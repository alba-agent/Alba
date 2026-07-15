import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import {
  Home, MessageSquare, Bot, Brain, Settings, FolderOpen, Zap,
  BarChart3, Calendar, Mic, Search, Terminal, FileText, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Command {
  id: string;
  label: string;
  description: string;
  category: string;
  icon?: any;
  action: () => void;
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler as any);
    return () => window.removeEventListener("keydown", handler as any);
  }, []);

  return { open, setOpen };
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: Command[] = [
    { id: "nav-home", label: "Go to Home", description: "Dashboard overview", category: "Navigation", icon: Home, action: () => { navigate("/"); onClose(); } },
    { id: "nav-chat", label: "Go to Chat", description: "Talk to ALBA", category: "Navigation", icon: MessageSquare, action: () => { navigate("/chat"); onClose(); } },
    { id: "nav-agents", label: "Go to Agents", description: "Agent orchestration", category: "Navigation", icon: Bot, action: () => { navigate("/agents"); onClose(); } },
    { id: "nav-files", label: "Go to Files", description: "Browse workspace", category: "Navigation", icon: FolderOpen, action: () => { navigate("/files"); onClose(); } },
    { id: "nav-analytics", label: "Go to Analytics", description: "Usage and spending", category: "Navigation", icon: BarChart3, action: () => { navigate("/analytics"); onClose(); } },
    { id: "nav-memory", label: "Go to Memory", description: "Agent memory search", category: "Navigation", icon: Brain, action: () => { navigate("/memory"); onClose(); } },
    { id: "nav-calendar", label: "Go to Calendar", description: "Events and tasks", category: "Navigation", icon: Calendar, action: () => { navigate("/calendar"); onClose(); } },
    { id: "nav-settings", label: "Go to Settings", description: "Configure ALBA", category: "Navigation", icon: Settings, action: () => { navigate("/settings"); onClose(); } },
    { id: "nav-providers", label: "Go to Providers", description: "Manage API keys", category: "Navigation", icon: Zap, action: () => { navigate("/providers"); onClose(); } },
    { id: "act-chat", label: "New Chat", description: "Start a new conversation", category: "Actions", icon: MessageSquare, action: () => { navigate("/chat"); onClose(); } },
    { id: "sys-ping", label: "Check Status", description: "Ping the server", category: "System", icon: Terminal, action: () => { fetch("/api/status").then(r => r.json()).then(console.log); onClose(); } },
  ];

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && filtered[selectedIndex]) { filtered[selectedIndex].action(); }
    else if (e.key === "Tab") { e.preventDefault(); const d = e.shiftKey ? -1 : 1; setSelectedIndex(i => Math.max(0, Math.min(i + d, filtered.length - 1))); }
  };

  if (!open) return null;

  // Group by category
  const grouped: Record<string, Command[]> = {};
  filtered.forEach(c => { if (!grouped[c.category]) grouped[c.category] = []; grouped[c.category].push(c); });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onClose} />
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[9999] glass rounded-xl shadow-2xl border border-alba-border overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-alba-border">
          <Search size={16} className="text-alba-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-alba-muted/50"
          />
          <span className="text-[10px] text-alba-muted bg-alba-bg/50 px-1.5 py-0.5 rounded">esc</span>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-alba-muted uppercase tracking-wider">{category}</div>
              {cmds.map((cmd, i) => {
                const globalIndex = filtered.indexOf(cmd);
                const isSelected = globalIndex === selectedIndex;
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isSelected ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {Icon && <Icon size={16} className="shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{cmd.label}</div>
                      <div className="text-[10px] text-alba-muted/60 truncate">{cmd.description}</div>
                    </div>
                    <span className="text-[10px] text-alba-muted/40">{cmd.category}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && <div className="p-6 text-center text-sm text-alba-muted">No matching commands</div>}
        </div>
      </div>
    </>
  );
}