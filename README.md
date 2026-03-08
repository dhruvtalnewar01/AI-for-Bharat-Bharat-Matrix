<div align="center">
  <br />
  <h1 align="center">B H A R A T   M A T R I X A I</h1>
  <p align="center">
    <strong>The First Agentic Interface for India.</strong>
  </p>
  <p align="center">
    A proprietary Cognitive Visual Engine navigating Indian digital infrastructure autonomously. Built for the citizens. Confidential Framework.
  </p>
  <br />
</div>

<hr />

## ✦ System Architecture

Bharat MatrixAI is a hyper-realistic, high-performance ecosystem divided into three core operational layers. It combines a cinematic WebGL frontend, a React Native voice-first mobile interface, and a heavy-duty Python Execution Layer for vision-based browser automation.

### 1. The Presentation Layer (`frontend-web/`)
A god-level, award-winning cinematic Next.js 16 web experience.
- **Engine:** Next.js (App Router), React, TypeScript
- **Physics & Rendering:** Three.js, React Three Fiber (R3F) for volumetric lighting and holographic canvases
- **Motion & Scrollytelling:** GSAP (`fromTo` engines) with ScrollTrigger for bulletproof layout math, Framer Motion for micro-interactions
- **Aesthetic:** Obsidian black, deep bordeaux glassmorphism, ceramic yellow gradients, and strict `.glass-strong` luxury design systems.

### 2. The Mobility Layer (`frontend-app/`)
A strict, voice-first mobile application focused on minimalist interaction and extreme accessibility.
- **Framework:** React Native (Expo)
- **State Architecture:** Zustand (Strict 4-phase finite state machines: `IDLE`, `LISTENING`, `PROCESSING`, `SPEAKING`)
- **Animation:** `react-native-reanimated` (Fluid ripple dynamics and HUD feedback)
- **Audio Routing:** `@vapi-ai/react-native-sdk`, `expo-av`

### 3. The Execution Layer (`backend-agent/`)
The autonomous brain. A Python-based Large Action Model (LAM) designed to navigate broken or legacy governmental DOMs without relying on APIs.
- **Core Engine:** FastAPI, Playwright (Headless Browser Automation)
- **Cognitive Vision:** Amazon Bedrock Converse API (Vision-based self-healing, visual inference heuristics)
- **Vernacular Pipeline:** AWS Nova 2 (Sonic) for localized intelligence
- **Security:** Military-grade PII mid-stream redaction pipelines (`privacy_guardrails.py`)

<br />

## ✦ Core Capabilities

- **Zero-API Execution:** Proprietary vision layer navigates complex and undocumented state DOMs directly, operating web interfaces exactly as a human would.
- **Sub-second Routing:** Intent capture, transcription, and workflow routing complete in `< 980ms`.
- **Privacy-First Layer:** Military-grade PII redaction mid-stream. Zero unredacted data retention.
- **Self-Healing OCR:** DOM element mapping automatically re-locates via dynamic snapshot analysis if the underlying HTML structurally mutates.

<br />

## ✦ Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.11+)
- AWS Credentials (Bedrock Access)
- VAPI AI Credentials

### Spin Up the Web Canvas
```bash
cd frontend-web
npm install
# VAPI keys are required in .env.local for voice interactions
echo "NEXT_PUBLIC_VAPI_KEY=your_key" > .env.local
echo "NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_id" >> .env.local

npm run dev
```

### Spin Up the Execution Layer
```bash
cd backend-agent
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

uvicorn main:app --port 8000
```

<br />

## ✦ Netlify Deployment (Static Export)

The web presentation layer is architected for edge deployment via static export.

1. Generate the static `out/` directory:
   ```bash
   cd frontend-web
   npm run build
   ```
2. Deploy the generated `out/` folder to Netlify via drag-and-drop or CLI.
3. **CRITICAL:** Ensure `NEXT_PUBLIC_VAPI_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` are injected into Netlify's Environment Variables panel before deploying.

<br />

## ✦ Ethics Directive & License

**Proprietary Software.**
All R&D strictly confidential. Built under the principles of zero data retention, explicit consent boundaries, and sovereign algorithmic alignment. Not licensed for public modification or commercial redistribution without explicit engineering authorization.
