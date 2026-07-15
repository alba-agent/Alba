import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Terminal, Search, Brain, Sparkles, FileEdit } from "lucide-react";

interface ToolCardProps {
  name: string;
  status: string;
  content?: string;
  isPending?: boolean;
}

const toolIcons: Record<string, typeof Terminal> = {
  edit: FileEdit,
  write: FileEdit,
  bash: Terminal,
  search: Search,
  think: Brain,
  subagent: Sparkles,
  default: Sparkles,
};

const statusColors: Record<string, string> = {
  running: "border-alba-accent/30 bg-alba-accent/5",
  pending: "border-alba-warn/30 bg-alba-warn/5",
  waiting: "border-alba-warn/30 bg-alba-warn/5",
  completed: "border-alba-success/30 bg-alba-success/5",
  interrupted: "border-alba-error/30 bg-alba-error/5",
  idle: "border-alba-border bg-alba-surface",
  active: "border-alba-accent/30 bg-alba-accent/5",
  ready: "border-alba-success/30 bg-alba-success/5",
  offline: "border-alba-border bg-alba-surface",
  connecting: "border-alba-warn/30 bg-alba-warn/5",
  disconnected: "border-alba-error/30 bg-alba-error/5",
  streaming: "border-alba-accent/30 bg-alba-accent/5",
  submitted: "border-alba-accent/30 bg-alba-accent/5",
  searching: "border-alba-accent/30 bg-alba-accent/5",
  thought: "border-alba-header/30 bg-alba-header/5",
  thinking: "border-alba-header/30 bg-alba-header/5",
  error: "border-alba-error/30 bg-alba-error/5",
  open: "border-alba-accent/30 bg-alba-accent/5",
  closed: "border-alba-border bg-alba-surface",
  indeterminate: "border-alba-warn/30 bg-alba-warn/5",
  checked: "border-alba-success/30 bg-alba-success/5",
  unchecked: "border-alba-border bg-alba-surface",
  done: "border-alba-success/30 bg-alba-success/5",
};

export default function ToolCard({ name, status, content, isPending }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = toolIcons[name] || toolIcons.default;
  const borderColor = statusColors[status] || statusColors.idle;

  return (
    <div className={`border rounded-xl overflow-hidden ${borderColor} transition-colors`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <Icon size={14} className="text-alba-muted shrink-0" />
        <span className="text-xs font-medium truncate flex-1">{name}</span>
        {status === "running" && (
          <span className="w-2 h-2 rounded-full bg-alba-accent animate-pulse shrink-0" />
        )}
        <ChevronRight
          size={12}
          className={`text-alba-muted transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      <AnimatePresence>
        {expanded && content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 border-t border-alba-border/50">
              <pre className="text-[11px] font-mono text-alba-muted whitespace-pre-wrap max-h-48 overflow-y-auto">
                {content.slice(0, 2000)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
