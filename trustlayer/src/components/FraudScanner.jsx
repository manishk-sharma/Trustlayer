import React, { useState } from "react";
import { scanMessage } from "../api/claude";
import { ResultCard, LoadingCard, ErrorCard } from "./ui/RiskComponents";
import { FiSearch } from "react-icons/fi";

export default function FraudScanner({ apiKey, setTabError }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const speak = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!apiKey) {
      setTabError("⚙️ Please add your Gemini API key in Settings first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setTabError(null);

    const res = await scanMessage(message, apiKey);

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

  const handleClear = () => {
    setMessage("");
    setResult(null);
    setError(null);
  };

  const examples = [
    {
      label: "Prize Scam",
      text: "Congratulations! You've won ₹50,000 in the Lucky Draw! Send ₹499 to claim. Reply with your bank details NOW. Offer expires in 1 hour!",
    },
    {
      label: "OTP Fraud",
      text: "Hi, I'm calling from SBI Bank. We detected suspicious activity. Please share your OTP to secure your account immediately.",
    },
    {
      label: "Safe Message",
      text: "Hey, are we still on for dinner tonight at 8? I booked a table at that new Italian place.",
    },
  ];

  return (
    <div className="animate-fade-in-up space-y-5 pb-6">
      {/* Header */}
      <div className="text-center md:text-left space-y-1">
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">AI Fraud Scanner</h1>
        <p className="text-xs md:text-sm text-text-muted">
          Paste any suspicious SMS, WhatsApp, or email message
        </p>
      </div>

      {/* Responsive grid: scanner + result side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Scanner Column */}
        <div className="space-y-4">
          {/* Scanner Card */}
          <div className="glass-card rounded-2xl p-4 md:p-5 space-y-4 border border-navy-700">
            <div className="flex items-center gap-2 pb-2 border-b border-navy-700">
              <div className="w-8 h-8 rounded-full bg-electric/10 flex items-center justify-center">
                <FiSearch className="w-4 h-4 text-electric" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Message Analysis</p>
                <p className="text-[10px] text-text-muted">
                  Powered by Gemini AI
                </p>
              </div>
            </div>

            <form onSubmit={handleScan} className="space-y-3">
              <textarea
                id="scanner-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Paste suspicious message here...&#10;&#10;Example: 'Dear customer, your account has been compromised. Click here to verify your identity immediately or your account will be locked...'"
                rows={5}
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors resize-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-navy-700 text-text-secondary hover:bg-navy-600 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  id="scan-btn"
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-electric hover:bg-electric-dark disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all duration-200 cursor-pointer shadow-lg shadow-electric/20 active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <FiSearch className="w-4 h-4" /> Scan for Fraud
                </button>
              </div>
            </form>
          </div>

          {/* Quick Examples */}
          {!result && !loading && (
            <div className="space-y-3 animate-fade-in-up">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider text-center md:text-left">
                Try these examples
              </p>
              <div className="space-y-2 md:grid md:grid-cols-1 md:gap-2">
                {examples.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setMessage(example.text)}
                    className="w-full text-left glass-card rounded-xl p-3 border border-navy-700 hover:border-electric/30 transition-colors cursor-pointer group"
                  >
                    <span className="text-[10px] font-bold text-electric uppercase tracking-wider">
                      {example.label}
                    </span>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2 group-hover:text-text-primary transition-colors">
                      {example.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Result Column */}
        <div className="space-y-4">
          {/* Loading State */}
          {loading && <LoadingCard />}

          {/* Error State */}
          {error && <ErrorCard message={error} onRetry={handleScan} />}

          {/* Result Card */}
          {result && <ResultCard result={result} />}

          {/* Empty state on desktop */}
          {!loading && !error && !result && (
            <div className="hidden lg:flex flex-col items-center justify-center h-full min-h-[200px] glass-card rounded-2xl border border-navy-700 border-dashed">
              <FiSearch className="w-10 h-10 mb-3 opacity-30 text-text-muted animate-pulse" />
              <p className="text-sm text-text-muted">Scan results will appear here</p>
              <p className="text-[10px] text-text-muted mt-1">Paste a message and click "Scan for Fraud"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
