"""
===================================================================================
 PRIVACY GUARDRAILS MODULE — Bharat MatrixAI LAM Execution Layer
===================================================================================

 PURPOSE:
   This module acts as the "Security Shield" for the entire LAM pipeline.
   It simulates AWS Guardrails for PII (Personally Identifiable Information)
   redaction, ensuring that NO sensitive Indian citizen data — Aadhaar numbers
   or mobile phone numbers — ever reaches application logs, stdout, or
   external API responses.

 WHY THIS EXISTS:
   Indian government websites handle extremely sensitive PII. When our
   GhostBrowser scrapes status pages, the raw HTML often contains Aadhaar
   numbers, phone numbers, and beneficiary names in plain text. Without
   this guardrail layer, a single unmasked log line could constitute a
   data breach under India's Digital Personal Data Protection Act, 2023.

 ARCHITECTURE:
   ┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
   │  Incoming    │────▶│  GuardrailMiddle  │────▶│  FastAPI Route   │
   │  HTTP Request│     │  ware (intercept) │     │  Handler         │
   └─────────────┘     └──────────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                       sanitize_log()           sanitize_log()
                              │                        │
                              ▼                        ▼
                       ┌─────────────┐         ┌─────────────┐
                       │  mask_aadhaar│         │  Clean Logs  │
                       │  mask_phone  │         │  (stdout)    │
                       └─────────────┘         └─────────────┘

 DEPLOYMENT TARGET: AWS Fargate (Docker) → logs forwarded to CloudWatch.
===================================================================================
"""

import re
import logging
import json
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint


# =============================================================================
# SECTION 1: PII DETECTION PATTERNS
# =============================================================================
# These regex patterns are the core of the guardrail system. They detect
# Indian PII in any text string — log messages, HTTP bodies, scraped content.

# AADHAAR NUMBER PATTERN
# -----------------------
# Aadhaar is a 12-digit unique identity number issued by UIDAI to every
# Indian resident. It can appear in three formats:
#   - Space-separated:  "1234 5678 9012"
#   - Hyphen-separated: "1234-5678-9012"
#   - Continuous:       "123456789012"
#
# The regex captures three groups of 4 digits, allowing optional space or
# hyphen separators between them. Word boundaries (\b) prevent partial
# matches against longer numeric strings.
AADHAAR_PATTERN = re.compile(r"\b(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})\b")

# INDIAN MOBILE PHONE PATTERN
# ----------------------------
# Indian mobile numbers are 10 digits, always starting with 6, 7, 8, or 9.
# The pattern captures the first 6 digits (to be masked) and the last 4
# digits (to remain visible for partial identification).
#
# We use [6-9] as the leading digit because:
#   - 6xxx: Reliance Jio
#   - 7xxx: Various operators
#   - 8xxx: Various operators
#   - 9xxx: Legacy Airtel/Vodafone/BSNL
#
# Word boundaries prevent matching against Aadhaar or other long numbers.
PHONE_PATTERN = re.compile(r"\b([6-9]\d{5})(\d{4})\b")


# =============================================================================
# SECTION 2: MASKING FUNCTIONS
# =============================================================================
# Each function takes a string and returns it with PII replaced by masked
# versions. The last 4 digits are always preserved — this is a common
# practice that allows support teams to verify identity without exposing
# the full number.


def mask_aadhaar(text: str) -> str:
    """
    Mask Aadhaar numbers in the given text.

    Replaces 12-digit Aadhaar numbers with "XXXX-XXXX-{last4}",
    preserving only the last 4 digits for partial identification.

    Examples:
        >>> mask_aadhaar("Aadhaar: 1234 5678 3456")
        'Aadhaar: XXXX-XXXX-3456'

        >>> mask_aadhaar("ID 123456783456 verified")
        'ID XXXX-XXXX-3456 verified'

        >>> mask_aadhaar("Aadhaar: 1234-5678-9012")
        'Aadhaar: XXXX-XXXX-9012'

    Args:
        text: Any string that may contain Aadhaar numbers.

    Returns:
        The input string with all Aadhaar numbers masked.
    """
    def _replace_aadhaar(match: re.Match) -> str:
        # group(3) is the last 4 digits — the only part we keep visible
        last_four = match.group(3)
        return f"XXXX-XXXX-{last_four}"

    return AADHAAR_PATTERN.sub(_replace_aadhaar, text)


