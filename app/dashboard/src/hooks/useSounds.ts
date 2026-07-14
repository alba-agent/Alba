import { useCallback, useRef } from "react";

// Tiny audio cues using Web Audio API — no external files needed
let audioCtx: AudioContext | null = null;
function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.08) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio not available */ }
}

export type SoundType = "message" | "success" | "error" | "tool_done";

export function useSounds(enabled: boolean = true) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const play = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;
    switch (type) {
      case "message": playTone(880, 0.12, "sine", 0.05); break;
      case "success": playTone(660, 0.08, "sine", 0.06); setTimeout(() => playTone(880, 0.12, "sine", 0.06), 100); break;
      case "error": playTone(220, 0.2, "sawtooth", 0.04); break;
      case "tool_done": playTone(440, 0.06, "sine", 0.04); break;
    }
  }, []);

  return { play };
}