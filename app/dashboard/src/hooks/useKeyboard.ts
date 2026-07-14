import { useEffect } from "react";

type KeyHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  handler: KeyHandler;
  description?: string;
}

export function useKeyboard(shortcuts: Shortcut[], deps: any[] = []) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        const metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : true;
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        if (e.key.toLowerCase() === s.key.toLowerCase() && metaMatch && shiftMatch) {
          e.preventDefault();
          s.handler(e);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, deps);
}

// Convenience hook for common ALBA shortcuts
export function useMioShortcuts(opts: {
  onCmdK?: () => void;
  onCmdSlash?: () => void;
  onCmdN?: () => void;
  onEscape?: () => void;
}) {
  const shortcuts: Shortcut[] = [
    ...(opts.onCmdK ? [{ key: "k", meta: true as const, handler: opts.onCmdK as KeyHandler, description: "Command palette" }] : []),
    ...(opts.onCmdSlash ? [{ key: "/", meta: true as const, handler: opts.onCmdSlash as KeyHandler, description: "Focus chat" }] : []),
    ...(opts.onCmdN ? [{ key: "n", meta: true as const, handler: opts.onCmdN as KeyHandler, description: "New chat" }] : []),
    ...(opts.onEscape ? [{ key: "Escape", handler: opts.onEscape as KeyHandler, description: "Close" }] : []),
  ];
  useKeyboard(shortcuts);
}