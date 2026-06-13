import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { FiStar, FiCheckCircle, FiAlertTriangle, FiXCircle } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";

function TrustScoreGauge({ score, t }) {
  const radius = 80;
  const stroke = 10;
  const normalizedRadius = radius - stroke;
  const circumference = 2 * Math.PI * normalizedRadius;
  const arcLength = circumference * 0.75;
  const filledLength = (score / 100) * arcLength;

  const getScoreColor = (s) => {
    if (s <= 40) return "#EF4444";
    if (s <= 65) return "#F59E0B";
    if (s <= 85) return "#3B82F6";
    return "#10B981";
  };

  const getScoreLabel = (s) => {
    if (s <= 40) return t.trustAtRisk;
    if (s <= 65) return t.trustBuilding;
    if (s <= 85) return t.trustTrusted;
    return t.trustVerified;
  };

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
        <circle cx={radius} cy={radius} r={normalizedRadius} fill="none" stroke="var(--navy-700)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${arcLength} ${circumference}`} transform={`rotate(135 ${radius} ${radius})`} />
        <circle cx={radius} cy={radius} r={normalizedRadius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${filledLength} ${circumference}`} transform={`rotate(135 ${radius} ${radius})`} style={{ filter: `drop-shadow(0 0 6px ${color}60)`, transition: "stroke-dasharray 0.8s ease-out" }} />
        <text x={radius} y={radius - 8} textAnchor="middle" fill={color} fontSize="32" fontWeight="800" fontFamily="system-ui" style={{ fontVariantNumeric: "tabular-nums" }}>{score}</text>
        <text x={radius} y={radius + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="600" fontFamily="system-ui">{label}</text>
        <text x="18" y={radius * 2 - 12} fill="var(--text-secondary)" fontSize="9" fontFamily="system-ui">0</text>
        <text x={radius * 2 - 26} y={radius * 2 - 12} fill="var(--text-secondary)" fontSize="9" fontFamily="system-ui">100</text>
      </svg>
    </div>
  );
}

function RiskTimeline({ transactions, t }) {
  const recent = transactions.slice(0, 5);
  const riskColors = { LOW: "#10B981", MEDIUM: "#F59E0B", HIGH: "#EF4444" };

  if (recent.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t.recentRiskActivity}</p>
      <div className="glass-card rounded-xl p-4 border border-navy-700">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-2 right-2 h-0.5 bg-navy-700 top-1/2 -translate-y-1/2 rounded-full" />
          {recent.map((txn) => (
            <div key={txn.id} className="relative z-10 flex flex-col items-center group">
              <div className="w-4 h-4 rounded-full border-2 border-white transition-transform hover:scale-125" style={{ backgroundColor: riskColors[txn.risk_level], boxShadow: `0 0 8px ${riskColors[txn.risk_level]}50` }} />
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-navy-950 rounded-lg px-2 py-1 text-[10px] text-text-secondary whitespace-nowrap border border-navy-700 shadow-lg">
                  {txn.recipient} · ₹{txn.amount}
                </div>
              </div>
              <p className="text-[9px] text-text-muted mt-1.5 max-w-[60px] truncate text-center">{txn.recipient.split(" ")[0]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-text-primary font-semibold">{payload[0].payload.name}: {payload[0].value}</p>
      </div>
    );
  }
  return null;
}

export default function TrustDashboard({ transactions }) {
  const { t } = useLanguage();

  const trustScore = useMemo(() => {
    let score = 60;
    transactions.forEach((txn) => {
      if (txn.risk_level === "LOW") score += 5;
      else if (txn.risk_level === "MEDIUM") score -= 5;
      else if (txn.risk_level === "HIGH") score -= 15;
    });
    return Math.max(0, Math.min(100, score));
  }, [transactions]);

  const riskDistribution = useMemo(() => {
    const low = transactions.filter((tx) => tx.risk_level === "LOW").length;
    const med = transactions.filter((tx) => tx.risk_level === "MEDIUM").length;
    const high = transactions.filter((tx) => tx.risk_level === "HIGH").length;
    return [
      { name: t.lowRisk, value: low, fill: "#10B981" },
      { name: t.mediumRisk, value: med, fill: "#F59E0B" },
      { name: t.highRisk, value: high, fill: "#EF4444" },
    ];
  }, [transactions, t]);

  const eligibility = useMemo(() => {
    if (trustScore > 85)
      return {
        icon: <FiStar className="w-5 h-5 text-risk-low" />,
        label: t.lendingPremiumLabel,
        amount: "₹5,000",
        color: "text-risk-low",
        bg: "bg-risk-low/10",
        border: "border-risk-low/20",
        desc: t.lendingPremiumDesc,
      };
    if (trustScore > 70)
      return {
        icon: <FiCheckCircle className="w-5 h-5 text-electric-light" />,
        label: t.lendingStandardLabel,
        amount: "₹2,000",
        color: "text-electric-light",
        bg: "bg-electric/10",
        border: "border-electric/20",
        desc: t.lendingStandardDesc,
      };
    if (trustScore >= 50)
      return {
        icon: <FiAlertTriangle className="w-5 h-5 text-risk-medium" />,
        label: t.lendingTrialLabel,
        amount: "₹500",
        color: "text-risk-medium",
        bg: "bg-risk-medium/10",
        border: "border-risk-medium/20",
        desc: t.lendingTrialDesc,
      };
    return {
      icon: <FiXCircle className="w-5 h-5 text-risk-high" />,
      label: t.lendingNotLabel,
      amount: "₹0",
      color: "text-risk-high",
      bg: "bg-risk-high/10",
      border: "border-risk-high/20",
      desc: t.lendingNotDesc,
    };
  }, [trustScore, t]);

  return (
    <div className="animate-fade-in-up space-y-5 pb-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-text-primary">{t.trustTitle}</h1>
        <p className="text-xs text-text-muted">{t.trustSubtitle}</p>
      </div>

      {/* Trust Score Gauge */}
      <div className="glass-card rounded-2xl p-5 border border-navy-700">
        <TrustScoreGauge score={trustScore} t={t} />
      </div>

      {/* Micro-Lending Eligibility */}
      <div className={`glass-card rounded-2xl p-4 border ${eligibility.border} space-y-2`}>
        <div className="flex items-center gap-2">
          {eligibility.icon}
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t.lendingTitle}</p>
            <p className={`text-base font-bold ${eligibility.color}`}>{eligibility.label}</p>
          </div>
        </div>
        <div className={`flex items-center justify-between ${eligibility.bg} rounded-xl p-3`}>
          <span className="text-xs text-text-secondary">{eligibility.desc}</span>
          <span className={`text-lg font-bold tabular-nums ${eligibility.color}`}>{eligibility.amount}</span>
        </div>
      </div>

      {/* Risk Distribution Chart */}
      <div className="glass-card rounded-2xl p-4 border border-navy-700 space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t.riskDistribution}</p>
        <div style={{ width: '100%', height: 176 }}>
          <ResponsiveContainer width="100%" height={176} minWidth={200}>
            <BarChart data={riskDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--navy-700)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {riskDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Timeline */}
      <RiskTimeline transactions={transactions} t={t} />
    </div>
  );
}
