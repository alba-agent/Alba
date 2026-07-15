import { useState, memo } from "react";
import { Send, Loader, AlertCircle, Check } from "lucide-react";

interface ToolResult {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  error?: string;
  loading?: boolean;
}

export default memo(function Tools() {
  const [toolName, setToolName] = useState("binance_prices");
  const [args, setArgs] = useState("{}");
  const [history, setHistory] = useState<ToolResult[]>([]);

  const tools = [
    { id: "binance_prices", label: "Binance Prices", desc: "Spot/futures prices" },
    { id: "binance_klines", label: "Binance Klines", desc: "Candlestick data" },
    { id: "binance_order_book", label: "Order Book", desc: "Depth chart" },
    { id: "binance_balance", label: "Account Balance", desc: "Account state" },
    { id: "hyperliquid_info", label: "HL Info", desc: "Account state" },
    { id: "hyperliquid_funding", label: "HL Funding", desc: "Funding rates" },
    { id: "hyperliquid_leaderboard", label: "HL Leaderboard", desc: "Top traders" },
    { id: "hyperliquid_meta", label: "HL Meta", desc: "Market info" },
    { id: "jupiter_quote", label: "Jupiter Quote", desc: "Swap quote" },
    { id: "jupiter_swap", label: "Jupiter Swap", desc: "Swap tx data" },
    { id: "jupiter_tokens", label: "Jupiter Tokens", desc: "Token list" },
    { id: "raydium_swap", label: "Raydium Swap", desc: "Raydium computation" },
  ];

  const runTool = async () => {
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(args);
    } catch {
      setHistory(prev => [...prev, { tool: toolName, args: {}, error: "Invalid JSON", result: null }]);
      return;
    }

    const entry: ToolResult = { tool: toolName, args: parsedArgs, result: null, loading: true };
    setHistory(prev => [...prev, entry]);

    try {
      const res = await fetch("/api/tools/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolName, args: parsedArgs }),
      });
      const data = await res.json();
      setHistory(prev => {
        const idx = prev.findIndex((_, i) => i === prev.length - 1);
        prev[idx] = { ...prev[idx], result: data, loading: false };
        return [...prev];
      });
    } catch (e) {
      setHistory(prev => {
        const idx = prev.length - 1;
        prev[idx] = { ...prev[idx], error: String(e), loading: false };
        return [...prev];
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Tool Playground</h1>

        <div className="glass rounded-xl p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Tool</label>
            <select
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              className="w-full mt-1 bg-alba-bg border border-alba-border rounded-lg px-3 py-2"
            >
              {tools.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Arguments (JSON)</label>
            <textarea
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder='{"symbol": "BTCUSDT"}'
              className="w-full mt-1 h-24 bg-alba-bg border border-alba-border rounded-lg px-3 py-2 font-mono text-sm"
            />
          </div>

          <button
            onClick={runTool}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-alba-accent text-alba-bg hover:bg-alba-accent/80"
          >
            <Send size={14} />
            Run Tool
          </button>
        </div>

        <div className="space-y-3">
          {history.map((h, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm">{h.tool}</span>
                {h.loading && <Loader size={12} className="animate-spin" />}
                {h.error && <AlertCircle size={12} className="text-alba-error" />}
                {!h.loading && !h.error && h.result != null && <Check size={12} className="text-alba-success" />}
              </div>
              <pre className="text-xs bg-alba-bg/50 p-2 rounded overflow-x-auto max-h-48">
                {JSON.stringify(h.result ?? h.error, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});