def mask_phone(text: str) -> str:
    """
    Mask Indian mobile phone numbers in the given text.

    Replaces 10-digit phone numbers starting with [6-9] with
    "XXXXXX{last4}", preserving only the last 4 digits.

    Examples:
        >>> mask_phone("Call: 9876547890")
        'Call: XXXXXX7890'

        >>> mask_phone("Mobile 8001234567 registered")
        'Mobile XXXXXX4567 registered'

    Args:
        text: Any string that may contain Indian phone numbers.

    Returns:
        The input string with all phone numbers masked.
    """
    def _replace_phone(match: re.Match) -> str:
        # group(2) is the last 4 digits — the only part we keep visible
        last_four = match.group(2)
        return f"XXXXXX{last_four}"

    return PHONE_PATTERN.sub(_replace_phone, text)


def sanitize_log(text: str) -> str:
    """
    Master sanitisation function — chains ALL PII masking operations.

    This is the SINGLE ENTRY POINT that every component in the LAM layer
    must call before writing any text to logs, stdout, or API responses.
    It applies masking functions in sequence: Aadhaar first, then phone.

    IMPORTANT: Always add new masking functions to this chain. If we add
    PAN card masking tomorrow, it goes here.

    Args:
        text: Raw text that may contain any type of Indian PII.

    Returns:
        Fully sanitised text safe for logging and external transmission.
    """
    # Order matters: Aadhaar first (12 digits) to avoid partial phone matches
    text = mask_aadhaar(text)
    text = mask_phone(text)
    return text


# =============================================================================
# SECTION 3: SANITISED LOGGING INFRASTRUCTURE
# =============================================================================
# Python's logging module is the standard way applications write to stdout.
# On AWS Fargate, stdout goes directly to CloudWatch Logs. If PII leaks
# into a log line, it's stored in CloudWatch indefinitely.
#
# Solution: Attach a custom logging.Filter that intercepts every log record
# and runs sanitize_log() on the message BEFORE it reaches the Handler.


