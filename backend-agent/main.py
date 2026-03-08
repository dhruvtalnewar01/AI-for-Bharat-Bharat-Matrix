"""
===================================================================================
 MAIN ORCHESTRATOR — Bharat MatrixAI LAM Execution Layer
===================================================================================

 PURPOSE:
   This is the COMMAND CENTER of the LAM (Large Action Model) Execution
   Layer. It's a FastAPI application that wires together three subsystems
   into a unified, production-ready API surface:

     1. GhostBrowser (browser_agent.py)    — The agentic browser engine
     2. Privacy Guardrails (privacy_guardrails.py) — PII protection shield
     3. Vernacular Pipeline (vernacular_pipeline.py) — Multilingual stubs

 API SURFACE:
   ┌────────────────────────────────────────────────────────────────┐
   │                                                                │
   │  System Endpoints:                                             │
   │    GET  /health              → Fargate ALB health check        │
   │    GET  /api/v1/capabilities → List supported gov sites        │
   │                                                                │
   │  Core LAM Endpoints:                                           │
   │    POST /api/v1/execute      → Execute any intent (THE HUB)   │
   │    POST /api/v1/pm-kisan/status → Direct PM-KISAN check       │
   │    POST /api/v1/scrape       → Generic scraping endpoint       │
   │                                                                │
   │  Vernacular Pipeline (from router):                            │
   │    POST /api/v1/intent       → Parse voice/text intent         │
   │    POST /api/v1/execute      → (shared with core)              │
   │    GET  /api/v1/status/{id}  → Poll async task status          │
   │    POST /api/v1/nova-webhook → Nova 2 Sonic real-time events   │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘

 REQUEST LIFECYCLE:
   Client → [GuardrailMiddleware: PII scan] → [FastAPI Router] → Handler
                                                                    │
                                                            GhostBrowser
                                                               (async)
                                                                    │
                                                           [PII sanitise]
                                                                    │
                                                              Response

 DEPLOYMENT:
   - Local: uvicorn main:app --reload --port 8000
   - Docker: docker run -p 8000:8000 bharat-matrix-lam
   - Fargate: ECS task with IAM role for Bedrock access
===================================================================================
"""

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from browser_agent import GhostBrowser
from privacy_guardrails import (
    GuardrailMiddleware,
    get_sanitised_logger,
    sanitize_log,
)
from vernacular_pipeline import router as vernacular_router

# Module logger — all output is PII-sanitised automatically
logger = get_sanitised_logger("main")


# =============================================================================
# SECTION 1: SHARED BROWSER INSTANCE
# =============================================================================
# A single GhostBrowser instance is shared across all requests.
# Why singleton? Because:
#   1. Launching Chromium takes ~3 seconds — too slow per-request
#   2. Each Chromium instance uses ~200MB RAM — multiplying is wasteful
#   3. We reuse the same browser context for session continuity
#
# On Fargate with 1 worker (--workers 1), this is safe. For multi-worker
# deployments, each worker gets its own GhostBrowser instance.

ghost_browser = GhostBrowser()


