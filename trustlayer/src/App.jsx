import React, { useState, useCallback, useEffect } from "react";
import {
  FiSend,
  FiSearch,
  FiClock,
  FiBarChart2,
  FiShield,
  FiLock,
  FiCpu,
  FiRefreshCw,
  FiBell,
  FiSettings,
  FiX,
  FiAlertTriangle
} from "react-icons/fi";
import SendPayment from "./components/SendPayment";
import FraudScanner from "./components/FraudScanner";
import ScamAlerts from "./components/ScamAlerts";
import TransactionHistory from "./components/TransactionHistory";
import TrustDashboard from "./components/TrustDashboard";
import { seedTransactions } from "./data/seedTransactions";

const TABS = [
  { id: "send", label: "Send Payment", shortLabel: "Send", icon: <FiSend className="w-4.5 h-4.5" />, desc: "Send & analyze" },
  { id: "scan", label: "Fraud Scanner", shortLabel: "Scan", icon: <FiSearch className="w-4.5 h-4.5" />, desc: "Scan messages" },
  { id: "alerts", label: "Scam Alerts", shortLabel: "Alerts", icon: <FiBell className="w-4.5 h-4.5" />, desc: "Live scam alerts" },
  { id: "history", label: "History", shortLabel: "History", icon: <FiClock className="w-4.5 h-4.5" />, desc: "Past transactions" },
  { id: "trust", label: "Trust Score", shortLabel: "Trust", icon: <FiBarChart2 className="w-4.5 h-4.5" />, desc: "Your profile" },
];

export default function App() {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("trustlayer_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
  });
  const [activeTab, setActiveTab] = useState("send");
  const [transactions, setTransactions] = useState([...seedTransactions]);
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [tabError, setTabError] = useState(null);

  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey]);

  const handleTransactionAdd = useCallback((txn) => {
    setTransactions((prev) => [txn, ...prev]);
    setActiveTab("history");
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setTabError(null);
  };

  return (
    <div className="flex h-full bg-[#F9FAFB] relative text-text-primary">
      {/* ========== Desktop/Tablet Sidebar (≥ 768px) ========== */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 border-r border-gray-200 bg-white">
        {/* Sidebar Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-electric to-electric-dark flex items-center justify-center shadow-lg shadow-electric/20">
              <FiShield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-text-primary tracking-tight">
                TrustLayer
              </span>
              <p className="text-[10px] text-text-muted">AI Fraud Detection</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`sidebar-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? "bg-electric/10 text-electric border border-electric/20"
                    : "text-text-muted hover:text-text-secondary hover:bg-gray-100 border border-transparent"
                }`}
              >
                <span className={`transition-transform duration-200 ${isActive ? "text-electric scale-110" : "text-text-muted group-hover:scale-105"}`}>
                  {tab.icon}
                </span>
                <div>
                  <span className={`text-sm font-semibold ${isActive ? "text-electric-light" : ""}`}>
                    {tab.label}
                  </span>
                  <p className={`text-[10px] ${isActive ? "text-electric/60" : "text-text-muted"}`}>
                    {tab.desc}
                  </p>
                </div>
                {isActive && (
                  <div className="ml-auto w-1.5 h-6 bg-electric rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          {apiKey ? (
            <div className="flex items-center gap-2 px-2">
              <FiCpu className="w-3.5 h-3.5 text-risk-low animate-pulse" />
              <span className="text-[11px] font-medium text-risk-low">AI Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2">
              <FiCpu className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[11px] font-medium text-text-muted">No API Key</span>
            </div>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-text-secondary cursor-pointer transition-colors"
            title="Settings"
          >
            <FiSettings className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ========== Main Content Area ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="shrink-0 px-4 md:px-6 lg:px-8 pt-3 pb-2 flex items-center justify-between border-b border-gray-200 bg-white">
          {/* Mobile: show logo; Desktop: show page title */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-electric to-electric-dark flex items-center justify-center">
              <FiShield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-text-primary tracking-tight">
              TrustLayer
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-text-secondary">{TABS.find(t => t.id === activeTab)?.icon}</span>
            <h2 className="text-base font-bold text-text-primary">
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {apiKey ? (
              <span className="text-[9px] md:text-[11px] font-medium text-risk-low bg-risk-low/10 px-2 py-0.5 rounded-full border border-risk-low/20 flex items-center gap-1">
                <FiCpu className="w-2.5 h-2.5" />
                AI Active
              </span>
            ) : (
              <span className="text-[9px] md:text-[11px] font-medium text-text-muted bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-1">
                <FiCpu className="w-2.5 h-2.5" />
                No Key
              </span>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-text-secondary cursor-pointer transition-colors"
              title="Settings"
            >
              <FiSettings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-4 pt-4 md:px-6 lg:px-8 md:pt-6">
          <div className="max-w-3xl mx-auto">
            {/* Red Dismissible Banner */}
            {tabError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between animate-fade-in-up mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <FiAlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{tabError}</span>
                </div>
                <button
                  onClick={() => setTabError(null)}
                  className="text-red-500 hover:text-red-700 cursor-pointer p-0.5 flex items-center"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            )}

            <div key={activeTab} className="animate-fade-in-up">
              {activeTab === "send" && (
                <SendPayment
                  onTransactionAdd={handleTransactionAdd}
                  apiKey={apiKey}
                  setTabError={setTabError}
                />
              )}
              {activeTab === "scan" && (
                <FraudScanner
                  apiKey={apiKey}
                  setTabError={setTabError}
                />
              )}
              {activeTab === "alerts" && (
                <ScamAlerts
                  apiKey={apiKey}
                  setTabError={setTabError}
                />
              )}
              {activeTab === "history" && (
                <TransactionHistory transactions={transactions} />
              )}
              {activeTab === "trust" && (
                <TrustDashboard transactions={transactions} />
              )}
            </div>
          </div>
        </main>

        {/* ========== Mobile Bottom Tab Bar (< 768px) ========== */}
        <nav className="md:hidden shrink-0 border-t border-gray-200 bg-white/95 backdrop-blur-md">
          <div className="flex">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 relative transition-colors duration-200 cursor-pointer ${
                    isActive ? "text-electric" : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-electric rounded-full" />
                  )}
                  <span
                    className={`transition-transform duration-200 ${
                      isActive ? "text-electric scale-110" : "text-text-muted"
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span className="text-[10px] font-semibold">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
      </div>

      {/* ========== API Settings Modal ========== */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4">
          <div className="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-[420px] animate-scale-in border border-electric/20 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FiSettings className="w-5 h-5 text-text-secondary" /> Gemini API Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-text-muted hover:text-text-secondary cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Enter Gemini API Key
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <FiLock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-[#F3F4F6] border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors font-mono"
                  />
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Your key stays in browser memory only. Never stored.
                </p>
              </div>

              <button
                onClick={() => {
                  setApiKey(tempKey);
                  localStorage.setItem("trustlayer_api_key", tempKey);
                  setTabError(null);
                  setShowSettings(false);
                }}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-electric hover:bg-electric-dark text-white transition-all cursor-pointer shadow-lg shadow-electric/20"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
