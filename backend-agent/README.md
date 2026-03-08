# 🇮🇳 Bharat MatrixAI — LAM Execution Layer

**Large Action Model backend** for navigating Indian government websites using headless Playwright with AI-powered visual self-healing.

## Architecture

```
User Voice/Text ──▶ Vernacular Pipeline (Amazon Nova stubs)
                         │
                         ▼
                    FastAPI Orchestrator (main.py)
                    ┌────┴────┐
                    ▼         ▼
             Ghost Browser   Privacy Guardrails
          (Playwright Headless)  (PII Masking)
             ┌────┴────┐
             ▼         ▼
        DOM Click   Bedrock Vision
        (Phase 1)   Fallback (Phase 2)
             │
             ▼
        Gov Website
      (pmkisan.gov.in)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.12 |
| Browser | Playwright (Headless Chromium) |
| AI/Vision | Amazon Bedrock (Claude 3.5 Sonnet) |
| API | FastAPI + Uvicorn |
| Privacy | AWS Guardrails simulation (regex PII masking) |
| Deploy | Docker → AWS Fargate |

## Project Structure

```
backend-agent/
├── main.py                  # FastAPI orchestrator
├── browser_agent.py         # Playwright ghost browser + Bedrock vision
├── privacy_guardrails.py    # PII masking middleware
├── vernacular_pipeline.py   # Vernacular intent stubs
├── requirements.txt         # Python dependencies
├── Dockerfile               # Fargate-optimised multi-stage build
├── .dockerignore
└── README.md
```

## Local Development Setup

### Prerequisites

- Python 3.12+
- Docker (for containerised testing)
- AWS credentials configured (`aws configure` or env vars)

### 1. Create Virtual Environment

```bash
cd backend-agent
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
playwright install chromium
```

### 3. Set Environment Variables

```bash
# Required for Bedrock integration
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret

# Or on Windows PowerShell:
$env:AWS_REGION = "us-east-1"
$env:AWS_ACCESS_KEY_ID = "your_key"
$env:AWS_SECRET_ACCESS_KEY = "your_secret"
```

### 4. Run the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will be live at: **http://localhost:8000**

## API Reference

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check for Fargate ALB |
| `GET` | `/api/v1/capabilities` | List supported gov sites |
| `GET` | `/docs` | Swagger UI (auto-generated) |

### Scraping

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/scrape` | Direct browser scraping with self-healing |

**Example request:**
```json
{
  "url": "https://pmkisan.gov.in",
  "target_element": "#btn_check_status",
  "element_description": "Check Status button",
  "scroll_before_action": true
}
```

### Vernacular Pipeline

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/intent` | Parse user transcript → intent |
| `POST` | `/api/v1/execute` | Execute intent via browser |
| `GET` | `/api/v1/status/{task_id}` | Poll async task status |

**Example intent request:**
```json
{
  "transcript": "मेरा PM Kisan का status check karo",
  "language": "hi"
}
```

## Docker Build & Run

```bash
# Build the image
docker build -t bharat-matrix-lam .

# Run the container
docker run -p 8000:8000 \
  -e AWS_REGION=us-east-1 \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  bharat-matrix-lam

# Verify health
curl http://localhost:8000/health
```

## AWS Fargate Deployment Notes

1. **Push to ECR:**
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker tag bharat-matrix-lam:latest <account>.dkr.ecr.<region>.amazonaws.com/bharat-matrix-lam:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/bharat-matrix-lam:latest
   ```

2. **Task Definition:** Use 2 vCPU / 4GB memory (Chromium needs headroom).

3. **IAM Task Role:** Attach a role with `bedrock:InvokeModel` permissions — no hardcoded secrets.

4. **ALB Target Group:** Health check path = `/health`, interval = 30s.

## Security

- All Aadhaar numbers are masked to `XXXX-XXXX-{last4}` before logging.
- All phone numbers are masked to `XXXXXX{last4}` before logging.
- PII sanitisation is applied at the middleware level (all requests/responses).
- Container runs Chromium in sandboxed headless mode.
- No credentials are baked into the Docker image.

## License

Proprietary — Bharat MatrixAI
