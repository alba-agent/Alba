import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Clock, Cpu } from "lucide-react";

interface Agent {
  id: string;
  role: string;
  status: "idle" | "working" | "done" | "error";
  task: string;
  progress?: number;
  elapsed?: string;
}

interface AgentAvatarProps {
  agent: Agent;
  size?: "sm" | "md" | "lg";
  expanded?: boolean;
  onClick?: () => void;
}

const statusConfig = {
  working: { icon: Loader2, color: "text-alba-accent", bg: "bg-alba-accent/10", border: "border-alba-accent/30", animate: true },
  done: { icon: CheckCircle2, color: "text-alba-success", bg: "bg-alba-success/10", border: "border-alba-success/30", animate: false },
  error: { icon: AlertCircle, color: "text-alba-error", bg: "bg-alba-error/10", border: "border-alba-error/30", animate: false },
  idle: { icon: Clock, color: "text-alba-muted", bg: "bg-alba-surface", border: "border-alba-border", animate: false },
};

const roleColors: Record<string, string> = {
  orchestrator: "from-alba-accent to-cyan-600",
  researcher: "from-alba-header to-purple-600",
  coder: "from-alba-success to-emerald-600",
  analyst: "from-alba-warn to-amber-600",
  writer: "from-blue-400 to-blue-600",
  default: "from-alba-muted to-slate-600",
};

export default function AgentAvatar({ agent, size = "md", expanded, onClick }: AgentAvatarProps) {
  const config = statusConfig[agent.status] || statusConfig.idle;
  const StatusIcon = config.icon;
  const gradient = roleColors[agent.role?.toLowerCase() || "default"];

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const iconSizes = { sm: 12, md: 16, lg: 20 };

  if (!expanded) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center relative ${onClick ? "cursor-pointer" : "cursor-default"}`}
        title={`${agent.role}: ${agent.status}`}
      >
        <span className="text-xs font-bold text-white">
          {agent.role?.[0]?.toUpperCase() || "A"}
        </span>
        {agent.status === "working" && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-alba-accent border-2 border-alba-bg animate-pulse" />
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${config.border} ${config.bg} transition-colors`}
    >
      <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
        <span className="text-sm font-bold text-white">
          {agent.role?.[0]?.toUpperCase() || "A"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{agent.role || "Agent"}</span>
          <StatusIcon size={12} className={`${config.color} ${config.animate ? "animate-spin" : ""}`} />
        </div>
        <p className="text-xs text-alba-muted truncate">{agent.task || "Idle"}</p>
        {agent.status === "working" && agent.progress !== undefined && (
          <div className="mt-1.5 h-1 bg-alba-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-alba-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${agent.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
        {agent.elapsed && (
          <span className="text-[10px] text-alba-muted mt-0.5">{agent.elapsed}</span>
        )}
      </div>
    </motion.div>
  );
}
