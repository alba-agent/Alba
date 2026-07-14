import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, FileText, Terminal, Search, CheckCircle2, Loader2 } from "lucide-react";

interface TimelineEntry {
  id: string;
  type: "edit" | "cmd" | "search" | "response";
  description: string;
  ts: number;
  details?: string;
}

const ICONS = { edit: FileText, cmd: Terminal, search: Search, response: CheckCircle2 };

export default function AgentTimeline({ events = [] }: { events?: TimelineEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (events.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4 mt-6">
      <div className="flex items-center gap-2 mb-3"><Clock size={14} className="text-alba-accent" /><span className="text-xs font-semibold text-alba-muted uppercase tracking-wider">Agent Timeline</span></div>
      <div className="relative pl-6 space-y-0">
        {/* Vertical line */}
        <div className="absolute left-2.5 top-1 bottom-0 w-px bg-alba-border/50" />
        {events.map((ev, i) => {
          const Icon = ICONS[ev.type] || CheckCircle2;
          return (
            <motion.div key={ev.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="relative pb-3">
              <div className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-alba-accent/20 border-2 border-alba-accent flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-alba-accent" />
              </div>
              <button onClick={() => setExpanded(expanded === ev.id ? null : ev.id)} className="flex items-center gap-2 text-left w-full">
                <Icon size={12} className="text-alba-muted shrink-0" />
                <span className="text-xs text-alba-muted truncate flex-1">{ev.description}</span>
                <span className="text-[10px] text-alba-muted/40 shrink-0">{new Date(ev.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </button>
              {expanded === ev.id && ev.details && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
                  <pre className="text-[11px] font-mono text-alba-muted/70 mt-1 ml-6 p-2 bg-alba-bg/50 rounded">{ev.details}</pre>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}