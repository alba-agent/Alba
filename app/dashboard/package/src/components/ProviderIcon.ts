// Provider logo mapping — hard-coded from /logos/ assets
// Some providers share the same parent company logo

const LOGO_MAP: Record<string, string> = {
  "Amazon Bedrock": "amazon-web-services-aws-logo-png_seeklogo-319188.png",
  "Anthropic": "anthropic-icon-logo-png_seeklogo-515014.png",
  "Azure OpenAI Responses": "azure.png",
  "Cerebras": "cerebras-logo-png_seeklogo-441674.png",
  "Cloudflare AI Gateway": "cloudflare-logo-png_seeklogo-294312.png",
  "Cloudflare Workers AI": "cloudflare-logo-png_seeklogo-294312.png",
  "DeepSeek": "deepseek-ai-icon-logo-png_seeklogo-611473.png",
  "Fireworks": "fireworks-ai-logo-png_seeklogo-611594.png",
  "Google Gemini": "gemini-icon-logo-png_seeklogo-611605.png",
  "Google Vertex AI": "google-2015-logo-png_seeklogo-268116.png",
  "Groq": "groq-icon-logo-png_seeklogo-605779.png",
  "Hugging Face": "hugging-face-icon-logo-png_seeklogo-515010.png",
  "Kimi For Coding": "kimi-logo-png_seeklogo-611650.png",
  "MiniMax": "minimax-logo-png_seeklogo-208363.png",
  "MiniMax China": "minimax-logo-png_seeklogo-208363.png",
  "Mistral": "mistral-ai-logo-png_seeklogo-515007.png",
  "Moonshot AI": "moonshot-icon-logo-png_seeklogo-669114.png",
  "Moonshot AI China": "moonshot-icon-logo-png_seeklogo-669114.png",
  "NVIDIA NIM": "nvidia-logo-png_seeklogo-443363.png",
  "OpenAI": "chatgpt-logo-png_seeklogo-500383.png",
  "OpenCode Go": "opencode-icon-logo-png_seeklogo-665474.png",
  "OpenCode Zen": "opencode-icon-logo-png_seeklogo-665474.png",
  "OpenRouter": "openrouter-logo-png_seeklogo-611674.png",
  "Together AI": "together-ai-logo-png_seeklogo-611707.png",
  "Vercel AI Gateway": "vercel-logo-png_seeklogo-396226.png",
  "xAI": "xai-logo-png_seeklogo-491313.png",
  "Xiaomi MiMo": "xiaomi-new-2021-logo-png_seeklogo-400987.png",
  "Xiaomi MiMo Token Plan": "xiaomi-new-2021-logo-png_seeklogo-400987.png",
};

// Providers using same logo (company groups)
export const PROVIDER_GROUPS: Record<string, string[]> = {
  "Cloudflare": ["Cloudflare AI Gateway", "Cloudflare Workers AI"],
  "MiniMax": ["MiniMax", "MiniMax China"],
  "Moonshot AI": ["Moonshot AI", "Moonshot AI China"],
  "OpenCode": ["OpenCode Go", "OpenCode Zen"],
  "Xiaomi": ["Xiaomi MiMo", "Xiaomi MiMo Token Plan"],
  "Google": ["Google Gemini", "Google Vertex AI"],
};

export function getProviderLogo(providerName: string): string | null {
  const file = LOGO_MAP[providerName];
  if (!file) return null;
  return `/logos/${file}`;
}

export function getProviderIcon(providerName: string): string {
  // Try logo first, fall back to emoji from Providers.tsx
  const logo = getProviderLogo(providerName);
  if (logo) return logo;
  return ""; // caller should handle with fallback emoji
}

export function isProviderConfigured(providerName: string, providers: Record<string, { configured: boolean; key?: string | null }>): boolean {
  return providers[providerName]?.configured && !!providers[providerName]?.key;
}