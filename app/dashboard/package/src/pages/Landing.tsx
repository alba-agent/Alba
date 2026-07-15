import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, Mic, Palette, Shield, Sparkles, Key, Check, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

const steps = [
  { title: "Welcome to ALBA", description: "Your personal AI assistant. Runs 100% locally on your machine. Private. Fast. Extensible.", icon: Sparkles },
  { title: "Connect a Provider", description: "Add at least one AI provider API key. You can add more later from the Providers page.", icon: Key },
  { title: "Choose a Model", description: "Select your default model. You can change this anytime in Settings.", icon: Cpu },
  { title: "You're Ready", description: "ALBA is configured and ready to go. All data stays on your machine.", icon: Shield },
];

const QUICK_PROVIDERS = [
  { name: "OpenRouter", envKey: "OPENROUTER_API_KEY", placeholder: "sk-or-...", url: "https://openrouter.ai/keys" },
  { name: "Anthropic", envKey: "ANTHROPIC_API_KEY", placeholder: "sk-ant-...", url: "https://console.anthropic.com" },
  { name: "OpenAI", envKey: "OPENAI_API_KEY", placeholder: "sk-...", url: "https://platform.openai.com" },
];

const QUICK_MODELS = [
  { id: "openrouter/owl-alpha", label: "Owl Alpha", provider: "OpenRouter" },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "Anthropic" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek Chat", provider: "OpenRouter" },
];

export default function Landing({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({ provider: "OpenRouter", apiKey: "", model: "openrouter/owl-alpha", theme: "dark" });
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleLaunch();
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: config.provider === "OpenRouter" ? config.apiKey : "",
          anthropicKey: config.provider === "Anthropic" ? config.apiKey : "",
          openaiKey: config.provider === "OpenAI" ? config.apiKey : "",
          model: config.model,
          theme: config.theme,
        }),
      });
      if (!res.ok) throw new Error("Setup failed");
      setTimeout(onComplete, 800);
    } catch (e: any) {
      setError(e.message);
      setIsLaunching(false);
    }
  };

  const isLast = step === steps.length - 1;
  const CurrentIcon = steps[step].icon;
  const selectedProvider = QUICK_PROVIDERS.find((p) => p.name === config.provider);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-alba-bg overflow-hidden relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-alba-bg via-alba-bg to-alba-accent/5" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-alba-accent/5 rounded-full blur-[120px]" />

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-lg px-8"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-alba-accent/30 to-cyan-600/30 flex items-center justify-center glow-accent overflow-hidden">
            <img src="/logos/alba-logo.png" alt="ALBA" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-semibold text-white">ALBA</span>
        </div>

        {/* Step content */}
        <div className="glass rounded-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-alba-accent/10 border border-alba-accent/20 flex items-center justify-center mb-6">
            <CurrentIcon className="text-alba-accent" size={28} />
          </div>

          <h1 className="text-2xl font-semibold mb-3">{steps[step].title}</h1>
          <p className="text-alba-muted leading-relaxed mb-8">{steps[step].description}</p>

          {/* Step 0: Welcome — theme selector */}
          {step === 0 && (
            <div className="mb-6">
              <label className="text-sm text-alba-muted block mb-2">Theme</label>
              <div className="flex gap-3">
                {["dark", "light"].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setConfig({ ...config, theme })}
                    className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                      config.theme === theme
                        ? "border-alba-accent bg-alba-accent/10 text-alba-accent"
                        : "border-alba-border text-alba-muted hover:border-alba-accent/30"
                    }`}
                  >
                    {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Provider + API Key */}
          {step === 1 && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="text-sm text-alba-muted block mb-2">Provider</label>
                <div className="flex gap-2">
                  {QUICK_PROVIDERS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setConfig({ ...config, provider: p.name, apiKey: "" })}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        config.provider === p.name
                          ? "border-alba-accent bg-alba-accent/10 text-alba-accent"
                          : "border-alba-border text-alba-muted hover:border-alba-accent/30"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-alba-muted block mb-2">
                  {config.provider} API Key
                  {selectedProvider && (
                    <a href={selectedProvider.url} target="_blank" rel="noopener noreferrer" className="text-alba-accent ml-2 hover:underline">
                      get key →
                    </a>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder={selectedProvider?.placeholder || "Enter API key..."}
                    className="w-full bg-alba-bg border border-alba-border rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:border-alba-accent transition-colors placeholder:text-alba-muted/50"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-alba-muted hover:text-alba-accent transition-colors"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-alba-muted mt-2">Your key is stored locally in ~/.alba/.env and never sent anywhere except the provider's API.</p>
              </div>
            </div>
          )}

          {/* Step 2: Model selection */}
          {step === 2 && (
            <div className="mb-6">
              <label className="text-sm text-alba-muted block mb-2">Default Model</label>
              <div className="space-y-2">
                {QUICK_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setConfig({ ...config, model: m.id })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all ${
                      config.model === m.id
                        ? "border-alba-accent bg-alba-accent/10 text-alba-accent"
                        : "border-alba-border text-alba-muted hover:border-alba-accent/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-xs text-alba-muted/60">{m.provider}</span>
                    </div>
                    {config.model === m.id && <Check size={16} className="text-alba-accent" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-alba-bg border border-alba-border">
                <span className="text-sm text-alba-muted">Provider</span>
                <span className="text-sm font-medium">{config.provider}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-alba-bg border border-alba-border">
                <span className="text-sm text-alba-muted">Model</span>
                <span className="text-sm font-medium font-mono">{config.model}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-alba-bg border border-alba-border">
                <span className="text-sm text-alba-muted">Theme</span>
                <span className="text-sm font-medium capitalize">{config.theme}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-alba-bg border border-alba-border">
                <span className="text-sm text-alba-muted">API Key</span>
                <span className="text-sm font-mono text-alba-success">
                  {config.apiKey ? `${config.apiKey.slice(0, 6)}******` : "Not set"}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-alba-error/10 border border-alba-error/20 text-alba-error text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Progress dots */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-alba-accent" : i < step ? "w-2 bg-alba-accent/50" : "w-2 bg-alba-border"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-5 py-3 rounded-lg border border-alba-border text-alba-muted hover:text-white transition-colors text-sm"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isLaunching || (step === 1 && !config.apiKey.trim())}
              className="flex-1 px-5 py-3 rounded-lg bg-alba-accent text-alba-bg font-semibold text-sm hover:bg-alba-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLaunching ? (
                <><Loader2 size={16} className="animate-spin" /> Launching...</>
              ) : isLast ? (
                <>Launch ALBA <ArrowRight size={16} /></>
              ) : (
                <>Continue <ArrowRight size={16} /></>
              )}
            </button>
          </div>

          {!isLast && (
            <button onClick={onComplete} className="w-full mt-3 text-xs text-alba-muted hover:text-alba-accent transition-colors">
              Skip setup — configure later
            </button>
          )}
        </div>

        <p className="text-center text-xs text-alba-muted mt-6">Step {step + 1} of {steps.length}</p>
      </motion.div>
    </div>
  );
}
