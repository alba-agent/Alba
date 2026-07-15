import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Cpu, Palette, Mic, Brain, Terminal, Save, Check, Loader2, AlertCircle, Search } from "lucide-react";
import { useTheme, type ThemeName } from "../hooks/useTheme";

// ── Model Selector Component ───────────────────────────────────────────────
function ModelSelector({ config, update }: { config: Record<string, unknown>; update: (key: string, value: unknown) => void }) {
  const [models, setModels] = useState<Array<{ id: string; name?: string; provider?: string }>>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const providers = config?.providers as Record<string, { configured?: boolean; key?: string }> | undefined;
  const configuredProviders = providers
    ? Object.entries(providers)
        .filter(([, p]) => p.configured && p.key)
        .map(([name]) => name)
    : [];

  const defaultConfig = config?.defaultProvider as string | undefined;
  const effectiveProvider = configuredProviders.includes(defaultConfig ?? "")
    ? (defaultConfig ?? "OpenRouter")
    : configuredProviders[0] || defaultConfig || "OpenRouter";

  const handleProviderChange = (provider: string) => {
    update("defaultProvider", provider);
  };

  const fetchModels = async (provider: string) => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const resp = await fetch(`/api/models?provider=${provider}`);
      const data = await resp.json();
      setModels(data.models ?? []);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "Failed to fetch models");
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveProvider) fetchModels(effectiveProvider);
  }, [effectiveProvider]);

  useEffect(() => {
    if (effectiveProvider) fetchModels(effectiveProvider);
  }, []);

  const filteredModels = searchQuery
    ? models.filter(m => m.id.toLowerCase().includes(searchQuery.toLowerCase()) || (m.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
    : models;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-alba-muted block mb-2">Default Provider</label>
        <select value={effectiveProvider} onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent">
          <option value="OpenRouter">OpenRouter</option>
          <option value="Anthropic">Anthropic</option>
          <option value="OpenAI">OpenAI</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-alba-muted block mb-2">Default Model</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-alba-muted" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-alba-bg border border-alba-border rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-alba-accent"
          />
        </div>
        <div className="mt-2 max-h-60 overflow-y-auto">
          {modelsLoading ? (
            <p className="text-xs text-alba-muted py-2">Loading models...</p>
          ) : modelsError ? (
            <p className="text-xs text-alba-error py-2">{modelsError}</p>
          ) : (
            <div className="space-y-1 mt-2">
              {filteredModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => update("defaultModel", model.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    config.defaultModel === model.id ? "bg-alba-accent/20 text-alba-accent" : "text-alba-muted hover:bg-alba-bg"
                  }`}
                >
                  {model.name ?? model.id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(function SettingsPage({ tab }: { tab?: string }) {
  const [activeTab, setActiveTab] = useState(tab || "general");
  useEffect(() => { if (tab) setActiveTab(tab); }, [tab]);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(setConfig)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load config"))
      .finally(() => setLoading(false));
  }, []);

  const fetchConfig = async () => {
    try {
      const r = await fetch("/api/config");
      setConfig(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch config");
    }
  };

  const update = (key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value } as Record<string, unknown>));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "ai", label: "AI Model", icon: Cpu },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "memory", label: "Memory", icon: Brain },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "advanced", label: "Advanced", icon: Terminal },
  ];

  const Toggle = memo(({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full relative transition-colors ${value ? "bg-alba-accent" : "bg-alba-border"}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "right-0.5" : "left-0.5"}`} />
    </button>
  ));

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
          <div className="w-48 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:bg-alba-bg"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 glass rounded-xl p-6">
            {activeTab === "general" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium">General</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Workspace</label>
                    <input type="text" value={config.workspace as string ?? "~/alba-workspace"} onChange={(e) => update("workspace", e.target.value)}
                      className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium">AI Model</h2>
                <ModelSelector config={config} update={update} />
                <div className="space-y-4 pt-4 border-t border-alba-border">
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Effect Level</label>
                    <p className="text-xs text-alba-muted mb-3">How aggressively ALBA spawns sub-agents</p>
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
                    <input type="number" value={config.maxTokens as number ?? 8192} onChange={(e) => update("maxTokens", parseInt(e.target.value) || 8192)}
                      className="w-32 bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent" />
                  </div>
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Temperature</label>
                    <input type="number" step="0.1" min="0" max="2" value={config.temperature as number ?? 0.7} onChange={(e) => update("temperature", parseFloat(e.target.value) || 0.7)}
                      className="w-32 bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Concurrent messages</p>
                      <p className="text-xs text-alba-muted">Allow sending messages while agent is processing</p>
                    </div>
                    <Toggle value={config.concurrentMessages as boolean ?? false} onChange={(v) => update("concurrentMessages", v)} />
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
                    <select value={config.ttsEngine as string ?? "macos-say"} onChange={(e) => update("ttsEngine", e.target.value)}
                      className="w-full bg-alba-bg border border-alba-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent">
                      <option value="macos-say">macOS Say (built-in)</option>
                      <option value="piper">Piper TTS (local)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">STT Engine</label>
                    <select value={config.sttEngine as string ?? "whisper-cpp"} onChange={(e) => update("sttEngine", e.target.value)}
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
                    <Toggle value={config.pushToTalk as boolean ?? false} onChange={(v) => update("pushToTalk", v)} />
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
                    <select value={config.autoDeleteMemory as string ?? "never"} onChange={(e) => update("autoDeleteMemory", e.target.value)}
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
                    <Toggle value={config.memorySearch as boolean ?? true} onChange={(v) => update("memorySearch", v)} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium">Appearance</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Theme Preset</label>
                    <div className="grid grid-cols-5 gap-2">
                      {(["midnight", "solarized", "neon", "ice", "matrix"] as ThemeName[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`py-3 rounded-lg border text-sm capitalize transition-all ${
                            theme === t ? "border-alba-accent bg-alba-accent/10 text-alba-accent glow-sm" : "border-alba-border text-alba-muted hover:border-alba-accent/30"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-alba-muted block mb-2">Accent Color</label>
                    <div className="flex gap-3">
                      {["#00e5ff", "#69ff94", "#c792ea", "#ffcb6b", "#ff5370"].map((color) => (
                        <button key={color} onClick={() => update("accentColor", color)}
                          className={`w-10 h-10 rounded-lg border-2 transition-all glow-sm ${
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
                    <Toggle value={config.animations as boolean ?? true} onChange={(v) => update("animations", v)} />
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
                    <select value={config.logLevel as string ?? "info"} onChange={(e) => update("logLevel", e.target.value)}
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
                    <Toggle value={config.debugMode as boolean ?? false} onChange={(v) => update("debugMode", v)} />
                  </div>
                  <button onClick={() => { if (confirm("Reset all settings?")) { fetchConfig(); } }}
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
});