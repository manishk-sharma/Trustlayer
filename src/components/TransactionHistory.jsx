import React, { useState, useEffect } from "react";
import { RiskBadge } from "./ui/RiskComponents";
import { FiSearch, FiX, FiChevronDown, FiInbox, FiInfo, FiAlertTriangle } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";

export default function TransactionHistory({ transactions }) {
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("trustlayer_search_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const addToHistory = (query) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem("trustlayer_search_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Debounced auto-save to search history as the user types
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return;

    const timer = setTimeout(() => {
      addToHistory(trimmed);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const removeFromHistory = (e, queryToRemove) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== queryToRemove);
      localStorage.setItem("trustlayer_search_history", JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("trustlayer_search_history");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    addToHistory(searchQuery);
  };

  const filteredTransactions = transactions.filter((txn) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      txn.recipient.toLowerCase().includes(query) ||
      txn.note.toLowerCase().includes(query) ||
      txn.risk_level.toLowerCase().includes(query) ||
      (txn.fraud_type && txn.fraud_type.toLowerCase().includes(query))
    );
  });

  return (
    <div className="animate-fade-in-up space-y-5 pb-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-text-primary">{t.historyTitle}</h1>
        <p className="text-xs text-text-muted">{t.historyCount(transactions.length)}</p>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-2">
        {[
          { label: t.historyLow, count: transactions.filter((tx) => tx.risk_level === "LOW").length, textColor: "text-risk-low" },
          { label: t.historyMed, count: transactions.filter((tx) => tx.risk_level === "MEDIUM").length, textColor: "text-risk-medium" },
          { label: t.historyHigh, count: transactions.filter((tx) => tx.risk_level === "HIGH").length, textColor: "text-risk-high" },
        ].map((stat) => (
          <div key={stat.label} className="flex-1 glass-card rounded-xl p-2.5 text-center border border-navy-700">
            <p className={`text-lg font-bold tabular-nums ${stat.textColor}`}>{stat.count}</p>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="space-y-2">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.historySearchPlaceholder}
              className="w-full bg-navy-800 border border-navy-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer flex items-center justify-center p-0.5">
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
          <button id="history-search-submit" type="submit" className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-electric text-white hover:bg-electric-dark transition-colors cursor-pointer">
            {t.historySearch}
          </button>
        </form>

        {/* Search History Chips */}
        {searchHistory.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
            <span className="text-text-muted font-medium">{t.historyRecent}</span>
            {searchHistory.map((query, index) => (
              <div key={index} onClick={() => setSearchQuery(query)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy-800 border border-navy-700 text-text-secondary hover:text-text-primary hover:border-electric/30 cursor-pointer transition-colors">
                <span>{query}</span>
                <button type="button" onClick={(e) => removeFromHistory(e, query)} className="text-text-muted hover:text-risk-high cursor-pointer flex items-center justify-center p-0.5 rounded-full hover:bg-navy-700 transition-colors">
                  <FiX className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={clearHistory} className="text-text-muted hover:text-text-secondary hover:underline cursor-pointer ml-auto text-[11px]">
              {t.historyClearAll}
            </button>
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className="space-y-2.5">
        {filteredTransactions.map((txn, index) => (
          <div key={txn.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
            <button
              onClick={() => toggleExpand(txn.id)}
              className="w-full text-left glass-card rounded-xl p-4 border border-navy-700 hover:border-electric/20 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary truncate">{txn.recipient}</span>
                    <RiskBadge level={txn.risk_level} />
                  </div>
                  <p className="text-xs text-text-muted mt-1 truncate">{txn.note}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums text-text-primary">₹{txn.amount.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{txn.timestamp}</p>
                </div>
              </div>
              <div className="flex items-center justify-center mt-2">
                <FiChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${expandedId === txn.id ? "rotate-180" : ""}`} />
              </div>
            </button>

            {/* Expanded Details */}
            {expandedId === txn.id && (
              <div className="animate-fade-in-up mt-1 ml-2 mr-2">
                <div className="bg-navy-900 rounded-xl p-4 space-y-3 border border-navy-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">{t.historyRiskScore}</span>
                    <span className={`text-sm font-bold tabular-nums ${txn.risk_level === "LOW" ? "text-risk-low" : txn.risk_level === "MEDIUM" ? "text-risk-medium" : "text-risk-high"}`}>
                      {txn.risk_score}/100
                    </span>
                  </div>
                  {txn.fraud_type && txn.fraud_type !== "None" && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">{t.historyFraudType}</span>
                      <span className="text-xs font-medium text-risk-high bg-risk-high/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FiAlertTriangle className="w-3 h-3 text-risk-high" /> {txn.fraud_type}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-xs text-text-muted">{t.historyAiAnalysis}</span>
                    <p className="text-xs text-text-secondary leading-relaxed">{txn.explanation}</p>
                  </div>
                  <div className="flex items-start gap-2 bg-electric/10 rounded-lg p-2.5">
                    <FiInfo className="w-4 h-4 text-electric shrink-0 mt-0.5" />
                    <p className="text-[11px] text-electric-light leading-relaxed">{txn.recommendation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-12">
          <FiInbox className="w-10 h-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">{t.historyEmpty}</p>
        </div>
      )}

      {transactions.length > 0 && filteredTransactions.length === 0 && (
        <div className="text-center py-12 glass-card rounded-xl p-6 border border-navy-700">
          <FiSearch className="w-10 h-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-primary font-semibold">{t.historyNoMatch}</p>
          <p className="text-xs text-text-muted mt-1">{t.historyNoMatchHint(searchQuery)}</p>
          <button onClick={() => setSearchQuery("")} className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-navy-800 text-text-secondary hover:bg-navy-700 transition-colors cursor-pointer border border-navy-700 flex items-center gap-1 mx-auto">
            <FiX className="w-3 h-3" /> {t.historyClearSearch}
          </button>
        </div>
      )}
    </div>
  );
}
