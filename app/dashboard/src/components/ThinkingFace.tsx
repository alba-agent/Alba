import { useEffect, useRef, useState } from "react";

interface ThinkingFaceProps {
  state: "idle" | "thinking" | "speaking";
  size?: "sm" | "md" | "lg";
}

export default function ThinkingFace({ state, size = "md" }: ThinkingFaceProps) {
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [mouthOpen, setMouthOpen] = useState(0);
  const [blink, setBlink] = useState(false);
  const intervalRef = useRef<any>(null);

  // Eye movement
  useEffect(() => {
    if (state === "thinking") {
      const iv = setInterval(() => {
        setEyePos({
          x: Math.sin(Date.now() / 300) * 3,
          y: Math.cos(Date.now() / 400) * 1.5,
        });
      }, 100);
      intervalRef.current = iv;
      return () => clearInterval(iv);
    } else if (state === "speaking") {
      const iv = setInterval(() => {
        setMouthOpen(Math.random() * 60 + 20);
        setEyePos({
          x: Math.sin(Date.now() / 500) * 1.5,
          y: 0,
        });
      }, 150);
      intervalRef.current = iv;
      return () => clearInterval(iv);
    } else {
      setEyePos({ x: 0, y: 0 });
      setMouthOpen(0);
    }
  }, [state]);

  // Random blink
  useEffect(() => {
    const blinkIv = setInterval(() => {
      if (state !== "speaking") {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }
    }, state === "thinking" ? 2000 : 4000);
    return () => clearInterval(blinkIv);
  }, [state]);

  // Blink during speaking occasionally
  useEffect(() => {
    if (state !== "speaking") return;
    const iv = setInterval(() => {
      if (Math.random() > 0.7) {
        setBlink(true);
        setTimeout(() => setBlink(false), 100);
      }
    }, 1500);
    return () => clearInterval(iv);
  }, [state]);

  const sizes = { sm: 40, md: 60, lg: 100 };
  const s = sizes[size];
  const eyeS = s * 0.08;
  const pupilS = s * 0.04;
  const eyeY = s * 0.35;
  const eyeSpacing = s * 0.25;
  const mouthY = s * 0.65;
  const cx = s / 2;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0" aria-label="ALBA face">
      {/* Face background */}
      <circle cx={cx} cy={cx} r={s * 0.45} fill="rgba(0,229,255,0.08)" className="transition-colors" />

      {/* Left eye */}
      <g transform={`translate(${cx - eyeSpacing + eyePos.x}, ${eyeY + eyePos.y})`}>
        {blink ? (
          <line x1={-eyeS} y1={0} x2={eyeS} y2={0} stroke="currentColor" strokeWidth="1.5" className="text-alba-accent" />
        ) : (
          <>
            <circle cx={0} cy={0} r={eyeS} fill="none" stroke="currentColor" strokeWidth="1" className="text-alba-accent" />
            <circle cx={0} cy={2} r={pupilS} fill="currentColor" className="text-alba-accent" />
          </>
        )}
      </g>

      {/* Right eye */}
      <g transform={`translate(${cx + eyeSpacing + eyePos.x}, ${eyeY + eyePos.y})`}>
        {blink ? (
          <line x1={-eyeS} y1={0} x2={eyeS} y2={0} stroke="currentColor" strokeWidth="1.5" className="text-alba-accent" />
        ) : (
          <>
            <circle cx={0} cy={0} r={eyeS} fill="none" stroke="currentColor" strokeWidth="1" className="text-alba-accent" />
            <circle cx={0} cy={2} r={pupilS} fill="currentColor" className="text-alba-accent" />
          </>
        )}
      </g>

      {/* Mouth */}
      {state === "speaking" ? (
        <ellipse cx={cx} cy={mouthY} rx={s * 0.12} ry={mouthOpen / 100 * s * 0.08} fill="currentColor" className="text-alba-accent transition-all duration-150" />
      ) : state === "thinking" ? (
        <path d={`M ${cx - s * 0.12} ${mouthY} Q ${cx} ${mouthY + s * 0.03} ${cx + s * 0.12} ${mouthY}`} fill="none" stroke="currentColor" strokeWidth="1" className="text-alba-muted" />
      ) : (
        <path d={`M ${cx - s * 0.1} ${mouthY} Q ${cx} ${mouthY + s * 0.04} ${cx + s * 0.1} ${mouthY}`} fill="none" stroke="currentColor" strokeWidth="1.2" className="text-alba-muted" />
      )}

      {/* Thinking dots */}
      {state === "thinking" && (
        <>
          <circle cx={cx + s * 0.25} cy={mouthY + s * 0.06} r={1.5} fill="currentColor" className="text-alba-accent animate-pulse" style={{ animationDelay: "0s" }} />
          <circle cx={cx + s * 0.32} cy={mouthY + s * 0.06} r={1.5} fill="currentColor" className="text-alba-accent animate-pulse" style={{ animationDelay: "0.3s" }} />
          <circle cx={cx + s * 0.39} cy={mouthY + s * 0.06} r={1.5} fill="currentColor" className="text-alba-accent animate-pulse" style={{ animationDelay: "0.6s" }} />
        </>
      )}
    </svg>
  );
}
