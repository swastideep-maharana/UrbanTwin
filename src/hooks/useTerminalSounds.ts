"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * useTerminalSounds
 * Procedural Audio Engine for UrbanTwin Cyber-Terminal
 */
export function useTerminalSounds() {
  const audioCtx = useRef<AudioContext | null>(null);
  const humOscillator = useRef<OscillatorNode | null>(null);
  const humGain = useRef<GainNode | null>(null);
  const initialized = useRef(false);

  const initAudio = useCallback(() => {
    if (initialized.current) return;
    
    try {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 1. Create Ambient Server Hum (Low-Frequency Loop)
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(45, audioCtx.current.currentTime);
      
      // Add subtle LFO to the hum frequency for "Hydraulic/Mechanical" feel
      const lfo = audioCtx.current.createOscillator();
      const lfoGain = audioCtx.current.createGain();
      lfo.frequency.setValueAtTime(0.5, audioCtx.current.currentTime);
      lfoGain.gain.setValueAtTime(2, audioCtx.current.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      gain.gain.setValueAtTime(0, audioCtx.current.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, audioCtx.current.currentTime + 2); // Very subtle

      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      
      osc.start();
      humOscillator.current = osc;
      humGain.current = gain;
      initialized.current = true;
    } catch (e) {
      console.warn("Audio Context init failed:", e);
    }
  }, []);

  const playChirp = useCallback((type: "select" | "hover" | "alert" = "select") => {
    if (!audioCtx.current) return;
    if (audioCtx.current.state === "suspended") audioCtx.current.resume();

    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();

    osc.type = "square"; // Industrial feel
    
    switch (type) {
      case "select":
        osc.frequency.setValueAtTime(880, audioCtx.current.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.current.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.1);
        break;
      case "hover":
        osc.frequency.setValueAtTime(1200, audioCtx.current.currentTime);
        gain.gain.setValueAtTime(0.02, audioCtx.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.05);
        break;
      case "alert":
        osc.frequency.setValueAtTime(220, audioCtx.current.currentTime);
        osc.frequency.setValueAtTime(440, audioCtx.current.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.current.currentTime + 0.3);
        break;
    }

    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.3);
  }, []);

  useEffect(() => {
    // Resume audio context on first interaction (Browser policy)
    const handleInteraction = () => {
      initAudio();
      if (audioCtx.current?.state === "suspended") {
        audioCtx.current.resume();
      }
    };

    window.addEventListener("mousedown", handleInteraction);
    return () => {
      window.removeEventListener("mousedown", handleInteraction);
      if (humOscillator.current) humOscillator.current.stop();
      if (audioCtx.current) audioCtx.current.close();
    };
  }, [initAudio]);

  return { playChirp, initAudio };
}
