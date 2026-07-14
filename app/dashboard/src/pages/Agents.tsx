import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAgent } from "../hooks/useAgent";
import { Cpu, Zap, Clock, CheckCircle2, AlertCircle, Loader2, Wifi, WifiOff, Bot, Activity, DollarSign, BarChart3 } from "lucide-react";
import AgentTimeline from "../components/AgentTimeline";

export default function Agents() {
  const { agents, connectionState, connected } = useAgent();
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents/metrics")
      .then(r => r.json())
      .then(d => { setMetrics(d); setMetricsLoading(false); })
      .catch(() => setMetricsLoading(false));
  }, []);

  const statusIcon = (status: string) => {
    switch (status) {
      case "working": return <Loader2 size={14} className="text-alba-accent animate-spin" />;
      case "done": return <CheckCircle2 size={14} className="text-alba-success" />;
      case "error": return <AlertCircle size={14} className="text-alba-error" />;
      default: return <Clock size={14} className="text-alba-muted" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "working": return "border-alba-accent/30 bg-alba-accent/5";
      case "done": return "border-alba-success/30 bg-alba-success/5";
      case "error": return "border-alba-error/30 bg-alba-error/5";
      default: return "border-alba-border bg-alba-surface";
    }
  };

  // Main agent is always present
  const mainAgent = { id: "main", role: "ALBA", status: "idle" as const, task: "Main orchestrator", isMain: true };
  const subAgents = agents.filter(a => a.id !== "main");

  // Build stats from real metrics
  const stats = [
    { label: "Active", value: agents.filter(a => a.status === "working").length, icon: Zap, color: "text-alba-accent" as const },
    { label: "Completed", value: agents.filter(a => a.status === "done").length, icon: CheckCircle2, color: "text-alba-success" as const },
    { label: "Total", value: agents.length + 1, icon: Cpu, color: "text-alba-muted" as const },
  ];

  const metricCards = metricsLoading ? [] : [
    { label: "Total Calls", value: metrics?.totalCalls || 0, icon: Activity, color: "text-alba-header" as const },
    { label: "Total Tokens", value: metrics?.totalTokens ? `${(metrics.totalTokens / 1000).toFixed(1)}k` : "0", icon: BarChart3, color: "text-alba-warn" as const },
    { label: "Avg Tokens/Call", value: metrics?.avgTokensPerCall || 0, icon: Zap, color: "text-alba-accent" as const },
    { label: "Est. Cost", value: metrics?.estimatedCost ? `$${metrics.estimatedCost.toFixed(4)}` : "$0", icon: DollarSign, color: "text-alba-success" as const },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Agents</h1>
            <p className="text-sm text-alba-muted">Sub-agent orchestration & metrics</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {connected ? (
              <span className="flex items-center gap-1 text-alba-success"><Wifi size={12} /> Connected</span>
            ) : connectionState === "connecting" ? (
              <span className="flex items-center gap-1 text-alba-warn"><Loader2 size={12} className="animate-spin" /> Connecting...</span>
            ) : (
              <span className="flex items-center gap-1 text-alba-error"><WifiOff size={12} /> Disconnected</span>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          {[...stats, ...metricCards].map((stat, i) => (
            <div key={stat.label} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><stat.icon size={14} className={stat.color} /><span className="text-xs text-alba-muted">{stat.label}</span></div>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Provider Breakdown */}
        {metrics?.providerBreakdown && metrics.providerBreakdown.length > 0 && (
          <div className="glass rounded-xl p-4 mb-8">
            <h3 className="text-sm font-medium mb-3">Provider Usage</h3>
            <div className="space-y-2">
              {metrics.providerBreakdown.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-alba-bg/30 border border-alba-border/30">
                  <span className="text-sm font-medium">{p.name}</span>
                  <div className="flex items-center gap-4 text-xs text-alba-muted">
                    <span>{p.calls || 0} calls</span>
                    <span>{(p.promptTokens || 0) + (p.completionTokens || 0)} tokens</span>
                    <span className="text-alba-accent">${(p.estimatedCost || 0).toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Agent */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-alba-muted uppercase tracking-wider mb-3">Main Agent</h2>
          <div className={`border rounded-xl p-4 ${statusColor(mainAgent.status)}`}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-alba-accent to-cyan-600 flex items-center justify-center shrink-0">
                <Bot size={20} className="text-alba-bg" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{mainAgent.role}</span>
                  {statusIcon(mainAgent.status)}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-alba-accent/10 text-alba-accent">Main</span>
                </div>
                <p className="text-xs text-alba-muted truncate">{mainAgent.task}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Agents */}
        <div>
          <h2 className="text-sm font-semibold text-alba-muted uppercase tracking-wider mb-3">Sub-Agents ({subAgents.length})</h2>
          {subAgents.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-alba-accent/10 flex items-center justify-center mx-auto mb-4">
                <Cpu className="text-alba-accent" size={28} />
              </div>
              <h3 className="text-lg font-medium mb-2">No sub-agents running</h3>
              <p className="text-sm text-alba-muted max-w-md mx-auto">
                When you ask ALBA to do something complex, it automatically spawns sub-agents to work in parallel. They'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {subAgents.map((agent, i) => (
                <motion.div key={agent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`border rounded-xl p-4 ${statusColor(agent.status)}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-alba-accent/10 flex items-center justify-center shrink-0">
                      <Cpu size={18} className="text-alba-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{agent.role || "Agent"}</span>
                        {statusIcon(agent.status)}
                      </div>
                      <p className="text-xs text-alba-muted truncate">{agent.task || "Idle"}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Timeline */}
        <AgentTimeline events={[]} />
      </div>
    </div>
  );
}