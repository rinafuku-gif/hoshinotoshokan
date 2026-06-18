"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// All interaction sounds disabled — the library is a quiet place.
// Only ambient hum remains (user-toggled).

let audioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (!audioCtx && typeof window !== "undefined") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

// Silent — no click sounds in the library
export function playTap() {}
export function playReveal() {}
export function playTransition() {}

// Ambient background — gentle low hum (quieter, more atmospheric)
export function useAmbient() {
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode } | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(() => {
    const ctx = getAudioCtx();
    if (!ctx) return;

    if (nodesRef.current) {
      nodesRef.current.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      setTimeout(() => {
        nodesRef.current?.osc.stop();
        nodesRef.current?.lfo.stop();
        nodesRef.current = null;
      }, 600);
      setPlaying(false);
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(80, ctx.currentTime); // lower, more atmospheric
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime); // slower modulation
    lfoGain.gain.setValueAtTime(5, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.015, ctx.currentTime + 2); // quieter

    osc.start();
    lfo.start();
    nodesRef.current = { osc, gain, lfo };
    setPlaying(true);
  }, []);

  useEffect(() => {
    return () => {
      if (nodesRef.current) {
        try { nodesRef.current.osc.stop(); nodesRef.current.lfo.stop(); } catch {}
      }
    };
  }, []);

  return { playing, toggle };
}

export default function SoundToggle() {
  const { playing, toggle } = useAmbient();
  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors text-xs"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
      title={playing ? "サウンドOFF" : "サウンドON"}
    >
      {playing ? "♪" : "♪̸"}
    </button>
  );
}
