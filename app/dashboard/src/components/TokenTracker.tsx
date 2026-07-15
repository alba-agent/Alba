import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw, Copy, ExternalLink, Loader } from "lucide-react";

interface TokenData {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string | null;
  txns: {
    ANY_ADDITIONAL_PROPERTY?: { buys: number; sells: number };
  };
  volume: {
    ANY_ADDITIONAL_PROPERTY?: number;
  };
  priceChange: {
    ANY_ADDITIONAL_PROPERTY?: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  } | null;
  fdv: number | null;
  marketCap: number | null;
  pairCreatedAt: number | null;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { platform: string; handle: string }[];
  };
}

export default function TokenTracker({ tokenAddress = "gRWRJAXPnjBwUag6XjYtVJkW6WjbMkHJaUA7gmvpump", chainId = "solana" }: { tokenAddress?: string; chainId?: string }) {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTokenData();
    const iv = setInterval(fetchTokenData, 10000); // Refresh every 10s
    return () => clearInterval(iv);
  }, [tokenAddress, chainId]);

  const fetchTokenData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data && data.length > 0) {
        setTokenData(data[0]);
      } else {
        setError("No data found");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const priceChange = tokenData?.priceChange?.ANY_ADDITIONAL_PROPERTY ?? 0;
  const isPositive = priceChange >= 0;

  if (loading && !tokenData) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-alba-muted uppercase tracking-wider">Token Intel</span>
        </div>
        <div className="flex items-center justify-center h-32">
          <Loader size={20} className="text-alba-accent animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-alba-muted uppercase tracking-wider">Token Intel</span>
        </div>
        <p className="text-xs text-alba-error">Error: {error || "No data"}</p>
        <button onClick={fetchTokenData} className="text-xs text-alba-accent hover:underline mt-2 inline-block">
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-medium text-alba-muted uppercase tracking-wider">Token Intel</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchTokenData} className="p-1 rounded hover:bg-white/5" title="Refresh">
            <RefreshCw size={12} className="text-alba-muted" />
          </button>
          <a href={tokenData.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-white/5" title="Open in Dexscreener">
            <ExternalLink size={12} className="text-alba-muted" />
          </a>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        {tokenData.info?.imageUrl ? (
          <img src={tokenData.info.imageUrl} alt={tokenData.baseToken.symbol} className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-alba-accent/20 flex items-center justify-center">
            <span className="text-xs font-bold text-alba-accent">{tokenData.baseToken.symbol.slice(0, 2)}</span>
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold">{tokenData.baseToken.name || tokenData.baseToken.symbol}</h3>
          <p className="text-xs text-alba-muted">{tokenData.baseToken.symbol} / {tokenData.quoteToken.symbol}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">${Number(tokenData.priceUsd || 0).toFixed(6)}</span>
          <span className={`text-xs flex items-center gap-1 ${isPositive ? "text-alba-success" : "text-alba-error"}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(priceChange).toFixed(2)}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-alba-muted">Market Cap</p>
            <p className="font-medium">${tokenData.marketCap ? (tokenData.marketCap / 1e6).toFixed(2) + "M" : "—"}</p>
          </div>
          <div>
            <p className="text-alba-muted">Liquidity</p>
            <p className="font-medium">${tokenData.liquidity?.usd ? (tokenData.liquidity.usd / 1e3).toFixed(1) + "K" : "—"}</p>
          </div>
          <div>
            <p className="text-alba-muted">Volume</p>
            <p className="font-medium">${tokenData.volume?.ANY_ADDITIONAL_PROPERTY ? (tokenData.volume.ANY_ADDITIONAL_PROPERTY / 1e3).toFixed(1) + "K" : "—"}</p>
          </div>
          <div>
            <p className="text-alba-muted">FDV</p>
            <p className="font-medium">${tokenData.fdv ? (tokenData.fdv / 1e6).toFixed(2) + "M" : "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-alba-border/30">
          <button onClick={() => { navigator.clipboard.writeText(tokenData.baseToken.address); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-alba-bg/50 hover:bg-alba-accent/10 transition-colors text-xs text-alba-muted">
            {copied ? "Copied!" : <> <Copy size={12} /> Copy CA</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}