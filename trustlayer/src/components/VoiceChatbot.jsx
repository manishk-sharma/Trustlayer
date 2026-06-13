import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiX, FiSend, FiMic, FiVolume2, FiVolumeX, FiTrash2, FiChevronDown, FiShield } from "react-icons/fi";
import { callChatbot } from "../api/api";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { useLanguage } from "../context/LanguageContext";

export default function VoiceChatbot({ apiKey }) {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("trustlayer_bot_mute") === "true";
  });
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const chatEndRef = useRef(null);
  const isOpenRef = useRef(isOpen);
  const pendingFinalRef = useRef(null);

  // Keep isOpenRef in sync
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // ──────────────────────────────────────────────
  // Speech Recognition via the robust custom hook
  // ──────────────────────────────────────────────
  const handleSendMessageRef = useRef(null);

  const {
    isListening: isRecording,
    startListening: startVoiceInput,
    stopListening: stopVoiceInput,
    supported: speechSupported
  } = useSpeechRecognition({
    lang: lang === "hi" ? "hi-IN" : "en-IN",
    onResult: (transcript, isFinal) => {
      setInputText(transcript);
      if (isFinal) {
        // Store the final transcript to be sent after recording ends
        pendingFinalRef.current = transcript;
      }
    },
    onError: (msg) => {
      setError(msg);
    },
    onEnd: () => {
      // When recognition ends, check if we have a pending final transcript
      if (pendingFinalRef.current) {
        const text = pendingFinalRef.current;
        pendingFinalRef.current = null;
        // Use setTimeout to ensure state updates have settled
        setTimeout(() => {
          handleSendMessageRef.current?.(text);
        }, 50);
      }
    },
  });

  // Initialize and dynamically update Chat History with localized Greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "greeting",
          role: "ai",
          text: t.chatWelcome,
          timestamp: getFormattedTime()
        }
      ]);
    } else {
      setMessages(prev => prev.map(msg => {
        if (msg.id === "greeting" || msg.id.startsWith("greeting-")) {
          return { ...msg, text: t.chatWelcome };
        }
        return msg;
      }));
    }
  }, [t.chatWelcome]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Set hasUnread to false when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
    }
  }, [isOpen]);

  const getFormattedTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Voice Output
  const speakResponse = useCallback((text) => {
    if (isMuted) return;
    
    // Strip emojis, backticks, asterisks, and markdown formatting
    let clean = text
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "") // remove emojis
      .replace(/[*_`#]/g, "") // remove markdown syntax
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [isMuted, lang]);

  const handleMuteToggle = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem("trustlayer_bot_mute", nextMute ? "true" : "false");
    if (nextMute) {
      window.speechSynthesis.cancel();
    }
  };

  const handleClearChat = () => {
    window.speechSynthesis.cancel();
    setMessages([
      {
        id: "greeting-" + Date.now(),
        role: "ai",
        text: t.chatWelcome,
        timestamp: getFormattedTime()
      }
    ]);
    setError(null);
  };

  const handleSendMessage = useCallback(async (textToSend) => {
    const input = textToSend || inputText;
    if (!input.trim()) return;

    setError(null);
    setInputText("");

    const userMsg = {
      id: "user-" + Date.now(),
      role: "user",
      text: input,
      timestamp: getFormattedTime()
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Prepare history for API (keep most recent 20 messages to prevent token overflow)
    const historyForApi = messages
      .slice(-20)
      .map(msg => ({ role: msg.role, text: msg.text }));

    const res = await callChatbot(historyForApi, input, apiKey, lang);
    setLoading(false);

    if (res.success) {
      const aiMsg = {
        id: "ai-" + Date.now(),
        role: "ai",
        text: res.reply,
        timestamp: getFormattedTime()
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakResponse(res.reply);

      if (!isOpenRef.current) {
        setHasUnread(true);
      }
    } else {
      setError(res.error);
    }
  }, [inputText, messages, apiKey, speakResponse]);

  // Keep the ref updated for use in the onEnd callback
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Contextual chips generation
  const getContextualChips = () => {
    if (messages.length <= 1) {
      return t.chatChips || [];
    }
    
    // Check last AI message keywords
    const lastAiMsg = [...messages].reverse().find(m => m.role === "ai");
    if (!lastAiMsg) return [];

    const text = lastAiMsg.text.toLowerCase();
    if (text.includes("scam") || text.includes("danger") || text.includes("lottery") || text.includes("block")) {
      return lang === "hi" 
        ? ["स्कैम रिपोर्ट करें", "ब्लॉक कैसे करें?", "किसे कॉल करें?"] 
        : ["Report this scam", "How to block?", "Who to call?"];
    }
    if (text.includes("upi") || text.includes("pin") || text.includes("payment")) {
      return lang === "hi" 
        ? ["UPI सुरक्षा टिप्स", "दूसरा पेमेंट जांचें", "RBI सुरक्षा नियम"] 
        : ["UPI safety tips", "Check another payment", "RBI safety rules"];
    }
    return lang === "hi" 
      ? ["और बताएं", "दूसरा संदेश जांचें", "सुरक्षित रहने के टिप्स"] 
      : ["Tell me more", "Check another message", "Stay safe tips"];
  };

  return (
    <>
      {/* Floating Action Button (FAB) - Electric Blue matching the website theme */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[80px] right-4 z-40 w-14 h-14 bg-electric hover:bg-electric-dark text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-electric/30 cursor-pointer active:scale-95 transition-all duration-200"
        title="TrustGuard AI Chatbot"
      >
        {isOpen ? (
          <FiChevronDown className="w-7 h-7" />
        ) : (
          <FiMic className="w-6 h-6 animate-pulse" />
        )}
        
        {/* Unread notification pulse */}
        {hasUnread && (
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border border-white animate-ping" />
        )}
        {hasUnread && (
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border border-white" />
        )}
      </button>

      {/* Floating Chat Box Window (Compact styling matched to website's light theme cards) */}
      <div
        className={`fixed z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.15)] flex flex-col overflow-hidden
          bottom-[150px] right-4 md:right-6 w-[calc(100%-32px)] md:w-[380px] h-[500px] md:h-[530px]`}
        style={{
          transform: isOpen ? "translateY(0) scale(1)" : "translateY(50px) scale(0.95)",
          opacity: isOpen ? "1" : "0",
          pointerEvents: isOpen ? "auto" : "none"
        }}
      >
        {/* Header - White background, gray borders, native brand lock logo */}
        <div className="shrink-0 px-4 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            {/* Brand Shield Avatar in Header */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric to-electric-dark flex items-center justify-center text-white shadow-md shadow-electric/15 shrink-0">
              <FiShield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary leading-tight">{t.chatName}</h2>
              <p className="text-[10px] text-text-muted font-semibold mt-0.5">{t.chatSubtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Clear Chat */}
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors cursor-pointer"
              title={t.chatClear}
            >
              <FiTrash2 className="w-4 h-4" />
            </button>

            {/* Mute Toggle */}
            <button
              onClick={handleMuteToggle}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <FiVolumeX className="w-4 h-4 text-red-500" /> : <FiVolume2 className="w-4 h-4 text-electric" />}
            </button>

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 flex flex-col bg-[#F9FAFB]">
          {messages.map((msg) => {
            const isAi = msg.role === "ai";
            return (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${isAi ? "self-start" : "self-end flex-row-reverse"}`}
              >
                {/* Bot Shield Avatar next to bubble for AI replies */}
                {isAi ? (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-electric to-electric-dark flex items-center justify-center text-white shrink-0 mt-3.5 shadow-sm shadow-electric/10">
                    <FiShield className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <div className="w-1.5 shrink-0" />
                )}

                <div className="flex flex-col">
                  {/* Top user label */}
                  <span className="text-[10px] text-text-muted font-semibold mb-0.5 px-1">
                    {isAi ? t.chatName : (lang === "hi" ? "आप" : "You")}
                  </span>
                  
                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      isAi
                        ? "bg-white text-text-primary rounded-tl-none border border-gray-200"
                        : "bg-electric text-white rounded-tr-none"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    
                    {isAi && (
                      <div className="flex justify-end mt-1.5 border-t border-gray-100 pt-1.5">
                        <button
                          onClick={() => speakResponse(msg.text)}
                          className="px-2 py-0.5 rounded text-text-muted hover:text-text-primary bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
                          title={t.chatReplay}
                        >
                          <FiVolume2 className="w-3 h-3 text-electric" /> {t.chatReplay}
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] text-text-muted mt-1 px-1 ${isAi ? "text-left" : "text-right"}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator with Avatar */}
          {loading && (
            <div className="self-start flex gap-2 max-w-[85%]">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-electric to-electric-dark flex items-center justify-center text-white shrink-0 mt-3.5 shadow-sm shadow-electric/10">
                <FiShield className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted font-semibold mb-0.5 px-1">{t.chatName}</span>
                <div className="bg-white text-text-primary rounded-2xl rounded-tl-none px-4 py-3 border border-gray-200 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Error Message inside Drawer */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl self-center w-full max-w-[95%] text-center font-medium shadow-sm">
              {error}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggestion / Quick Reply Chips - White with blue borders and text */}
        {!loading && (
          <div className="px-4 py-2.5 flex gap-2 overflow-x-auto shrink-0 bg-white border-t border-gray-100 scrollbar-none">
            {getContextualChips().map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="px-3.5 py-1.5 rounded-full border border-electric/35 text-electric-light hover:bg-electric/5 bg-white text-xs font-semibold cursor-pointer shadow-sm transition-all whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Input Area - Pill-shaped search bar layout */}
        <div className="shrink-0 p-3.5 border-t border-gray-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Pill shaped wrapper */}
            <div className="flex-1 bg-gray-100 rounded-full border border-gray-200 px-4 py-2 flex items-center shadow-inner focus-within:border-electric focus-within:bg-white transition-all">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isRecording ? t.chatListening : t.chatPlaceholder}
                className="w-full bg-transparent text-text-primary border-none outline-none focus:outline-none focus:ring-0 text-sm placeholder:text-text-muted"
                disabled={loading}
              />
              
              {/* Mic Icon INSIDE the input pill */}
              {speechSupported ? (
                <button
                  type="button"
                  onMouseDown={() => {
                    pendingFinalRef.current = null;
                    startVoiceInput();
                  }}
                  onMouseUp={stopVoiceInput}
                  onMouseLeave={stopVoiceInput}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    pendingFinalRef.current = null;
                    startVoiceInput();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopVoiceInput();
                  }}
                  className={`p-1.5 rounded-full transition-all cursor-pointer mr-1 shrink-0 ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                  title="Hold to speak"
                >
                  <FiMic className="w-4 h-4" />
                </button>
              ) : (
                <span
                  className="p-1.5 mr-1 shrink-0 text-text-muted opacity-40 cursor-not-allowed"
                  title="Speech recognition not supported"
                >
                  <FiMic className="w-4 h-4" />
                </span>
              )}

              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="text-text-muted hover:text-text-secondary cursor-pointer p-0.5"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Send trigger */}
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="w-9.5 h-9.5 bg-electric hover:bg-electric-dark text-white rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm shrink-0"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
