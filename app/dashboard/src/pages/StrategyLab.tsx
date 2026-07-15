import { useState, memo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Plus, X } from "lucide-react";

interface Strategy {
  id: string;
  name: string;
  symbol: string;
  condition: string;
  action: string;
}

export default memo(function StrategyLab() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [newStrategy, setNewStrategy] = useState({ name: "", symbol: "", condition: "", action: "" });

  const addStrategy = () => {
    if (!newStrategy.name || !newStrategy.symbol) return;
    setStrategies(prev => [...prev, { ...newStrategy, id: `strat-${Date.now()}` }]);
    setNewStrategy({ name: "", symbol: "", condition: "", action: "" });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Strategy Lab</h1>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isRunning ? "bg-alba-error/10 text-alba-error" : "bg-alba-success/10 text-alba-success"
            }`}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            {isRunning ? "Stop All" : "Run All"}
          </button>
        </div>

        {/* New Strategy Form */}
        <div className="glass rounded-xl p-4 space-y-4">
          <h2 className="text-lg font-medium">New Strategy</h2>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Strategy name"
              value={newStrategy.name}
              onChange={(e) => setNewStrategy(prev => ({ ...prev, name: e.target.value }))}
              className="bg-alba-bg border border-alba-border rounded-lg px-3 py-2"
            />
            <input
              type="text"
              placeholder="Symbol (e.g. BTCUSDT)"
              value={newStrategy.symbol}
              onChange={(e) => setNewStrategy(prev => ({ ...prev, symbol: e.target.value }))}
              className="bg-alba-bg border border-alba-border rounded-lg px-3 py-2"
            />
            <input
              type="text"
              placeholder="Condition (e.g. RSI < 30)"
              value={newStrategy.condition}
              onChange={(e) => setNewStrategy(prev => ({ ...prev, condition: e.target.value }))}
              className="bg-alba-bg border border-alba-border rounded-lg px-3 py-2"
            />
            <input
              type="text"
              placeholder="Action (e.g. Buy 0.1)"
              value={newStrategy.action}
              onChange={(e) => setNewStrategy(prev => ({ ...prev, action: e.target.value }))}
              className="bg-alba-bg border border-alba-border rounded-lg px-3 py-2"
            />
          </div>
          <button
            onClick={addStrategy}
            disabled={!newStrategy.name || !newStrategy.symbol}
            className="px-4 py-2 rounded-lg bg-alba-accent text-alba-bg disabled:opacity-50"
          >
            Add Strategy
          </button>
        </div>

        {/* Strategies List */}
        <div className="space-y-3">
          {strategies.map((s) => (
            <div key={s.id} className="glass rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-alba-muted">{s.condition} → {s.action}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-alba-accent/10 text-alba-accent">
                  {s.symbol}
                </span>
                <button
                  onClick={() => setStrategies(prev => prev.filter(x => x.id !== s.id))}
                  className="p-1 rounded hover:bg-alba-bg"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          {strategies.length === 0 && (
            <p className="text-center text-alba-muted py-8">No strategies yet. Create one above.</p>
          )}
        </div>
      </div>
    </div>
  );
});