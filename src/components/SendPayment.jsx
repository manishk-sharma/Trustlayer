import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { analyzePayment, fetchScamAlerts } from "../api/api";
import { ResultCard, LoadingCard, ErrorCard } from "./ui/RiskComponents";
import { FiShield, FiMic, FiBell, FiCheck, FiX, FiUser, FiSearch, FiCamera, FiDownload, FiGrid, FiShare2, FiClock } from "react-icons/fi";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { useLanguage } from "../context/LanguageContext";
import QRCode from "qrcode";
import { Html5Qrcode } from "html5-qrcode";

// ── Mock UPI user directory for verification simulation ──
const UPI_USERS = {
  "rahul@upi": { name: "Rahul Sharma", bank: "SBI", avatar: "RS" },
  "priya@okicici": { name: "Priya Patel", bank: "ICICI Bank", avatar: "PP" },
  "amit@paytm": { name: "Amit Kumar", bank: "Paytm Payments Bank", avatar: "AK" },
  "sneha@ybl": { name: "Sneha Gupta", bank: "Yes Bank", avatar: "SG" },
  "arjun@axl": { name: "Arjun Reddy", bank: "Axis Bank", avatar: "AR" },
  "neha@sbi": { name: "Neha Singh", bank: "State Bank of India", avatar: "NS" },
  "vikram@hdfc": { name: "Vikram Desai", bank: "HDFC Bank", avatar: "VD" },
  "kavita@kotak": { name: "Kavita Joshi", bank: "Kotak Mahindra Bank", avatar: "KJ" },
  "ravi@upi": { name: "Ravi Verma", bank: "Punjab National Bank", avatar: "RV" },
  "deepa@ibl": { name: "Deepa Nair", bank: "IDBI Bank", avatar: "DN" },
  "shop@upi": { name: "ShopMart India", bank: "HDFC Bank", avatar: "SM" },
  "priya@ybl": { name: "Priya Sharma", bank: "Yes Bank", avatar: "PS" },
  "lottery-claim@paytm": { name: "KBC Prize Desk", bank: "Paytm Payments Bank", avatar: "KP" },
  "rahul@okicici": { name: "Rahul Mehta", bank: "ICICI Bank", avatar: "RM" },
};

// ── Recent contacts for quick selection ──
const RECENT_CONTACTS = [
  { name: "Rahul", upiId: "rahul@upi", avatar: "RS", color: "#3B82F6" },
  { name: "Priya", upiId: "priya@okicici", avatar: "PP", color: "#8B5CF6" },
  { name: "Amit", upiId: "amit@paytm", avatar: "AK", color: "#10B981" },
  { name: "Sneha", upiId: "sneha@ybl", avatar: "SG", color: "#F59E0B" },
  { name: "Arjun", upiId: "arjun@axl", avatar: "AR", color: "#EF4444" },
];

// ── Quick amount chips ──
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

// ── Demo QR codes for testing ──
const DEMO_QR_STRINGS = [
  { label: "🛒 Shop Payment", labelHi: "🛒 दुकान भुगतान", upi: "upi://pay?pa=shop@upi&pn=ShopMart India&am=299&tn=Online purchase" },
  { label: "👩 Friend Split", labelHi: "👩 दोस्त स्प्लिट", upi: "upi://pay?pa=priya@ybl&pn=Priya Sharma&am=500&tn=Dinner split" },
  { label: "🚨 Suspicious", labelHi: "🚨 संदिग्ध", upi: "upi://pay?pa=lottery-claim@paytm&pn=KBC Prize Desk&am=999&tn=Claim your prize processing fee" },
];

