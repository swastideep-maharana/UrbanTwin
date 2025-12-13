"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Define the commands we understand
type CommandAction = {
  keywords: string[];
  action: () => void;
};

// Define types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  } & { length: number };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

// Extend Window interface for type safety
declare global {
  interface Window {
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export const useVoiceCommand = (commands: CommandAction[]) => {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window !== "undefined" && window.webkitSpeechRecognition) {
      const SpeechRecognitionConstructor = window.webkitSpeechRecognition;
      const rec = new SpeechRecognitionConstructor();
      rec.continuous = false; // Stop after one sentence
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        setLastTranscript(transcript);
        console.log("Heard:", transcript);

        // Check if the spoken text matches any command keywords
        commands.forEach((cmd) => {
          if (cmd.keywords.some((keyword) => transcript.includes(keyword))) {
            cmd.action();
            console.log("Executing command:", cmd.keywords[0]);
          }
        });
        setIsListening(false);
      };

      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error", e.error);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
      
      return () => {
        if (rec) rec.abort();
      };
    }
  }, [commands]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (err) {
        console.error("Error start listening:", err);
        setIsListening(false);
      }
    } else {
      alert("Voice control not supported in this browser (Try Chrome).");
    }
  }, []);

  return { isListening, lastTranscript, startListening };
};
