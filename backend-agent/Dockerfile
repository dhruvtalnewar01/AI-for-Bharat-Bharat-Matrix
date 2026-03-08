# =============================================================================
# Bharat MatrixAI — LAM Execution Layer
# Optimised for AWS Fargate with Headless Chromium
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder — install Python deps & Playwright + Chromium
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /build

# Install system dependencies needed for Playwright installation
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/build/deps -r requirements.txt

# Install Playwright and download only Chromium
RUN pip install --no-cache-dir playwright \
    && playwright install chromium

# ---------------------------------------------------------------------------
# Stage 2: Runtime — minimal image with only what's needed
# ---------------------------------------------------------------------------
FROM python:3.12-slim

# Labels for container registry
LABEL maintainer="Bharat MatrixAI Team"
LABEL description="LAM Execution Layer — Agentic browser automation for Indian gov websites"
LABEL version="0.1.0"

WORKDIR /app

# Install Chromium runtime dependencies (required by Playwright)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxshmfence1 \
    fonts-noto \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy installed Python packages from builder
COPY --from=builder /build/deps /usr/local/lib/python3.12/site-packages/

# Copy Playwright browsers from builder
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

# Copy application code
COPY main.py .
COPY browser_agent.py .
COPY privacy_guardrails.py .
COPY vernacular_pipeline.py .

# Create non-root user for security
RUN groupadd -r lamuser && useradd -r -g lamuser -d /app -s /sbin/nologin lamuser

# Playwright needs access to the browser cache
# In Fargate, we run as root for browser compatibility but isolate via task roles
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose the API port
EXPOSE 8000

# Health check for Fargate
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
