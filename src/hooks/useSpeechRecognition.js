import { useState, useRef, useCallback, useEffect } from "react";

/**
 * useSpeechRecognition — Production-ready, reusable hook supporting:
 * 1. OpenAI Whisper API (when trustlayer_openai_api_key is present in Settings)
 * 2. Native Browser Web Speech API fallback (when OpenAI API Key is missing)
 *
 * This dual-engine architecture guarantees maximum browser support (Safari, Firefox, Chrome)
 * while unlocking high-accuracy Hinglish/Hindi speech-to-text when Whisper is enabled.
 */
export default function useSpeechRecognition({
  onResult,
  onError,
  onEnd,
  lang = "hi-IN",
  debug = false,
  maxDuration = 15000,
} = {}) {
  const [isListening, setIsListening] = useState(false);

  // Stable callback refs to avoid recreating handlers
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onEndRef = useRef(onEnd);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  const log = useCallback((...args) => {
    if (debug) console.log("[SpeechRecognition]", ...args);
  }, [debug]);

  // ─────────────────────────────────────────────────────────────
  // 1. ENGINE DECISION
  // ─────────────────────────────────────────────────────────────
  const getOpenaiKey = () => {
    return localStorage.getItem("trustlayer_openai_api_key") || import.meta.env.VITE_OPENAI_API_KEY || "";
  };

  const isWhisperEnabled = () => {
    return !!getOpenaiKey();
  };

  // ─────────────────────────────────────────────────────────────
  // 2. WHISPER ENGINE (MediaRecorder + OpenAI API)
  // ─────────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const whisperTimeoutRef = useRef(null);
  const isTranscribingRef = useRef(false);

  const startWhisperRecording = async () => {
    log("Starting Whisper recording flow...");
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Detect supported container format
      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        options = { mimeType: "audio/ogg" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        log("MediaRecorder stopped. Preparing to transcribe...");
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Cleanup stream tracks immediately so the mic red dot indicator goes off
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Call Whisper API
        await sendToWhisper(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);

      // Auto-stop safety timeout
      whisperTimeoutRef.current = setTimeout(() => {
        log("Whisper safety timeout reached. Stopping recording...");
        stopWhisperRecording();
      }, maxDuration);

    } catch (err) {
      console.error("Failed to start Whisper recording:", err);
      onErrorRef.current?.("🎤 Failed to access microphone: " + err.message);
      setIsListening(false);
    }
  };

  const stopWhisperRecording = () => {
    if (whisperTimeoutRef.current) {
      clearTimeout(whisperTimeoutRef.current);
      whisperTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const sendToWhisper = async (audioBlob) => {
    const apiKey = getOpenaiKey();
    if (!apiKey) {
      onErrorRef.current?.("OpenAI API Key is missing. Whisper is disabled.");
      setIsListening(false);
      onEndRef.current?.();
      return;
    }

    isTranscribingRef.current = true;
    log("Sending request to OpenAI Whisper API...");
    try {
      const formData = new FormData();
      const fileExtension = audioBlob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([audioBlob], `whisper.${fileExtension}`, { type: audioBlob.type });

      formData.append("file", file);
      formData.append("model", "whisper-1");
      // Use language code hint
      const whisperLangHint = lang.startsWith("hi") ? "hi" : "en";
      formData.append("language", whisperLangHint);

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        let errMsg = `API error status ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.error?.message) {
            errMsg = errJson.error.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const result = await response.json();
      const text = result.text || "";
      log("Whisper transcription result:", text);

      if (text.trim()) {
        onResultRef.current?.(text, true);
      } else {
        onErrorRef.current?.("🎤 No speech detected. Please try again.");
      }
    } catch (err) {
      console.error("Whisper transcription failed:", err);
      onErrorRef.current?.("🌐 Whisper transcription failed: " + err.message);
    } finally {
      isTranscribingRef.current = false;
      setIsListening(false);
      onEndRef.current?.();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. BROWSER WEB SPEECH ENGINE (webkitSpeechRecognition Fallback)
  // ─────────────────────────────────────────────────────────────
  const recognitionRef = useRef(null);
  const nativeTimeoutRef = useRef(null);
  const langFallbackRef = useRef([lang, "en-IN", "en-US"]);
  const networkRetryRef = useRef(0);

  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  useEffect(() => {
    const chain = [lang];
    if (lang !== "en-IN") chain.push("en-IN");
    if (lang !== "en-US") chain.push("en-US");
    langFallbackRef.current = [...new Set(chain)];
  }, [lang]);

  const cleanupNative = useCallback(() => {
    if (nativeTimeoutRef.current) {
      clearTimeout(nativeTimeoutRef.current);
      nativeTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const checkNativeMicPermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: "microphone" });
        if (result.state === "denied") {
          onErrorRef.current?.("🎤 Microphone access is blocked. Please allow it in settings.");
          return false;
        }
      }
      return true;
    } catch (_) {
      return true;
    }
  };

  const startNativeRecognition = (langCode) => {
    cleanupNative();

    if (!SpeechRecognitionAPI) {
      onErrorRef.current?.("Speech recognition is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    log(`Starting native SpeechRecognition with lang="${langCode}"`);
    const rec = new SpeechRecognitionAPI();
    rec.lang = langCode;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onResultRef.current?.(finalTranscript, true);
      } else if (interimTranscript) {
        onResultRef.current?.(interimTranscript, false);
      }
    };

    rec.onerror = (event) => {
      const errorCode = event.error;
      log("Native recognition error:", errorCode);

      if (errorCode === "network") {
        if (networkRetryRef.current < 2) {
          networkRetryRef.current++;
          const delay = 500 * networkRetryRef.current;
          setTimeout(() => startNativeRecognition(langCode), delay);
          return;
        }
        onErrorRef.current?.("🌐 Voice recognition network error. Please try again.");
        cleanupNative();
        return;
      }

      const chain = langFallbackRef.current;
      const currentIdx = chain.indexOf(langCode);
      if (
        (errorCode === "language-not-supported" || errorCode === "no-speech") &&
        currentIdx >= 0 &&
        currentIdx < chain.length - 1
      ) {
        const nextLang = chain[currentIdx + 1];
        setTimeout(() => startNativeRecognition(nextLang), 150);
        return;
      }

      const ERROR_MESSAGES = {
        "not-allowed": "🎤 Microphone access denied. Please allow microphone permissions.",
        "no-speech": "🎤 No speech detected. Speak clearly.",
        "audio-capture": "🎤 Microphone not found.",
        "service-not-allowed": "🎤 Speech service blocked. Please use Chrome or Edge.",
        "aborted": null
      };

      const userMsg = ERROR_MESSAGES[errorCode];
      if (userMsg !== undefined) {
        if (userMsg !== null) onErrorRef.current?.(userMsg);
      } else {
        onErrorRef.current?.(`🎤 Voice recognition error (${errorCode}).`);
      }
      cleanupNative();
    };

    rec.onend = () => {
      log("Native recognition session ended.");
      if (nativeTimeoutRef.current) {
        clearTimeout(nativeTimeoutRef.current);
        nativeTimeoutRef.current = null;
      }
      setIsListening(false);
      recognitionRef.current = null;
      onEndRef.current?.();
    };

    recognitionRef.current = rec;
    setIsListening(true);

    try {
      rec.start();
      nativeTimeoutRef.current = setTimeout(() => {
        log("Native safety timeout reached. Stopping...");
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (_) {}
        }
      }, maxDuration);
    } catch (e) {
      console.error("Native start throw:", e);
      onErrorRef.current?.("🎤 Failed to start voice input.");
      cleanupNative();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. PUBLIC API INTERFACE
  // ─────────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (isListening || isTranscribingRef.current) return;

    if (isWhisperEnabled()) {
      await startWhisperRecording();
    } else {
      networkRetryRef.current = 0;
      const hasPermission = await checkNativeMicPermission();
      if (!hasPermission) return;
      startNativeRecognition(langFallbackRef.current[0]);
    }
  }, [isListening, lang]);

  const stopListening = useCallback(() => {
    if (isWhisperEnabled()) {
      stopWhisperRecording();
    } else {
      if (nativeTimeoutRef.current) {
        clearTimeout(nativeTimeoutRef.current);
        nativeTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup Whisper
      if (whisperTimeoutRef.current) clearTimeout(whisperTimeoutRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Cleanup Native
      cleanupNative();
    };
  }, [cleanupNative]);

  // Hook supports Whisper on all modern browsers (via MediaRecorder), or Native fallback where available
  const supported = true;

  return { isListening, startListening, stopListening, supported };
}
