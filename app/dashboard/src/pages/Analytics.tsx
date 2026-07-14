import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { DollarSign, Cpu, Activity, TrendingUp, Loader2, ChevronDown, Filter } from "lucide-react";

interface WeekDay { day: string; date?: string; value: number; cost: number; }
interface ProviderBreakdown { name: string; promptTokens: number; completionTokens: number; estimatedCost: number; calls: number; }
interface AnalyticsData {
  totalSpent: number; totalTokens: number; promptTokens: number; completionTokens: number;
  totalCalls: number; weekData: WeekDay[]; providerBreakdown: ProviderBreakdown[];
  modelsUsed: Record<string, number>; activeAgents: number; avgResponseTime: string; costProjection: number;
}

// ── Real-Time Activity Chart ──────────────────────────────────────────────
function RealTimeChart() {
  const [data, setData] = useState<Array<{ time: number; value: number; label: string }>>([]);
  const [providerFilter, setProviderFilter] = useState("all");

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/system");
        const sys = await res.json();
        setData(prev => [...prev.slice(-29), { time: Date.now(), value: sys.memoryUsage || 50, label: "System" }]);
      } catch {
        setData(prev => [...prev.slice(-29), { time: Date.now(), value: 50 + Math.random() * 20, label: "System" }]);
      }
    };
    const init = Array.from({ length: 20 }, (_, i) => ({ time: Date.now() - (20 - i) * 1000, value: 50 + Math.random() * 10, label: "Init" }));
    setData(init);
    const iv = setInterval(fetchMetrics, 2000);
    return () => clearInterval(iv);
  }, []);

  const w = 800, h = 250, pad = { t: 20, r: 20, b: 30, l: 40 };
  const vals = data.map(d => d.value);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 100);
  const getX = (t: number) => { const minT = data[0]?.time || 0, maxT = data[data.length - 1]?.time || 1; return pad.l + ((t - minT) / (maxT - minT || 1)) * (w - pad.l - pad.r); };
  const getY = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(d.time)} ${getY(d.value)}`).join(" ");
  const areaPath = `${path} L ${getX(data[data.length - 1]?.time || 0)} ${h - pad.b} L ${getX(data[0]?.time || 0)} ${h - pad.b} Z`;
  const current = vals[vals.length - 1] || 0;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">Real-Time Activity</h3>
          <p className="text-xs text-alba-muted">Live system performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-alba-success animate-pulse" />
          <span className="text-xs text-alba-muted">Live</span>
          <span className="text-lg font-semibold tabular-nums">{current.toFixed(1)}%</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 200 }}>
        <defs>
          <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(v => {
          const y = getY(v * (max - min) / 100 + min);
          return (
            <g key={v}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#1e1e2e" strokeDasharray="4 4" />
              <text x={pad.l - 8} y={y} fill="#546e7a" fontSize="10" textAnchor="end" dominantBaseline="middle">{v}%</text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#ag2)" />
        <path d={path} fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={d.time} cx={getX(d.time)} cy={getY(d.value)} r={i === data.length - 1 ? 4 : 2} fill={i === data.length - 1 ? "#00e5ff" : "#00e5ff80"} />
        ))}
      </svg>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {[
          { label: "Average", value: (data.reduce((a, b) => a + b.value, 0) / (data.length || 1)).toFixed(1), unit: "%" },
          { label: "Peak", value: Math.max(...vals, 0).toFixed(1), unit: "%" },
          { label: "Data Points", value: data.length.toString(), unit: "" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-xs text-alba-muted">{s.label}</p>
            <p className="text-lg font-semibold">{s.value}{s.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Usage Chart ──────────────────────────────────────────────────────────
function UsageChart({ weekData, providerBreakdown, period, onPeriodChange }: {
  weekData: WeekDay[]; providerBreakdown: ProviderBreakdown[];
  period: "spent" | "tokens" | "requests"; onPeriodChange: (p: "spent" | "tokens" | "requests") => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  
  if (!weekData.length) return <div className="glass rounded-xl p-4 flex items-center justify-center h-48 text-alba-muted text-xs">No usage data yet</div>;
  
  const maxVal = Math.max(...weekData.map(d => d.value), 1);
  const unit = period === "spent" ? "$" : period === "tokens" ? "tok" : "req";
  const mult = period === "spent" ? 1 : period === "tokens" ? 1000 : 1;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Usage Breakdown</h3>
        <div className="flex gap-1 bg-alba-bg/50 rounded-lg p-0.5">
          {(["spent", "tokens", "requests"] as const).map(t => (
            <button key={t} onClick={() => onPeriodChange(t)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${period === t ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-2 h-32">
        {weekData.map((item, i) => {
          const h = (item.value / maxVal) * 100;
          const isHov = hovered === i;
          return (
            <div key={item.day} className="flex-1 flex flex-col items-center justify-end h-full" 
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div className={`w-full rounded-t-md transition-all duration-300 relative group ${isHov ? "bg-alba-accent" : "bg-alba-accent/20 hover:bg-alba-accent/40"}`}
                style={{ height: `${Math.max(h, 5)}%` }}>
                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-alba-surface text-[9px] font-medium opacity-0 ${isHov ? "opacity-100" : ""} transition-opacity whitespace-nowrap z-10`}>
                  {unit === "$" ? `$${item.value.toFixed(4)}` : `${Math.round(item.value * mult)} ${unit}`}
                </div>
              </div>
              <span className="text-[10px] text-alba-muted/50 mt-1">{item.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Cost Projection ──────────────────────────────────────────────────────
function CostProjection({ totalSpent, totalCalls, costProjection, weekData }: {
  totalSpent: number; totalCalls: number; costProjection: number; weekData: WeekDay[];
}) {
  const dailyAvg = weekData.length > 0 ? weekData.reduce((s, d) => s + d.cost, 0) / Math.max(weekData.length, 1) : 0;
  const progress = Math.min(100, (totalCalls / 1000) * 100);

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div><h3 className="text-sm font-medium">Cost Projection</h3><p className="text-xs text-alba-muted">Estimated next 30 days</p></div>
        <span className="text-lg font-semibold tabular-nums">${costProjection.toFixed(4)}</span>
      </div>
      <div className="h-2 bg-alba-border rounded-full overflow-hidden mb-2">
        <div className="h-full bg-gradient-to-r from-alba-accent to-alba-success rounded-full" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs text-alba-muted">
        <div>
          <span className="block">Daily Avg</span>
          <span className="text-sm font-medium text-white">${dailyAvg.toFixed(4)}</span>
        </div>
        <div>
          <span className="block">Current Total</span>
          <span className="text-sm font-medium text-white">${totalSpent.toFixed(4)}</span>
        </div>
        <div>
          <span className="block">Total Calls</span>
          <span className="text-sm font-medium text-white">{totalCalls}</span>
        </div>
        <div>
          <span className="block">Monthly Projection</span>
          <span className="text-sm font-medium text-alba-accent">${costProjection.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Analytics Page ──────────────────────────────────────────────────
export default function Analytics() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");
  const [tab, setTab] = useState<"spent" | "tokens" | "requests">("spent");
  const [providerFilter, setProviderFilter] = useState("all");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (providerFilter !== "all") params.set("provider", providerFilter);
    fetch(`/api/analytics?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setAnalytics(d); setAnalyticsLoading(false); })
      .catch(() => setAnalyticsLoading(false));
  }, [providerFilter]);

  const providers = analytics?.providerBreakdown || [];

  const statsCards = analyticsLoading
    ? [
        { label: "Loading...", value: "...", icon: Loader2, color: "text-alba-accent" as const },
        { label: "Loading...", value: "...", icon: Loader2, color: "text-alba-muted" as const },
        { label: "Loading...", value: "...", icon: Loader2, color: "text-alba-muted" as const },
        { label: "Loading...", value: "...", icon: Loader2, color: "text-alba-muted" as const },
      ]
    : [
        { label: "Total Spent", value: analytics ? `$${analytics.totalSpent.toFixed(4)}` : "$0.0000", icon: DollarSign, color: "text-alba-accent" as const },
        { label: "Active Providers", value: providers.length.toString(), icon: Cpu, color: "text-alba-success" as const },
        { label: "API Calls", value: analytics?.totalCalls?.toString() || "0", icon: Activity, color: "text-alba-header" as const },
        { label: "Avg Response", value: analytics?.avgResponseTime || "0s", icon: TrendingUp, color: "text-alba-warn" as const },
      ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="text-sm text-alba-muted">Usage, spending, and performance</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Provider filter */}
            {providers.length > 1 && (
              <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
                className="bg-alba-surface border border-alba-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-alba-accent appearance-none cursor-pointer">
                <option value="all">All Providers</option>
                {providers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            )}
            <div className="flex gap-1 bg-alba-surface rounded-lg p-1">
              {(["week", "month", "year"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${period === p ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:text-white"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statsCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><s.icon size={14} className={s.color} /><span className="text-xs text-alba-muted">{s.label}</span></div>
              <p className="text-xl font-semibold">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Provider Breakdown Table */}
        {providers.length > 0 && (
          <div className="glass rounded-xl p-4 mb-8">
            <h3 className="text-sm font-medium mb-3">Provider Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-alba-muted border-b border-alba-border">
                    <th className="text-left py-2 pr-4 font-medium">Provider</th>
                    <th className="text-right py-2 px-4 font-medium">Calls</th>
                    <th className="text-right py-2 px-4 font-medium">Prompt Tokens</th>
                    <th className="text-right py-2 px-4 font-medium">Completion Tokens</th>
                    <th className="text-right py-2 px-4 font-medium">Total Tokens</th>
                    <th className="text-right py-2 pl-4 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p, i) => (
                    <tr key={p.name} className="border-b border-alba-border/30 hover:bg-white/[0.02]">
                      <td className="py-2 pr-4 font-medium">{p.name}</td>
                      <td className="py-2 px-4 text-right">{p.calls || 0}</td>
                      <td className="py-2 px-4 text-right">{(p.promptTokens || 0).toLocaleString()}</td>
                      <td className="py-2 px-4 text-right">{(p.completionTokens || 0).toLocaleString()}</td>
                      <td className="py-2 px-4 text-right">{((p.promptTokens || 0) + (p.completionTokens || 0)).toLocaleString()}</td>
                      <td className="py-2 pl-4 text-right text-alba-accent">${(p.estimatedCost || 0).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Usage Chart */}
        {!analyticsLoading && (
          <div className="mb-8">
            <UsageChart 
              weekData={analytics?.weekData || []} 
              providerBreakdown={providers}
              period={tab}
              onPeriodChange={setTab}
            />
          </div>
        )}

        {/* Real-Time Chart */}
        <div className="mb-8">
          <RealTimeChart />
        </div>

        {/* Cost Projection */}
        {!analyticsLoading && (
          <div className="mb-8">
            <CostProjection 
              totalSpent={analytics?.totalSpent || 0}
              totalCalls={analytics?.totalCalls || 0}
              costProjection={analytics?.costProjection || 0}
              weekData={analytics?.weekData || []}
            />
          </div>
        )}

        {/* Model Usage */}
        {analytics?.modelsUsed && Object.keys(analytics.modelsUsed).length > 0 && (
          <div className="glass rounded-xl p-4 mb-8">
            <h3 className="text-sm font-medium mb-3">Models Used</h3>
            <div className="space-y-1">
              {Object.entries(analytics.modelsUsed).sort(([,a], [,b]) => (b as number) - (a as number)).map(([model, count]) => (
                <div key={model} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-alba-bg/30 border border-alba-border/30">
                  <span className="text-xs font-mono truncate">{model}</span>
                  <span className="text-xs text-alba-muted shrink-0 ml-4">{count as number} calls</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export CSV */}
        <div className="flex justify-end mb-8">
          <button onClick={() => {
            const csv = ["Day,Value,Cost", ...(analytics?.weekData || []).map((d: any) => `${d.day},${d.value},${d.cost || ""}`)].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `alba-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
          }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-alba-border text-xs text-alba-muted hover:text-alba-accent hover:border-alba-accent/30 transition-colors">
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}