export default function SendPayment({ onTransactionAdd, apiKey, demoMode, setTabError }) {
  const { lang, t } = useLanguage();
  
  // ── UPI ID Lookup State ──
  const [upiId, setUpiId] = useState("");
  const [upiVerified, setUpiVerified] = useState(false);
  const [upiUser, setUpiUser] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [upiError, setUpiError] = useState(null);
  
  // ── Payment State ──
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [voiceError, setVoiceError] = useState(null);
  
  // ── Payment Processing State ──
  const [paymentStage, setPaymentStage] = useState(null);
  const [processingStep, setProcessingStep] = useState(0);
  
  // ── Payment QR State ──
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [paymentQRUrl, setPaymentQRUrl] = useState("");
  const [txnId, setTxnId] = useState("");
  const [qrExpired, setQrExpired] = useState(false);
  
  // ── QR Scanner State ──
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanSuccess, setScanSuccess] = useState("");
  const html5QrRef = useRef(null);
  
  // ── My QR State ──
  const [showMyQR, setShowMyQR] = useState(false);
  const [myQRDataUrl, setMyQRDataUrl] = useState("");
  const myUpiId = "user@trustlayer";
  
  // ── Demo QR State ──
  const [demoQRUrls, setDemoQRUrls] = useState({});
  const [showDemoQRs, setShowDemoQRs] = useState(false);
  
  // ── Alerts ──
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

  // ═══════════════════════════════════════════════════
  // QR SCANNER
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (!showScanner) return;

    let mounted = true;
    const startScanner = async () => {
      try {
        html5QrRef.current = new Html5Qrcode("qr-reader");
        await html5QrRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (mounted) handleQRResult(decodedText);
          },
          () => {
            // Per-frame scan errors — ignore
          }
        );
      } catch (err) {
        if (mounted) {
          setScanError(
            lang === "hi"
              ? "कैमरा एक्सेस अनुमति दें। या QR इमेज अपलोड करें।"
              : "Camera access denied. Please allow camera permission or upload a QR image."
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (html5QrRef.current) {
        try {
          if (html5QrRef.current.isScanning) {
            html5QrRef.current.stop().catch(() => {});
          }
        } catch (e) { /* ignore */ }
      }
    };
  }, [showScanner]);

  const stopScanner = () => {
    if (html5QrRef.current) {
      try {
        if (html5QrRef.current.isScanning) {
          html5QrRef.current.stop().catch(() => {});
        }
      } catch (e) { /* ignore */ }
    }
  };

  const handleQRResult = (text) => {
    try {
      if (text.startsWith("upi://")) {
        // UPI QR format: upi://pay?pa=upiid@bank&pn=Name&am=Amount&tn=Note
        const url = new URL(text.replace("upi://pay?", "https://x.com?"));
        const pa = url.searchParams.get("pa");
        const pn = url.searchParams.get("pn");
        const am = url.searchParams.get("am");
        const tn = url.searchParams.get("tn");

        if (pa) {
          setUpiId(pa);
          const knownUser = UPI_USERS[pa.toLowerCase().trim()];
          if (knownUser) {
            setUpiUser(knownUser);
          } else if (pn) {
            setUpiUser({
              name: pn,
              bank: "UPI",
              avatar: pn.slice(0, 2).toUpperCase(),
            });
          } else {
            const name = pa.split("@")[0];
            const cap = name.charAt(0).toUpperCase() + name.slice(1);
            setUpiUser({
              name: cap,
              bank: "Linked Bank",
              avatar: cap.substring(0, 2).toUpperCase(),
            });
          }
          if (am) setAmount(am);
          if (tn) setNote(tn);
          setUpiVerified(true);
          setUpiError(null);
        }
      } else if (text.includes("@")) {
        // Plain UPI ID in QR
        setUpiId(text.trim());
        handleVerifyUpiDirect(text.trim());
      } else {
        setScanError(
          lang === "hi"
            ? "अमान्य QR कोड। UPI भुगतान कोड नहीं।"
            : "Invalid QR code. Not a UPI payment code."
        );
        return;
      }

      // Close scanner and show success
      stopScanner();
      setShowScanner(false);
      setScanError("");
      setScanSuccess(lang === "hi" ? "✓ QR स्कैन सफल!" : "✓ QR scanned successfully!");
      setTimeout(() => setScanSuccess(""), 3000);
    } catch (err) {
      setScanError(
        lang === "hi"
          ? "QR कोड पढ़ नहीं सका। पुनः प्रयास करें।"
          : "Could not read QR code. Try again."
      );
    }
  };

  const handleQRImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const scanner = new Html5Qrcode("qr-reader-hidden");
      const result = await scanner.scanFile(file, true);
      handleQRResult(result);
    } catch (err) {
      setScanError(
        lang === "hi"
          ? "इमेज से QR पढ़ नहीं सका। स्पष्ट फोटो प्रयास करें।"
          : "Could not read QR from image. Try a clearer photo."
      );
    }
  };

  // ═══════════════════════════════════════════════════
  // MY QR CODE GENERATION
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (!showMyQR) return;
    const upiString = `upi://pay?pa=${myUpiId}&pn=TrustLayer User&cu=INR`;
    QRCode.toDataURL(upiString, {
      width: 280,
      margin: 2,
      color: {
        dark: "#1D4ED8",
        light: "#FFFFFF",
      },
    }).then((url) => setMyQRDataUrl(url))
      .catch(() => setMyQRDataUrl(""));
  }, [showMyQR]);

  // ── Generate demo QR codes ──
  useEffect(() => {
    if (!showDemoQRs) return;
    const generateAll = async () => {
      const urls = {};
      for (const demo of DEMO_QR_STRINGS) {
        try {
          urls[demo.upi] = await QRCode.toDataURL(demo.upi, {
            width: 160,
            margin: 1,
            color: { dark: "#24292F", light: "#FFFFFF" },
          });
        } catch {
          urls[demo.upi] = "";
        }
      }
      setDemoQRUrls(urls);
    };
    generateAll();
  }, [showDemoQRs]);

  // ═══════════════════════════════════════════════════
  // UPI ID VERIFICATION
  // ═══════════════════════════════════════════════════
  const handleVerifyUpi = async () => {
    if (!upiId.trim() || !upiId.includes("@")) {
      setUpiError(lang === "hi" ? "कृपया वैध UPI ID दर्ज करें (जैसे name@upi)" : "Please enter a valid UPI ID (e.g. name@upi)");
      return;
    }
    await handleVerifyUpiDirect(upiId);
  };

  const handleVerifyUpiDirect = async (id) => {
    setVerifying(true);
    setUpiError(null);
    setUpiVerified(false);
    setUpiUser(null);
    
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
    
    const user = UPI_USERS[id.toLowerCase().trim()];
    if (user) {
      setUpiUser(user);
      setUpiVerified(true);
    } else {
      const name = id.split("@")[0];
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      setUpiUser({
        name: capitalizedName,
        bank: "Linked Bank",
        avatar: capitalizedName.substring(0, 2).toUpperCase(),
      });
      setUpiVerified(true);
    }
    setVerifying(false);
  };

  const handleSelectContact = (contact) => {
    setUpiId(contact.upiId);
    const user = UPI_USERS[contact.upiId];
    if (user) {
      setUpiUser(user);
      setUpiVerified(true);
      setUpiError(null);
    }
  };

  // ═══════════════════════════════════════════════════
  // AI FRAUD ANALYSIS
  // ═══════════════════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!upiVerified || !amount || !note.trim()) return;

    if (!apiKey && !demoMode) {
      setTabError(t.noKeyError);
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setTabError(null);

    const recipientName = upiUser?.name || upiId;
    const res = await analyzePayment(recipientName, amount, note, apiKey, lang);

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

  // ═══════════════════════════════════════════════════
  // PAYMENT QR GENERATION
  // ═══════════════════════════════════════════════════
  const generatePaymentQR = async () => {
    const newTxnId = "TXN" + Date.now().toString().slice(-10);
    setTxnId(newTxnId);

    const upiString = [
      `upi://pay`,
      `?pa=${upiId}`,
      `&pn=${encodeURIComponent(upiUser?.name || "Recipient")}`,
      `&am=${amount}`,
      `&tn=${encodeURIComponent(note || "Payment")}`,
      `&tr=${newTxnId}`,
      `&cu=INR`,
    ].join("");

    try {
      const url = await QRCode.toDataURL(upiString, {
        width: 280,
        margin: 2,
        color: { dark: "#1D4ED8", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      });
      setPaymentQRUrl(url);
    } catch {
      setPaymentQRUrl("");
    }
  };

  // ═══════════════════════════════════════════════════
  // PROCEED → PROCESSING → PAYMENT QR
  // ═══════════════════════════════════════════════════
  const handleProceed = async () => {
    setPaymentStage("processing");
    setProcessingStep(0);

    // Processing steps with specified timing
    const steps = [
      { delay: 700, step: 1 },
      { delay: 700, step: 2 },
      { delay: 800, step: 3 },
      { delay: 800, step: 4 },
    ];

    for (const s of steps) {
      await new Promise((r) => setTimeout(r, s.delay));
      setProcessingStep(s.step);
    }

    // Transition to Payment QR screen
    await new Promise((r) => setTimeout(r, 200));
    setPaymentStage(null);
    await generatePaymentQR();
    setQrExpired(false);
    setShowPaymentQR(true);

    // Record transaction in history
    const txn = {
      id: Date.now(),
      recipient: upiUser?.name || upiId,
      amount: Number(amount),
      note,
      risk_level: result?.risk_level || "LOW",
      risk_score: result?.risk_score || 10,
      fraud_type: result?.fraud_type || "None",
      explanation: result?.explanation || "Transaction completed successfully",
      recommendation: result?.recommendation || "No issues detected",
      timestamp: "Just now",
    };
    onTransactionAdd(txn);
  };

  const resetForm = () => {
    setUpiId("");
    setUpiVerified(false);
    setUpiUser(null);
    setUpiError(null);
    setAmount("");
    setNote("");
    setResult(null);
    setError(null);
    setVoiceError(null);
    setPaymentStage(null);
    setProcessingStep(0);
    setShowPaymentQR(false);
    setPaymentQRUrl("");
    setTxnId("");
    setQrExpired(false);
    setScanSuccess("");
  };

  const processingSteps = lang === "hi" 
    ? ["बैंक से कनेक्ट हो रहा है...", "लेन-देन सत्यापित हो रहा है...", "UPI सर्वर से पुष्टि...", "भुगतान पूरा हो रहा है..."]
    : ["Connecting to bank...", "Verifying transaction...", "Confirming with UPI server...", "Completing payment..."];

  // ═══════════════════════════════════════════════════
  // PAYMENT PROCESSING FULL-SCREEN OVERLAY
  // ═══════════════════════════════════════════════════
  if (paymentStage) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/95 backdrop-blur-xl p-4">
        <div className="w-full max-w-sm">
          {paymentStage === "processing" && (
            <div className="animate-fade-in-up text-center space-y-8">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-navy-700" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-electric animate-spin" style={{ animationDuration: "0.8s" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">💸</span>
                </div>
              </div>
              
              <div>
                <p className="text-3xl font-bold text-text-primary tabular-nums">₹{Number(amount).toLocaleString("en-IN")}</p>
                <p className="text-sm text-text-muted mt-1">
                  {lang === "hi" ? "भेज रहे हैं" : "Sending to"} <span className="text-text-secondary font-semibold">{upiUser?.name}</span>
                </p>
              </div>
              
              <div className="space-y-3 text-left max-w-xs mx-auto">
                {processingSteps.map((step, i) => {
                  const isCompleted = i < processingStep;
                  const isActive = i === processingStep;
                  
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 transition-all duration-200 ${
                        isCompleted || isActive ? "opacity-100" : "opacity-40"
                      }`}
                    >
                      {isCompleted ? (
                        <div className="w-5 h-5 rounded-full bg-risk-low/20 flex items-center justify-center shrink-0">
                          <FiCheck className="w-3 h-3 text-risk-low" />
                        </div>
                      ) : isActive ? (
                        <div
                          className="w-5 h-5 rounded-full border-2 border-electric-dark border-t-transparent animate-spin shrink-0"
                          style={{ animationDuration: "0.6s" }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-navy-700 shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          isActive
                            ? "text-text-primary font-semibold"
                            : isCompleted
                            ? "text-text-secondary font-medium"
                            : "text-text-muted font-normal"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <p className="text-[10px] text-text-muted">
                {lang === "hi" ? "कृपया प्रतीक्षा करें, स्क्रीन बंद न करें" : "Please wait, do not close this screen"}
              </p>
            </div>
          )}



          {paymentStage === "failed" && (
            <div className="animate-scale-in text-center space-y-6">
              <div className="mx-auto w-24 h-24 rounded-full bg-risk-high/20 border-2 border-risk-high/40 flex items-center justify-center">
                <FiX className="w-10 h-10 text-risk-high" strokeWidth={3} />
              </div>
              
              <div>
                <p className="text-lg font-bold text-risk-high">
                  {lang === "hi" ? "भुगतान विफल" : "Payment Failed"}
                </p>
                <p className="text-sm text-text-muted mt-1">
                  {lang === "hi" ? "कृपया पुनः प्रयास करें" : "Please try again"}
                </p>
              </div>
              
              <button
                onClick={resetForm}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-navy-700 hover:bg-navy-600 text-text-secondary transition-all cursor-pointer"
              >
                {lang === "hi" ? "वापस जाएं" : "Go Back"}
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // ═══════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="animate-fade-in-up space-y-5 pb-6">
      {/* Hidden element for QR image scanning fallback */}
      <div id="qr-reader-hidden" className="hidden" />

      {/* Header with My QR button */}
      <div className="flex items-center justify-between">
        <div className="text-center md:text-left space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">{t.sendTitle}</h1>
          <p className="text-xs md:text-sm text-text-muted">{t.sendSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDemoQRs(!showDemoQRs)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-navy-700 text-text-muted hover:border-electric/40 hover:text-electric text-xs font-semibold cursor-pointer transition-all duration-200"
            title={lang === "hi" ? "डेमो QR कोड" : "Demo QR Codes"}
          >
            <FiGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === "hi" ? "डेमो QR" : "Demo QR"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowMyQR(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-navy-700 text-text-muted hover:border-electric/40 hover:text-electric text-xs font-semibold cursor-pointer transition-all duration-200"
            title={lang === "hi" ? "मेरा QR कोड" : "My QR Code"}
          >
            <span className="text-sm">⬛</span>
            <span className="hidden sm:inline">{lang === "hi" ? "मेरा QR" : "My QR"}</span>
          </button>
        </div>
      </div>

      {/* ═══ QR Scan Success Banner ═══ */}
      {scanSuccess && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-risk-low/10 border border-risk-low/25 text-risk-low animate-fade-in-up">
          <FiCheck className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">{scanSuccess}</span>
        </div>
      )}

      {/* ═══ Demo QR Codes Panel ═══ */}
      {showDemoQRs && (
        <div className="glass-card rounded-2xl p-4 border border-navy-700 animate-fade-in-up space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiGrid className="w-4 h-4 text-electric" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                {lang === "hi" ? "QR टेस्ट कोड" : "Test QR Codes"}
              </h3>
            </div>
            <button
              onClick={() => setShowDemoQRs(false)}
              className="text-text-muted hover:text-text-secondary cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-text-muted">
            {lang === "hi"
              ? "इन QR कोड को अपने फोन कैमरे से स्कैन करें, या 📷 Scan QR बटन दबाकर UPI भुगतान प्रवाह का परीक्षण करें"
              : "Scan these QR codes with your phone camera, or use the 📷 Scan QR button to test the UPI payment flow"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEMO_QR_STRINGS.map((demo, i) => (
              <div key={i} className="bg-navy-800 rounded-xl p-3 flex flex-col items-center gap-2 border border-navy-700">
                <div className="bg-white p-2 rounded-lg">
                  {demoQRUrls[demo.upi] ? (
                    <img src={demoQRUrls[demo.upi]} alt={demo.label} className="w-28 h-28" />
                  ) : (
                    <div className="w-28 h-28 flex items-center justify-center text-text-muted text-[10px]">
                      {lang === "hi" ? "बना रहे हैं..." : "Generating..."}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-text-secondary">
                  {lang === "hi" ? demo.labelHi : demo.label}
                </span>
                <button
                  type="button"
                  onClick={() => handleQRResult(demo.upi)}
                  className="w-full py-1.5 rounded-lg text-[10px] font-bold bg-electric/10 text-electric hover:bg-electric/20 border border-electric/20 transition-all cursor-pointer"
                >
                  {lang === "hi" ? "इसे भरें" : "Auto-fill this"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responsive grid: form + result side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Form Column */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* ═══ STEP 1: UPI ID Lookup ═══ */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {lang === "hi" ? "UPI ID" : "UPI ID"}
              </label>
              
              {/* Recent contacts */}
              {!upiVerified && (
                <div className="space-y-2">
                  <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                    {lang === "hi" ? "हाल के संपर्क" : "Recent Contacts"}
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {RECENT_CONTACTS.map((contact) => (
                      <button
                        key={contact.upiId}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        className="flex flex-col items-center gap-1.5 min-w-[56px] group cursor-pointer"
                      >
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-110 shadow-md"
                          style={{ backgroundColor: contact.color }}
                        >
                          {contact.avatar}
                        </div>
                        <span className="text-[10px] text-text-muted group-hover:text-text-secondary font-medium truncate max-w-[56px]">
                          {contact.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* UPI input + Scan QR button */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="send-upi-id"
                    type="text"
                    value={upiId}
                    onChange={(e) => {
                      setUpiId(e.target.value);
                      setUpiVerified(false);
                      setUpiUser(null);
                      setUpiError(null);
                    }}
                    placeholder={lang === "hi" ? "UPI ID दर्ज करें (जैसे name@upi)" : "Enter UPI ID (e.g. name@upi)"}
                    className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 pr-24 text-sm text-text-primary placeholder:text-text-muted focus:border-electric transition-colors"
                    disabled={upiVerified}
                  />
                  {!upiVerified ? (
                    <button
                      type="button"
                      onClick={handleVerifyUpi}
                      disabled={verifying || !upiId.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-electric hover:bg-electric-dark text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {verifying ? (
                        <span className="flex items-center gap-1.5">
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {lang === "hi" ? "जांच..." : "Verifying"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <FiSearch className="w-3 h-3" />
                          {lang === "hi" ? "सत्यापित करें" : "Verify"}
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setUpiVerified(false);
                        setUpiUser(null);
                        setUpiId("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                    >
                      {lang === "hi" ? "बदलें" : "Change"}
                    </button>
                  )}
                </div>
                
                {/* Scan QR Button */}
                {!upiVerified && (
                  <button
                    type="button"
                    onClick={() => { setScanError(""); setShowScanner(true); }}
                    className="px-3 py-3 bg-navy-800 border border-navy-700 rounded-xl text-lg hover:border-electric/50 hover:bg-navy-700 transition-all cursor-pointer shrink-0 flex items-center justify-center"
                    title={lang === "hi" ? "QR कोड स्कैन करें" : "Scan QR Code"}
                  >
                    📷
                  </button>
                )}
              </div>
              
              {/* UPI Error */}
              {upiError && (
                <p className="text-[10px] text-risk-high font-medium animate-fade-in-up flex items-center gap-1">
                  <FiX className="w-3 h-3" /> {upiError}
                </p>
              )}
              
              {/* Verified user card */}
              {upiVerified && upiUser && (
                <div className="flex items-center gap-3 bg-risk-low/8 border border-risk-low/20 rounded-xl px-4 py-3 animate-fade-in-up">
                  <div className="w-10 h-10 rounded-full bg-electric/20 border border-electric/30 flex items-center justify-center text-electric text-sm font-bold">
                    {upiUser.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{upiUser.name}</p>
                    <p className="text-[10px] text-text-muted">{upiUser.bank}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-risk-low/15 text-risk-low">
                    <FiCheck className="w-3 h-3" />
                    <span className="text-[10px] font-bold">{lang === "hi" ? "सत्यापित" : "Verified"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ STEP 2: Amount with Quick Chips ═══ */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {t.amountLabel}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-text-muted font-semibold">₹</span>
                <input
                  id="send-amount"
                  type="number"
                  min="1"
                  max="100000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl pl-9 pr-4 py-3.5 text-lg text-text-primary placeholder:text-text-muted focus:border-electric transition-colors tabular-nums font-semibold"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(String(qa))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      Number(amount) === qa
                        ? "bg-electric/15 text-electric border-electric/30"
                        : "bg-navy-800 text-text-muted border-navy-700 hover:border-navy-600 hover:text-text-secondary"
                    }`}
                  >
                    ₹{qa.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            {/* ═══ STEP 3: Payment Note ═══ */}
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
              disabled={loading || !upiVerified || !amount || !note.trim()}
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

      {/* ═══════ PAYMENT QR SCREEN ═══════ */}
      {showPaymentQR && createPortal(
        <div className="fixed inset-0 z-50 bg-navy-900/98 backdrop-blur-xl overflow-y-auto">
          <div className="flex items-start justify-center py-8 px-4 min-h-screen">
            <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

              {/* ── LEFT COLUMN: Header + QR ── */}
              <div className="flex flex-col items-center">

                {/* Success header */}
                <div className="flex flex-col items-center mb-5 animate-scale-in">
                  <div className="relative w-14 h-14 mb-2.5">
                    <div className="absolute inset-0 rounded-full bg-risk-low/15 animate-ping" style={{ animationDuration: "1.5s" }} />
                    <div className="relative w-14 h-14 rounded-full bg-risk-low/20 border-2 border-risk-low/40 flex items-center justify-center">
                      <FiCheck className="w-7 h-7 text-risk-low" strokeWidth={3} />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-text-primary">
                    {lang === "hi" ? "भुगतान शुरू हुआ" : "Payment Initiated"}
                  </h2>
                  <p className="text-text-muted text-xs mt-0.5">
                    {lang === "hi" ? "QR शेयर या स्कैन करें" : "Share or scan QR to complete"}
                  </p>
                </div>

                {/* Amount */}
                <p className="text-3xl font-bold text-text-primary tabular-nums mb-1 animate-fade-in-up">
                  ₹{Number(amount).toLocaleString("en-IN")}
                </p>

                {/* Recipient */}
                <div className="flex items-center gap-2 mb-5 animate-fade-in-up">
                  <div className="w-6 h-6 bg-electric/20 rounded-full flex items-center justify-center text-electric font-bold text-[10px] border border-electric/30">
                    {upiUser?.avatar}
                  </div>
                  <p className="text-text-secondary text-xs">
                    {upiUser?.name}
                    <span className="text-text-muted ml-1">• {upiId}</span>
                  </p>
                </div>

                {/* QR Code Card */}
                <div className="bg-navy-950 rounded-2xl border border-navy-700 p-4 w-full max-w-[280px] flex flex-col items-center animate-fade-in-up shadow-xl mb-4">
                  <p className="text-text-muted text-[9px] mb-2.5 uppercase tracking-[0.2em] font-semibold">
                    {lang === "hi" ? "UPI से भुगतान करने के लिए स्कैन करें" : "Scan to Pay via UPI"}
                  </p>

                  <div className="relative">
                    {paymentQRUrl ? (
                      <>
                        <div className="bg-white p-2.5 rounded-xl">
                          <img
                            src={paymentQRUrl}
                            alt="UPI QR"
                            className="w-48 h-48 rounded-lg"
                          />
                        </div>
                        {/* Center shield logo */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-9 h-9 bg-white rounded-lg shadow-lg border border-electric/20 flex items-center justify-center">
                            <FiShield className="w-4 h-4 text-electric" />
                          </div>
                        </div>
                        {/* QR Expired overlay */}
                        {qrExpired && (
                          <div className="absolute inset-0 bg-navy-900/90 rounded-xl flex flex-col items-center justify-center gap-2.5">
                            <p className="text-risk-high font-bold text-sm">
                              {lang === "hi" ? "QR समाप्त हो गया" : "QR Expired"}
                            </p>
                            <button
                              onClick={() => { setQrExpired(false); generatePaymentQR(); }}
                              className="px-3 py-1.5 bg-electric hover:bg-electric-dark text-white text-xs rounded-lg font-semibold transition-all cursor-pointer"
                            >
                              🔄 {lang === "hi" ? "नया QR बनाएं" : "Generate New QR"}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-48 h-48 bg-navy-800 rounded-xl flex items-center justify-center">
                        <div className="w-7 h-7 border-2 border-electric border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* UPI ID pill */}
                  <div className="mt-2.5 w-full text-center bg-electric/10 rounded-lg py-2 px-3 border border-electric/20">
                    <p className="text-electric font-mono text-xs font-semibold">{upiId}</p>
                    <p className="text-text-muted text-[9px] mt-0.5">{upiUser?.bank}</p>
                  </div>
                </div>

                {/* Expiry Timer */}
                {!qrExpired && (
                  <QRExpiryTimer
                    lang={lang}
                    onExpire={() => setQrExpired(true)}
                  />
                )}
              </div>

              {/* ── RIGHT COLUMN: Details + Actions ── */}
              <div className="flex flex-col gap-4 animate-fade-in-up mt-0 md:mt-20">

                {/* Transaction Details */}
                <div className="bg-navy-950 rounded-xl px-5 py-4 border border-navy-700">
                  {[
                    { label: lang === "hi" ? "लेन-देन ID" : "Txn ID", value: txnId },
                    { label: lang === "hi" ? "नोट" : "Note", value: note || "—" },
                    { label: lang === "hi" ? "स्थिति" : "Status", value: lang === "hi" ? "⏳ स्कैन की प्रतीक्षा" : "⏳ Awaiting scan" },
                    { label: lang === "hi" ? "समय" : "Time", value: new Date().toLocaleTimeString("en-IN") },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between py-2.5 border-b border-navy-800 last:border-0"
                    >
                      <span className="text-text-muted text-xs">{label}</span>
                      <span className="text-text-secondary text-xs font-medium font-mono">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (!paymentQRUrl) return;
                      const a = document.createElement("a");
                      a.href = paymentQRUrl;
                      a.download = `pay-${txnId}.png`;
                      a.click();
                    }}
                    disabled={!paymentQRUrl}
                    className="flex-1 py-3 bg-electric hover:bg-electric-dark text-white rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <FiDownload className="w-4 h-4" />
                    {lang === "hi" ? "QR सेव करें" : "Save QR"}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (paymentQRUrl && navigator.share) {
                          const res = await fetch(paymentQRUrl);
                          const blob = await res.blob();
                          const file = new File([blob], `pay-${upiUser?.name || "payment"}.png`, { type: "image/png" });
                          await navigator.share({
                            title: `${lang === "hi" ? "भुगतान करें" : "Pay"} ₹${amount} ${lang === "hi" ? "को" : "to"} ${upiUser?.name}`,
                            files: [file],
                          });
                        } else {
                          const upiLink = `upi://pay?pa=${upiId}&am=${amount}&tn=${encodeURIComponent(note || "Payment")}`;
                          await navigator.clipboard.writeText(upiLink);
                          alert(lang === "hi" ? "UPI लिंक कॉपी हुआ!" : "UPI link copied!");
                        }
                      } catch (e) { /* ignore */ }
                    }}
                    className="flex-1 py-3 bg-navy-800 text-text-secondary rounded-xl text-sm font-semibold hover:bg-navy-700 transition-all cursor-pointer border border-navy-700 flex items-center justify-center gap-1.5"
                  >
                    <FiShare2 className="w-4 h-4" />
                    {lang === "hi" ? "शेयर" : "Share"}
                  </button>
                </div>

                {/* Done — New Payment */}
                <button
                  onClick={resetForm}
                  className="w-full py-3 text-text-muted text-sm border border-navy-700 rounded-xl hover:bg-navy-800 transition-colors cursor-pointer font-medium"
                >
                  {lang === "hi" ? "पूर्ण — नया भुगतान" : "Done — New Payment"}
                </button>

                {/* Footer */}
                <p className="text-text-muted/50 text-[10px] text-center">
                  🔒 {lang === "hi" ? "NPCI UPI द्वारा सुरक्षित • TrustLayer AI संरक्षित" : "Secured by NPCI UPI • TrustLayer AI Protected"}
                </p>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════ QR SCANNER MODAL ═══════ */}
      {showScanner && createPortal(
        <div className="fixed inset-0 z-50 bg-navy-900/95 backdrop-blur-sm flex flex-col items-center justify-center">
          {/* Header */}
          <div className="flex items-center justify-between w-full max-w-sm px-4 mb-5">
            <h3 className="text-text-primary font-semibold text-lg">
              {lang === "hi" ? "UPI QR स्कैन करें" : "Scan UPI QR Code"}
            </h3>
            <button
              onClick={() => { stopScanner(); setShowScanner(false); setScanError(""); }}
              className="text-text-muted hover:text-text-primary text-2xl cursor-pointer transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Camera viewfinder */}
          <div className="relative w-72 h-72 rounded-2xl overflow-hidden border-2 border-electric/50 shadow-lg shadow-electric/10">
            <div id="qr-reader" className="w-full h-full qr-reader-container" />
            
            {/* Corner markers overlay */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-3 left-3 w-8 h-8 border-t-[3px] border-l-[3px] border-electric rounded-tl-lg" />
              <div className="absolute top-3 right-3 w-8 h-8 border-t-[3px] border-r-[3px] border-electric rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-[3px] border-l-[3px] border-electric rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-[3px] border-r-[3px] border-electric rounded-br-lg" />
              
              {/* Scanning line animation */}
              <div className="animate-qr-scan-line absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-electric to-transparent opacity-70" />
            </div>
          </div>

          <p className="text-text-muted text-xs mt-5 text-center px-8 max-w-sm">
            {lang === "hi"
              ? "UPI QR कोड पर कैमरा इंगित करें — भुगतान विवरण ऑटो-भर जाएंगे"
              : "Point camera at a UPI QR code to auto-fill payment details"}
          </p>

          {scanError && (
            <div className="mt-3 px-4 py-2.5 rounded-xl bg-risk-high/10 border border-risk-high/25 max-w-sm mx-4">
              <p className="text-risk-high text-xs text-center font-medium">{scanError}</p>
            </div>
          )}

          {/* Upload QR image fallback */}
          <label className="mt-5 px-4 py-2.5 border border-navy-700 rounded-xl text-text-muted text-xs cursor-pointer hover:border-electric/40 hover:text-electric transition-all flex items-center gap-2 font-semibold">
            <span>📁</span>
            <span>{lang === "hi" ? "QR इमेज अपलोड करें" : "Upload QR Image Instead"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQRImageUpload}
            />
          </label>

          {/* Demo: simulate scan */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 px-4 max-w-sm">
            <p className="w-full text-center text-[10px] text-text-muted mb-1">
              {lang === "hi" ? "या डेमो QR आज़माएं:" : "Or try a demo scan:"}
            </p>
            {DEMO_QR_STRINGS.map((demo, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQRResult(demo.upi)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-navy-800 text-text-secondary border border-navy-700 hover:border-electric/30 hover:text-electric transition-all cursor-pointer"
              >
                {lang === "hi" ? demo.labelHi : demo.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ═══════ MY QR CODE MODAL ═══════ */}
      {showMyQR && createPortal(
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-navy-950 rounded-3xl p-6 w-full max-w-xs border border-navy-700 text-center animate-scale-in space-y-4">
            <h3 className="text-text-primary font-bold text-lg">
              {lang === "hi" ? "मेरा पेमेंट QR" : "My Payment QR"}
            </h3>
            <p className="text-text-muted text-xs">
              {lang === "hi" ? "कोई भी इसे स्कैन करके आपको भुगतान कर सकता है" : "Anyone can scan this to pay you"}
            </p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl inline-block">
              {myQRDataUrl ? (
                <img src={myQRDataUrl} alt="My UPI QR" className="w-56 h-56" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-text-muted text-sm">
                  {lang === "hi" ? "बना रहे हैं..." : "Generating..."}
                </div>
              )}
            </div>

            {/* UPI ID label */}
            <div className="bg-navy-800 rounded-xl px-4 py-2.5 border border-navy-700">
              <p className="text-electric font-mono text-sm font-semibold">{myUpiId}</p>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 text-risk-low text-xs font-medium">
              <FiShield className="w-3.5 h-3.5" />
              <span>{lang === "hi" ? "TrustLayer द्वारा सत्यापित" : "Verified by TrustLayer"}</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!myQRDataUrl) return;
                  const a = document.createElement("a");
                  a.href = myQRDataUrl;
                  a.download = "my-upi-qr.png";
                  a.click();
                }}
                disabled={!myQRDataUrl}
                className="flex-1 py-2.5 bg-electric hover:bg-electric-dark text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <FiDownload className="w-3.5 h-3.5" />
                {lang === "hi" ? "डाउनलोड" : "Download"}
              </button>
              <button
                onClick={() => setShowMyQR(false)}
                className="flex-1 py-2.5 bg-navy-800 text-text-secondary rounded-xl text-xs font-semibold hover:bg-navy-700 transition-colors cursor-pointer border border-navy-700"
              >
                {lang === "hi" ? "बंद करें" : "Close"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Live Scam Alerts Section */}
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
// QR EXPIRY COUNTDOWN TIMER
// ==========================================
const QRExpiryTimer = ({ lang, onExpire }) => {
  const [secs, setSecs] = useState(600); // 10 minutes

  useEffect(() => {
    const t = setInterval(() => {
      setSecs((p) => {
        if (p <= 1) {
          clearInterval(t);
          onExpire();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const urgent = secs < 60;

  return (
    <div
      className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full mb-4 border transition-colors ${
        urgent
          ? "bg-risk-high/10 text-risk-high border-risk-high/20"
          : "bg-electric/10 text-electric border-electric/20"
      }`}
    >
      <FiClock className="w-3.5 h-3.5" />
      <span>
        {lang === "hi" ? "QR समाप्त होगा" : "QR expires in"} {m}:{s.toString().padStart(2, "0")}
      </span>
    </div>
  );
};

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
