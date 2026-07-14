import { useState, useRef, useCallback, useEffect } from "react";

export type ConnectionState = "connecting" | "connected" | "disconnected";

interface VoiceOptions {
  onTranscript: (text: string) => void;
  handsFree?: boolean;
  wakeWord?: string;
  silenceTimeout?: number; // ms of silence before auto-send
  onListeningChange?: (listening: boolean) => void;
}

export function useVoice(options: VoiceOptions) {
  const { onTranscript, handsFree = false, wakeWord = "alba", silenceTimeout = 3000, onListeningChange } = options;
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const listeningRef = useRef(false);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setVoiceSupported(supported);
  }, []);

  const startListening = useCallback(() => {
    if (!voiceSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t;
        } else {
          interimTranscript += t;
        }
      }
      setVoiceText(finalTranscriptRef.current + interimTranscript);

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const text = finalTranscriptRef.current.trim();
        if (!text) return;

        // Check for wake word
        const lower = text.toLowerCase();
        if (lower.startsWith(wakeWord + " ")) {
          const cmd = text.slice(wakeWord.length + 1).trim();
          if (cmd) {
            onTranscript(cmd);
            finalTranscriptRef.current = "";
            setVoiceText("");
          }
        } else if (lower === wakeWord) {
          // Just wake word, keep listening
          finalTranscriptRef.current = "";
          setVoiceText("");
        } else {
          // Send directly
          onTranscript(text);
          finalTranscriptRef.current = "";
          setVoiceText("");
        }

        // Stop or keep listening based on mode
        if (!handsFree) {
          recognition.stop();
          setListening(false);
          listeningRef.current = false;
          onListeningChange?.(false);
        }
      }, silenceTimeout);
    };

    recognition.onerror = () => {
      setListening(false);
      listeningRef.current = false;
      onListeningChange?.(false);
    };

    recognition.onend = () => {
      if (handsFree && listeningRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
    listeningRef.current = true;
    onListeningChange?.(true);
    setVoiceText("");
    finalTranscriptRef.current = "";
  }, [voiceSupported, handsFree, wakeWord, silenceTimeout, onTranscript, onListeningChange]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setListening(false);
    listeningRef.current = false;
    setVoiceText("");
    finalTranscriptRef.current = "";
    onListeningChange?.(false);
  }, [onListeningChange]);

  const toggleMic = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  return { listening, voiceText, voiceSupported, startListening, stopListening, toggleMic };
}
