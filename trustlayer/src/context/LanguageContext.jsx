import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// Full translation dictionary — en + hi
// ─────────────────────────────────────────────────────────────
const translations = {
  en: {
    // App header
    appName: "TrustLayer",
    appSubtitle: "AI Fraud Detection",

    // Tab labels (full + short for mobile)
    tabSend: "Send Payment",
    tabSendShort: "Send",
    tabSendDesc: "Send & analyze",
    tabScan: "Fraud Scanner",
    tabScanShort: "Scan",
    tabScanDesc: "Scan messages",
    tabAlerts: "Scam Alerts",
    tabAlertsShort: "Alerts",
    tabAlertsDesc: "Live scam alerts",
    tabHistory: "History",
    tabHistoryShort: "History",
    tabHistoryDesc: "Past transactions",
    tabTrust: "Trust Score",
    tabTrustShort: "Trust",
    tabTrustDesc: "Your profile",

    // Sidebar footer
    aiActive: "AI Active",
    demoActive: "Demo Active",
    noKey: "No Key",

    // Send Payment
    sendTitle: "Send Payment",
    sendSubtitle: "AI analyzes every transaction for fraud signals",
    recipientLabel: "Recipient",
    recipientPlaceholder: "Enter name or UPI ID",
    amountLabel: "Amount (₹)",
    noteLabel: "Payment Note / UPI Description",
    notePlaceholder: "What's this payment for?",
    noteListening: "🎤 Listening... speak now...",
    noteAiHint: "This note will be analyzed by AI for fraud patterns",
    sendButton: "Send & Analyze",
    analyzing: "Analyzing...",

    // Risk result card
    riskLow: "LOW RISK",
    riskMedium: "MEDIUM RISK",
    riskHigh: "HIGH RISK",
    riskScoreLabel: "Risk Score",
    fraudTypeLabel: "Fraud Type",
    hinglishWarningLabel: "Voice Warning",
    redFlagsLabel: "Red Flags Detected",
    proceedButton: "Proceed Anyway",
    proceedSafe: "Proceed",
    cancelButton: "Cancel Payment",
    analysisFailed: "Analysis Failed",
    tryAgain: "Try Again",
    analyzingWithAI: "Analyzing with AI...",
    aiEvaluating: "Gemini is evaluating risk patterns",
    resultPlaceholder: "AI analysis results will appear here",
    resultPlaceholderHint: "Fill out the form and click \"Send & Analyze\"",

    // Fraud Scanner
    scanTitle: "AI Fraud Scanner",
    scanSubtitle: "Paste any suspicious SMS, WhatsApp, or email message",
    scanCardTitle: "Message Analysis",
    scanCardSubtitle: "Powered by Gemini AI",
    scanPlaceholder: "Paste suspicious message here...\n\nExample: 'Dear customer, your account has been compromised. Click here to verify your identity immediately or your account will be locked...'",
    scanListening: "🎤 Listening... speak now...",
    scanButton: "Scan for Fraud",
    scanClear: "Clear",
    scanResultPlaceholder: "Scan results will appear here",
    scanResultHint: "Paste a message and click \"Scan for Fraud\"",
    tryExamples: "Try these examples",
    exPrize: "Prize Scam",
    exOtp: "OTP Fraud",
    exSafe: "Safe Message",

    // History
    historyTitle: "Transaction History",
    historyCount: (n) => `${n} transaction${n !== 1 ? "s" : ""} this session`,
    historyEmpty: "No transactions yet",
    historyNoMatch: "No matches found",
    historyNoMatchHint: (q) => `We couldn't find any transaction matching "${q}"`,
    historyClearSearch: "Clear Search",
    historySearch: "Search",
    historySearchPlaceholder: "Search recipient, note, risk level...",
    historyRecent: "Recent:",
    historyClearAll: "Clear all",
    historyLow: "Low",
    historyMed: "Medium",
    historyHigh: "High",
    historyRiskScore: "Risk Score",
    historyFraudType: "Fraud Type",
    historyAiAnalysis: "AI Analysis",

    // Trust Dashboard
    trustTitle: "Trust Dashboard",
    trustSubtitle: "Your financial trust profile",
    trustAtRisk: "At Risk",
    trustBuilding: "Building Trust",
    trustTrusted: "Trusted",
    trustVerified: "Verified",
    lendingTitle: "Micro-Lending Eligibility",
    lendingPremiumLabel: "Premium Credit Line",
    lendingPremiumDesc: "Excellent trust profile — premium benefits unlocked",
    lendingStandardLabel: "Standard Credit Line",
    lendingStandardDesc: "Good trust score — standard credit available",
    lendingTrialLabel: "Trial Limit",
    lendingTrialDesc: "Building trust — limited credit available",
    lendingNotLabel: "Not Eligible",
    lendingNotDesc: "Too many high-risk signals detected",
    riskDistribution: "Risk Distribution",
    recentRiskActivity: "Recent Risk Activity",
    lowRisk: "Low Risk",
    mediumRisk: "Medium Risk",
    highRisk: "High Risk",

    // Alerts
    alertsTitle: "Scam Alerts",
    alertsSubtitle: "Real-time warnings & cyber advisories grounded via Google Search",
    alertsGrounding: "Grounding: Google Search Active",
    alertsLastUpdated: "Last Updated",
    alertsSeverity: "Severity",
    alertsProtectionTip: "Protection Tip:",
    alertsNoAlerts: "No Alerts Loaded",
    alertsNoAlertsHint: "Click fetch or refresh to load live scam alerts.",
    alertsNoKey: "Please add your Gemini API key in settings to fetch alerts.",
    alertsFetch: "Fetch Alerts",

    // Chatbot
    chatName: "TrustGuard AI",
    chatSubtitle: "Your fraud safety assistant",
    chatPlaceholder: "Poochiye... Type your question...",
    chatListening: "🎤 Listening... speak now...",
    chatWelcome: "Hello! 👋 I am TrustGuard AI. Ask me anything about suspicious payments, SMS scams, or safe UPI practices. Type or tap the mic!",
    chatClear: "Clear Chat",
    chatChips: [
      "🔍 Check a suspicious SMS",
      "💸 Is this UPI request safe?",
      "🏦 RBI scam alerts",
      "🆘 I think I got scammed"
    ],
    chatReplay: "Replay",

    // Settings
    settingsTitle: "TrustLayer Settings",
    apiKeyLabel: "OpenRouter API Key",
    apiKeyPlaceholder: "sk-or-...",
    openaiKeyLabel: "OpenAI API Key (for Whisper)",
    openaiKeyPlaceholder: "sk-...",
    apiKeyOptional: "Optional in Demo Mode",
    apiKeyNote: "Your key stays in browser memory only. Never stored.",
    apiKeyClear: "Clear Key",
    demoModeLabel: "Demo / Mock Mode",
    demoModeDesc: "Simulate AI risk analysis",
    saveSettings: "Save Settings",

    // Errors
    noKeyError: "⚙️ Please add your OpenRouter API key in Settings first or enable Demo Mode.",
    configureKey: "Configure Key",
  },

  hi: {
    // App header
    appName: "ट्रस्टलेयर",
    appSubtitle: "AI धोखाधड़ी सुरक्षा",

    // Tab labels
    tabSend: "पैसे भेजें",
    tabSendShort: "भेजें",
    tabSendDesc: "भेजें और जांचें",
    tabScan: "धोखाधड़ी स्कैनर",
    tabScanShort: "स्कैन",
    tabScanDesc: "संदेश स्कैन करें",
    tabAlerts: "स्कैम अलर्ट",
    tabAlertsShort: "अलर्ट",
    tabAlertsDesc: "लाइव अलर्ट",
    tabHistory: "इतिहास",
    tabHistoryShort: "इतिहास",
    tabHistoryDesc: "पुराने लेन-देन",
    tabTrust: "भरोसा स्कोर",
    tabTrustShort: "भरोसा",
    tabTrustDesc: "आपकी प्रोफाइल",

    // Sidebar footer
    aiActive: "AI सक्रिय",
    demoActive: "डेमो सक्रिय",
    noKey: "कोई Key नहीं",

    // Send Payment
    sendTitle: "पैसे भेजें",
    sendSubtitle: "AI हर लेन-देन की धोखाधड़ी जांच करता है",
    recipientLabel: "प्राप्तकर्ता",
    recipientPlaceholder: "नाम या UPI ID दर्ज करें",
    amountLabel: "राशि (₹)",
    noteLabel: "भुगतान नोट / UPI विवरण",
    notePlaceholder: "यह भुगतान किस लिए है?",
    noteListening: "🎤 सुन रहे हैं... बोलिए...",
    noteAiHint: "इस नोट का AI धोखाधड़ी पैटर्न के लिए विश्लेषण किया जाएगा",
    sendButton: "भेजें और जांचें",
    analyzing: "जांच हो रही है...",

    // Risk result card
    riskLow: "कम जोखिम",
    riskMedium: "मध्यम जोखिम",
    riskHigh: "उच्च जोखिम",
    riskScoreLabel: "जोखिम स्कोर",
    fraudTypeLabel: "धोखाधड़ी का प्रकार",
    hinglishWarningLabel: "आवाज़ चेतावनी",
    redFlagsLabel: "पाए गए खतरे",
    proceedButton: "फिर भी भेजें",
    proceedSafe: "आगे बढ़ें",
    cancelButton: "भुगतान रद्द करें",
    analysisFailed: "विश्लेषण विफल",
    tryAgain: "पुनः प्रयास करें",
    analyzingWithAI: "AI से जांच हो रही है...",
    aiEvaluating: "Gemini जोखिम पैटर्न का मूल्यांकन कर रहा है",
    resultPlaceholder: "AI विश्लेषण परिणाम यहाँ दिखेंगे",
    resultPlaceholderHint: "फॉर्म भरें और \"भेजें और जांचें\" दबाएं",

    // Fraud Scanner
    scanTitle: "AI धोखाधड़ी स्कैनर",
    scanSubtitle: "कोई भी संदिग्ध SMS, WhatsApp या ईमेल पेस्ट करें",
    scanCardTitle: "संदेश विश्लेषण",
    scanCardSubtitle: "Gemini AI द्वारा संचालित",
    scanPlaceholder: "संदिग्ध संदेश यहाँ पेस्ट करें...\n\nउदाहरण: 'प्रिय ग्राहक, आपका खाता कॉम्प्रोमाइज हो गया है। तुरंत सत्यापित करने के लिए यहाँ क्लिक करें...'",
    scanListening: "🎤 सुन रहे हैं... बोलिए...",
    scanButton: "धोखाधड़ी के लिए स्कैन करें",
    scanClear: "साफ करें",
    scanResultPlaceholder: "स्कैन परिणाम यहाँ दिखेंगे",
    scanResultHint: "संदेश पेस्ट करें और \"स्कैन करें\" दबाएं",
    tryExamples: "ये उदाहरण आज़माएं",
    exPrize: "इनाम स्कैम",
    exOtp: "OTP धोखाधड़ी",
    exSafe: "सुरक्षित संदेश",

    // History
    historyTitle: "लेन-देन इतिहास",
    historyCount: (n) => `इस सेशन में ${n} लेन-देन`,
    historyEmpty: "अभी तक कोई लेन-देन नहीं",
    historyNoMatch: "कोई मिलान नहीं मिला",
    historyNoMatchHint: (q) => `"${q}" से मिलता कोई लेन-देन नहीं मिला`,
    historyClearSearch: "खोज साफ करें",
    historySearch: "खोजें",
    historySearchPlaceholder: "प्राप्तकर्ता, नोट, जोखिम स्तर खोजें...",
    historyRecent: "हाल ही:",
    historyClearAll: "सब साफ करें",
    historyLow: "कम",
    historyMed: "मध्यम",
    historyHigh: "उच्च",
    historyRiskScore: "जोखिम स्कोर",
    historyFraudType: "धोखाधड़ी प्रकार",
    historyAiAnalysis: "AI विश्लेषण",

    // Trust Dashboard
    trustTitle: "भरोसा डैशबोर्ड",
    trustSubtitle: "आपकी वित्तीय भरोसा प्रोफाइल",
    trustAtRisk: "जोखिम में",
    trustBuilding: "भरोसा बन रहा है",
    trustTrusted: "भरोसेमंद",
    trustVerified: "सत्यापित",
    lendingTitle: "माइक्रो-लेंडिंग पात्रता",
    lendingPremiumLabel: "प्रीमियम क्रेडिट लाइन",
    lendingPremiumDesc: "उत्कृष्ट भरोसा — प्रीमियम लाभ अनलॉक",
    lendingStandardLabel: "स्टैंडर्ड क्रेडिट लाइन",
    lendingStandardDesc: "अच्छा भरोसा स्कोर — स्टैंडर्ड क्रेडिट उपलब्ध",
    lendingTrialLabel: "ट्रायल सीमा",
    lendingTrialDesc: "भरोसा बन रहा है — सीमित क्रेडिट उपलब्ध",
    lendingNotLabel: "पात्र नहीं",
    lendingNotDesc: "बहुत अधिक उच्च-जोखिम संकेत पाए गए",
    riskDistribution: "जोखिम वितरण",
    recentRiskActivity: "हाल की जोखिम गतिविधि",
    lowRisk: "कम जोखिम",
    mediumRisk: "मध्यम जोखिम",
    highRisk: "उच्च जोखिम",

    // Alerts
    alertsTitle: "स्कैम अलर्ट",
    alertsSubtitle: "Google Search द्वारा रियल-टाइम चेतावनियां और सलाह",
    alertsGrounding: "स्रोत: Google Search सक्रिय",
    alertsLastUpdated: "अंतिम अपडेट",
    alertsSeverity: "गंभीरता",
    alertsProtectionTip: "सुरक्षा टिप:",
    alertsNoAlerts: "कोई अलर्ट लोड नहीं",
    alertsNoAlertsHint: "लाइव स्कैम अलर्ट लोड करने के लिए fetch या refresh करें।",
    alertsNoKey: "अलर्ट लाने के लिए Settings में API key डालें।",
    alertsFetch: "अलर्ट लाएं",

    // Chatbot
    chatName: "ट्रस्टगार्ड AI",
    chatSubtitle: "आपका धोखाधड़ी सुरक्षा सहायक",
    chatPlaceholder: "पूछिए... अपना सवाल टाइप करें...",
    chatListening: "🎤 सुन रहे हैं... बोलिए...",
    chatWelcome: "नमस्ते! 👋 मैं ट्रस्टगार्ड AI हूँ। किसी भी संदिग्ध पेमेंट, SMS स्कैम, या UPI सुरक्षा के बारे में पूछें। टाइप करें या माइक दबाएं!",
    chatClear: "चैट साफ करें",
    chatChips: [
      "🔍 संदिग्ध SMS जांचें",
      "💸 यह UPI रिक्वेस्ट सुरक्षित है?",
      "🏦 RBI स्कैम अलर्ट",
      "🆘 मुझे लगता है मैं ठगा गया"
    ],
    chatReplay: "दोबारा सुनें",

    // Settings
    settingsTitle: "ट्रस्टलेयर सेटिंग्स",
    apiKeyLabel: "OpenRouter API Key",
    apiKeyPlaceholder: "sk-or-...",
    openaiKeyLabel: "OpenAI API Key (Whisper के लिए)",
    openaiKeyPlaceholder: "sk-...",
    apiKeyOptional: "डेमो मोड में वैकल्पिक",
    apiKeyNote: "आपकी key सिर्फ ब्राउज़र मेमोरी में रहती है। कहीं स्टोर नहीं होती।",
    apiKeyClear: "Key हटाएं",
    demoModeLabel: "डेमो / मॉक मोड",
    demoModeDesc: "AI जोखिम विश्लेषण सिमुलेट करें",
    saveSettings: "सेटिंग्स सेव करें",

    // Errors
    noKeyError: "⚙️ पहले Settings में OpenRouter API key डालें या Demo Mode चालू करें।",
    configureKey: "Key सेट करें",
  },
};

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────
const LanguageContext = createContext(undefined);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("trustlayer_lang") || "en";
  });

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    localStorage.setItem("trustlayer_lang", newLang);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "hi" : "en");
  }, [lang, setLang]);

  const t = translations[lang] || translations.en;

  // Update <html lang> attribute for accessibility / SEO
  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useLanguage — access lang, setLang, toggleLang, and t (translations)
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}

export default LanguageContext;
