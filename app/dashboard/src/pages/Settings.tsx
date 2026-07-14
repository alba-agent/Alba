import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Cpu, Palette, Mic, Brain, Terminal, Save, Check, Loader2, AlertCircle, Search } from "lucide-react";

// ── Model Selector Component ───────────────────────────────────────────────
function ModelSelector({ config, update }: { config: any; update: (key: string, value: any) => void }) {
  const [models, setModels] = useState<Array<{ id: string; name?: string; provider?: string }>>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get list of configured providers
  const configuredProviders = config?.providers 
    ? Object.entries(config.providers)
        .filter(([_, p]: [string, any]) => p.configured && p.key)
        .map(([name]) => name)
    : [];
  
  // If current defaultProvider is not in configured list, pick first configured
  const effectiveProvider = configuredProviders.includes(config.defaultProvider) 
    ? config.defaultProvider 
    : configuredProviders[0] || config.defaultProvider || "OpenRouter";
  
  const handleProviderChange = (provider: string) => {
    update("defaultProvider", provider);
    // Reset model when provider changes
    update("model", "");
    setModels([]);
    setSearchQuery("");
  };
  
  const fetchModels = async (provider: string) => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const res = await fetch(`/api/models?provider=${encodeURIComponent(provider)}`);
      const data = await res.json();
      if (data.error) {
        setModelsError(data.error);
        setModels([]);
      } else if (data.models && data.models.length > 0) {
        // Normalize model list
        const normalized = data.models.map((m: any) => ({
          id: m.id || m,
          name: m.name || m.id?.split("/").pop() || m,
          provider: m.provider?.name || provider,
        }));
        setModels(normalized);
        
        // If current model is set but not in list, keep it anyway
        // If no model is set, pick first
        if (!config.model && normalized.length > 0) {
          update("model", normalized[0].id);
        }
      }
    } catch (e: any) {
      setModelsError(e.message);
    }
    setModelsLoading(false);
  };
  
  // Fetch models on mount and when provider changes
  useEffect(() => {
    if (effectiveProvider) {
      fetchModels(effectiveProvider);
    }
  }, [config.defaultProvider]);
  
  // Fetch on mount
  useEffect(() => {
    if (effectiveProvider && models.length === 0) {
      fetchModels(effectiveProvider);
    }
  }, []);
  
  const filteredModels = searchQuery
    ? models.filter(m => m.id.toLowerCase().includes(searchQuery.toLowerCase()) || (m.name || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : models;
  
  return (
    <div className="space-y-4">
      {/* Default Provider Selector */}
      <div>
        <label className="text-sm text-alba-muted block mb-2">AI Provider</label>
        {configuredProviders.length === 0 ? (
          <p className="text-xs text-alba-warn">No providers configured. Go to Providers page to add API keys.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {configuredProviders.map((name: string) => (
              <button key={name}
                onClick={() => handleProviderChange(name)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  effectiveProvider === name 
                    ? "border-alba-accent bg-alba-accent/10 text-alba-accent" 
                    : "border-alba-border text-alba-muted hover:border-alba-accent/30"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Model Selector */}
      <div>
        <label className="text-sm text-alba-muted block mb-2">
          Default Model
          {models.length > 0 && <span className="text-xs ml-2 text-alba-muted/50">({models.length} available)</span>}
        </label>
        
        {modelsLoading ? (
          <div className="flex items-center gap-2 bg-alba-bg border border-alba-border rounded-lg px-3 py-2">
            <Loader2 size={14} className="animate-spin text-alba-accent" />
            <span className="text-sm text-alba-muted">Loading models...</span>
          </div>
        ) : modelsError ? (
          <div>
            <div className="flex items-center gap-2 bg-alba-error/10 border border-alba-error/20 rounded-lg px-3 py-2 mb-2">
              <AlertCircle size={14} className="text-alba-error shrink-0" />
              <span className="text-xs text-alba-error">{modelsError}</span>
            </div>
            {/* Fallback text input */}
            <input type="text" value={config.model} onChange={(e) => update("model", e.target.value)}
              placeholder="Enter model ID manually..."
              className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent font-mono" />
          </div>
        ) : models.length === 0 ? (
          <input type="text" value={config.model} onChange={(e) => update("model", e.target.value)}
            placeholder="Enter model ID manually..."
            className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent font-mono" />
        ) : (
          <div>
            {/* Search filter */}
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-alba-muted" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="w-full bg-alba-bg border border-alba-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-alba-accent" />
            </div>
            {/* Model list (scrollable) */}
            <div className="max-h-48 overflow-y-auto border border-alba-border rounded-lg bg-alba-bg">
              {filteredModels.length === 0 ? (
                <div className="p-3 text-sm text-alba-muted text-center">No models match &quot;{searchQuery}&quot;</div>
              ) : (
                filteredModels.map((m) => (
                  <button key={m.id}
                    onClick={() => update("model", m.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between hover:bg-white/5 ${
                      config.model === m.id ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{m.name || m.id.split("/").pop()}</span>
                      <span className="text-[10px] text-alba-muted/50 truncate block">{m.id}</span>
                    </div>
                    {config.model === m.id && <Check size={14} className="shrink-0 ml-2" />}
                  </button>
                ))
              )}
            </div>
            {/* Show current model */}
            <p className="text-xs text-alba-muted mt-2">
              Current: <span className="font-mono text-alba-accent">{config.model || "None selected"}</span>
            </p>
          </div>
        )}
        
        {/* Manual override */}
        <button onClick={() => {
          setModels([]);
          setSearchQuery("");
        }} className="text-xs text-alba-muted hover:text-alba-accent mt-2">
          Enter model ID manually instead
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage({ tab }: { tab?: string }) {
  const [activeTab, setActiveTab] = useState(tab || "general");
  useEffect(() => { if (tab) setActiveTab(tab); }, [tab]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const update = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "ai", label: "AI Model", icon: Cpu },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "memory", label: "Memory", icon: Brain },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "advanced", label: "Advanced", icon: Terminal },
  ];

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full relative transition-colors ${value ? "bg-alba-accent" : "bg-alba-border"}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "right-0.5" : "left-0.5"}`} />
    </button>
  );

  if (loading || !config) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="text-alba-accent animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-alba-accent text-alba-bg text-sm font-medium hover:bg-alba-accent/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-alba-error/10 border border-alba-error/20 text-alba-error text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="flex gap-6">
          {/* Show internal tabs only when no sidebar (mobile) */}
          <nav className="w-48 shrink-0 space-y-1 hidden">
            {tabs.map((tab) => (
              <button key={tab.id} className="hidden" />
            ))}
          </nav>

          <div className="flex-1 glass rounded-xl p-6">
            {activeTab === "general" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium">General</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Port</label>
                    <input type="number" value={config.port} onChange={(e) => update("port", parseInt(e.target.value) || 3001)}
                      className="w-32 bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Auto-start agent</p>
                      <p className="text-xs text-alba-muted">Start agent when ALBA launches</p>
                    </div>
                    <Toggle value={config.autoStartAgent} onChange={(v) => update("autoStartAgent", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Voice alerts</p>
                      <p className="text-xs text-alba-muted">ALBA speaks important updates</p>
                    </div>
                    <Toggle value={config.voiceAlerts} onChange={(v) => update("voiceAlerts", v)} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium">AI Model</h2>
                <div className="space-y-4">
                  <ModelSelector config={config} update={update} />
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Personality</label>
                    <select value={config.personality || "professional"} onChange={(e) => update("personality", e.target.value)}
                      className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent">
                      <option value="professional">Professional — Polished and efficient</option>
                      <option value="casual">Casual — Friendly and relaxed</option>
                      <option value="concise">Concise — Short and direct</option>
                      <option value="creative">Creative — Imaginative and expressive</option>
                    </select>
                    <p className="text-xs text-alba-muted mt-1">Controls how ALBA communicates with you</p>
                  </div>
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Effect Level</label>
                    <div className="flex gap-2">
                      {["eco", "normal", "turbo", "max"].map((level) => (
                        <button key={level} onClick={() => update("effect", level)}
                          className={`flex-1 py-2 rounded-lg border text-sm capitalize transition-all ${
                            config.effect === level ? "border-alba-accent bg-alba-accent/10 text-alba-accent" : "border-alba-border text-alba-muted hover:border-alba-accent/30"
                          }`}>
                          {level}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-alba-muted mt-2">
                      {config.effect === "eco" && "🌿 Minimal. Single model, no swarm."}
                      {config.effect === "normal" && "⚡ Balanced. Single model with tools."}
                      {config.effect === "turbo" && "🚀 Fast. Spawns 2 sub-agents for complex tasks."}
                      {config.effect === "max" && "🌊 Maximum. Spawns 5 sub-agents for deep analysis."}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Max Tokens</label>
                    <input type="number" value={config.maxTokens} onChange={(e) => update("maxTokens", parseInt(e.target.value) || 8192)}
                      className="w-32 bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent" />
                  </div>
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Temperature</label>
                    <input type="number" step="0.1" min="0" max="2" value={config.temperature} onChange={(e) => update("temperature", parseFloat(e.target.value) || 0.7)}
                      className="w-32 bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Concurrent messages</p>
                      <p className="text-xs text-alba-muted">Allow sending messages while agent is processing</p>
                    </div>
                    <Toggle value={config.concurrentMessages} onChange={(v) => update("concurrentMessages", v)} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "voice" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium">Voice</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">TTS Engine</label>
                    <select value={config.ttsEngine} onChange={(e) => update("ttsEngine", e.target.value)}
                      className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent">
                      <option value="macos-say">macOS Say (built-in)</option>
                      <option value="piper">Piper TTS (local)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">STT Engine</label>
                    <select value={config.sttEngine} onChange={(e) => update("sttEngine", e.target.value)}
                      className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent">
                      <option value="whisper-cpp">whisper.cpp (local)</option>
                      <option value="vosk">Vosk (local)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Push-to-talk</p>
                      <p className="text-xs text-alba-muted">Hold spacebar to record</p>
                    </div>
                    <Toggle value={config.pushToTalk} onChange={(v) => update("pushToTalk", v)} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "memory" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium">Memory</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Auto-delete after</label>
                    <select value={config.autoDeleteMemory} onChange={(e) => update("autoDeleteMemory", e.target.value)}
                      className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent">
                      <option value="never">Never</option>
                      <option value="30d">30 days</option>
                      <option value="90d">90 days</option>
                      <option value="1y">1 year</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Memory search</p>
                      <p className="text-xs text-alba-muted">Enable semantic memory search</p>
                    </div>
                    <Toggle value={config.memorySearch} onChange={(v) => update("memorySearch", v)} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium">Appearance</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Theme</label>
                    <div className="flex gap-3">
                      {["dark", "light", "system"].map((theme) => (
                        <button key={theme} onClick={() => update("theme", theme)}
                          className={`flex-1 py-3 rounded-lg border text-sm capitalize transition-all ${
                            config.theme === theme ? "border-alba-accent bg-alba-accent/10 text-alba-accent" : "border-alba-border text-alba-muted hover:border-alba-accent/30"
                          }`}>
                          {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻"} {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Accent Color</label>
                    <div className="flex gap-3">
                      {["#00e5ff", "#69ff94", "#c792ea", "#ffcb6b", "#ff5370"].map((color) => (
                        <button key={color} onClick={() => update("accentColor", color)}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            config.accentColor === color ? "border-white scale-110" : "border-transparent hover:border-white/30"
                          }`}
                          style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Animations</p>
                      <p className="text-xs text-alba-muted">Enable motion effects</p>
                    </div>
                    <Toggle value={config.animations} onChange={(v) => update("animations", v)} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "advanced" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium">Advanced</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Config Directory</label>
                    <p className="text-sm font-mono bg-alba-bg border border-alba-border rounded-lg px-3 py-2">~/.alba/</p>
                  </div>
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Log Level</label>
                    <select value={config.logLevel} onChange={(e) => update("logLevel", e.target.value)}
                      className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent">
                      <option value="info">info</option>
                      <option value="debug">debug</option>
                      <option value="warn">warn</option>
                      <option value="error">error</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Debug mode</p>
                      <p className="text-xs text-alba-muted">Verbose logging</p>
                    </div>
                    <Toggle value={config.debugMode} onChange={(v) => update("debugMode", v)} />
                  </div>
                  <button onClick={() => { if (confirm("Reset all settings?")) { fetch("/api/config").then(r => r.json()).then(d => setConfig(d)); } }}
                    className="w-full py-2 rounded-lg border border-alba-error/30 text-alba-error text-sm hover:bg-alba-error/10 transition-colors">
                    Reset to Defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
