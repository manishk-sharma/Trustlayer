import React from "react";
import { FiAlertTriangle, FiInfo, FiXCircle, FiAlertCircle } from "react-icons/fi";

const riskConfig = {
  LOW: {
    color: "text-risk-low",
    bg: "bg-risk-low/15",
    border: "border-risk-low/30",
    label: "LOW RISK",
    barColor: "#10B981",
  },
  MEDIUM: {
    color: "text-risk-medium",
    bg: "bg-risk-medium/15",
    border: "border-risk-medium/30",
    label: "MEDIUM RISK",
    barColor: "#F59E0B",
  },
  HIGH: {
    color: "text-risk-high",
    bg: "bg-risk-high/15",
    border: "border-risk-high/30",
    label: "HIGH RISK",
    barColor: "#EF4444",
  },
};

export function RiskBadge({ level }) {
  const cfg = riskConfig[level] || riskConfig.LOW;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${cfg.bg} ${cfg.color} border ${cfg.border}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${level === "LOW" ? "bg-risk-low" : level === "MEDIUM" ? "bg-risk-medium" : "bg-risk-high"}`}
      />
      {cfg.label}
    </span>
  );
}

export function RiskScoreBar({ score, level }) {
  const cfg = riskConfig[level] || riskConfig.LOW;
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-text-secondary">Risk Score</span>
        <span className={`text-sm font-bold tabular-nums ${cfg.color}`}>
          {score}/100
        </span>
      </div>
      <div className="w-full h-2 bg-navy-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${score}%`,
            backgroundColor: cfg.barColor,
            boxShadow: `0 0 8px ${cfg.barColor}40`,
          }}
        />
      </div>
    </div>
  );
}

export function ResultCard({ result, onProceed, onCancel, showActions = false }) {
  if (!result) return null;

  const cfg = riskConfig[result.risk_level] || riskConfig.LOW;

  return (
    <div className="animate-scale-in">
      <div className={`glass-card rounded-2xl p-5 space-y-4 border ${cfg.border}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <RiskBadge level={result.risk_level} />
          {result.fraud_type && result.fraud_type !== "None" && (
            <span className="text-xs font-medium text-text-secondary bg-navy-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <FiAlertTriangle className="w-3.5 h-3.5 text-risk-high" /> {result.fraud_type}
            </span>
          )}
        </div>

        {/* Score Bar */}
        <RiskScoreBar score={result.risk_score} level={result.risk_level} />

        {/* Explanation */}
        <div className="space-y-2">
          <p className="text-sm text-text-secondary leading-relaxed">
            {result.explanation}
          </p>
          <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
            <FiInfo className="w-4 h-4 text-electric shrink-0 mt-0.5" />
            <p className="text-xs text-electric-light leading-relaxed">
              {result.recommendation}
            </p>
          </div>
        </div>

        {/* Red Flags (for scanner) */}
        {result.red_flags && result.red_flags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Red Flags Detected
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.red_flags.map((flag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-risk-high/10 text-risk-high border border-risk-high/20"
                >
                  <FiAlertTriangle className="w-3 h-3 text-risk-high" /> {flag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-navy-700 text-text-secondary hover:bg-navy-600 transition-colors cursor-pointer"
            >
              Cancel Payment
            </button>
            <button
              onClick={onProceed}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                result.risk_level === "HIGH"
                  ? "bg-risk-high/20 text-risk-high hover:bg-risk-high/30 border border-risk-high/30"
                  : "bg-electric/20 text-electric-light hover:bg-electric/30 border border-electric/30"
              }`}
            >
              {result.risk_level === "HIGH" ? (
                <span className="flex items-center justify-center gap-1.5">
                  <FiAlertTriangle className="w-3.5 h-3.5" /> Proceed Anyway
                </span>
              ) : (
                "Proceed"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="animate-fade-in-up">
      <div className="glass-card rounded-2xl p-6 space-y-4 animate-pulse-glow border border-electric/20">
        <div className="flex items-center justify-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 border-2 border-electric/30 border-t-electric rounded-full animate-spin-slow" />
          </div>
          <div>
            <p className="text-sm font-semibold text-electric-light">
              Analyzing with AI...
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Gemini is evaluating risk patterns
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-navy-700 rounded-full animate-shimmer" />
          <div className="h-2 bg-navy-700 rounded-full animate-shimmer w-3/4" />
          <div className="h-2 bg-navy-700 rounded-full animate-shimmer w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function ErrorCard({ message, onRetry }) {
  return (
    <div className="animate-fade-in-up">
      <div className="glass-card rounded-2xl p-5 border border-risk-high/20 space-y-3">
        <div className="flex items-center gap-2">
          <FiXCircle className="w-5 h-5 text-risk-high" />
          <p className="text-sm font-semibold text-risk-high">Analysis Failed</p>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2 rounded-xl text-sm font-semibold bg-navy-700 text-text-secondary hover:bg-navy-600 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
