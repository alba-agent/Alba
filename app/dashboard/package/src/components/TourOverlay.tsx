import { useState, useEffect, useCallback } from "react";

const TOUR_KEY = "alba_tour_done";

interface TourStep {
  title: string;
  description: string;
  target: string; // CSS selector for the highlighted element
  position: "bottom" | "top" | "left" | "right";
}

const STEPS: TourStep[] = [
  { title: "Welcome to ALBA", description: "Your personal AI assistant. Everything runs locally on your machine.", target: ".glow-accent", position: "right" },
  { title: "Navigation", description: "Use the sidebar to navigate between Dashboard, Chat, Agents, Files, and more.", target: "aside", position: "right" },
  { title: "Chat", description: "Talk to ALBA, use voice commands, and see real-time tool cards for every action.", target: "a[href='/chat']", position: "right" },
  { title: "Quick Commands", description: "Press Cmd+K anytime to open the command palette and quickly navigate or run actions.", target: "body", position: "bottom" },
  { title: "Settings", description: "Configure AI models, voice, appearance, and more in Settings.", target: "a[href='/settings']", position: "right" },
];

export default function TourOverlay() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) setTimeout(() => setActive(true), 500);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "true");
    setActive(false);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }, [step, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  if (!active) return null;

  const s = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[9999]" onClick={dismiss} />
      {/* Tooltip */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] glass rounded-xl p-5 max-w-sm w-full border border-alba-border/50 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-alba-muted uppercase tracking-wider">Step {step + 1} of {STEPS.length}</span>
          <button onClick={dismiss} className="text-[10px] text-alba-muted hover:text-white transition-colors">Skip</button>
        </div>
        <h3 className="text-base font-semibold mb-1">{s.title}</h3>
        <p className="text-sm text-alba-muted leading-relaxed mb-4">{s.description}</p>
        {/* Progress bar */}
        <div className="h-1 bg-alba-border rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-alba-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <button onClick={prev} disabled={step === 0} className="px-3 py-1.5 rounded-lg text-xs text-alba-muted hover:text-white disabled:opacity-30 transition-colors">Back</button>
          <button onClick={next} className="px-4 py-1.5 rounded-lg bg-alba-accent text-alba-bg text-xs font-medium hover:bg-alba-accent/90 transition-colors">
            {step < STEPS.length - 1 ? "Next" : "Got it!"}
          </button>
        </div>
      </div>
    </>
  );
}