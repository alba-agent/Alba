import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Eye, EyeOff, ChevronDown, ChevronUp, Loader2, AlertCircle, Key, Shield } from "lucide-react";
import { getProviderLogo } from "../components/ProviderIcon";

interface Provider {
  configured: boolean;
  key: string | null;
}

type ProvidersMap = Record<string, Provider>;

// Provider icons — uses real logos when available, falls back to emoji
function ProviderIcon({ name }: { name: string }) {
  const logo = getProviderLogo(name);
  if (logo) {
    return <img src={logo} alt={name} className="w-7 h-7 object-contain shrink-0" />;
  }
  // Fallback emoji for providers without logos
  const fallback: Record<string, string> = {
    "Ant Ling": "🐜", "OpenCode Go": "🔷", "OpenCode Zen": "☯️",
    "Kimi For Coding": "🌙", "NVIDIA NIM": "🎮",
  };
  return <span className="text-lg w-7 text-center shrink-0">{fallback[name] || "🔌"}</span>;
}

// Same-logos company groups (for display grouping)
const COMPANY_GROUPS: Record<string, string[]> = {
  "Cloudflare": ["Cloudflare AI Gateway", "Cloudflare Workers AI"],
  "MiniMax": ["MiniMax", "MiniMax China"],
  "Moonshot AI": ["Moonshot AI", "Moonshot AI China"],
  "OpenCode": ["OpenCode Go", "OpenCode Zen"],
  "Xiaomi": ["Xiaomi MiMo", "Xiaomi MiMo Token Plan"],
  "Google": ["Google Gemini", "Google Vertex AI"],
};

export default function Providers() {
  const [providers, setProviders] = useState<ProvidersMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "configured" | "unconfigured">("all");

  useEffect(() => { fetchProviders(); }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/providers");
      if (!res.ok) throw new Error("Failed to fetch providers");
      const data = await res.json();
      setProviders(data);
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProvider || !apiKey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey: apiKey.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();

      // Re-fetch to get server state
      await fetchProviders();

      setSaveSuccess(selectedProvider);
      setApiKey("");
      setSelectedProvider(null);
      setShowKey(false);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const configuredCount = Object.values(providers).filter((p) => p.configured).length;
  const totalCount = Object.keys(providers).length;

  const filteredEntries = Object.entries(providers).filter(([_, p]) => {
    if (filter === "configured") return p.configured;
    if (filter === "unconfigured") return !p.configured;
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="text-alba-accent animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Providers</h1>
            <p className="text-sm text-alba-muted mt-1">
              Configure AI model providers. Add at least one API key to get started.
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full bg-alba-accent/10 text-alba-accent border border-alba-accent/20">
            {configuredCount}/{totalCount} configured
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "configured", "unconfigured"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
                filter === f
                  ? "bg-alba-accent/10 text-alba-accent border border-alba-accent/20"
                  : "text-alba-muted hover:text-white border border-alba-border hover:border-alba-accent/20"
              }`}
            >
              {f} {f === "configured" && `(${configuredCount})`} {f === "unconfigured" && `(${totalCount - configuredCount})`}
            </button>
          ))}
        </div>

        {/* Success message */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-lg bg-alba-success/10 border border-alba-success/20 text-alba-success text-sm flex items-center gap-2"
            >
              <Check size={16} />
              {saveSuccess} configured successfully!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-alba-error/10 border border-alba-error/20 text-alba-error text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Provider list */}
        <div className="space-y-2">
          {filteredEntries.map(([name, provider]) => {
            const isSelected = selectedProvider === name;

            return (
              <motion.div
                key={name}
                layout
                className={`border rounded-xl transition-all overflow-hidden ${
                  isSelected
                    ? "border-alba-accent/40 bg-alba-accent/5"
                    : provider.configured
                    ? "border-alba-success/20 bg-alba-success/5"
                    : "border-alba-border bg-alba-surface hover:border-alba-accent/20"
                }`}
              >
                <button
                  onClick={() => {
                    if (isSelected) {
                      setSelectedProvider(null);
                      setApiKey("");
                      setShowKey(false);
                    } else {
                      setSelectedProvider(name);
                      setApiKey("");
                      setShowKey(false);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <ProviderIcon name={name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{name}</span>
                      {provider.configured ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-alba-success/15 text-alba-success flex items-center gap-1 shrink-0">
                          <Check size={10} /> configured
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-alba-border/50 text-alba-muted shrink-0">
                          unconfigured
                        </span>
                      )}
                    </div>
                    {provider.configured && (
                      <p className="text-xs text-alba-muted mt-0.5 flex items-center gap-1">
                        <Shield size={10} /> Key stored securely
                      </p>
                    )}
                  </div>
                  {isSelected ? <ChevronUp size={16} className="text-alba-accent shrink-0" /> : <ChevronDown size={16} className="text-alba-muted shrink-0" />}
                </button>

                {/* Expandable key input */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0">
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-alba-muted" />
                            <input
                              type={showKey ? "text" : "password"}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder={`Enter ${name} API key...`}
                              className="w-full bg-alba-bg border border-alba-border rounded-lg pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:border-alba-accent transition-colors placeholder:text-alba-muted/50"
                              onKeyDown={(e) => e.key === "Enter" && handleSave()}
                              autoFocus
                            />
                            <button
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-alba-muted hover:text-alba-accent transition-colors"
                            >
                              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          <button
                            onClick={handleSave}
                            disabled={!apiKey.trim() || saving}
                            className="px-4 py-2.5 rounded-lg bg-alba-accent text-alba-bg text-sm font-medium hover:bg-alba-accent/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                          >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Save
                          </button>
                        </div>
                        {provider.configured && (
                          <p className="text-xs text-alba-muted mt-2">
                            Already configured. Enter a new key to replace it.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {filteredEntries.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-alba-muted">No providers match the "{filter}" filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
