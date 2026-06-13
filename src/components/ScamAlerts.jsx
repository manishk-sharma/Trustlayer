import React, { useState, useEffect, useCallback } from "react";
import { fetchScamAlerts } from "../api/api";
import { FiBell, FiRefreshCw, FiAlertTriangle, FiShield } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";

export default function ScamAlerts({ apiKey, demoMode, setTabError }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const loadAlerts = useCallback(async () => {
    if (!apiKey && !demoMode) {
      setTabError(t.noKeyError);
      return;
    }
    setLoading(true);
    setTabError(null);
    const res = await fetchScamAlerts(apiKey);
    setLoading(false);
    if (res.success) {
      setData(res.data);
    } else {
      setTabError(res.error);
    }
  }, [apiKey, demoMode, setTabError, t]);

  useEffect(() => {
    // If demoMode toggles or key changes, clear old data so it reloads correctly
    setData(null);
  }, [apiKey, demoMode]);

  useEffect(() => {
    if (!data && (apiKey || demoMode)) {
      loadAlerts();
    }
  }, [data, apiKey, demoMode, loadAlerts]);

  return (
    <div className="animate-fade-in-up space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <FiBell className="w-5 h-5 text-electric animate-bounce" /> {t.alertsTitle}
          </h1>
          <p className="text-xs text-text-muted">{t.alertsSubtitle}</p>
        </div>
        <button
          onClick={loadAlerts}
          disabled={loading}
          className="p-2.5 rounded-xl bg-navy-800 border border-navy-700 hover:bg-navy-700 transition-colors cursor-pointer disabled:opacity-40"
          title="Refresh Alerts"
        >
          <FiRefreshCw className={`w-4 h-4 text-text-secondary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading Skeletal state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card rounded-2xl p-5 border border-gray-200 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded-full w-1/4" />
                <div className="h-6 bg-gray-200 rounded-xl w-16" />
              </div>
              <div className="h-3 bg-gray-200 rounded-full w-full" />
              <div className="h-3 bg-gray-200 rounded-full w-2/3" />
              <div className="h-8 bg-blue-50/50 rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Alert Feed items */}
      {!loading && data && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] text-text-muted font-semibold uppercase tracking-wider px-1">
            <span>{t.alertsGrounding}</span>
            <span>{t.alertsLastUpdated}: {data.last_updated}</span>
          </div>
          
          <div className="space-y-3.5">
            {data.alerts && data.alerts.map((alert, index) => {
              const isHigh = alert.severity === "HIGH";
              return (
                <div
                  key={index}
                  className={`glass-card rounded-2xl p-5 border ${
                    isHigh ? 'border-risk-high/30 bg-risk-high/5' : 'border-risk-medium/30 bg-risk-medium/5'
                  } space-y-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isHigh ? 'bg-risk-high/15 text-risk-high' : 'bg-risk-medium/15 text-risk-medium'
                      }`}>
                        <FiAlertTriangle className="w-2.5 h-2.5" />
                        {alert.severity} {t.alertsSeverity}
                      </span>
                      <h3 className="text-base font-bold text-text-primary mt-2">{alert.title}</h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-navy-800 border border-navy-700 rounded-xl text-text-secondary shrink-0">
                      {alert.category}
                    </span>
                  </div>
                  
                  <p className="text-sm text-text-secondary leading-relaxed">{alert.summary}</p>
                  
                  <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 border border-blue-100/50">
                    <FiShield className="w-4 h-4 text-electric shrink-0 mt-0.5" />
                    <p className="text-xs text-electric-light font-medium leading-relaxed">
                      <span className="font-bold">{t.alertsProtectionTip}</span> {alert.tip}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State / Trigger */}
      {!loading && !data && (
        <div className="text-center py-16 glass-card rounded-2xl border border-dashed border-gray-200 p-6">
          <FiBell className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-primary font-semibold">{t.alertsNoAlerts}</p>
          <p className="text-xs text-text-muted mt-1">
            {apiKey ? t.alertsNoAlertsHint : t.alertsNoKey}
          </p>
          <button
            onClick={loadAlerts}
            className="mt-4 px-5 py-2.5 bg-electric text-white font-semibold rounded-xl text-xs hover:bg-electric-dark transition-colors cursor-pointer shadow-lg shadow-electric/10"
          >
            {t.alertsFetch}
          </button>
        </div>
      )}
    </div>
  );
}
