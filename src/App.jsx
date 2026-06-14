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
  FiAlertTriangle,
  FiGlobe,
  FiSun,
  FiMoon
} from "react-icons/fi";
import SendPayment from "./components/SendPayment";
import FraudScanner from "./components/FraudScanner";
import ScamAlerts from "./components/ScamAlerts";
import TransactionHistory from "./components/TransactionHistory";
import TrustDashboard from "./components/TrustDashboard";
import { seedTransactions } from "./data/seedTransactions";
import VoiceChatbot from "./components/VoiceChatbot";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { useTheme } from "./context/ThemeContext";

function AppContent() {
  const { lang, toggleLang, t } = useLanguage();

  const TABS = [
    { id: "send", label: t.tabSend, shortLabel: t.tabSendShort, icon: <FiSend className="w-4.5 h-4.5" />, desc: t.tabSendDesc },
    { id: "scan", label: t.tabScan, shortLabel: t.tabScanShort, icon: <FiSearch className="w-4.5 h-4.5" />, desc: t.tabScanDesc },
    { id: "alerts", label: t.tabAlerts, shortLabel: t.tabAlertsShort, icon: <FiBell className="w-4.5 h-4.5" />, desc: t.tabAlertsDesc },
    { id: "history", label: t.tabHistory, shortLabel: t.tabHistoryShort, icon: <FiClock className="w-4.5 h-4.5" />, desc: t.tabHistoryDesc },
    { id: "trust", label: t.tabTrust, shortLabel: t.tabTrustShort, icon: <FiBarChart2 className="w-4.5 h-4.5" />, desc: t.tabTrustDesc },
  ];

  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("trustlayer_openrouter_api_key") || import.meta.env.VITE_OPENROUTER_API_KEY || "";
  });
  const [openaiKey, setOpenaiKey] = useState(() => {
    return localStorage.getItem("trustlayer_openai_api_key") || import.meta.env.VITE_OPENAI_API_KEY || "";
  });
  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem("trustlayer_demo_mode") === "true";
  });
  const [activeTab, setActiveTab] = useState("send");
  const [transactions, setTransactions] = useState([...seedTransactions]);
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempOpenaiKey, setTempOpenaiKey] = useState(openaiKey);
  const [tempDemoMode, setTempDemoMode] = useState(demoMode);
  const [tabError, setTabError] = useState(null);

  useEffect(() => {
    if (showSettings) {
      setTempKey(apiKey);
      setTempOpenaiKey(openaiKey);
      setTempDemoMode(demoMode);
    }
  }, [showSettings, apiKey, openaiKey, demoMode]);

  const handleTransactionAdd = useCallback((txn) => {
    setTransactions((prev) => [txn, ...prev]);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setTabError(null);
  };

  // Language toggle button component
  const LanguageToggle = ({ compact = false }) => (
    <button
      onClick={toggleLang}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-electric/30 text-electric hover:bg-electric/10 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 shrink-0"
      title={lang === "en" ? "Switch to Hindi" : "Switch to English"}
    >
      <FiGlobe className="w-3 h-3" />
      {!compact && <span>{lang === "en" ? "हिंदी" : "English"}</span>}
      {compact && <span>{lang === "en" ? "HI" : "EN"}</span>}
    </button>
  );

  // Theme toggle button component
  const ThemeToggle = ({ compact = false }) => {
    const { theme, toggleTheme } = useTheme();
    return (
      <button
        onClick={toggleTheme}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-electric/30 text-electric hover:bg-electric/10 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 shrink-0"
        title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
      >
        {theme === "light" ? <FiMoon className="w-3 h-3" /> : <FiSun className="w-3 h-3" />}
        {!compact && <span>{theme === "light" ? "Dark" : "Light"}</span>}
      </button>
    );
  };

  return (
    <div className="flex h-full bg-navy-900 relative text-text-primary">
      {/* ========== Desktop/Tablet Sidebar (≥ 768px) ========== */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 border-r border-navy-700 bg-navy-950">
        {/* Sidebar Header */}
        <div className="px-5 pt-5 pb-4 border-b border-navy-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-electric to-electric-dark flex items-center justify-center shadow-lg shadow-electric/20">
              <FiShield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-text-primary tracking-tight">
                {t.appName}
              </span>
              <p className="text-[10px] text-text-muted">{t.appSubtitle}</p>
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
                    : "text-text-muted hover:text-text-secondary hover:bg-navy-800 border border-transparent"
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
        <div className="px-4 py-3 border-t border-navy-700 flex items-center justify-between">
          {apiKey ? (
            <div className="flex items-center gap-2 px-2">
              <FiCpu className="w-3.5 h-3.5 text-risk-low animate-pulse" />
              <span className="text-[11px] font-medium text-risk-low">{t.aiActive}</span>
            </div>
          ) : demoMode ? (
            <div className="flex items-center gap-2 px-2">
              <FiCpu className="w-3.5 h-3.5 text-electric animate-pulse" />
              <span className="text-[11px] font-medium text-electric">{t.demoActive}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2">
              <FiCpu className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[11px] font-medium text-text-muted">{t.noKey}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <LanguageToggle compact />
            <ThemeToggle compact />
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl border border-navy-700 hover:bg-navy-800 text-text-secondary cursor-pointer transition-colors"
              title="Settings"
            >
              <FiSettings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========== Main Content Area ========== */}
      <div className="flex-1 flex flex-col min-w-0">
 
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-4 pt-4 md:px-6 lg:px-8 md:pt-6">
          <div className="max-w-3xl mx-auto">
            {/* Red Dismissible Banner */}
            {tabError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between animate-fade-in-up mb-4">
                <div className="flex items-center gap-2 text-sm flex-1 mr-2">
                  <FiAlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{tabError}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(tabError.toLowerCase().includes("key") ||
                    tabError.toLowerCase().includes("quota") ||
                    tabError.toLowerCase().includes("settings") ||
                    tabError.toLowerCase().includes("rate limit") ||
                    tabError.toLowerCase().includes("unauthorized") ||
                    tabError.toLowerCase().includes("invalid")) && (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer mr-1"
                    >
                      {t.configureKey}
                    </button>
                  )}
                  <button
                    onClick={() => setTabError(null)}
                    className="text-red-500 hover:text-red-700 cursor-pointer p-0.5 flex items-center"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div key={activeTab} className="animate-fade-in-up">
              {activeTab === "send" && (
                <SendPayment
                  onTransactionAdd={handleTransactionAdd}
                  apiKey={apiKey}
                  demoMode={demoMode}
                  setTabError={setTabError}
                />
              )}
              {activeTab === "scan" && (
                <FraudScanner
                  apiKey={apiKey}
                  demoMode={demoMode}
                  setTabError={setTabError}
                />
              )}
              {activeTab === "alerts" && (
                <ScamAlerts
                  apiKey={apiKey}
                  demoMode={demoMode}
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
        <nav className="md:hidden shrink-0 border-t border-navy-700 bg-navy-950/95 backdrop-blur-md">
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
            <div className="flex items-center justify-between pb-2 border-b border-navy-700">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FiSettings className="w-5 h-5 text-text-secondary" /> {t.settingsTitle}
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-text-muted hover:text-text-secondary cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

             <div className="space-y-4">
              {/* OpenRouter API Key */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t.apiKeyLabel}
                  </label>
                  {apiKey && (
                    <button
                      onClick={() => setTempKey("")}
                      className="text-[10px] text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                    >
                      {t.apiKeyClear}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <FiLock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder={tempDemoMode ? t.apiKeyOptional : t.apiKeyPlaceholder}
                    className="w-full bg-navy-800 border border-navy-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors font-mono"
                  />
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  {t.apiKeyNote}
                </p>
              </div>

              {/* OpenAI API Key */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t.openaiKeyLabel}
                  </label>
                  {openaiKey && (
                    <button
                      onClick={() => setTempOpenaiKey("")}
                      className="text-[10px] text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                    >
                      {t.apiKeyClear}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <FiLock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={tempOpenaiKey}
                    onChange={(e) => setTempOpenaiKey(e.target.value)}
                    placeholder={tempDemoMode ? t.apiKeyOptional : t.openaiKeyPlaceholder}
                    className="w-full bg-navy-800 border border-navy-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors font-mono"
                  />
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Required for OpenAI Whisper Speech-to-Text. Falls back to browser Web Speech API.
                </p>
              </div>

              {/* Demo Mode Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-navy-700">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text-secondary">{t.demoModeLabel}</span>
                  <span className="text-[10px] text-text-muted">{t.demoModeDesc}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTempDemoMode(!tempDemoMode)}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative flex items-center ${
                    tempDemoMode ? "bg-electric" : "bg-navy-600"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute ${
                      tempDemoMode ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={() => {
                  setApiKey(tempKey);
                  localStorage.setItem("trustlayer_openrouter_api_key", tempKey);
                  setOpenaiKey(tempOpenaiKey);
                  localStorage.setItem("trustlayer_openai_api_key", tempOpenaiKey);
                  setDemoMode(tempDemoMode);
                  localStorage.setItem("trustlayer_demo_mode", tempDemoMode ? "true" : "false");
                  setTabError(null);
                  setShowSettings(false);
                }}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-electric hover:bg-electric-dark text-white transition-all cursor-pointer shadow-lg shadow-electric/20"
              >
                {t.saveSettings}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating AI Voice Assistant Chatbot */}
      <VoiceChatbot apiKey={apiKey} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
