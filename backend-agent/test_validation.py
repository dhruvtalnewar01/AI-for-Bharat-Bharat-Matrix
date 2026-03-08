"""
Final validation suite for the hackathon-ready LAM Execution Layer.
Tests imports, PII masking, endpoint registration, and Nova 2 stubs.
"""

print("=" * 60)
print("  BHARAT MATRIXAI — LAM EXECUTION LAYER VALIDATION")
print("=" * 60)

# ---- 1. PII Masking Tests ----
print("\n[1/5] PII Masking Tests")
from privacy_guardrails import mask_aadhaar, mask_phone, sanitize_log

# Aadhaar with spaces
assert "XXXX-XXXX-3456" in mask_aadhaar("Aadhaar: 1234 5678 3456")
print("  ✓ Aadhaar (spaces): 1234 5678 3456 → XXXX-XXXX-3456")

# Aadhaar with dashes
assert "XXXX-XXXX-9012" in mask_aadhaar("ID: 1234-5678-9012")
print("  ✓ Aadhaar (dashes): 1234-5678-9012 → XXXX-XXXX-9012")

# Aadhaar continuous
assert "XXXX-XXXX-3456" in mask_aadhaar("123456783456")
print("  ✓ Aadhaar (continuous): 123456783456 → XXXX-XXXX-3456")

# Phone
assert "XXXXXX7890" in mask_phone("Call 9876547890")
print("  ✓ Phone: 9876547890 → XXXXXX7890")

# Combined
combined = sanitize_log("Aadhaar 1234 5678 9012 phone 8001234567")
assert "XXXX-XXXX" in combined and "XXXXXX" in combined
print("  ✓ Combined sanitize_log: PII masked correctly")

# ---- 2. Module Imports ----
print("\n[2/5] Module Imports")
from main import app
from browser_agent import GhostBrowser
from vernacular_pipeline import router
print(f"  ✓ FastAPI app: {app.title}")
print(f"  ✓ GhostBrowser: {GhostBrowser.__name__}")
print(f"  ✓ Vernacular router: {len(router.routes)} routes")

# ---- 3. GhostBrowser Methods ----
print("\n[3/5] GhostBrowser Methods")
browser = GhostBrowser()
methods = [
    "launch", "close", "navigate", "human_scroll",
    "click_element", "click_by_coordinates", "type_text",
    "get_page_text", "take_screenshot", "ask_bedrock_for_element",
    "self_healing_click", "self_healing_type",
    "check_pm_kisan_status", "_extract_status_from_text",
]
for m in methods:
    assert hasattr(browser, m), f"Missing: {m}"
    print(f"  ✓ {m}()")

# ---- 4. FastAPI Endpoints ----
print("\n[4/5] FastAPI Endpoints")
route_paths = [r.path for r in app.routes]
expected_routes = [
    "/health",
    "/api/v1/execute",
    "/api/v1/pm-kisan/status",
    "/api/v1/scrape",
    "/api/v1/capabilities",
    "/api/v1/intent",
    "/api/v1/status/{task_id}",
    "/api/v1/nova-webhook",
]
for route in expected_routes:
    assert route in route_paths, f"Missing route: {route}"
    print(f"  ✓ {route}")

# ---- 5. Nova 2 Sonic Stubs ----
print("\n[5/5] Nova 2 Sonic Stubs")
from vernacular_pipeline import (
    _nova_sonic_speech_to_text,
    _nova_sonic_text_to_speech,
    _nova_intent_classifier,
)
assert callable(_nova_sonic_speech_to_text)
print("  ✓ _nova_sonic_speech_to_text() — STT stub")
assert callable(_nova_sonic_text_to_speech)
print("  ✓ _nova_sonic_text_to_speech() — TTS stub")
assert callable(_nova_intent_classifier)
print("  ✓ _nova_intent_classifier() — NLU stub")

# ---- 6. Text Extraction Helper ----
print("\n[BONUS] Text Extraction Helper")
test_text = "Beneficiary registered\nInstallment 17 credited\nRandom line\nPayment pending"
extracted = GhostBrowser._extract_status_from_text(test_text)
assert "registered" in extracted.lower()
print(f"  ✓ _extract_status_from_text: extracted {len(extracted.splitlines())} relevant lines")

print("\n" + "=" * 60)
print("  ✅ ALL VALIDATIONS PASSED — CODEBASE IS HACKATHON-READY")
print("=" * 60)
