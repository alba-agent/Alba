import { useEffect, useState } from "react";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; desc: string }[];
}

const GROUPS: ShortcutGroup[] = [
  { title: "Navigation", shortcuts: [
    { keys: "Cmd+K", desc: "Open command palette" },
    { keys: "Cmd+Shift+/", desc: "Open keyboard shortcuts" },
    { keys: "Escape", desc: "Close modals and palettes" },
  ]},
  { title: "Chat", shortcuts: [
    { keys: "Cmd+/", desc: "Focus chat input" },
    { keys: "Cmd+N", desc: "New chat" },
    { keys: "Enter", desc: "Send message" },
    { keys: "Shift+Enter", desc: "New line in message" },
    { keys: "Escape", desc: "Stop generation" },
  ]},
  { title: "Voice", shortcuts: [
    { keys: "Cmd+M", desc: "Toggle microphone" },
    { keys: "Say 'ALBA'", desc: "Wake word for voice commands" },
  ]},
  { title: "Files", shortcuts: [
    { keys: "Cmd+S", desc: "Save current file" },
  ]},
  { title: "General", shortcuts: [
    { keys: "Cmd+,", desc: "Open settings" },
    { keys: "Cmd+1-0", desc: "Navigate to sidebar items" },
  ]},
];

export default function ShortcutsReference({ open: externalOpen, onClose }: { open: boolean; onClose: () => void }) {
  const [open, setOpen] = useState(externalOpen);

  useEffect(() => { setOpen(externalOpen); }, [externalOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => { setOpen(false); onClose(); }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[9999] glass rounded-xl border border-alba-border shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-alba-border">
          <h2 className="text-base font-semibold">Keyboard Shortcuts</h2>
          <button onClick={() => { setOpen(false); onClose(); }} className="text-alba-muted hover:text-white text-sm">×</button>
        </div>
        <div className="p-5 space-y-5">
          {GROUPS.map(group => (
            <div key={group.title}>
              <h3 className="text-[10px] font-semibold text-alba-muted uppercase tracking-wider mb-2">{group.title}</h3>
              <div className="space-y-1.5">
                {group.shortcuts.map(s => (
                  <div key={s.keys} className="flex items-center justify-between text-sm">
                    <span className="text-alba-muted">{s.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-alba-bg border border-alba-border text-[11px] font-mono text-alba-accent">{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}