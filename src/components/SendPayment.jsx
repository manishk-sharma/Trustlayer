import React, { useState, useEffect } from "react";
import { analyzePayment, fetchScamAlerts } from "../api/api";
import { ResultCard, LoadingCard, ErrorCard } from "./ui/RiskComponents";
import { FiShield, FiMic, FiBell } from "react-icons/fi";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { useLanguage } from "../context/LanguageContext";

export default function SendPayment({ onTransactionAdd, apiKey, demoMode, setTabError }) {
  const { lang, t } = useLanguage();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [voiceError, setVoiceError] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  useEffect(() => {
    const loadSendAlerts = async () => {
      if (!apiKey && !demoMode) return;
      try {
        setLoadingAlerts(true);
        const res = await fetchScamAlerts(apiKey);
        if (res.success) {
          setAlertsData(res.data);
        }
      } catch (err) {
        console.error("Failed to load alerts for payment page:", err);
      } finally {
        setLoadingAlerts(false);
      }
    };
    loadSendAlerts();
  }, [apiKey, demoMode]);

  // ── Voice input via the robust custom hook ──
  const {
    isListening: isRecording,
    startListening: startVoiceInput,
    stopListening: stopVoiceInput,
    supported: speechSupported
  } = useSpeechRecognition({
    lang: lang === "hi" ? "hi-IN" : "en-IN",
    onResult: (transcript, isFinal) => {
      setNote(transcript);
      if (isFinal) setVoiceError(null);
    },
    onError: (msg) => {
      setVoiceError(msg);
      setTimeout(() => setVoiceError(null), 5000);
    },
  });

  const speak = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient.trim() || !amount || !note.trim()) return;

    if (!apiKey && !demoMode) {
      setTabError(t.noKeyError);
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setTabError(null);

    const res = await analyzePayment(recipient, amount, note, apiKey, lang);

    setLoading(false);
    if (res.success) {
      setResult(res.data);
      if (res.data.risk_level === "HIGH" && res.data.hinglish_warning) {
        speak(res.data.hinglish_warning);
      }
    } else {
      setError(res.error);
      setTabError(res.error);
    }
  };

  const handleProceed = () => {
    const txn = {
      id: Date.now(),
      recipient,
      amount: Number(amount),
      note,
      risk_level: result.risk_level,
      risk_score: result.risk_score,
      fraud_type: result.fraud_type,
      explanation: result.explanation,
      recommendation: result.recommendation,
      timestamp: "Just now",
    };
    onTransactionAdd(txn);
    resetForm();
  };

  const resetForm = () => {
    setRecipient("");
    setAmount("");
    setNote("");
    setResult(null);
    setError(null);
    setVoiceError(null);
  };

  return (
    <div className="animate-fade-in-up space-y-5 pb-6">
      {/* Header */}
      <div className="text-center md:text-left space-y-1">
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">{t.sendTitle}</h1>
        <p className="text-xs md:text-sm text-text-muted">{t.sendSubtitle}</p>
      </div>

      {/* Responsive grid: form + result side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Form Column */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Recipient & Amount row on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recipient */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  {t.recipientLabel}
                </label>
                <input
                  id="send-recipient"
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={t.recipientPlaceholder}
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  {t.amountLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted font-semibold">₹</span>
                  <input
                    id="send-amount"
                    type="number"
                    min="1"
                    max="50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-navy-800 border border-navy-700 rounded-xl pl-8 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Payment Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {t.noteLabel}
              </label>
              <div className="relative">
                <textarea
                  id="send-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={isRecording ? t.noteListening : t.notePlaceholder}
                  rows={3}
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl pl-4 pr-12 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors resize-none"
                />
                {speechSupported ? (
                  <button
                    type="button"
                    onMouseDown={() => { setVoiceError(null); startVoiceInput(); }}
                    onMouseUp={stopVoiceInput}
                    onMouseLeave={stopVoiceInput}
                    onTouchStart={(e) => { e.preventDefault(); setVoiceError(null); startVoiceInput(); }}
                    onTouchEnd={(e) => { e.preventDefault(); stopVoiceInput(); }}
                    className={`absolute right-3.5 bottom-3.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      isRecording
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-navy-700 hover:bg-navy-600 text-text-secondary border border-navy-600"
                    }`}
                    title="Hold to speak note"
                  >
                    <FiMic className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="absolute right-3.5 bottom-3.5 w-8 h-8 rounded-lg flex items-center justify-center bg-navy-700 text-text-muted opacity-40 cursor-not-allowed border border-navy-600" title="Speech not supported">
                    <FiMic className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              {voiceError && (
                <p className="text-[10px] md:text-xs text-red-500 font-medium animate-fade-in-up">{voiceError}</p>
              )}
              <p className="text-[10px] md:text-xs text-text-muted flex items-center gap-1">
                <FiShield className="w-3.5 h-3.5 text-electric" /> {t.noteAiHint}
              </p>
            </div>

            {/* Submit */}
            <button
              id="send-analyze-btn"
              type="submit"
              disabled={loading || !recipient.trim() || !amount || !note.trim()}
              className="w-full md:w-auto md:px-10 py-3.5 rounded-xl text-sm font-bold bg-electric hover:bg-electric-dark disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all duration-200 cursor-pointer shadow-lg shadow-electric/20 hover:shadow-electric/30 active:scale-[0.98]"
            >
              {loading ? t.analyzing : t.sendButton}
            </button>
          </form>
        </div>

        {/* Result Column */}
        <div className="space-y-4">
          {loading && <LoadingCard />}
          {error && <ErrorCard message={error} onRetry={handleSubmit} />}
          {result && (
            <ResultCard result={result} showActions={true} onProceed={handleProceed} onCancel={resetForm} />
          )}
          {!loading && !error && !result && (
            <div className="hidden lg:flex flex-col items-center justify-center h-full min-h-[200px] glass-card rounded-2xl border border-navy-700 border-dashed">
              <FiShield className="w-10 h-10 mb-3 opacity-30 text-text-muted animate-pulse" />
              <p className="text-sm text-text-muted">{t.resultPlaceholder}</p>
              <p className="text-[10px] text-text-muted mt-1">{t.resultPlaceholderHint}</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Scam Alerts Section (in the requested area) */}
      <div className="pt-6 border-t border-navy-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiBell className="w-4.5 h-4.5 text-electric animate-bounce" />
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              {t.alertsTitle}
            </h2>
          </div>
          {alertsData && (
            <span className="text-[10px] text-text-muted font-semibold">
              {t.alertsLastUpdated}: {alertsData.last_updated}
            </span>
          )}
        </div>

        {loadingAlerts ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-navy-950 border border-navy-700 rounded-2xl p-4 animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded-full w-1/4" />
                  <div className="h-5 bg-gray-200 rounded-xl w-12" />
                </div>
                <div className="h-3.5 bg-gray-200 rounded-full w-3/4" />
                <div className="h-3 bg-gray-200 rounded-full w-full" />
                <div className="h-3 bg-gray-200 rounded-full w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(alertsData?.alerts || getFallbackAlerts(lang)).slice(0, 3).map((alert, index) => {
              const isHigh = alert.severity === "HIGH";
              return (
                <div
                  key={index}
                  className={`glass-card rounded-2xl p-4 border flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
                    isHigh 
                      ? 'border-red-100 bg-red-50/10 hover:border-red-200' 
                      : 'border-amber-100 bg-amber-50/10 hover:border-amber-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isHigh ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-[9px] font-semibold px-2 py-0.5 bg-navy-800 border border-navy-700 rounded-lg text-text-secondary">
                        {alert.category}
                      </span>
                    </div>
                    
                    <h3 className="text-xs font-bold text-text-primary leading-snug line-clamp-1">
                      {alert.title}
                    </h3>
                    <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3">
                      {alert.summary}
                    </p>
                  </div>
                  
                  <div className="mt-3.5 pt-2.5 border-t border-navy-700 flex items-start gap-1.5 text-[10px] text-electric font-medium">
                    <FiShield className="w-3.5 h-3.5 text-electric shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <span className="font-bold">{t.alertsProtectionTip}</span> {alert.tip}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// BILINGUAL STATIC SCAM ALERTS FALLBACK
// ==========================================
const getFallbackAlerts = (lang) => {
  if (lang === "hi") {
    return [
      {
        title: "संदिग्ध UPI मनी कलेक्ट रिक्वेस्ट",
        category: "UPI",
        severity: "HIGH",
        summary: "जालसाज बिजली के बिलों से मिलते-जुलते नामों से रैंडम UPI 'कलेक्ट' रिक्वेस्ट भेज रहे हैं, ताकि उपयोगकर्ता बिना सोचे-समझे UPI PIN दर्ज कर दें।",
        tip: "पैसे पाने के लिए कभी भी UPI PIN न डालें। PIN केवल पैसे भेजने के लिए चाहिए होता है।"
      },
      {
        title: "यूट्यूब वीडियो लाइक पार्ट-टाइम जॉब स्कैम",
        category: "Job",
        severity: "HIGH",
        summary: "स्कैमर व्हाट्सएप/टेलीग्राम पर यूट्यूब वीडियो लाइक करने के लिए छोटा भुगतान (₹50-100) करते हैं, फिर वीआईपी ग्रुप में शामिल करके बड़ी रकम निवेश करने का दबाव बनाते हैं।",
        tip: "असली नौकरियां आपसे काम शुरू करने के लिए कभी भी पैसे जमा करने को नहीं कहेंगी।"
      },
      {
        title: "बिजली बिल डिस्कनेक्शन SMS धोखाधड़ी",
        category: "SMS",
        severity: "MEDIUM",
        summary: "बिजली बिल बकाया होने के कारण बिजली काटने की चेतावनी देने वाले फर्जी SMS भेजे जा रहे हैं। वे पीड़ितों को फर्जी हेल्पलाइन नंबर पर कॉल करने को कहते हैं।",
        tip: "बिजली विभाग कभी भी पर्सनल मोबाइल नंबर से मैसेज नहीं भेजता। हमेशा आधिकारिक नंबर पर ही संपर्क करें।"
      }
    ];
  }
  return [
    {
      title: "Vigorous UPI Collect Request Fraud",
      category: "UPI",
      severity: "HIGH",
      summary: "Fraudsters are sending random UPI 'Collect' requests to users with names matching utility bills, hoping users will click authorize and enter their UPI PIN blindly.",
      tip: "Never enter your UPI PIN to receive money. PIN is only required to send or authorize payments."
    },
    {
      title: "Part-time Youtube Like Job Scams",
      category: "Job",
      severity: "HIGH",
      summary: "Scammers recruit people on WhatsApp/Telegram to like YouTube videos for small payouts (₹50-100), then coerce them into joining VIP groups and investing huge amounts.",
      tip: "Genuine jobs will never ask you to pay or deposit money to start earning."
    },
    {
      title: "Electricity Bill Verification Smishing",
      category: "SMS",
      severity: "MEDIUM",
      summary: "Fake SMS messages threatening immediate power disconnection due to pending bills are circulating. They instruct victims to call a fraud helpline number.",
      tip: "Utility companies do not send disconnection threats from normal mobile numbers. Contact the official electricity department."
    }
  ];
};
