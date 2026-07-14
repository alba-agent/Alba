import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, FileText, Terminal, Search, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  { id: "chat", label: "New Chat", icon: MessageSquare, path: "/chat", color: "text-alba-accent" },
  { id: "file", label: "New File", icon: FileText, path: "/files", color: "text-alba-success" },
  { id: "bash", label: "Run Command", icon: Terminal, path: "/chat", color: "text-alba-warn" },
  { id: "search", label: "Search", icon: Search, path: "/memory", color: "text-alba-header" },
  { id: "home", label: "Dashboard", icon: Home, path: "/", color: "text-alba-muted" },
];

export default function QuickActions() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && actions.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ delay: i * 0.04, duration: 0.15 }}
            onClick={() => { navigate(action.path); setOpen(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full glass border border-alba-border/50 shadow-lg hover:border-alba-accent/30 transition-all group"
          >
            <action.icon size={16} className={action.color} />
            <span className="text-xs font-medium text-alba-muted group-hover:text-white transition-colors">{action.label}</span>
          </motion.button>
        ))}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full bg-gradient-to-br from-alba-accent to-cyan-600 flex items-center justify-center shadow-lg hover:scale-105 transition-transform glow-accent ${open ? "rotate-45" : ""}`}
      >
        <Plus size={22} className="text-alba-bg" />
      </button>
    </div>
  );
}