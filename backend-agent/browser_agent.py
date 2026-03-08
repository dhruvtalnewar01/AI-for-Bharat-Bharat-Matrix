"""
===================================================================================
 BROWSER AGENT MODULE — Bharat MatrixAI LAM Execution Layer
===================================================================================

 PURPOSE:
   This is the ENGINE of the LAM (Large Action Model) Execution Layer.
   It implements a "GhostBrowser" — a stealth headless Chromium instance
   powered by Playwright — that navigates Indian government websites and
   performs real user actions (clicking, typing, scrolling) without
   triggering bot-detection mechanisms.

 KEY INNOVATION — VISION-BASED SELF-HEALING:
   Indian government websites (pmkisan.gov.in, nfsa.gov.in, etc.) are
   notoriously unstable. DOM structures change without notice, CSS class
   names get randomised, and elements shift positions after every deploy.

   Our solution: a TWO-PHASE interaction model.
     Phase 1 (DOM-first): Try standard CSS/XPath selectors.
     Phase 2 (Vision fallback): If DOM fails, capture a full-page
       screenshot, send it to Amazon Bedrock (Claude 3.5 Sonnet), ask
       the LLM to visually identify the target element's bounding box
       coordinates, and click/type at those precise pixel coordinates.

   This makes the agent SELF-HEALING — it adapts to UI changes in
   real-time without any code updates.

 ARCHITECTURE:
   ┌─────────────────────────────────────────────────────────────────┐
   │                     GhostBrowser                                │
   │                                                                 │
   │  launch() ──▶ navigate() ──▶ human_scroll()                     │
   │                                    │                             │
   │                          ┌─────────▼──────────┐                  │
   │                          │  self_healing_click │                  │
   │                          │  self_healing_type  │                  │
   │                          └──┬──────────────┬──┘                  │
   │                             │              │                     │
   │                     Phase 1: DOM     Phase 2: Vision             │
   │                     click_element    take_screenshot()           │
   │                     type_text()      ask_bedrock_for_element()   │
   │                                      click_by_coordinates()     │
   │                                                                 │
   │  check_pm_kisan_status(aadhaar) ◀── Full end-to-end workflow    │
   └─────────────────────────────────────────────────────────────────┘

 ANTI-DETECTION MEASURES:
   - Randomised User-Agent rotation (4 curated strings)
   - navigator.webdriver property override (undetectable)
   - Random mouse jitter before every click
   - Human-cadence typing (50-150ms per keystroke)
   - Smooth incremental scrolling with random pauses
   - Geolocation spoofing (New Delhi coordinates)
   - Browser locale set to en-IN with Asia/Kolkata timezone

 DEPLOYMENT: Runs inside a Docker container on AWS Fargate.
===================================================================================
"""

import asyncio
import base64
import json
import random
import re
import io
from typing import Optional

import boto3
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from PIL import Image

from privacy_guardrails import get_sanitised_logger, sanitize_log

# Module-level logger — all output passes through PII sanitisation filter
logger = get_sanitised_logger("browser_agent")


# =============================================================================
# SECTION 1: CONFIGURATION CONSTANTS
# =============================================================================

# Amazon Bedrock model identifier for Claude 3.5 Sonnet v2
# This model excels at visual UI understanding and can identify
# button/input locations from screenshots with high accuracy.
BEDROCK_MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0"

# AWS region where Bedrock is deployed
# us-east-1 has the broadest model availability for Bedrock
BEDROCK_REGION = "us-east-1"

# Curated User-Agent strings for rotation
# These represent the 4 most common browser/OS combinations globally.
# Rotating through them makes our bot look like different real users.
USER_AGENTS = [
    # Chrome on Windows 10/11 — 65%+ of Indian internet users
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",

    # Safari on macOS — common among government officials
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/18.0 Safari/605.1.15",

    # Firefox on Windows — privacy-conscious users
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) "
    "Gecko/20100101 Firefox/133.0",

    # Chrome on Linux — tech-savvy demographic
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

# Chromium launch arguments for stealth operation
# Each flag serves a specific anti-detection purpose:
STEALTH_ARGS = [
    # CRITICAL: Prevents sites from detecting Playwright/Puppeteer via
    # the Blink automation feature flag
    "--disable-blink-features=AutomationControlled",

    # Hides the "Chrome is being controlled by automated software" infobar
    "--disable-infobars",

    # Uses /tmp instead of /dev/shm for shared memory — required in Docker
    # containers where /dev/shm is typically only 64MB
    "--disable-dev-shm-usage",

    # Required for Docker: Chrome cannot create sandboxed child processes
    # inside most container runtimes
    "--no-sandbox",

    # GPU is not available in headless Docker containers
    "--disable-gpu",

    # Extensions can leak automation fingerprints
    "--disable-extensions",

    # Additional sandbox bypass for Docker
    "--disable-setuid-sandbox",

    # Standard 1080p viewport — matches most Indian government employees'
    # desktop monitors
    "--window-size=1920,1080",
]