# =============================================================================
# SECTION 2: APPLICATION LIFESPAN (Startup + Shutdown)
# =============================================================================
# FastAPI's lifespan context manager handles resource initialization.
# On startup: pre-warm the browser so first request is fast.
# On shutdown: gracefully close the browser and free resources.


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan hook — runs on application start and stop.

    Startup:
      - Launches the GhostBrowser (headless Chromium + stealth config)
      - Browser is immediately ready to serve requests
      - If launch fails, the app still starts (degrades gracefully)

    Shutdown:
      - Closes the browser and Playwright runtime
      - Releases all system resources (memory, file handles)
    """
    # ---- STARTUP ----
    logger.info("🚀 Starting Bharat MatrixAI LAM Execution Layer...")
    try:
        await ghost_browser.launch()
        logger.info("✅ Ghost Browser pre-warmed and ready to serve")
    except Exception as e:
        # Don't crash the app if browser fails — health check still works,
        # and we can attempt browser launch on first request instead
        logger.error("⚠️ Browser pre-warm failed: %s", str(e))

    yield  # App is running, serving requests

    # ---- SHUTDOWN ----
    logger.info("🛑 Shutting down LAM Execution Layer...")
    await ghost_browser.close()
    logger.info("✅ All resources released. Goodbye.")


# =============================================================================
# SECTION 3: FASTAPI APPLICATION CREATION
# =============================================================================

app = FastAPI(
    title="Bharat MatrixAI — LAM Execution Layer",
    description=(
        "Agentic backend for navigating Indian government websites using "
        "headless Playwright with Amazon Bedrock-powered vision self-healing. "
        "Built for Bharat MatrixAI — India's first vernacular-native "
        "government services assistant."
    ),
    version="0.1.0",
    lifespan=lifespan,
    # Enable Swagger UI with custom branding
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---- MOUNT MIDDLEWARE ----
# CORS middleware — allows frontend-web (localhost:3000) and Vapi cloud
# to access the API. In production, restrict origins to your domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The GuardrailMiddleware intercepts ALL HTTP traffic and sanitises PII
# from log output. This is the outermost defence layer.
app.add_middleware(GuardrailMiddleware)

# ---- MOUNT ROUTERS ----
# The vernacular pipeline router provides /api/v1/intent, /execute,
# /status, and /nova-webhook endpoints.
app.include_router(vernacular_router)


# =============================================================================
# SECTION 4: REQUEST / RESPONSE MODELS
# =============================================================================
# Pydantic models for type-safe request validation and response serialisation.
# FastAPI automatically generates OpenAPI schemas from these.


class ExecuteIntentRequest(BaseModel):
    """
    Universal intent execution request for the LAM hub endpoint.

    This is the PRIMARY request model for POST /api/v1/execute.
    It accepts any supported intent and routes it to the correct
    GhostBrowser workflow.

    Example payload:
        {
            "intent": "check_pm_kisan_status",
            "aadhaar": "123456789012",
            "language": "hi"
        }
    """

    intent: str = Field(
        ...,
        description="The action intent to execute",
        examples=["check_pm_kisan_status", "check_ration_card"],
    )
    aadhaar: Optional[str] = Field(
        default=None,
        description="12-digit Aadhaar number (if required by intent)",
    )
    phone: Optional[str] = Field(
        default=None,
        description="10-digit mobile number (if required by intent)",
    )
    language: str = Field(
        default="en",
        description="Response language preference (ISO 639-1)",
        examples=["hi", "en", "ta", "bn"],
    )
    extra_params: Optional[dict] = Field(
        default=None,
        description="Additional parameters specific to the intent",
    )


class ExecuteIntentResponse(BaseModel):
    """
    Universal response from the LAM hub endpoint.

    Contains the scraping result, metadata, and links to any TTS
    audio responses generated by the vernacular pipeline.
    """

    success: bool = Field(description="Whether the action completed")
    intent: str = Field(description="The executed intent")
    status_text: str = Field(
        default="",
        description="Human-readable status summary",
    )
    farmer_name: str = Field(
        default="",
        description="Beneficiary name (PM-KISAN specific)",
    )
    installments: list = Field(
        default_factory=list,
        description="Payment history (PM-KISAN specific)",
    )
    raw_text: str = Field(
        default="",
        description="Raw scraped page text (sanitised, capped)",
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if the action failed",
    )


class ScrapeRequest(BaseModel):
    """
    Generic scraping request for the direct /scrape endpoint.

    This is a lower-level endpoint that bypasses intent classification
    and directly tells the GhostBrowser where to go and what to click.
    """

    url: str = Field(
        ...,
        description="Target URL to scrape",
        examples=["https://pmkisan.gov.in"],
    )
    target_element: Optional[str] = Field(
        default=None,
        description="CSS/XPath selector of the element to interact with",
        examples=["#btn_check_status"],
    )
    element_description: Optional[str] = Field(
        default=None,
        description="Human-readable description for Bedrock vision fallback",
        examples=["Check Status button"],
    )
    input_data: Optional[dict] = Field(
        default=None,
        description="Form fields to fill: {selector: value}",
        examples=[{"#aadhaar_input": "123456789012"}],
    )
    scroll_before_action: bool = Field(
        default=True,
        description="Perform human-like scrolling before interaction",
    )


class ScrapeResponse(BaseModel):
    """Response from the generic scraping endpoint."""

    success: bool
    url: str
    page_title: str = ""
    extracted_text: str = ""
    error: Optional[str] = None


class PMKisanRequest(BaseModel):
    """
    Dedicated PM-KISAN status check request.

    Validates that the Aadhaar is exactly 12 digits before sending
    it to the GhostBrowser. This prevents unnecessary browser launches
    for malformed input.
    """

    aadhaar_number: str = Field(
        ...,
        description="12-digit Aadhaar number",
        min_length=12,
        max_length=12,
        pattern=r"^\d{12}$",
    )


class PMKisanResponse(BaseModel):
    """Structured PM-KISAN status result."""

    success: bool
    status_text: str = ""
    farmer_name: str = ""
    installments: list = []
    raw_text: str = ""
    error: Optional[str] = None


# =============================================================================
# SECTION 5: API ENDPOINTS
# =============================================================================


# ---- SYSTEM ENDPOINTS ------------------------------------------------------

@app.get("/health", tags=["system"])
async def health_check():
    """
    Health check endpoint for AWS Fargate ALB target group.

    The Fargate task definition's health check hits this endpoint every
    30 seconds. If it returns non-200 for 3 consecutive checks, Fargate
    replaces the container.

    Returns 200 OK with service metadata.
    """
    return {
        "status": "ok",
        "service": "bharat-matrix-lam",
        "version": "0.1.0",
        "engine": "ghost-browser-playwright",
        "vision": "amazon-bedrock-claude-3.5-sonnet",
    }


# ---- CORE LAM HUB ENDPOINT ------------------------------------------------

@app.post(
    "/api/v1/execute",
    response_model=ExecuteIntentResponse,
    tags=["lam-core"],
)
async def execute_intent(request: ExecuteIntentRequest):
    """
    🌟 THE PRIMARY LAM ENDPOINT — Execute any supported intent.

    This is the CENTRAL HUB that routes intent payloads to the correct
    GhostBrowser workflow. The frontend sends a simple JSON payload like:

        {"intent": "check_pm_kisan_status", "aadhaar": "123456789012"}

    ...and this endpoint handles everything:
      1. Validates the intent
      2. Routes to the correct browser workflow
      3. Runs the self-healing browser automation
      4. Returns the sanitised result

    Currently supported intents:
      - check_pm_kisan_status: Navigate pmkisan.gov.in, check beneficiary status
      - (More intents will be added for ration card, passport, etc.)

    Args:
        request: ExecuteIntentRequest with intent, aadhaar, language.

    Returns:
        ExecuteIntentResponse with scraped and sanitised results.
    """
    logger.info(
        "🎯 Execute intent received: '%s' (lang: %s)",
        request.intent,
        request.language,
    )

    try:
        # ==================================================================
        # ROUTE: PM-KISAN Status Check
        # ==================================================================
        if request.intent == "check_pm_kisan_status":
            # Validate Aadhaar is provided
            if not request.aadhaar:
                raise HTTPException(
                    status_code=400,
                    detail="Aadhaar number is required for PM-KISAN status check",
                )

            # Validate Aadhaar format (12 digits)
            if not request.aadhaar.isdigit() or len(request.aadhaar) != 12:
                raise HTTPException(
                    status_code=400,
                    detail="Aadhaar must be exactly 12 digits",
                )

            # Execute the PM-KISAN browser workflow
            logger.info("🏁 Launching PM-KISAN workflow...")
            result = await ghost_browser.check_pm_kisan_status(
                request.aadhaar
            )

            return ExecuteIntentResponse(
                success=result["success"],
                intent=request.intent,
                status_text=result["status_text"],
                farmer_name=result.get("farmer_name", ""),
                installments=result.get("installments", []),
                raw_text=result.get("raw_text", ""),
                error=result.get("error"),
            )

        # ==================================================================
        # ROUTE: Ration Card Check (stub — ready for Sprint 2)
        # ==================================================================
        elif request.intent == "check_ration_card":
            logger.info("📋 Ration card check requested — returning stub")
            return ExecuteIntentResponse(
                success=True,
                intent=request.intent,
                status_text=(
                    "Ration card check stub: This workflow will navigate "
                    "nfsa.gov.in and check ration card status. "
                    "Full implementation in Sprint 2."
                ),
                error=None,
            )

        # ==================================================================
        # ROUTE: Passport Status Check (stub — ready for Sprint 2)
        # ==================================================================
        elif request.intent == "check_passport_status":
            logger.info("🛂 Passport check requested — returning stub")
            return ExecuteIntentResponse(
                success=True,
                intent=request.intent,
                status_text=(
                    "Passport status check stub: This workflow will navigate "
                    "passportindia.gov.in and track application status. "
                    "Full implementation in Sprint 2."
                ),
                error=None,
            )

        # ==================================================================
        # UNKNOWN INTENT
        # ==================================================================
        else:
            logger.warning("❓ Unknown intent: '%s'", request.intent)
            raise HTTPException(
                status_code=400,
                detail=f"Unknown intent: '{request.intent}'. "
                       f"Supported: check_pm_kisan_status, check_ration_card, "
                       f"check_passport_status",
            )

    except HTTPException:
        raise  # Re-raise FastAPI HTTP exceptions as-is
    except Exception as e:
        error_msg = sanitize_log(str(e))
        logger.error("❌ Execute intent failed: %s", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


# ---- DEDICATED PM-KISAN ENDPOINT ------------------------------------------

@app.post(
    "/api/v1/pm-kisan/status",
    response_model=PMKisanResponse,
    tags=["pm-kisan"],
)
async def check_pm_kisan_status(request: PMKisanRequest):
    """
    Dedicated PM-KISAN beneficiary status check endpoint.

    This is a shortcut endpoint that bypasses intent routing and goes
    directly to the PM-KISAN workflow. Useful for:
      - Direct API integrations
      - Testing the browser agent in isolation
      - Frontend components that already know the intent

    The full workflow is documented in browser_agent.py's
    check_pm_kisan_status() method.

    Args:
        request: PMKisanRequest with validated 12-digit Aadhaar.

    Returns:
        PMKisanResponse with structured status data.
    """
    logger.info("🌾 PM-KISAN direct endpoint called")

    try:
        result = await ghost_browser.check_pm_kisan_status(
            request.aadhaar_number
        )
        return PMKisanResponse(**result)
    except Exception as e:
        error_msg = sanitize_log(str(e))
        logger.error("❌ PM-KISAN endpoint error: %s", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


# ---- GENERIC SCRAPE ENDPOINT ----------------------------------------------

@app.post(
    "/api/v1/scrape",
    response_model=ScrapeResponse,
    tags=["scraping"],
)
async def scrape_page(request: ScrapeRequest):
    """
    Generic web scraping endpoint with self-healing.

    This is a lower-level endpoint that accepts any URL and optional
    interaction parameters. It's useful for:
      - Scraping government sites not yet mapped to an intent
      - Testing the GhostBrowser against new websites
      - One-off data extraction tasks

    Flow:
      1. Navigate to URL (with anti-detection stealth)
      2. Human-like scroll (if enabled)
      3. Fill form fields (if provided)
      4. Click target element (DOM → Bedrock vision fallback)
      5. Extract and return sanitised page text

    Args:
        request: ScrapeRequest with URL and interaction config.

    Returns:
        ScrapeResponse with extracted text.
    """
    logger.info("🔍 Scrape request for: %s", request.url)

    try:
        # Step 1: Navigate
        await ghost_browser.navigate(request.url)

        # Step 2: Human scroll
        if request.scroll_before_action:
            await ghost_browser.human_scroll(scrolls=2)

        # Step 3: Fill form fields
        if request.input_data:
            for selector, value in request.input_data.items():
                sanitised_value = sanitize_log(value)
                logger.info("📝 Filling %s with: %s", selector, sanitised_value)
                success = await ghost_browser.type_text(selector, value)
                if not success:
                    logger.warning("⚠️ Could not fill: %s", selector)

        # Step 4: Click target element (self-healing)
        if request.target_element:
            description = request.element_description or request.target_element
            click_ok = await ghost_browser.self_healing_click(
                request.target_element, description
            )
            if not click_ok:
                logger.warning(
                    "⚠️ Could not click: %s", request.target_element
                )
            # Wait for page update after click
            await asyncio.sleep(2)

        # Step 5: Extract page text
        page_text = await ghost_browser.get_page_text()
        page_title = await ghost_browser.page.title()
        sanitised_text = sanitize_log(page_text[:5000])

        return ScrapeResponse(
            success=True,
            url=request.url,
            page_title=page_title,
            extracted_text=sanitised_text,
        )

    except Exception as e:
        error_msg = sanitize_log(str(e))
        logger.error("❌ Scrape failed for %s: %s", request.url, error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


# ---- CAPABILITIES DISCOVERY -----------------------------------------------

@app.get("/api/v1/capabilities", tags=["system"])
async def list_capabilities():
    """
    List all supported government websites and LAM capabilities.

    The frontend calls this on load to dynamically render available
    services. When we add new government site integrations, only this
    list needs updating — the frontend adapts automatically.

    Returns:
        JSON with supported sites, actions, languages, and features.
    """
    return {
        "supported_sites": [
            {
                "name": "PM-KISAN",
                "url": "https://pmkisan.gov.in",
                "actions": ["check_status"],
                "languages": ["hi", "en"],
                "status": "live",
            },
            {
                "name": "NFSA Ration Card",
                "url": "https://nfsa.gov.in",
                "actions": ["check_ration_card"],
                "languages": ["hi", "en"],
                "status": "stub",
            },
            {
                "name": "Passport Seva",
                "url": "https://www.passportindia.gov.in",
                "actions": ["check_passport_status"],
                "languages": ["hi", "en"],
                "status": "stub",
            },
        ],
        "features": {
            "self_healing_vision": True,
            "pii_masking": True,
            "vernacular_support": True,
            "nova_sonic_tts": "stub",
            "nova_sonic_stt": "stub",
        },
    }


# =============================================================================
# SECTION 6: VAPI WEBHOOK ENDPOINT
# =============================================================================
# This endpoint receives tool-call events from Vapi's cloud when the AI
# assistant triggers the check_pm_kisan_status function during a voice call.
#
# Vapi payload format (from docs):
#   {
#     "message": {
#       "type": "tool-calls",
#       "toolCallList": [
#         { "id": "call_abc", "name": "check_pm_kisan_status",
#           "parameters": { "aadhaar_number": "123456789012" } }
#       ]
#     }
#   }
#
# Response format Vapi expects:
#   {
#     "results": [
#       { "name": "...", "toolCallId": "...", "result": "..." }
#     ]
#   }


@app.post("/api/v1/vapi-webhook", tags=["vapi"])
async def vapi_webhook(request: Request):
    """
    🎙️ VAPI TOOL CALL WEBHOOK — Receives tool calls from Vapi AI.

    When the Vapi voice assistant decides to call check_pm_kisan_status,
    Vapi's cloud server sends a POST to this endpoint with the tool call
    payload. We execute the Ghost Browser workflow and return the result
    in Vapi's expected format.

    The privacy guardrails middleware is ACTIVE on this endpoint —
    all PII is redacted before the response leaves our server.
    """
    try:
        body = await request.json()
        logger.info("📞 Vapi webhook received: type=%s", body.get("message", {}).get("type", "unknown"))

        message = body.get("message", {})
        msg_type = message.get("type", "")

        # ── Handle tool-calls events ────────────────────────────
        if msg_type == "tool-calls":
            tool_call_list = message.get("toolCallList", [])
            results = []

            for tool_call in tool_call_list:
                tool_name = tool_call.get("name", "")
                tool_call_id = tool_call.get("id", "")
                parameters = tool_call.get("parameters", {})

                logger.info(
                    "🔧 Tool call: name=%s, id=%s",
                    tool_name,
                    tool_call_id,
                )

                if tool_name == "check_pm_kisan_status":
                    aadhaar = parameters.get("aadhaar_number", "")

                    # Validate Aadhaar format
                    if not aadhaar or not aadhaar.isdigit() or len(aadhaar) != 12:
                        results.append({
                            "name": tool_name,
                            "toolCallId": tool_call_id,
                            "result": json.dumps({
                                "status": "error",
                                "message": "Invalid Aadhaar number. Must be 12 digits.",
                            }),
                        })
                        continue

                    # Execute the Ghost Browser PM-KISAN workflow
                    logger.info("🏁 Launching PM-KISAN workflow via Vapi tool call...")
                    try:
                        browser_result = await ghost_browser.check_pm_kisan_status(aadhaar)

                        # Sanitise the result before sending back to Vapi
                        sanitised_result = {
                            "status": sanitize_log(browser_result.get("status_text", "")),
                            "farmer_name": sanitize_log(browser_result.get("farmer_name", "")),
                            "success": browser_result.get("success", False),
                            "installments": browser_result.get("installments", []),
                        }

                        results.append({
                            "name": tool_name,
                            "toolCallId": tool_call_id,
                            "result": json.dumps(sanitised_result, ensure_ascii=False),
                        })

                    except Exception as e:
                        error_msg = sanitize_log(str(e))
                        logger.error("❌ Ghost Browser failed: %s", error_msg)
                        results.append({
                            "name": tool_name,
                            "toolCallId": tool_call_id,
                            "result": json.dumps({
                                "status": "error",
                                "message": f"Browser automation failed: {error_msg}",
                            }),
                        })
                else:
                    # Unknown tool — return an error result
                    results.append({
                        "name": tool_name,
                        "toolCallId": tool_call_id,
                        "result": json.dumps({
                            "status": "error",
                            "message": f"Unknown tool: {tool_name}",
                        }),
                    })

            return JSONResponse(content={"results": results})

        # ── Handle other Vapi events (status updates, etc.) ─────
        # Vapi may send assistant-request, status-update, end-of-call-report,
        # etc. We acknowledge them with 200 OK.
        logger.info("📋 Vapi event (non-tool): %s", msg_type)
        return JSONResponse(content={"status": "ok"})

    except Exception as e:
        error_msg = sanitize_log(str(e))
        logger.error("❌ Vapi webhook error: %s", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


# =============================================================================
# SECTION 7: ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    """
    Direct execution: python main.py

    Starts uvicorn with auto-reload enabled for development.
    In production (Docker/Fargate), the Dockerfile CMD runs uvicorn directly.
    """
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,         # Auto-reload on code changes
        log_level="info",
    )
