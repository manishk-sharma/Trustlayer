# 🛡️ TrustLayer

> **Next-Generation Real-Time AI Fraud Detection & Financial Trust Protocol for Digital Payments.**

TrustLayer is a modern, bilingual (English & Hindi) financial safety application designed to protect Indian digital payment users from cyber fraud, social engineering, smishing, and UPI-based scams. By leveraging advanced generative AI models and real-time search grounding, TrustLayer helps users verify transactions, inspect suspicious messages, track their financial safety profile, and get immediate voice-assisted support.

---

## 🌟 Key Features

### 1. 💸 Send & Analyze Payments
*   **Real-Time UPI Scan:** Scans recipient name, amount, and transaction notes for flags like urgency, lottery lures, emergency claims, and fake refunds.
*   **Hinglish Voice Warnings:** In high-risk scenarios, users receive a bold audio warning in simple Hindi (Devanagari/Hinglish) to deter immediate payment.
*   **Risk Categorization:** Offers a granular classification (Low, Medium, High Risk) with corresponding risk scores, fraud types, and protective recommendations.

### 2. 🔍 AI Fraud Message Scanner
*   **Smishing & Social Engineering Detection:** Scan suspicious SMS, WhatsApp messages, or emails for compromised link warnings, OTP theft tactics, and bank impersonation.
*   **Red Flags Highlighting:** Dissects messages to list specific flags (e.g., *Bank Impersonation*, *Urgency*, *Unverified Links*) along with a detailed explanation of the threat.

### 3. 🏦 Google Search Grounded Scam Alerts
*   **Live Cybersecurity Feeds:** Fetches live warnings and RBI advisories published in the last 7 days using **Gemini 2.5 Flash with Search Grounding**.
*   **Categorized Threat Database:** Alerts are categorized (UPI, SMS, Job, Banking, Investment) with severity levels and actionable safety tips.

### 4. 🎙️ TrustGuard AI (Bilingual Voice Chatbot)
*   **Interactive Safety Companion:** A floating smart assistant that answers queries on UPI safety, RBI rules, fraud patterns, and scam reporting.
*   **Voice Integration:** Supports voice typing powered by **OpenAI Whisper** (with fallback to browser Web Speech API) and includes **Text-to-Speech (TTS)** voice readouts.
*   **Contextual Suggestions:** Suggests relevant action chips dynamically (e.g., *"How to block?"*, *"UPI safety tips"*) based on chat history.

### 5. 📊 Trust Score & Dashboard
*   **Transaction Analytics:** Interactive graphs powered by **Recharts** displaying risk distributions and transaction volume timelines.
*   **Micro-Lending Eligibility:** Evaluates transaction safety to calculate real-time credit line eligibility (Premium, Standard, Trial, or Not Eligible).

---

## 🛠️ Tech Stack

*   **Frontend Core:** [React 19](https://react.dev/) & [Vite](https://vite.dev/)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & [React Icons](https://react-icons.github.io/react-icons/)
*   **Data Visualization:** [Recharts](https://recharts.org/)
*   **Language Context:** Custom bilingual context provider (`en` / `hi`)
*   **AI Engine:** Google Gemini 2.5 Flash & Gemini 2.5 Flash Online (via [OpenRouter API](https://openrouter.ai/))
*   **Speech Services:** OpenAI Whisper API (Voice-to-Text) & Web Speech API (fallback STT + native TTS)

---

## 📂 Project Structure

```text
Trustlayer/
├── public/                  # Static assets (Favicons, SVG icons)
├── src/
│   ├── api/
│   │   └── api.js           # API logic for OpenRouter (Gemini) & local simulations
│   ├── components/
│   │   ├── ui/
│   │   │   └── RiskComponents.jsx # Modular risk banners & indicators
│   │   ├── FraudScanner.jsx       # SMS & message analysis component
│   │   ├── ScamAlerts.jsx         # Live search-grounded cyber alerts
│   │   ├── SendPayment.jsx        # Payment forms, risk evaluations, and warnings
│   │   ├── TransactionHistory.jsx # Searchable list of past transactions
│   │   ├── TrustDashboard.jsx     # Recharts visual logs & micro-credit checks
│   │   └── VoiceChatbot.jsx       # Floating TrustGuard AI conversational assistant
│   ├── context/
│   │   └── LanguageContext.jsx    # Bilingual (EN/HI) translation dictionary & provider
│   ├── data/
│   │   └── seedTransactions.js    # Seed transactions for initial dashboard state
│   ├── hooks/
│   │   └── useSpeechRecognition.js # Audio capture & Whisper/Browser speech hook
│   ├── index.css            # Tailwind directives & theme configuration
│   ├── main.jsx             # React mount entry point
│   └── App.jsx              # Main App layout, Sidebar, Topbar & Settings Modal
├── eslint.config.js         # Linter configuration
├── index.html               # Main HTML template
├── package.json             # Build dependencies & scripts
├── vite.config.js           # Vite bundle configuration
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Run Locally
Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 4. Build for Production
Create an optimized production build:
```bash
npm run build
```
Preview the built app locally:
```bash
npm run preview
```

---

## ⚙️ Configuration & API Settings

TrustLayer runs in two modes, configurable directly in the app's **Settings (⚙️)** panel:

1.  **AI Mode (Recommended):**
    *   **OpenRouter API Key:** Enter your OpenRouter key to enable active risk scans, chatbot logic, and real-time grounding via `google/gemini-2.5-flash`.
    *   **OpenAI API Key (Optional):** Enter your OpenAI API key to enable high-accuracy Whisper Speech-to-Text. If left blank, the app gracefully falls back to the native browser Web Speech API.
2.  **Demo / Mock Mode:**
    *   Toggling **Demo Mode** allows testing all interfaces (Payment Analysis, Message Scan, Scam Alerts, Chatbot responses) using high-fidelity local simulator functions. No API keys are required in this mode.