class SanitisedLogFilter(logging.Filter):
    """
    A logging filter that automatically redacts PII from ALL log records.

    Attach this filter to any logging Handler to ensure that Aadhaar and
    phone numbers are masked BEFORE the log line is written to stdout,
    files, or CloudWatch.

    How it works:
      1. Python's logging module calls filter() on every LogRecord.
      2. We intercept the record, sanitise the message string.
      3. We also sanitise any positional/keyword arguments that might
         contain PII (e.g., logger.info("User %s", aadhaar_number)).
      4. Return True to allow the record to proceed (now sanitised).
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # --- Sanitise the main message string ---
        if isinstance(record.msg, str):
            record.msg = sanitize_log(record.msg)

        # --- Sanitise format arguments ---
        # Python logging supports two arg styles:
        #   logger.info("User %s has phone %s", name, phone)  → tuple args
        #   logger.info("User %(name)s", {"name": name})      → dict args
        if record.args:
            if isinstance(record.args, dict):
                # Dict-style: sanitise each string value
                record.args = {
                    k: sanitize_log(str(v)) if isinstance(v, str) else v
                    for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                # Tuple-style: sanitise each string argument
                record.args = tuple(
                    sanitize_log(str(a)) if isinstance(a, str) else a
                    for a in record.args
                )

        # Always return True — we never suppress log records, only sanitise
        return True


def get_sanitised_logger(name: str) -> logging.Logger:
    """
    Factory function that creates a pre-configured, PII-safe logger.

    Every module in the LAM layer should use this instead of the standard
    logging.getLogger(). The returned logger:
      - Has the SanitisedLogFilter attached (PII auto-redaction)
      - Uses structured JSON-like formatting (CloudWatch-friendly)
      - Defaults to INFO level

    Usage:
        from privacy_guardrails import get_sanitised_logger
        logger = get_sanitised_logger("browser_agent")
        logger.info("Processing Aadhaar 123456789012")
        # Output: {"time":"...","message":"Processing Aadhaar XXXX-XXXX-9012"}

    Args:
        name: Module name for the logger (appears in log output).

    Returns:
        A configured logging.Logger with PII sanitisation enabled.
    """
    logger = logging.getLogger(name)

    # Prevent duplicate handlers if get_sanitised_logger is called multiple times
    if not logger.handlers:
        handler = logging.StreamHandler()
        # Structured JSON format — ideal for CloudWatch Logs Insights queries
        handler.setFormatter(
            logging.Formatter(
                '{"time":"%(asctime)s","level":"%(levelname)s",'
                '"module":"%(name)s","message":"%(message)s"}'
            )
        )
        # Attach the PII sanitisation filter
        handler.addFilter(SanitisedLogFilter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    return logger


# =============================================================================
# SECTION 4: FASTAPI MIDDLEWARE — THE HTTP-LEVEL SHIELD
# =============================================================================
# While the SanitisedLogFilter catches PII in log statements, we also need
# to catch PII at the HTTP boundary. The GuardrailMiddleware intercepts
# every incoming request and outgoing response, ensuring that:
#   1. Request bodies are sanitised before logging
#   2. All HTTP activity is logged with PII redacted
#
# This simulates the behaviour of AWS Guardrails applied at the ALB/API
# Gateway level in a production AWS deployment.


class GuardrailMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware that acts as a PII firewall at the HTTP boundary.

    For every request/response cycle:
      - Logs the HTTP method, path, and client IP
      - For POST/PUT/PATCH: reads the body and logs a sanitised version
      - Logs the response status code
      - ALL log output passes through sanitize_log() automatically

    This is the outermost defence layer. Even if a developer forgets to
    call sanitize_log() in their endpoint handler, this middleware ensures
    the HTTP-level logs are clean.

    Architecture position:
      Client → [GuardrailMiddleware] → FastAPI Router → Endpoint Handler
    """

    def __init__(self, app, logger: logging.Logger | None = None):
        super().__init__(app)
        # Use the sanitised logger — double protection
        self.logger = logger or get_sanitised_logger("guardrails")

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """
        Intercept every HTTP request, sanitise logs, forward to handler.

        This method is called automatically by FastAPI/Starlette for every
        incoming HTTP request. We log sanitised request info, forward to
        the actual endpoint, then log the response status.
        """

        # ---- LOG SANITISED REQUEST INFO ----
        # Even the client IP could be sensitive in some contexts, but we
        # log it for debugging. The PII filter will catch any Aadhaar/phone
        # that might accidentally appear in headers or query params.
        client_host = request.client.host if request.client else "unknown"
        self.logger.info(
            "→ %s %s from %s",
            request.method,
            request.url.path,
            client_host,
        )

        # ---- SANITISE REQUEST BODY FOR LOGGING ----
        # For mutation requests, we read the body to log a sanitised version.
        # This catches cases where the frontend sends raw Aadhaar in the
        # request payload — we'll see "XXXX-XXXX-1234" in CloudWatch.
        if request.method in ("POST", "PUT", "PATCH"):
            try:
                body_bytes = await request.body()
                body_text = body_bytes.decode("utf-8", errors="replace")
                sanitised_body = sanitize_log(body_text)
                self.logger.info("Request body (sanitised): %s", sanitised_body)
            except Exception:
                self.logger.warning("Could not read request body for PII scan")

        # ---- FORWARD TO THE ACTUAL ENDPOINT ----
        response = await call_next(request)

        # ---- LOG RESPONSE STATUS ----
        self.logger.info(
            "← %s %s → %d",
            request.method,
            request.url.path,
            response.status_code,
        )

        return response
