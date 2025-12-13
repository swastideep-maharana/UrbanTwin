"use client";

import { useState, useEffect, useCallback } from "react";

// Define the commands we understand
type CommandAction = {
  keywords: string[];
  action: () => void;
};

export const useVoiceCommand = (commands: CommandAction[]) => {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false; // Stop after one sentence
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        setLastTranscript(transcript);
        console.log("Heard:", transcript);

        // Check if the spoken text matches any command keywords
        commands.forEach((cmd) => {
          if (cmd.keywords.some((keyword) => transcript.includes(keyword))) {
            cmd.action();
          }
        });
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      setRecognition(rec);
    }
  }, [commands]);

  const startListening = useCallback(() => {
    if (recognition) {
      setIsListening(true);
      recognition.start();
    } else {
      alert("Voice control not supported in this browser (Try Chrome).");
    }
  }, [recognition]);

  return { isListening, lastTranscript, startListening };
};