# Anti-detection JavaScript injected before EVERY page load
# This script patches browser APIs that websites commonly use to detect bots:
STEALTH_INIT_SCRIPT = """
// Override navigator.webdriver — the PRIMARY bot detection signal.
// When Playwright/Puppeteer controls Chrome, this property is set to true.
// Real browsers always return undefined.
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// Override navigator.plugins — headless Chrome reports 0 plugins.
// Real Chrome on Windows reports 5 default plugins (PDF viewer, etc.).
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

// Override navigator.languages — headless Chrome defaults to ['en-US'].
// We add Hindi to match the Indian user demographic.
Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en', 'hi']
});

// Create a fake window.chrome object — headless Chrome doesn't have this,
// but all real Chrome installations do.
window.chrome = { runtime: {} };
"""


# =============================================================================
# SECTION 2: GHOST BROWSER CLASS — THE CORE ENGINE
# =============================================================================

class GhostBrowser:
    """
    Stealth headless browser for navigating Indian government websites.

    This class wraps Playwright's async API with:
      - Anti-detection stealth configuration
      - Human-like interaction patterns (scrolling, typing, mouse movement)
      - Vision-based self-healing via Amazon Bedrock
      - A complete PM-KISAN status check workflow

    Lifecycle:
      browser = GhostBrowser()
      await browser.launch()      # Start headless Chromium
      result = await browser.check_pm_kisan_status("123456789012")
      await browser.close()       # Clean shutdown
    """

    def __init__(self):
        """Initialise internal state — no external resources yet."""
        self._playwright = None          # Playwright runtime handle
        self._browser: Optional[Browser] = None           # Chromium browser instance
        self._context: Optional[BrowserContext] = None     # Browser context (profile)
        self._page: Optional[Page] = None                 # Active page/tab
        self._bedrock_client = None      # Lazy-loaded Bedrock Runtime client

    # =========================================================================
    # LIFECYCLE METHODS — Launch and close the browser
    # =========================================================================

    async def launch(self) -> None:
        """
        Launch a stealth headless Chromium browser.

        This method:
          1. Starts the Playwright runtime
          2. Launches Chromium with anti-detection args
          3. Creates a browser context with Indian locale/timezone/geo
          4. Opens a new page and injects stealth scripts
          5. Logs the selected user-agent (sanitised)

        The browser is pre-warmed on FastAPI startup via the lifespan hook,
        so it's ready to serve requests immediately.
        """
        logger.info("🚀 Launching Ghost Browser (headless Chromium)...")

        # Start Playwright async runtime
        self._playwright = await async_playwright().start()

        # Randomly select a user-agent for this session
        user_agent = random.choice(USER_AGENTS)

        # Launch Chromium with stealth arguments
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=STEALTH_ARGS,
        )

        # Create a browser context — this is like a fresh browser profile.
        # We configure it to appear as an Indian user browsing from New Delhi.
        self._context = await self._browser.new_context(
            viewport={"width": 1920, "height": 1080},  # Full HD monitor
            user_agent=user_agent,                       # Randomised UA string
            locale="en-IN",                              # Indian English locale
            timezone_id="Asia/Kolkata",                  # IST timezone
            permissions=["geolocation"],                 # Allow geo access
            geolocation={                                # New Delhi coordinates
                "latitude": 28.6139,
                "longitude": 77.2090,
            },
        )

        # Open a new tab
        self._page = await self._context.new_page()

        # Inject stealth scripts BEFORE any navigation occurs.
        # add_init_script() runs the script before any page JavaScript executes.
        await self._page.add_init_script(STEALTH_INIT_SCRIPT)

        logger.info("✅ Ghost Browser launched with UA: %s", user_agent)

    async def close(self) -> None:
        """
        Gracefully shut down the browser and release all resources.

        Called automatically by FastAPI's lifespan shutdown hook.
        Order matters: close browser first, then stop the Playwright runtime.
        """
        if self._browser:
            await self._browser.close()
            logger.info("Browser instance closed")
        if self._playwright:
            await self._playwright.stop()
            logger.info("Playwright runtime stopped")
        logger.info("🛑 Ghost Browser fully shut down")

    @property
    def page(self) -> Page:
        """
        Get the active page. Raises if browser hasn't been launched.

        This property is used throughout the class to access the Playwright
        page object for all DOM and mouse interactions.
        """
        if not self._page:
            raise RuntimeError(
                "Browser not launched. Call launch() first. "
                "This usually means the FastAPI lifespan hook failed."
            )
        return self._page

    # =========================================================================
    # NAVIGATION — Get to the right page
    # =========================================================================

    async def navigate(self, url: str, wait_until: str = "networkidle") -> None:
        """
        Navigate to a URL with human-like behaviour.

        Uses 'networkidle' wait strategy — this waits until there have been
        no network requests for 500ms, which is important for Indian gov
        sites that load multiple tracking/analytics scripts.

        After navigation, adds a random 1.5-3s delay to mimic a human
        reading the page before interacting.

        Args:
            url: Target URL to navigate to.
            wait_until: Playwright wait condition. Options:
                        'networkidle', 'load', 'domcontentloaded', 'commit'
        """
        logger.info("🌐 Navigating to: %s", url)
        await self.page.goto(url, wait_until=wait_until, timeout=60000)
        # Human pause — a real user would take a moment to orient themselves
        await self._human_delay(1.5, 3.0)
        logger.info("📄 Page loaded: %s", await self.page.title())

    async def human_scroll(self, scrolls: int = 3) -> None:
        """
        Simulate human-like scrolling behaviour.

        Real users don't instantly jump to elements — they scroll down
        gradually, pausing to read. This method replicates that pattern
        with randomised scroll distances (200-500px) and pause durations
        (200-600ms).

        This serves two purposes:
          1. Anti-detection: Bots that instantly interact look suspicious.
          2. Content loading: Some gov sites use lazy loading triggered
             by scroll events.

        Args:
            scrolls: Number of scroll steps to perform (default: 3).
        """
        for i in range(scrolls):
            # Random scroll distance — humans don't scroll exact amounts
            scroll_amount = random.randint(200, 500)
            await self.page.evaluate(f"window.scrollBy(0, {scroll_amount})")
            # Random pause between scrolls — mimics reading
            delay = random.uniform(0.2, 0.6)
            await asyncio.sleep(delay)
            logger.info(
                "📜 Scrolled %dpx (step %d/%d)",
                scroll_amount, i + 1, scrolls
            )

    # =========================================================================
    # DOM INTERACTION — Click and type using selectors
    # =========================================================================

    async def click_element(self, selector: str, timeout: int = 10000) -> bool:
        """
        Try to click an element using a CSS or XPath selector.

        Before clicking, performs a random mouse jitter to simulate natural
        cursor movement. After clicking, adds a human delay.

        This is Phase 1 of the self-healing strategy. If this fails
        (element not found, selector changed), the caller escalates to
        Phase 2 (vision-based click via Bedrock).

        Args:
            selector: CSS selector (e.g., "#submit_btn") or
                      XPath (e.g., "//button[text()='Submit']").
            timeout: Maximum wait time in ms for the element to appear.

        Returns:
            True if the click succeeded, False if the selector wasn't found.
        """
        try:
            # Wait for the element to appear in the DOM
            await self.page.wait_for_selector(selector, timeout=timeout)
            # Random mouse movement before clicking — anti-detection
            await self._mouse_jitter()
            # Execute the click
            await self.page.click(selector)
            # Post-click human delay
            await self._human_delay(0.5, 1.5)
            logger.info("🖱️ Clicked element via DOM: %s", selector)
            return True
        except Exception as e:
            # Log the failure — this triggers Phase 2 in self_healing_click
            logger.warning("⚠️ DOM click failed for '%s': %s", selector, str(e))
            return False

    async def click_by_coordinates(self, x: float, y: float) -> None:
        """
        Click at exact pixel coordinates with human-like precision.

        Adds ±2px random jitter to the target coordinates because real
        human clicks are never pixel-perfect. Also moves the mouse
        gradually to the target (5-15 intermediate steps) instead of
        teleporting — another anti-detection measure.

        This is the execution step of Phase 2 (vision-based self-healing).
        After Bedrock identifies the bounding box, we calculate the center
        point and click here.

        Args:
            x: Target X coordinate (pixels from left).
            y: Target Y coordinate (pixels from top).
        """
        # Add human-like jitter — nobody clicks exactly on the center pixel
        jitter_x = x + random.uniform(-2, 2)
        jitter_y = y + random.uniform(-2, 2)

        # Move mouse gradually to the target (not a teleport)
        await self.page.mouse.move(
            jitter_x, jitter_y,
            steps=random.randint(5, 15)  # Intermediate movement steps
        )
        # Brief natural pause before clicking
        await self._human_delay(0.1, 0.3)
        # Execute the click at the final position
        await self.page.mouse.click(jitter_x, jitter_y)
        logger.info("🎯 Coordinate click at (%.1f, %.1f)", jitter_x, jitter_y)

    async def type_text(self, selector: str, text: str) -> bool:
        """
        Type text into an input field with human-like keystroke timing.

        Each character is typed individually with a random delay of
        50-150ms between keystrokes. This mimics real human typing speed
        (~40-60 WPM) and prevents bot detection via keystroke analysis.

        Args:
            selector: CSS/XPath selector for the input field.
            text: The text to type (e.g., an Aadhaar number).

        Returns:
            True if typing succeeded, False if the input wasn't found.
        """
        try:
            # Wait for the input field to appear
            await self.page.wait_for_selector(selector, timeout=10000)
            # Click the field first to ensure it's focused
            await self.page.click(selector)
            # Type each character individually with random delays
            for char in text:
                await self.page.keyboard.type(
                    char,
                    delay=random.randint(50, 150)  # Human typing speed
                )
            logger.info("⌨️ Typed text into: %s", selector)
            return True
        except Exception as e:
            logger.warning("⚠️ Typing failed for '%s': %s", selector, str(e))
            return False

    async def get_page_text(self) -> str:
        """
        Extract ALL visible text content from the current page.

        Uses Playwright's inner_text("body") which returns only visible
        text (ignoring hidden elements, scripts, styles). This is used
        to extract the status result after form submission.

        Returns:
            All visible text on the page as a single string.
        """
        return await self.page.inner_text("body")

    # =========================================================================
    # VISION-BASED SELF-HEALING — Amazon Bedrock Integration
    # =========================================================================
    # This is the USP (Unique Selling Proposition) of the LAM Execution Layer.
    # When DOM selectors fail (which happens frequently on Indian gov sites),
    # we fall back to visual AI to find and interact with elements.

    async def take_screenshot(self) -> bytes:
        """
        Capture a full-page screenshot as PNG bytes.

        The screenshot is sent to Amazon Bedrock's Claude 3.5 Sonnet model
        for visual analysis. Full-page capture ensures we catch elements
        that might be below the fold.

        Returns:
            PNG image data as bytes.
        """
        screenshot = await self.page.screenshot(full_page=True, type="png")
        logger.info("📸 Screenshot captured (%d bytes)", len(screenshot))
        return screenshot

    def _get_bedrock_client(self):
        """
        Lazy-initialise the Amazon Bedrock Runtime client.

        Why lazy? Because:
          1. boto3 client creation involves credential resolution
          2. We don't need Bedrock if DOM selectors succeed (Phase 1)
          3. The client is reused across multiple calls once created

        On AWS Fargate, credentials come from the IAM Task Role —
        no keys are hardcoded or passed via environment variables.

        Returns:
            boto3 Bedrock Runtime client configured for the target region.
        """
        if not self._bedrock_client:
            self._bedrock_client = boto3.client(
                "bedrock-runtime",
                region_name=BEDROCK_REGION,
            )
        return self._bedrock_client

    async def ask_bedrock_for_element(
        self, screenshot: bytes, element_description: str
    ) -> dict:
        """
        Send a screenshot to Amazon Bedrock and ask Claude 3.5 Sonnet to
        identify the bounding box of a described UI element.

        This is the CORE of the vision-based self-healing system.

        How it works:
          1. Encode the screenshot as base64 (Bedrock requirement)
          2. Get the image dimensions for the prompt context
          3. Construct a precise prompt asking for JSON coordinates
          4. Call the Bedrock Converse API with the image + prompt
          5. Parse the JSON response to get {x, y, width, height}

        The Converse API is used instead of InvokeModel because:
          - It provides a standardised message format across models
          - Better support for multimodal (image + text) inputs
          - Automatic token counting and billing

        Args:
            screenshot: Full-page PNG screenshot as bytes.
            element_description: Human-readable description of the target
                                 element (e.g., "The 'Know Your Status' button").

        Returns:
            Dict with keys: x, y, width, height (pixel coordinates).
            Returns zeroed dict if Bedrock can't find the element.
        """
        logger.info(
            "🧠 Asking Bedrock to locate: '%s'", element_description
        )

        # Step 1: Encode screenshot to base64 for Bedrock API
        image_b64 = base64.b64encode(screenshot).decode("utf-8")

        # Step 2: Get image dimensions for the prompt
        # This helps Claude understand the coordinate space
        img = Image.open(io.BytesIO(screenshot))
        img_width, img_height = img.size

        # Step 3: Construct a precise, structured prompt
        # Key prompt engineering decisions:
        #   - Explicitly state the image dimensions so coordinates are accurate
        #   - Ask for JSON-only output to enable automated parsing
        #   - Specify the exact JSON schema to prevent format variation
        #   - Prohibit explanatory text to avoid parsing errors
        prompt = (
            f"You are a visual UI automation assistant analysing a screenshot "
            f"of an Indian government website. "
            f"The screenshot dimensions are {img_width}x{img_height} pixels. "
            f"\n\n"
            f"TASK: Identify the bounding box coordinates of the UI element "
            f"described as: '{element_description}'. "
            f"\n\n"
            f"RULES:\n"
            f"1. Return ONLY valid JSON, no markdown, no explanation.\n"
            f"2. Use this exact format: "
            f'{{"x": <number>, "y": <number>, "width": <number>, "height": <number>}}\n'
            f"3. x,y is the top-left corner of the bounding box.\n"
            f"4. All values must be in pixels.\n"
            f"5. If the element is not visible, return all zeros."
        )

        # Step 4: Build the Bedrock Converse API request
        # The Converse API expects messages in a chat-like format with
        # multimodal content blocks (image + text).
        request_body = {
            "modelId": BEDROCK_MODEL_ID,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            # Image content block — the screenshot
                            "image": {
                                "format": "png",
                                "source": {
                                    "bytes": image_b64,
                                },
                            },
                        },
                        {
                            # Text content block — the prompt
                            "text": prompt,
                        },
                    ],
                }
            ],
            "inferenceConfig": {
                "maxTokens": 256,    # Coordinates don't need many tokens
                "temperature": 0.0,  # Deterministic output for consistency
            },
        }

        # Step 5: Execute the API call
        # boto3 is synchronous, so we run it in a thread executor to avoid
        # blocking the asyncio event loop (critical for FastAPI concurrency)
        client = self._get_bedrock_client()
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,  # Use the default ThreadPoolExecutor
            lambda: client.converse(**request_body),
        )

        # Step 6: Parse the response
        # The Converse API response structure:
        # { "output": { "message": { "content": [{"text": "..."}] } } }
        output_text = (
            response.get("output", {})
            .get("message", {})
            .get("content", [{}])[0]
            .get("text", "{}")
        )

        # Step 7: Parse JSON and validate
        try:
            coords = json.loads(output_text)
            logger.info("✅ Bedrock located element at: %s", coords)
            return coords
        except json.JSONDecodeError:
            # If Bedrock returns non-JSON (rare but possible), log and return zeros
            logger.error(
                "❌ Bedrock returned non-JSON: %s", output_text[:200]
            )
            return {"x": 0, "y": 0, "width": 0, "height": 0}

    # =========================================================================
    # SELF-HEALING ORCHESTRATORS — The two-phase strategy
    # =========================================================================

    async def self_healing_click(
        self, selector: str, element_description: str
    ) -> bool:
        """
        Two-phase click strategy with automatic DOM → Vision escalation.

        Phase 1 (Fast path): Try the CSS/XPath selector directly.
        Phase 2 (Fallback):  Screenshot → Bedrock → Coordinate click.

        This method is the primary interface for all click operations in
        the PM-KISAN workflow. Callers don't need to know which phase
        succeeded — the method handles escalation transparently.

        Args:
            selector: CSS or XPath selector to try first.
            element_description: Human-readable description for Bedrock
                                 (e.g., "The 'Get Data' submit button").

        Returns:
            True if the click succeeded via either phase.
            False if both phases failed (element truly not on page).
        """
        # ---- Phase 1: DOM-first (fast, preferred) ----
        if await self.click_element(selector):
            return True

        # ---- Phase 2: Bedrock vision fallback (slower, resilient) ----
        logger.info(
            "🔄 Escalating to vision self-healing for: '%s'",
            element_description
        )

        try:
            # Capture the current page state
            screenshot = await self.take_screenshot()

            # Ask Claude 3.5 Sonnet to find the element visually
            coords = await self.ask_bedrock_for_element(
                screenshot, element_description
            )

            # Validate that Bedrock found something
            if coords.get("width", 0) == 0 and coords.get("height", 0) == 0:
                logger.error(
                    "❌ Bedrock could not locate: '%s'", element_description
                )
                return False

            # Calculate the center point of the bounding box for clicking
            center_x = coords["x"] + coords["width"] / 2
            center_y = coords["y"] + coords["height"] / 2

            # Execute the coordinate-based click
            await self.click_by_coordinates(center_x, center_y)
            logger.info(
                "✅ Vision-based click succeeded for: '%s'",
                element_description
            )
            return True

        except Exception as e:
            logger.error("❌ Self-healing click failed: %s", str(e))
            return False

    async def self_healing_type(
        self, selector: str, text: str, element_description: str
    ) -> bool:
        """
        Two-phase typing strategy with automatic DOM → Vision escalation.

        Phase 1: Try typing via DOM selector (fast).
        Phase 2: Screenshot → Bedrock finds input field → click coordinates
                 → type character-by-character (resilient).

        This is used for the Aadhaar input field on pmkisan.gov.in, which
        has historically changed its CSS ID multiple times.

        Args:
            selector: CSS/XPath selector for the input field.
            text: The text to type (e.g., Aadhaar number).
            element_description: Description for Bedrock vision fallback.

        Returns:
            True if typing succeeded via either phase.
        """
        # ---- Phase 1: DOM-first ----
        if await self.type_text(selector, text):
            return True

        # ---- Phase 2: Bedrock vision fallback ----
        logger.info(
            "🔄 Escalating to vision self-healing type for: '%s'",
            element_description,
        )

        try:
            screenshot = await self.take_screenshot()
            coords = await self.ask_bedrock_for_element(
                screenshot, element_description
            )

            if coords.get("width", 0) == 0 and coords.get("height", 0) == 0:
                logger.error(
                    "❌ Bedrock could not locate input: '%s'",
                    element_description
                )
                return False

            # Click the center of the identified input field to focus it
            center_x = coords["x"] + coords["width"] / 2
            center_y = coords["y"] + coords["height"] / 2
            await self.click_by_coordinates(center_x, center_y)
            await self._human_delay(0.3, 0.6)

            # Type each character with human-like timing
            for char in text:
                await self.page.keyboard.type(
                    char, delay=random.randint(50, 150)
                )

            logger.info(
                "✅ Vision-based type succeeded for: '%s'",
                element_description
            )
            return True

        except Exception as e:
            logger.error("❌ Self-healing type failed: %s", str(e))
            return False

    # =========================================================================
    # PM-KISAN STATUS CHECK — Complete End-to-End Workflow
    # =========================================================================
    # This is the flagship workflow of the LAM Execution Layer.
    # It demonstrates the full power of the self-healing browser agent
    # by navigating a real Indian government website autonomously.

    async def check_pm_kisan_status(self, aadhaar_number: str) -> dict:
        """
        Check PM-KISAN beneficiary status — the complete 7-step workflow.

        This method orchestrates the entire interaction with pmkisan.gov.in:

          ┌──────────────────────────────────────────────────────────┐
          │  Step 1: Navigate to https://pmkisan.gov.in/            │
          │  Step 2: Click "Know Your Status" (self-healing)        │
          │  Step 3: Enter Aadhaar number (self-healing)            │
          │  Step 4: Click "Get Data" submit (self-healing)         │
          │  Step 5: Wait for results to load                       │
          │  Step 6: Extract farmer name + installment data         │
          │  Step 7: Clean, sanitise, and return as JSON            │
          └──────────────────────────────────────────────────────────┘

        Every step uses the self-healing strategy:
          1st attempt: Try 4-5 different CSS/XPath selectors
          2nd attempt: Screenshot → Bedrock → coordinate interaction

        SECURITY: No raw Aadhaar number is ever logged. sanitize_log()
        is called before every logger statement that might contain PII.

        Args:
            aadhaar_number: 12-digit Aadhaar number as a string.

        Returns:
            dict with these keys:
              - success (bool): Whether the scrape completed
              - status_text (str): Human-readable status summary
              - farmer_name (str): Beneficiary name (if found)
              - installments (list): Payment history rows
              - raw_text (str): Sanitised page text (capped at 3000 chars)
              - error (str|None): Error message if failed
        """
        # Initialise the result structure
        result = {
            "success": False,
            "status_text": "",
            "farmer_name": "",
            "installments": [],
            "raw_text": "",
            "error": None,
        }

        # SECURITY: Sanitise the Aadhaar before ANY logging
        safe_id = sanitize_log(aadhaar_number)
        logger.info("🏁 PM-KISAN status check initiated for: %s", safe_id)

        try:
            # ==================================================================
            # STEP 1: Navigate to the PM-KISAN homepage
            # ==================================================================
            await self.navigate("https://pmkisan.gov.in/")
            # Scroll like a real user would — also triggers lazy-loaded content
            await self.human_scroll(scrolls=2)

            # ==================================================================
            # STEP 2: Click "Know Your Status" / "Beneficiary Status"
            # ==================================================================
            # The button text and selector have changed multiple times.
            # We try 4 different selectors before falling back to vision.
            know_status_selectors = [
                # Href-based: Most stable — matches even if text changes
                "a[href*='BeneficiaryStatus']",
                # XPath text match: Works across different CSS frameworks
                "//a[contains(text(),'Know Your Status')]",
                # Class-based: Bootstrap nav-link pattern
                "a.nav-link[href*='Status']",
                # ID-based: Least likely to exist but fastest if it does
                "#know_status",
            ]

            clicked = False
            for selector in know_status_selectors:
                if await self.click_element(selector, timeout=5000):
                    clicked = True
                    logger.info("✅ Found 'Know Your Status' via: %s", selector)
                    break

            # If all DOM selectors failed → vision fallback
            if not clicked:
                logger.info(
                    "🔄 All DOM selectors failed for 'Know Your Status' "
                    "— escalating to Bedrock vision"
                )
                screenshot = await self.take_screenshot()
                coords = await self.ask_bedrock_for_element(
                    screenshot,
                    "The 'Know Your Status' or 'Beneficiary Status' button "
                    "or link on the PM-KISAN homepage. It is typically a "
                    "prominent navigation element or card on the main page.",
                )
                if coords.get("width", 0) > 0:
                    center_x = coords["x"] + coords["width"] / 2
                    center_y = coords["y"] + coords["height"] / 2
                    await self.click_by_coordinates(center_x, center_y)
                    clicked = True

            if not clicked:
                result["error"] = "Could not locate 'Know Your Status' button"
                logger.error("❌ %s", result["error"])
                return result

            # Wait for the status page to load
            await self._human_delay(2.0, 4.0)
            logger.info(
                "📄 Status page: %s", await self.page.title()
            )

            # ==================================================================
            # STEP 3: Enter the Aadhaar number
            # ==================================================================
            # The input field ID has historically been:
            #   - #ctl00_ContentPlaceHolder1_txtAadhar (ASP.NET default)
            #   - input[name*='Aadhar'] (name-based)
            #   - input[maxlength='12'] (attribute-based)
            aadhaar_input_selectors = [
                "#ctl00_ContentPlaceHolder1_txtAadhar",
                "input[placeholder*='Aadhaar']",
                "input[placeholder*='aadhaar']",
                "input[name*='Aadhar']",
                "input[type='text'][maxlength='12']",
            ]

            typed = False
            for selector in aadhaar_input_selectors:
                if await self.type_text(selector, aadhaar_number):
                    typed = True
                    logger.info("✅ Aadhaar entered via DOM: %s", selector)
                    break

            # Vision fallback for the input field
            if not typed:
                typed = await self.self_healing_type(
                    aadhaar_input_selectors[0],
                    aadhaar_number,
                    "The Aadhaar number text input field — a single-line "
                    "text box where the user enters their 12-digit Aadhaar "
                    "number. It usually has a placeholder like 'Enter Aadhaar'.",
                )

            if not typed:
                result["error"] = "Could not locate Aadhaar input field"
                logger.error("❌ %s", result["error"])
                return result

            await self._human_delay(0.5, 1.0)

            # ==================================================================
            # STEP 4: Click the submit / "Get Data" button
            # ==================================================================
            submit_selectors = [
                "#ctl00_ContentPlaceHolder1_btnSubmit",
                "input[type='submit'][value*='Get Data']",
                "button[type='submit']",
                "input[type='button'][value*='Get Data']",
                "#btnSubmit",
            ]

            submitted = False
            for selector in submit_selectors:
                if await self.click_element(selector, timeout=5000):
                    submitted = True
                    logger.info("✅ Submit clicked via DOM: %s", selector)
                    break

            # Vision fallback for the submit button
            if not submitted:
                submitted = await self.self_healing_click(
                    submit_selectors[0],
                    "The 'Get Data' or 'Submit' button — typically a green "
                    "or blue button below the Aadhaar input field that "
                    "triggers the beneficiary status lookup.",
                )

            if not submitted:
                result["error"] = "Could not click submit/Get Data button"
                logger.error("❌ %s", result["error"])
                return result

            # ==================================================================
            # STEP 5: Wait for results to load
            # ==================================================================
            # Indian gov sites can be slow — we wait 3-5s for the AJAX response
            await self._human_delay(3.0, 5.0)

            # Try to detect the result container appearing
            result_selectors = [
                "#ctl00_ContentPlaceHolder1_lbl_FarmerName",
                ".status-result",
                "#result-container",
                "table.table",
                ".beneficiary-details",
            ]

            for selector in result_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=5000)
                    logger.info("✅ Result container found: %s", selector)
                    break
                except Exception:
                    continue

            # ==================================================================
            # STEP 6: Extract and parse the results
            # ==================================================================

            # Get ALL visible text from the page
            raw_text = await self.get_page_text()

            # Store sanitised raw text (capped at 3000 chars to prevent
            # response bloat — gov sites can have 10k+ chars of boilerplate)
            result["raw_text"] = sanitize_log(raw_text[:3000])

            # --- Extract farmer name from specific element ---
            try:
                name_el = await self.page.query_selector(
                    "#ctl00_ContentPlaceHolder1_lbl_FarmerName"
                )
                if name_el:
                    raw_name = await name_el.inner_text()
                    result["farmer_name"] = sanitize_log(raw_name)
                    logger.info("👤 Farmer name found")
            except Exception:
                logger.info("ℹ️ Farmer name element not found — continuing")

            # --- Extract installment payment rows from the table ---
            try:
                rows = await self.page.query_selector_all(
                    "table.table tbody tr"
                )
                for row in rows:
                    cells = await row.query_selector_all("td")
                    if len(cells) >= 2:
                        installment = sanitize_log(
                            await cells[0].inner_text()
                        )
                        status = sanitize_log(
                            await cells[1].inner_text()
                        )
                        result["installments"].append({
                            "installment": installment,
                            "status": status
                        })
                if result["installments"]:
                    logger.info(
                        "💰 Found %d installment records",
                        len(result["installments"])
                    )
            except Exception:
                logger.info("ℹ️ Installment table not found — using fallback")

            # ==================================================================
            # STEP 7: Build the clean status summary
            # ==================================================================
            status_lines = []

            if result["farmer_name"]:
                status_lines.append(f"Farmer: {result['farmer_name']}")

            if result["installments"]:
                status_lines.append(
                    f"Installments found: {len(result['installments'])}"
                )
                # Show the most recent 3 installments
                for inst in result["installments"][-3:]:
                    status_lines.append(
                        f"  {inst['installment']}: {inst['status']}"
                    )
            else:
                # Fallback: keyword extraction from raw text
                meaningful = self._extract_status_from_text(raw_text)
                if meaningful:
                    status_lines.append(meaningful)

            # Assemble the final status text
            result["status_text"] = sanitize_log(
                "\n".join(status_lines) if status_lines
                else "Status page loaded but no structured data found. "
                     "Raw text has been captured for manual review."
            )
            result["success"] = True

            logger.info(
                "🏁 PM-KISAN check completed — %d chars of status extracted",
                len(result["status_text"]),
            )
            return result

        except Exception as e:
            # Catch-all for unexpected errors (network timeout, browser crash, etc.)
            error_msg = sanitize_log(str(e))
            logger.error("❌ PM-KISAN check failed: %s", error_msg)
            result["error"] = error_msg
            return result

    # =========================================================================
    # PRIVATE HELPER METHODS
    # =========================================================================

    @staticmethod
    def _extract_status_from_text(raw_text: str) -> str:
        """
        Best-effort extraction of PM-KISAN status from raw page text.

        When structured selectors (table, labels) aren't available, this
        method scans the raw page text looking for keywords that indicate
        status information. It returns the most relevant lines.

        This is the last-resort extraction method — it won't give perfectly
        structured data, but it captures meaningful status info.

        Keywords searched:
          beneficiary, registered, installment, credited, pending,
          rejected, rft signed, fto generated, paid

        Args:
            raw_text: Full page text from get_page_text().

        Returns:
            Relevant lines concatenated with newlines, sanitised of PII.
        """
        # Keywords that indicate PM-KISAN status information
        keywords = [
            "beneficiary", "registered", "not registered",
            "installment", "credited", "pending", "rejected",
            "rft signed", "fto generated", "paid",
        ]

        lines = raw_text.split("\n")
        relevant = []

        for line in lines:
            stripped = line.strip()
            # Match lines containing keywords, exclude long boilerplate
            if (any(kw in stripped.lower() for kw in keywords)
                    and len(stripped) < 200):
                relevant.append(sanitize_log(stripped))
            # Cap at 10 relevant lines to keep the response manageable
            if len(relevant) >= 10:
                break

        return "\n".join(relevant)

    async def _human_delay(
        self, min_sec: float = 1.0, max_sec: float = 3.0
    ) -> None:
        """
        Add a randomised delay to mimic human interaction pace.

        Humans don't interact with web pages at machine speed. Adding
        random delays between 1-3 seconds (configurable) makes our
        bot's timing profile indistinguishable from a real user.

        Args:
            min_sec: Minimum delay in seconds.
            max_sec: Maximum delay in seconds.
        """
        delay = random.uniform(min_sec, max_sec)
        await asyncio.sleep(delay)

    async def _mouse_jitter(self) -> None:
        """
        Move the mouse to a random position to simulate natural movement.

        Real users move their mouse around the page while reading.
        This method moves the cursor to a random position within the
        viewport before each click action, making the interaction
        pattern look organic.

        The mouse moves gradually (3-10 steps) instead of teleporting,
        which would be a bot detection signal.
        """
        x = random.randint(100, 1800)
        y = random.randint(100, 900)
        await self.page.mouse.move(x, y, steps=random.randint(3, 10))
        await asyncio.sleep(random.uniform(0.05, 0.15))
