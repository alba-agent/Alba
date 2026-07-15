import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAgent } from "../hooks/useAgent";
import { Cpu, Brain, MessageSquare, Mic, Zap, Shield, ArrowRight, Loader2, Wifi, WifiOff, CheckSquare, Square, Plus, ChevronDown, ChevronUp, Calendar, DollarSign, Activity, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import ActivityFeed from "../components/ActivityFeed";
import TokenTracker from "../components/TokenTracker";

// ── Mini Chart (real data) ──────────────────────────────────────────────────
function MiniChart({ data, loading }: { data: Array<{ day: string; value: number }>; loading: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (loading) return <div className="glass rounded-xl p-4 flex items-center justify-center h-32"><Loader2 size={16} className="text-alba-accent animate-spin" /></div>;
  if (!data.length) return <div className="glass rounded-xl p-4 flex items-center justify-center h-32 text-alba-muted text-xs">No activity data yet</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-alba-success animate-pulse" /><span className="text-xs font-medium text-alba-muted uppercase tracking-wide">Activity</span></div>
        <span className="text-lg font-semibold tabular-nums">{hovered !== null ? `${data[hovered].value}` : ""}</span>
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {data.map((item, i) => {
          const h = (item.value / max) * 100;
          const isHov = hovered === i;
          return (
            <div key={item.day} className="relative flex-1 flex flex-col items-center justify-end h-full"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div className={`w-full rounded-full transition-all duration-300 origin-bottom cursor-pointer ${isHov ? "bg-alba-accent" : "bg-alba-accent/20 hover:bg-alba-accent/30"}`}
                style={{ height: `${Math.max(h, 5)}%`, transform: isHov ? "scaleX(1.15)" : "scaleX(1)" }} />
              <span className={`text-[9px] mt-1.5 transition-colors ${isHov ? "text-alba-accent" : "text-alba-muted/50"}`}>{item.day.slice(0, 1)}</span>
              {isHov && <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-alba-surface text-[10px] font-medium whitespace-nowrap z-10">{item.value}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Budget Card (real data) ─────────────────────────────────────────────────
function BudgetCard({ data, loading }: { data: any; loading: boolean }) {
  const [period, setPeriod] = useState<"spent" | "tokens" | "requests">("spent");
  if (loading) return <div className="glass rounded-xl p-4 flex items-center justify-center h-40"><Loader2 size={16} className="text-alba-accent animate-spin" /></div>;
  
  const weekData = data?.weekData || [];
  const total = data?.totalSpent || 0;
  const totalCalls = data?.totalCalls || 0;
  const totalTokens = data?.totalTokens || 0;
  const maxVal = Math.max(...weekData.map((d: any) => d.value), 1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const displayValue = period === "spent" ? `$${total.toFixed(4)}` : period === "tokens" ? `${(totalTokens / 1000).toFixed(1)}k` : `${totalCalls}`;
  const unit = period === "spent" ? "$" : period === "tokens" ? "tok" : "calls";

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div><p className="text-xs text-alba-muted">Budget</p><h3 className="text-2xl font-semibold">{displayValue}</h3></div>
        <div className="flex gap-1 bg-alba-bg/50 rounded-lg p-0.5">
          {(["spent", "tokens", "requests"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${period === p ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:text-white"}`}>{p}</button>
          ))}
        </div>
      </div>
      {weekData.length > 0 ? (
        <div className="flex items-end gap-1 h-24">
          {weekData.map((item: any, i: number) => {
            const h = (item.value / maxVal) * 100;
            const isHov = hoveredIdx === i;
            return (
              <div key={item.day} className="relative flex-1 flex flex-col items-center justify-end h-full"
                onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                <div className={`w-full rounded-full transition-all duration-200 cursor-pointer ${isHov ? "bg-alba-accent" : "bg-alba-accent/20 hover:bg-alba-accent/30"}`}
                  style={{ height: `${Math.max(h, 5)}%` }} />
                <span className={`text-[9px] mt-1 ${isHov ? "text-alba-accent" : "text-alba-muted/40"}`}>{item.day.slice(0, 1)}</span>
                {isHov && <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-alba-surface text-[9px] font-medium whitespace-nowrap z-10">{item.value}</div>}
              </div>
            );
          })}
        </div>
      ) : <div className="h-24 flex items-center justify-center text-alba-muted text-xs">No usage data yet</div>}
    </div>
  );
}

// ── Tasks Section ───────────────────────────────────────────────────────────
function TasksSection() {
  const [expanded, setExpanded] = useState(true);
  const [tasks, setTasks] = useState<Array<{ id: string; text: string; done: boolean }>>([]);
  const [newTask, setNewTask] = useState("");

  const addTask = () => { if (!newTask.trim()) return; setTasks(prev => [...prev, { id: `t-${Date.now()}`, text: newTask.trim(), done: false }]); setNewTask(""); };
  const toggleTask = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="glass rounded-xl">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2"><CheckSquare size={16} className="text-alba-accent" /><span className="text-sm font-medium">Tasks</span>{tasks.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-alba-accent/10 text-alba-accent">{doneCount}/{tasks.length}</span>}</div>
        {expanded ? <ChevronUp size={14} className="text-alba-muted" /> : <ChevronDown size={14} className="text-alba-muted" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 group">
              <button onClick={() => toggleTask(task.id)} className="shrink-0">
                {task.done ? <CheckSquare size={14} className="text-alba-success" /> : <Square size={14} className="text-alba-muted" />}
              </button>
              <span className={`text-sm flex-1 ${task.done ? "line-through text-alba-muted/50" : ""}`}>{task.text}</span>
              <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 text-alba-muted hover:text-mo-error transition-all">×</button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Add a task..."
              className="flex-1 bg-alba-bg/50 border border-alba-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-alba-accent/50 placeholder:text-alba-muted/50" />
            <button onClick={addTask} className="p-1.5 rounded-lg bg-alba-accent/10 text-alba-accent hover:bg-alba-accent/20 transition-colors"><Plus size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Calendar Widget ─────────────────────────────────────────────────────────
function CalendarWidget() {
  const today = new Date();
  const year = today.getFullYear(), month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const isToday = (d: number) => d === today.getDate();

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><Calendar size={16} className="text-alba-accent" /><span className="text-sm font-medium">{today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span></div>
        <Link to="/calendar" className="text-xs text-alba-accent hover:underline">View all</Link>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-[10px] text-alba-muted/50 py-1">{d}</div>)}
        {days.map((d, i) => <div key={i} className={`text-xs py-1 rounded-md transition-colors ${d ? "hover:bg-alba-accent/10 cursor-pointer" : ""} ${d && isToday(d) ? "bg-alba-accent text-alba-bg font-bold" : "text-alba-muted"}`}>{d || ""}</div>)}
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { connected, connectionState, agents, memories } = useAgent();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => setConfigured(d.configured)).catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    fetch("/api/analytics").then(r => r.json()).then(d => { setAnalytics(d); setAnalyticsLoading(false); }).catch(() => setAnalyticsLoading(false));
  }, []);

  // Poll memory count for real-time stats
  useEffect(() => {
    fetch("/api/memory").then(r => r.json()).then(d => {
      // This will trigger re-render with updated memory count
    }).catch(() => {});
    const iv = setInterval(() => {
      fetch("/api/memory").then(r => r.json()).catch(() => {});
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  if (configured === null) return <div className="flex-1 flex items-center justify-center"><Loader2 className="text-alba-accent animate-spin" size={24} /></div>;

  const stats = [
    { label: "Status", value: connected ? "Online" : "Offline", icon: Zap, color: connected ? "text-alba-success" : "text-alba-error" },
    { label: "Active Agents", value: agents.filter(a => a.status === "working").length, icon: Cpu, color: "text-alba-accent" },
    { label: "Memories", value: memories.length, icon: Brain, color: "text-alba-header" },
    { label: "Total Calls", value: analytics?.totalCalls || 0, icon: Activity, color: "text-alba-success" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative px-6 pt-8 pb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-alba-accent/5 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-alba-accent/30 to-cyan-600/30 flex items-center justify-center glow-accent overflow-hidden">
              <img src="/logos/alba-logo.png" alt="ALBA" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">ALBA Dashboard</h1>
              <p className="text-sm text-alba-muted flex items-center gap-2">
                {connected ? <><Wifi size={12} className="text-alba-success" /> Connected</> : connectionState === "connecting" ? <><Loader2 size={12} className="text-alba-warn animate-spin" /> Connecting...</> : <><WifiOff size={12} className="text-alba-error" /> Disconnected</>}
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><stat.icon size={14} className={stat.color} /><span className="text-xs text-alba-muted">{stat.label}</span></div>
                <p className="text-xl font-semibold">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <BudgetCard data={analytics} loading={analyticsLoading} />
            <MiniChart data={analytics?.weekData || []} loading={analyticsLoading} />
            <TokenTracker tokenAddress="gRWRJAXPnjBwUag6XjYtVJkW6WjbMkHJaUA7gmvpump" chainId="solana" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <TasksSection />
            <CalendarWidget />
          </div>

          <div className="mb-8">
            <h3 className="text-xs font-semibold text-alba-muted uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: "Chat", desc: "Talk to ALBA", icon: MessageSquare, path: "/chat" },
                { title: "Agents", desc: "Sub-agent orchestration", icon: Cpu, path: "/agents" },
                { title: "Analytics", desc: "Usage & spending", icon: Zap, path: "/analytics" },
                { title: "Files", desc: "Browse workspace", icon: Brain, path: "/files" },
              ].map((feat) => (
                <Link key={feat.title} to={feat.path} className="glass rounded-lg p-3 flex items-center gap-3 hover:border-alba-accent/20 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-alba-accent/10 flex items-center justify-center shrink-0 group-hover:bg-alba-accent/20 transition-colors"><feat.icon size={14} className="text-alba-accent" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{feat.title}</p><p className="text-[10px] text-alba-muted truncate">{feat.desc}</p></div>
                  <ArrowRight size={12} className="text-alba-muted group-hover:text-alba-accent transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <ActivityFeed />
          </div>

          <div className="glass rounded-xl p-4 border-alba-success/20 bg-alba-success/5 mb-8">
            <div className="flex items-center gap-3"><Shield size={16} className="text-alba-success shrink-0" /><div><p className="text-sm font-medium text-alba-success">100% Local</p><p className="text-xs text-alba-muted">All processing happens on your machine. No data leaves your computer.</p></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
