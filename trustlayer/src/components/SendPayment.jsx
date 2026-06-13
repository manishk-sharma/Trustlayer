import React, { useState } from "react";
import { analyzePayment } from "../api/claude";
import { ResultCard, LoadingCard, ErrorCard } from "./ui/RiskComponents";
import { FiShield } from "react-icons/fi";

export default function SendPayment({ onTransactionAdd, apiKey, setTabError }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient.trim() || !amount || !note.trim()) return;

    if (!apiKey) {
      setTabError("⚙️ Please add your Gemini API key in Settings first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setTabError(null);

    const res = await analyzePayment(recipient, amount, note, apiKey);

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
  };

  return (
    <div className="animate-fade-in-up space-y-5 pb-6">
      {/* Header */}
      <div className="text-center md:text-left space-y-1">
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Send Payment</h1>
        <p className="text-xs md:text-sm text-text-muted">
          AI analyzes every transaction for fraud signals
        </p>
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
                  Recipient
                </label>
                <input
                  id="send-recipient"
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter name or UPI ID"
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted font-semibold">
                    ₹
                  </span>
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
                Payment Note / UPI Description
              </label>
              <textarea
                id="send-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this payment for?"
                rows={3}
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors resize-none"
              />
              <p className="text-[10px] md:text-xs text-text-muted flex items-center gap-1">
                <FiShield className="w-3.5 h-3.5 text-electric" /> This note will be analyzed by AI for fraud patterns
              </p>
            </div>

            {/* Submit */}
            <button
              id="send-analyze-btn"
              type="submit"
              disabled={loading || !recipient.trim() || !amount || !note.trim()}
              className="w-full md:w-auto md:px-10 py-3.5 rounded-xl text-sm font-bold bg-electric hover:bg-electric-dark disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all duration-200 cursor-pointer shadow-lg shadow-electric/20 hover:shadow-electric/30 active:scale-[0.98]"
            >
              {loading ? "Analyzing..." : "Send & Analyze"}
            </button>
          </form>
        </div>

        {/* Result Column */}
        <div className="space-y-4">
          {/* Loading State */}
          {loading && <LoadingCard />}

          {/* Error State */}
          {error && <ErrorCard message={error} onRetry={handleSubmit} />}

          {/* Result Card */}
          {result && (
            <ResultCard
              result={result}
              showActions={true}
              onProceed={handleProceed}
              onCancel={resetForm}
            />
          )}

          {/* Empty state placeholder on desktop */}
          {!loading && !error && !result && (
            <div className="hidden lg:flex flex-col items-center justify-center h-full min-h-[200px] glass-card rounded-2xl border border-navy-700 border-dashed">
              <FiShield className="w-10 h-10 mb-3 opacity-30 text-text-muted animate-pulse" />
              <p className="text-sm text-text-muted">AI analysis results will appear here</p>
              <p className="text-[10px] text-text-muted mt-1">Fill out the form and click "Send & Analyze"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
