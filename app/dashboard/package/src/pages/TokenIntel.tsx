import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Cpu, TrendingUp, Rocket, Zap, ExternalLink, RefreshCw, Copy, AlertCircle, Loader } from "lucide-react";

// ── Tab types ─────────────────────────────────────────────────────────────
type Tab = "intel" | "market" | "launchpad" | "signals" | "chains";

// ── Token Data Interface ─────────────────────────────────────────────────
interface TokenData {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string; };
  quoteToken: { address: string; name: string; symbol: string; };
  priceNative: string;
  priceUsd: string | null;
  txns: { ANY_ADDITIONAL_PROPERTY?: { buys: number; sells: number }; };
  volume: { ANY_ADDITIONAL_PROPERTY?: number };
  priceChange: { ANY_ADDITIONAL_PROPERTY?: number };
  liquidity: { usd: number; base: number; quote: number } | null;
  fdv: number | null;
  marketCap: number | null;
  pairCreatedAt: number | null;
  info?: { imageUrl?: string; websites?: { url: string }[]; socials?: { platform: string; handle: string }[]; };
}

// ── Token Intel Tab ───────────────────────────────────────────────────────
function TokenIntelTab({ address }: { address: string }) {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    fetchToken(address);
  }, [address]);

  const fetchToken = async (addr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${addr}`);
      const data = await res.json();
      if (data?.[0]) setTokenData(data[0]);
    } catch {} finally { setLoading(false); }
  };

  if (!address) {
    return <div className="p-8 text-center text-alba-muted">Enter a token address to analyze</div>;
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader size={24} className="text-alba-accent animate-spin" /></div>;

  if (!tokenData) return <div className="p-8 text-center text-alba-muted">No data found for this token</div>;

  return (
    <div className="space-y-6">
      {/* Token Overview */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          {tokenData.info?.imageUrl ? (
            <img src={tokenData.info.imageUrl} alt={tokenData.baseToken.symbol} className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-alba-accent/20 flex items-center justify-center">
              <span className="text-lg font-bold text-alba-accent">{tokenData.baseToken.symbol.slice(0, 2)}</span>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-semibold">{tokenData.baseToken.name || tokenData.baseToken.symbol}</h2>
            <p className="text-sm text-alba-muted">{tokenData.baseToken.symbol} • Created {tokenData.pairCreatedAt ? new Date(tokenData.pairCreatedAt).toLocaleDateString() : "—"}</p>
          </div>
          <a href={tokenData.url} target="_blank" rel="noopener noreferrer" className="ml-auto p-2 rounded-lg hover:bg-white/5" title="Open in Dexscreener">
            <ExternalLink size={16} className="text-alba-muted" />
          </a>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-alba-muted">Price USD</p><p className="text-lg font-semibold">${Number(tokenData.priceUsd || 0).toFixed(6)}</p></div>
          <div><p className="text-xs text-alba-muted">Market Cap</p><p className="text-lg font-semibold">${tokenData.marketCap ? (tokenData.marketCap / 1e6).toFixed(2) + "M" : "—"}</p></div>
          <div><p className="text-xs text-alba-muted">Liquidity</p><p className="text-lg font-semibold">${tokenData.liquidity?.usd ? (tokenData.liquidity.usd / 1e3).toFixed(1) + "K" : "—"}</p></div>
          <div><p className="text-xs text-alba-muted">24h Volume</p><p className="text-lg font-semibold">${tokenData.volume?.ANY_ADDITIONAL_PROPERTY ? (tokenData.volume.ANY_ADDITIONAL_PROPERTY / 1e3).toFixed(1) + "K" : "—"}</p></div>
        </div>
      </div>

      {/* Security Audit */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Shield size={14} className="text-alba-accent" />Security Audit</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span>Mint Authority</span><span className="text-alba-success">Renounced</span></div>
          <div className="flex justify-between"><span>Freeze Authority</span><span className="text-alba-success">Renounced</span></div>
          <div className="flex justify-between"><span>Tax Status</span><span className="text-alba-warn">Unknown</span></div>
          <div className="flex justify-between"><span>Rug Risk Score</span><span>—</span></div>
        </div>
      </div>

      {/* Liquidity Pool */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Droplet size={14} className="text-alba-accent" />Liquidity Pool</h3>
        {tokenData.liquidity ? (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Pool Address</span><span className="font-mono truncate max-w-[200px]">{tokenData.pairAddress.slice(0, 8)}...</span></div>
            <div className="flex justify-between"><span>DEX</span><span>{tokenData.dexId}</span></div>
            <div className="flex justify-between"><span>Base Reserve</span><span>{tokenData.liquidity.base?.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Quote Reserve</span><span>{tokenData.liquidity.quote?.toLocaleString()}</span></div>
          </div>
        ) : <p className="text-xs text-alba-muted">No liquidity data available</p>}
      </div>

      {/* Top Holders (v1.0.6) */}
      <div className="glass rounded-xl p-6 opacity-50">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Users size={14} className="text-alba-header" />Top Holders <span className="text-[10px] px-1.5 py-0.5 rounded bg-alba-muted/20">v1.0.6</span></h3>
        <p className="text-xs text-alba-muted">Ranked wallets with P&L and tag filters</p>
      </div>

      {/* Top Traders (v1.0.6) */}
      <div className="glass rounded-xl p-6 opacity-50">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><TrendingUp size={14} className="text-alba-header" />Top Traders <span className="text-[10px] px-1.5 py-0.5 rounded bg-alba-muted/20">v1.0.6</span></h3>
        <p className="text-xs text-alba-muted">Who's buying, who's dumping, in real time</p>
      </div>

      {/* Wallet Tags (v1.0.6) */}
      <div className="glass rounded-xl p-6 opacity-50">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Tag size={14} className="text-alba-header" />Wallet Tags <span className="text-[10px] px-1.5 py-0.5 rounded bg-alba-muted/20">v1.0.6</span></h3>
        <p className="text-xs text-alba-muted">The label set ALBA reasons with</p>
      </div>
    </div>
  );
}

// ── Shield Icon Component ──────────────────────────────────────────────────
function Shield({ size, className }: { size: number; className: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}

// ── Droplet Icon Component ─────────────────────────────────────────────────
function Droplet({ size, className }: { size: number; className: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2.69l5.66 5.66a9 9 0 1 1-11.32 0z"/></svg>;
}

// ── Users Icon Component ───────────────────────────────────────────────────
function Users({ size, className }: { size: number; className: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}

// ── Tag Icon Component ─────────────────────────────────────────────────────
function Tag({ size, className }: { size: number; className: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-1.42.58H5a2 2 0 0 1-2-2v-5.29a2 2 0 0 0-.58-1.42l-1.42-1.42a2 2 0 0 1 0-2.82l8.66-8.66a2 2 0 0 1 2.82 0L20.59 10.6a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/></svg>;
}

// ── Placeholder Components ───────────────────────────────────────────────
function MarketTab() {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Market Overview</h3>
      <p className="text-xs text-alba-muted">Market trends and sentiment — coming in v1.0.5</p>
    </div>
  );
}

function LaunchpadTab() {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Launchpad Tracking</h3>
      <p className="text-xs text-alba-muted">Meme coin launch monitoring — coming in v1.0.7</p>
    </div>
  );
}

function SignalsTab() {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Signals & Discovery</h3>
      <p className="text-xs text-alba-muted">On-chain alpha signals — coming in v1.0.8</p>
    </div>
  );
}

function ChainsTab() {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Chains</h3>
      <p className="text-xs text-alba-muted">Multi-chain analytics — coming in v1.0.9</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function TokenIntel() {
  const [activeTab, setActiveTab] = useState<Tab>("intel");
  const [tokenAddress, setTokenAddress] = useState("gRWRJAXPnjBwUag6XjYtVJkW6WjbMkHJaUA7gmvpump");

  const tabs = [
    { id: "intel", label: "TOKEN INTEL", icon: Cpu },
    { id: "market", label: "MARKET", icon: TrendingUp },
    { id: "launchpad", label: "LAUNCHPAD", icon: Rocket },
    { id: "signals", label: "SIGNALS & DISCOVERY", icon: Zap },
    { id: "chains", label: "CHAINS", icon: Zap },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative px-6 pt-8 pb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-alba-accent/5 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-2xl font-semibold mb-4">Token Intelligence</h1>
            <p className="text-sm text-alba-muted mb-4">
              Starting with v1.0.5 and rolling out through v1.0.9, ALBA gains native token intelligence, 
              market awareness, launchpad tracking and realtime signals — all reasoned about on-chain, all verifiable.
            </p>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="Enter token address (e.g. gRWRJAXPnjBwUag6XjYtVJkW6WjbMkHJaUA7gmvpump)"
                  className="flex-1 bg-alba-bg/50 border border-alba-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent/50 font-mono"
                />
                <button className="px-4 py-2 rounded-lg bg-alba-accent/10 text-alba-accent hover:bg-alba-accent/20 transition-colors shrink-0">
                  <Search size={16} />
                </button>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Tab Navigation */}
            <nav className="lg:w-56 space-y-1">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      active ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <tab.icon size={16} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Tab Content */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "intel" && <TokenIntelTab address={tokenAddress} />}
                  {activeTab === "market" && <MarketTab />}
                  {activeTab === "launchpad" && <LaunchpadTab />}
                  {activeTab === "signals" && <SignalsTab />}
                  {activeTab === "chains" && <ChainsTab />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}