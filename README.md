<div align="center">
  <img src=".github/assets/hero_banner.png" alt="Bharat MatrixAI Banner" width="100%" />
</div>

<br />

<div align="center">

# ✦ B H A R A T &nbsp;&nbsp; M A T R I X A I ✦
**The First Agentic Interface for India.**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](#)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](#)
[![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=white)](#)
[![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)](#)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](#)

A proprietary, high-performance Cognitive Visual Engine navigating Indian digital infrastructure autonomously. Built for the citizens. Confidential Framework.

</div>

<br />

## ✦ The Architecture Matrix

Bharat MatrixAI is a hyper-realistic, high-performance ecosystem divided into three core operational layers. It possesses a cinematic WebGL frontend, a React Native voice-first mobile interface, and a heavy-duty Python Execution Layer for vision-based browser automation.

<div align="center">
  <img src=".github/assets/arch_visual.png" alt="Architecture Core" width="100%" />
</div>

### System Flow
```mermaid
graph TD
    classDef client fill:#4A002A,stroke:#D4AF37,stroke-width:2px,color:#FFFFFF,font-family:monospace;
    classDef engine fill:#050505,stroke:#FFFFFF,stroke-width:1px,color:#D4AF37,font-family:monospace;
    classDef target fill:#1a1a1a,stroke:#333333,stroke-width:1px,color:#a0a0a0,stroke-dasharray: 5 5;

    subgraph "The Presentation Layer"
        W[Web Canvas: Next.js + Three.js]:::client
        M[Mobility Layer: React Native App]:::client
    end

    subgraph "The Execution Engine"
        API[FastAPI Router]:::engine
        V[VAPI AI Audio Stream]:::engine
        LLM[Amazon Bedrock / AWS Nova]:::engine
        LAM[Playwright Vision Automator]:::engine
        PII[Privacy Redaction Middleware]:::engine
    end

    subgraph "External Nodes"
        GOV[Legacy Governmental DOMs]:::target
    end

    W -->|User Intent| API
    M <-->|Voice Stream| V
    V -->|Transcribed Intent| API
    API -->|Sanitize| PII
    PII <-->|Cognitive Analysis| LLM
    API -->|Execute Action| LAM
    LAM <-->|Zero-API Interaction| GOV
```

<br />

## ✦ Layer Diagnostics

<table width="100%">
  <tr>
    <td width="33%" valign="top">
      <h3>I. The Web Canvas</h3>
      <p>A god-level, award-winning cinematic Next.js 16 web experience.</p>
      <ul>
        <li><b>Engine:</b> Next.js, React, TypeScript</li>
        <li><b>Physics:</b> Three.js, React Three Fiber for volumetric lighting</li>
        <li><b>Motion:</b> GSAP <code>fromTo</code> engines, Framer Motion</li>
        <li><b>Aesthetic:</b> Obsidian black, bordeaux glassmorphism, ceramic yellow gradients</li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <h3>II. The Mobility Layer</h3>
      <p>A voice-first mobile application focused on extreme accessibility.</p>
      <ul>
        <li><b>Framework:</b> React Native (Expo)</li>
        <li><b>State:</b> Zustand (IDLE, LISTENING, PROCESSING)</li>
        <li><b>Animation:</b> <code>react-native-reanimated</code></li>
        <li><b>Audio:</b> VAPI AI SDK, Expo AV</li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <h3>III. The Execution Engine</h3>
      <p>A Python LAM designed to navigate legacy DOMs without APIs.</p>
      <ul>
        <li><b>Core:</b> FastAPI, Playwright Headless</li>
        <li><b>Cognitive Vision:</b> Amazon Bedrock Converse API</li>
        <li><b>Vernacular Pipeline:</b> AWS Nova 2 (Sonic)</li>
        <li><b>Security:</b> Military-grade PII mid-stream redaction</li>
      </ul>
    </td>
  </tr>
</table>

<br />

## ✦ Core Capabilities

- ⚡ **Zero-API Execution:** Proprietary vision layer navigates complex and undocumented state DOMs directly, operating web interfaces exactly as a human would.
- ⏱️ **Sub-second Routing:** Intent capture, transcription, and workflow routing complete in `< 980ms`.
- 🛡️ **Privacy-First Layer:** Military-grade PII redaction mid-stream. Zero unredacted data retention.
- 👁️ **Self-Healing OCR:** DOM element mapping automatically re-locates via dynamic snapshot analysis if the underlying HTML structurally mutates.

<br />

## ✦ Initialization Protocols

### 1. Spin Up the Web Canvas
```bash
cd frontend-web
npm install

# Inject VAPI credentials
echo "NEXT_PUBLIC_VAPI_KEY=your_key" > .env.local
echo "NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_id" >> .env.local

npm run dev
```

### 2. Spin Up the Execution Engine
```bash
cd backend-agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

uvicorn main:app --port 8000
```

<br />

## ✦ Netlify Edge Deployment

The web presentation layer is architected for edge deployment via strict static export.

1. Generate the static cache:
   ```bash
   cd frontend-web
   npm run build
   ```
2. Deploy the generated `out/` folder to Netlify via drag-and-drop or CLI.
3. **CRITICAL:** Ensure `NEXT_PUBLIC_VAPI_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` are configured in the Netlify UI before deployment.

<br />

---

> **Ethics Directive & License**
> Proprietary Software. All R&D strictly confidential. Built under the principles of zero data retention, explicit consent boundaries, and sovereign algorithmic alignment. Not licensed for public modification or commercial redistribution without explicit engineering authorization.
