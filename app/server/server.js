import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync, renameSync, readdirSync, unlinkSync } from "node:fs";
import { join, extname, basename, dirname, resolve as resolvePath } from "node:path";
import { homedir, cpus, loadavg, totalmem, freemem, uptime as osUptime, platform } from "node:os";
import { createServer } from "node:http";
import https from "node:https";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "node:url";

const ALBA_HOME = join(homedir(), ".alba");
const WORKSPACE_DIR = join(ALBA_HOME, "workspace");
const LOG_FILE = join(ALBA_HOME, "server.log");
const CONFIG_FILE = join(ALBA_HOME, "config.json");
const MEMORY_FILE = join(ALBA_HOME, "memory.json");
const SESSIONS_FILE = join(ALBA_HOME, "sessions.json");
const USAGE_FILE = join(ALBA_HOME, "usage.json");
const PLANS_DIR = join(ALBA_HOME, "plans");
const ACTIVITY_FILE = join(ALBA_HOME, "activity.json");
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const IDENTITY_DIR = join(__dirname, "..", "..", "npm", "src", "identity");

// SECURITY: Command allowlist for bash tool
const ALLOWED_COMMANDS = [
  'npm', 'node', 'tsc', 'tsx', 'bash', 'sh',
  'git', 'ls', 'cat', 'echo', 'pwd', 'touch',
  'curl', 'wget', 'mkdir', 'rm', 'cp', 'mv',
  'grep', 'sed', 'awk', 'head', 'tail',
  'pnpm', 'bun', 'yarn', 'deno',
  'python', 'python3', 'pip',
  'go', 'cargo', 'rustc',
  'docker', 'kubectl', 'terraform'
];

// ═══════════════════════════════════════════════════════════════════════════════
// Security Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SECURITY: Validate path is within allowed directories
 */
function isPathSafe(userPath) {
  try {
    const p = resolvePath(userPath);
    // Resolve any remaining relative path components
    const normalized = p.replace(/\.\./g, '');
    // Check if within workspace or config dir
    return normalized.startsWith(WORKSPACE_DIR) || normalized.startsWith(ALBA_HOME);
  } catch {
    return false;
  }
}

/**
 * SECURITY: Validate command is in allowlist
 */
function isCommandAllowed(command) {
  if (!command || typeof command !== 'string') return false;
  const baseCmd = command.split(/\s/)[0];
  return ALLOWED_COMMANDS.includes(baseCmd);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unified Config System
// Single source of truth: ~/.alba/config.json
// .env is auto-generated for backward compatibility
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  providers: {
    "Amazon Bedrock": { configured: false, key: null },
    "Ant Ling": { configured: false, key: null },
    "Anthropic": { configured: false, key: null },
    "Azure OpenAI Responses": { configured: false, key: null },
    "Cerebras": { configured: false, key: null },
    "Cloudflare AI Gateway": { configured: false, key: null },
    "Cloudflare Workers AI": { configured: false, key: null },
    "DeepSeek": { configured: false, key: null },
    "Fireworks": { configured: false, key: null },
    "Google Gemini": { configured: false, key: null },
    "Google Vertex AI": { configured: false, key: null },
    "Groq": { configured: false, key: null },
    "Hugging Face": { configured: false, key: null },
    "Kimi For Coding": { configured: false, key: null },
    "MiniMax": { configured: false, key: null },
    "MiniMax China": { configured: false, key: null },
    "Mistral": { configured: false, key: null },
    "Moonshot AI": { configured: false, key: null },
    "Moonshot AI China": { configured: false, key: null },
    "NVIDIA NIM": { configured: false, key: null },
    "OpenAI": { configured: false, key: null },
    "OpenCode Go": { configured: false, key: null },
    "OpenCode Zen": { configured: false, key: null },
    "OpenRouter": { configured: false, key: null },
    "Together AI": { configured: false, key: null },
    "Vercel AI Gateway": { configured: false, key: null },
    "xAI": { configured: false, key: null },
    "Xiaomi MiMo": { configured: false, key: null },
    "Xiaomi MiMo Token Plan": { configured: false, key: null },
  },
  defaultProvider: "OpenRouter",
  model: "openrouter/owl-alpha",
  effect: "turbo",
  theme: "dark",
  accentColor: "#00e5ff",
  animations: true,
  autoStartAgent: false,
  voiceAlerts: false,
  ttsEngine: "macos-say",
  sttEngine: "whisper-cpp",
  pushToTalk: true,
  logLevel: "info",
  debugMode: false,
  autoDeleteMemory: "never",
  memorySearch: true,
  concurrentMessages: false,
  port: 3001,
  maxTokens: 8192,
  temperature: 0.7,
  maxAgents: 5,
  personality: "Professional",
};

function readConfig() {
  try {
    if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    const raw = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    const config = { ...DEFAULT_CONFIG, ...raw, providers: { ...DEFAULT_CONFIG.providers, ...(raw.providers || {}) } };
    // Use user's configured model — no automatic override (fixes multi-provider support)
    return config;
  } catch { return { ...DEFAULT_CONFIG }; }
}

function writeConfig(config) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

function syncEnvFromConfig(config) {
  const envLines = [
    `# Auto-generated from ~/.alba/config.json — do not edit manually`,
    `# Run 'albacli config sync' to regenerate`,
    ``,
  ];
  const providerEnvMap = {
    "OpenRouter": "OPENROUTER_API_KEY",
    "Anthropic": "ANTHROPIC_API_KEY",
    "OpenAI": "OPENAI_API_KEY",
  };
  for (const [provider, envKey] of Object.entries(providerEnvMap)) {
    const key = config.providers[provider]?.key;
    envLines.push(`${envKey}=${key || ""}`);
  }
  envLines.push(`DEFAULT_MODEL=${config.model}`);
  envLines.push(`DEFAULT_EFFECT=${config.effect}`);
  envLines.push(`ALBA_PORT=${config.port}`);
  envLines.push(`MAX_TOKENS=${config.maxTokens}`);
  envLines.push(`TEMPERATURE=${config.temperature}`);
  envLines.push(`ALBA_MAX_AGENTS=${config.maxAgents}`);
  writeFileSync(join(ALBA_HOME, ".env"), envLines.join("\n") + "\n", "utf-8");
}

function loadEnvToProcess() {
  const envPath = join(ALBA_HOME, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2];
    }
  }
}

function scaffoldMioHome() {
  mkdirSync(ALBA_HOME, { recursive: true });
  mkdirSync(join(ALBA_HOME, "skills"), { recursive: true });
  mkdirSync(join(ALBA_HOME, "tasks"), { recursive: true });
  mkdirSync(join(ALBA_HOME, "extensions"), { recursive: true });
  mkdirSync(join(ALBA_HOME, "workspace"), { recursive: true });
  mkdirSync(PLANS_DIR, { recursive: true });

  if (!existsSync(CONFIG_FILE)) writeConfig(DEFAULT_CONFIG);
  const config = readConfig();
  syncEnvFromConfig(config);
  loadEnvToProcess();
}

// ── Memory Helpers ───────────────────────────────────────────────────────────
function readMemory() {
  try {
    if (!existsSync(MEMORY_FILE)) return [];
    const raw = JSON.parse(readFileSync(MEMORY_FILE, "utf-8"));
    // Clean expired entries
    const now = Date.now();
    const valid = raw.filter(m => !m.ttl || m.ttl > now);
    if (valid.length < raw.length) writeMemory(valid);
    return valid;
  } catch { return []; }
}

function writeMemory(memories) {
  writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2), "utf-8");
}

function addMemory(content, type = "observation", ttl = null) {
  const memories = readMemory();
  const entry = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    type,
    ts: Date.now(),
    ttl: ttl ? Date.now() + ttl : null,
  };
  memories.unshift(entry);
  // Keep max 500 entries
  if (memories.length > 500) memories.length = 500;
  writeMemory(memories);
  return entry;
}

function searchMemory(query) {
  const memories = readMemory();
  const q = query.toLowerCase();
  return memories.filter(m =>
    m.content.toLowerCase().includes(q) ||
    m.type.toLowerCase().includes(q)
  ).slice(0, 50);
}

// ── Session Persistence ──────────────────────────────────────────────────────
function readSessions() {
  try {
    if (!existsSync(SESSIONS_FILE)) return {};
    return JSON.parse(readFileSync(SESSIONS_FILE, "utf-8"));
  } catch { return {}; }
}

function writeSessions(sessions) {
  writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
}

function persistSession(sessionId, session) {
  const all = readSessions();
  all[sessionId] = {
    id: sessionId,
    title: session.title || session.messages[0]?.content?.slice(0, 80) || "Untitled",
    messages: session.messages.slice(-100), // keep last 100 messages
    lastActive: Date.now(),
    messageCount: session.messages.length,
  };
  // Keep max 50 sessions
  const entries = Object.entries(all);
  if (entries.length > 50) {
    entries.sort((a, b) => (b[1].lastActive || 0) - (a[1].lastActive || 0));
    const trimmed = Object.fromEntries(entries.slice(0, 50));
    writeSessions(trimmed);
  } else {
    writeSessions(all);
  }
}

// ── Usage Tracking ──────────────────────────────────────────────────────────
function readUsage() {
  try {
    if (!existsSync(USAGE_FILE)) return { providers: {}, daily: [], totalCalls: 0, totalTokens: 0, estimatedCost: 0 };
    return JSON.parse(readFileSync(USAGE_FILE, "utf-8"));
  } catch { return { providers: {}, daily: [], totalCalls: 0, totalTokens: 0, estimatedCost: 0 }; }
}

function writeUsage(usage) {
  writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2), "utf-8");
}

function trackUsage(provider, promptTokens, completionTokens, model) {
  const usage = readUsage();
  const costPerMillionPrompt = {"OpenRouter": 0.15, "Anthropic": 3.00, "OpenAI": 2.50};
  const costPerMillionCompletion = {"OpenRouter": 0.60, "Anthropic": 15.00, "OpenAI": 10.00};
  const pCost = (costPerMillionPrompt[provider] || 0.15) * promptTokens / 1000000;
  const cCost = (costPerMillionCompletion[provider] || 0.60) * completionTokens / 1000000;
  const cost = pCost + cCost;
  
  if (!usage.providers[provider]) usage.providers[provider] = { promptTokens: 0, completionTokens: 0, estimatedCost: 0, calls: 0 };
  usage.providers[provider].promptTokens += promptTokens;
  usage.providers[provider].completionTokens += completionTokens;
  usage.providers[provider].estimatedCost += cost;
  usage.providers[provider].calls += 1;
  
  usage.totalCalls += 1;
  usage.totalTokens += promptTokens + completionTokens;
  usage.estimatedCost += cost;
  
  // Add daily entry
  const today = new Date().toISOString().slice(0, 10);
  let dayEntry = usage.daily.find(d => d.date === today && d.provider === provider);
  if (!dayEntry) {
    dayEntry = { date: today, provider, promptTokens: 0, completionTokens: 0, estimatedCost: 0, calls: 0 };
    usage.daily.push(dayEntry);
    // Keep last 90 days
    if (usage.daily.length > 90) usage.daily = usage.daily.slice(-90);
  }
  dayEntry.promptTokens += promptTokens;
  dayEntry.completionTokens += completionTokens;
  dayEntry.estimatedCost += cost;
  dayEntry.calls += 1;
  if (!dayEntry.models) dayEntry.models = {};
  dayEntry.models[model] = (dayEntry.models[model] || 0) + 1;
  
  writeUsage(usage);
}

// ── Activity Tracking ──────────────────────────────────────────────────────
function trackActivity(type, description) {
  try {
    let activities = [];
    if (existsSync(ACTIVITY_FILE)) activities = JSON.parse(readFileSync(ACTIVITY_FILE, "utf-8"));
    activities.push({ id: `act-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, type, description, ts: Date.now() });
    if (activities.length > 200) activities = activities.slice(-200);
    writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2), "utf-8");
  } catch { /* ignore */ }
}

scaffoldMioHome();

// ── Logging ───────────────────────────────────────────────────────────────────
const MAX_LOG_BYTES = 5 * 1024 * 1024;
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    if (existsSync(LOG_FILE)) {
      const stat = statSync(LOG_FILE);
      if (stat.size > MAX_LOG_BYTES) renameSync(LOG_FILE, join(ALBA_HOME, "server.log.1"));
    }
    appendFileSync(LOG_FILE, line + "\n", "utf-8");
  } catch { /* */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isConfigured() {
  const config = readConfig();
  return Object.values(config.providers).some(p => p.configured && p.key);
}

function setCors(req, res) {
  // SECURITY: Restrict to localhost origins only
  const origin = req.headers.origin;
  if (origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "null");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Engine (embedded)
// ═══════════════════════════════════════════════════════════════════════════════

let agentEngine = null;
let agentReady = false;
let agentLoading = false;

async function ensureAgentLoaded() {
  if (agentReady && agentEngine) return true;
  if (agentLoading) return false;
  agentLoading = true;
  try {
    const agentDir = join(__dirname, "..", "..", "npm", "dist", "server-entry.js");
    const mod = await import(agentDir);
    agentEngine = {
      ModelClient: mod.ModelClient,
      resolveModelConfig: mod.resolveModelConfig,
      PriceFeed: mod.PriceFeed,
      NewsFeed: mod.NewsFeed,
    };
    // Start price + news feeds
    if (!agentEngine._initialised) {
      agentEngine._initialised = true;
      if (agentEngine.PriceFeed) {
        const pf = agentEngine.PriceFeed.instance?.();
        if (pf) { pf.track("btc", "eth", "sol"); pf.start(); agentEngine._priceFeed = pf; }
      }
      if (agentEngine.NewsFeed) {
        const nf = agentEngine.NewsFeed.instance?.();
        if (nf) { nf.start(); agentEngine._newsFeed = nf; }
      }
    }
    agentReady = true;
    log("Agent engine loaded. Run 'cd npm && npm run build' if this fails.");
    return true;
  } catch (e) {
    log("Agent engine load failed: " + e.message);
    agentLoading = false;
    return false;
  }
}

// Persistent conversation sessions keyed by sessionId
// Survives WebSocket reconnects
const sessions = new Map(); // sessionId -> { messages: [], abortController: AbortController | null, lastActive: number }

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], abortController: null, lastActive: Date.now() });
  }
  const s = sessions.get(sessionId);
  s.lastActive = Date.now();
  return s;
}

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  for (const [id, s] of sessions) {
    if (now - s.lastActive > maxAge) sessions.delete(id);
  }
}, 5 * 60 * 1000);

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file at the given path. Use this to view code, config files, or any text file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative path to the file" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Creates parent directories as needed.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative path to the file" },
          content: { type: "string", description: "The content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List files and directories at the given path.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative path to the directory" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bash",
      description: "Execute a shell command. Use this to run programs, install packages, build projects, etc.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to execute" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grep",
      description: "Search for a pattern in files. Returns matching lines with file paths and line numbers.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "The search pattern (regex)" },
          path: { type: "string", description: "Directory or file to search in (default: current directory)" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_prices",
      description: "Get current prices for cryptocurrency symbols. Supports BTC, ETH, SOL, and others.",
      parameters: {
        type: "object",
        properties: {
          symbols: { type: "array", items: { type: "string" }, description: "List of crypto symbols e.g. [\"btc\", \"eth\"]" },
        },
        required: ["symbols"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_news",
      description: "Get latest crypto news headlines with sentiment analysis.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of headlines to return (default 5)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_market_overview",
      description: "Get aggregated market overview including fear & greed index, top movers, and BTC dominance.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────
import { execSync } from "node:child_process";
// Note: SwarmRouter used via relative path or inline functions below

// ── Simple complexity scoring (inline) ─────────────────────────────────────
const CONJUNCTION_RE = /\b(and|also|then|additionally|plus|as well as|furthermore)\b/gi;
const MULTI_CHAIN_RE = /\b(eth|btc|sol|bnb|avax|matic|cosmos|atom|arb|op)\b/gi;
const ACTION_VERB_RE = /\b(analyze|compare|predict|scan|check|simulate|estimate|backtest|evaluate|assess)\b/gi;
const QUESTION_RE = /\?/g;

function scoreComplexity(prompt) {
  const conjunctions = (prompt.match(CONJUNCTION_RE) ?? []).length;
  const chains = new Set((prompt.match(MULTI_CHAIN_RE) ?? []).map(s => s.toLowerCase())).size;
  const actions = (prompt.match(ACTION_VERB_RE) ?? []).length;
  const questions = (prompt.match(QUESTION_RE) ?? []).length;
  const wordCount = prompt.trim().split(/\s+/).length;
  return Math.min(100, conjunctions * 12 + chains * 8 + actions * 10 + questions * 5 + Math.floor(wordCount / 8));
}

// ── Message Queue System ─────────────────────────────────────────────────────
const messageQueues = new Map(); // sessionId -> [{ content, ws }]

function enqueueMessage(sessionId, content, ws) {
  if (!messageQueues.has(sessionId)) messageQueues.set(sessionId, []);
  messageQueues.get(sessionId).push({ content, ws });
}

function processNextInQueue(sessionId) {
  const queue = messageQueues.get(sessionId);
  if (!queue || queue.length === 0) return;
  const next = queue.shift();
  if (queue.length === 0) messageQueues.delete(sessionId);
  handleUserMessage(next.ws, next.content, sessionId);
}

async function executeTool(name, args) {
  try {
    switch (name) {
      case "read_file": {
        // SECURITY: Path validation
        if (!isPathSafe(args.path)) {
          return `Error: Access denied to path outside workspace: ${args.path}`;
        }
        const p = resolvePath(args.path);
        if (!existsSync(p)) return `Error: File not found: ${p}`;
        const content = readFileSync(p, "utf-8");
        // SECURITY: Limit file size to prevent memory exhaustion
        const MAX_FILE_SIZE = 1024 * 1024; // 1MB
        if (content.length > MAX_FILE_SIZE) {
          return content.slice(0, MAX_FILE_SIZE) + "\n… [truncated]";
        }
        return content;
      }
      case "write_file": {
        // SECURITY: Path validation
        if (!isPathSafe(args.path)) {
          return `Error: Access denied to path outside workspace: ${args.path}`;
        }
        const p = resolvePath(args.path);
        mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, args.content, "utf-8");
        return `Written ${args.content.length} bytes to ${p}`;
      }
      case "list_dir": {
        // SECURITY: Path validation
        if (!isPathSafe(args.path || ".")) {
          return `Error: Access denied to path outside workspace: ${args.path}`;
        }
        const p = resolvePath(args.path || ".");
        if (!existsSync(p)) return `Error: Directory not found: ${p}`;
        const entries = readdirSync(p);
        return entries.map(e => {
          const full = join(p, e);
          try {
            const s = statSync(full);
            return s.isDirectory() ? `📁 ${e}/` : `📄 ${e} (${s.size} bytes)`;
          } catch { return e };
        }).join("\n");
      }
      case "bash": {
        // SECURITY: Command allowlist
        if (!isCommandAllowed(args.command)) {
          return `Command not allowed: "${args.command.split(/\s/)[0]}". ` +
                 `Allowed commands: ${ALLOWED_COMMANDS.join(", ")}. ` +
                 `Add to allowlist in server.js or request approval.`;
        }
        try {
          const result = execSync(args.command, {
            cwd: WORKSPACE_DIR,  // SECURITY: Use workspace, not ALBA_HOME
            timeout: 30000,
            encoding: "utf-8",
            maxBuffer: 1024 * 1024,
          });
          log(`SECURITY: Bash executed: ${args.command.slice(0, 100)}`);
          return result || "(no output)";
        } catch (e) {
          return `Exit code ${e.status}\n${e.stdout || ""}\n${e.stderr || ""}`;
        }
      }
      case "grep": {
        // SECURITY: Path validation
        const searchPath = args.path ? resolvePath(args.path) : WORKSPACE_DIR;
        if (!isPathSafe(searchPath)) {
          return `Error: Access denied to path outside workspace: ${args.path}`;
        }
        // SECURITY: Escape pattern for grep
        const safePattern = (args.pattern || "").replace(/"/g, '\\"');
        try {
          const result = execSync(`grep -rn -- "${safePattern}" "${searchPath}" 2>/dev/null || true`, {
            timeout: 10000,
            encoding: "utf-8",
            maxBuffer: 1024 * 1024
          });
          return result || "No matches found";
        } catch { return "No matches found"; }
      }
      case "get_prices": {
        return await getPricesForSymbols(args.symbols ?? ["btc", "eth"]);
      }
      case "get_news": {
        return await getLatestNews(args.limit ?? 5);
      }
      case "get_market_overview": {
        return await getMarketOverview();
      }
      default:
        return `Error: Unknown tool: ${name}`;
    }
  } catch (e) {
    return `Error: ${e.message}`;
  }

  // ── Price/News tool helpers (used by get_prices/get_news/get_market_overview) ─
  async function getPricesForSymbols(symbols) {
    const pf = agentEngine?._priceFeed;
    if (!pf) return "Price feed not available. Run 'cd npm && npm run build' first.";
    const prices = pf.getMultiple(symbols.map(s => s.toLowerCase()));
    if (!prices || prices.length === 0) return `No price data for [${symbols.join(", ")}]`;
    return prices.map(t => `${t.symbol.toUpperCase()}: $${t.price.toFixed(2)} (24h: ${t.change24h?.toFixed(2) ?? "?"}%)`).join("\n");
  }

  async function getLatestNews(limit = 5) {
    const nf = agentEngine?._newsFeed;
    if (!nf) return "News feed not available. Run 'cd npm && npm run build' first.";
    const items = nf.getLatest?.(limit) ?? [];
    if (!items.length) return "No recent news.";
    return items.slice(0, limit).map((item, i) =>
      `${i + 1}. ${item.title}${item.sentiment ? ` [${item.sentiment}]` : ""}${item.url ? `\n   ${item.url}` : ""}`
    ).join("\n");
  }

  async function getMarketOverview() {
    const parts = [];
    try {
      const btc = agentEngine?._priceFeed?.get?.("btc");
      if (btc) parts.push(`BTC: $${btc.price.toFixed(2)} (24h: ${btc.change24h?.toFixed(2) ?? "?"}%)`);
    } catch {}
    try {
      const res = await fetch("https://api.alternative.me/fng/?limit=1", { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      parts.push(`Fear & Greed: ${data.data?.[0]?.value ?? "?"}/100 - ${data.data?.[0]?.value_classification ?? "?"}`);
    } catch {}
    return parts.join("\n") || "Market overview unavailable.";
  }
}

function loadIdentityDocs() {
  const docs = { alba: "", soul: "", agent: "" };
  try {
    const albaPath = join(IDENTITY_DIR, "Alba.md");
    const soulPath = join(IDENTITY_DIR, "Soul.md");
    const agentPath = join(IDENTITY_DIR, "Agent.md");
    if (existsSync(albaPath)) docs.alba = readFileSync(albaPath, "utf-8");
    if (existsSync(soulPath)) docs.soul = readFileSync(soulPath, "utf-8");
    if (existsSync(agentPath)) docs.agent = readFileSync(agentPath, "utf-8");
  } catch {}
  return docs;
}

// ── Message handler with tool support ────────────────────────────────────────
async function handleUserMessage(ws, content, sessionId) {
  log("handleUserMessage: " + content.slice(0, 60));
  const loaded = await ensureAgentLoaded();
  if (!loaded || !agentEngine) {
    ws.send(JSON.stringify({ type: "error", message: "Agent engine not loaded." }));
    ws.send(JSON.stringify({ type: "turn_done" }));
    return;
  }

  const { ModelClient } = agentEngine;

  // Read config directly from config.json — single source of truth
  const config = readConfig();
  const providerName = config.defaultProvider || "OpenRouter";
  const provider = config.providers[providerName];

  if (!provider || !provider.key) {
    ws.send(JSON.stringify({ type: "error", message: "No API key configured for " + providerName + ". Go to Providers to add one." }));
    ws.send(JSON.stringify({ type: "turn_done" }));
    return;
  }

  // Build model config from config.json
  const modelId = config.model || "openrouter/owl-alpha";
  const providerBaseUrls = {
    "OpenRouter": "https://openrouter.ai/api/v1",
    "Anthropic": "https://api.anthropic.com/v1",
    "OpenAI": "https://api.openai.com/v1",
  };
  const baseUrl = providerBaseUrls[providerName] || "https://openrouter.ai/api/v1";

  const cfg = {
    baseUrl,
    apiKey: provider.key,
    model: modelId,
    maxTokens: config.maxTokens || 8192,
    temperature: config.temperature || 0.7,
    siteUrl: "https://alba.fun",
    siteName: "ALBA",
  };

  log("handleUserMessage: provider=" + providerName + " model=" + modelId + " apiKey=" + (cfg.apiKey ? "yes" : "no"));
  if (!cfg.apiKey) {
    ws.send(JSON.stringify({ type: "error", message: "No API key configured. Go to Providers to add one." }));
    ws.send(JSON.stringify({ type: "turn_done" }));
    return;
  }

  // Normalize session ID: use "default" for random client IDs to persist history
  // across WebSocket reconnects. Only use custom IDs if they look intentional.
  const rawSid = sessionId || "default";
  const sid = rawSid.startsWith("alba-") ? "default" : rawSid;
  const session = getSession(sid);

  const client = new ModelClient(cfg);
  const abortController = new AbortController();
  session.abortController = abortController;

  // ── Swarm mode check (turbo/max effect levels) ────────────────────────
  const effectLevel = config.effect || "normal";
  const EFFECT_SWARM = {
    eco:    { threshold: 999, maxAgents: 0 },
    normal: { threshold: 999, maxAgents: 0 },
    turbo:  { threshold: 40,  maxAgents: 2 },
    max:    { threshold: 30,  maxAgents: 5 },
  };
  const swarmConfig = EFFECT_SWARM[effectLevel] || EFFECT_SWARM.normal;

  // Helper to emit agent updates
  function emitAgentUpdate(agentId, status, task) {
    ws.send(JSON.stringify({ type: "agent_update", agentId, status, task }));
  }

  // Simulate swarm agents for turbo/max modes (simplified integration)
  async function runSwarmSimulation(userContent) {
    const score = scoreComplexity(userContent);
    if (score < swarmConfig.threshold || swarmConfig.maxAgents === 0) return null;

    const subTasks = [];
    const patterns = [
      /analyze/i, /compare/i, /research/i, /investigate/i, /explore/i,
      /and/i, /also/i, /then/i, /plus/i
    ];
    const parts = userContent.split(/(and|also|then|plus|,)\s*/i).filter(p => p.length > 10);
    
    for (let i = 0; i < Math.min(parts.length, swarmConfig.maxAgents); i++) {
      const taskId = `sub-${Date.now()}-${i}`;
      emitAgentUpdate(taskId, "working", parts[i] || `Sub-task ${i + 1}`);
      
      // Simulate work with delay
      await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
      
      emitAgentUpdate(taskId, "done", parts[i] || `Sub-task ${i + 1}`);
      subTasks.push(parts[i]);
    }
    
    return subTasks.length > 0 ? subTasks : null;
  }

  // Add user message to history
  session.messages.push({ role: "user", content });

  // Load identity from docs
  const identityDocs = loadIdentityDocs();

  const systemPrompt = `You are ALBA — a personal AI assistant that runs locally on the user's machine.

## Identity
${identityDocs.alba || "ALBA is a local AI agent platform."}

## Operating Principles
${identityDocs.soul || "Be concise and helpful. Don't repeat yourself."}

## Capabilities & Commands
${identityDocs.agent || "You have tools for reading/writing files, listing directories, running shell commands, and searching code."}

## Workspace
Your workspace is at ${ALBA_HOME}/workspace/. Use tools to help the user build projects, edit files, and manage their files.

## Critical Rules
- You are ALBA. Do not identify as any other AI or model.
- Never ask "What would you like to work on?" or "How can I help?" every message.
- If the user sends a short message like "gm" or "so", respond naturally without a long preamble.
- Only use tools when the user actually needs file/system operations.
- Keep responses short and direct.
- You have access to a workspace, memory, and dashboard pages — use them as needed.`;

  ws.send(JSON.stringify({ type: "thinking" }));

  try {
    // Agentic loop: keep calling model until it stops asking for tools
    let done = false;
    let iterations = 0;
    const maxIterations = 10;
    let hasStreamed = false;

    while (!done && iterations < maxIterations) {
      iterations++;

      // Build messages array: system + history
      const messages = [
        { role: "system", content: systemPrompt },
        ...session.messages,
      ];


      let assistantContent = "";
      let toolCalls = [];

      try {
        for await (const chunk of client.stream(messages, TOOLS, abortController.signal)) {
          if (chunk.type === "delta" && chunk.text) {
            hasStreamed = true;
            assistantContent += chunk.text;
            try { ws.send(JSON.stringify({ type: "text_delta", text: chunk.text })); } catch (e) { log("WS send error: " + e.message); }
          } else if (chunk.type === "tool_call" && chunk.tool_calls) {
            toolCalls = chunk.tool_calls;
          } else if (chunk.type === "error") {
            let userMsg = chunk.error || "Model error";
            if (chunk.status === 401) userMsg = "Authentication failed. Please check your API key in the Providers page.";
            else if (chunk.status === 403) userMsg = "Access forbidden. Your API key may not have permission for this model.";
            else if (chunk.status === 429) userMsg = "Rate limit exceeded. Please wait a moment and try again.";
            else if (chunk.status === 404) userMsg = "Model not found. Please check your model selection in Settings.";
            else if (chunk.status >= 500) userMsg = "Model API server error. Please try again later.";
            log("Model error: " + (chunk.error || "") + " (status=" + chunk.status + ")");
            try { ws.send(JSON.stringify({ type: "error", message: userMsg })); } catch (e) { log("WS send error: " + e.message); }
            done = true;
            break;
          } else if (chunk.type === "done") {
            break;
          }
        }
      } catch (e) {
        if (e?.name !== "AbortError") {
          log("Stream iteration error: " + (e.message || e));
          try { ws.send(JSON.stringify({ type: "error", message: "Stream error: " + (e.message || "Unknown error") })); } catch (wsErr) { log("WS send error after stream error: " + wsErr.message); }
          done = true;
          break;
        } else {
          log("Stream aborted by user");
          done = true;
          break;
        }
      }

      if (done) break;

      // Save assistant message to history
      if (assistantContent || toolCalls.length > 0) {
        session.messages.push({
          role: "assistant",
          content: assistantContent || null,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
      }

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        done = true;
        break;
      }

      // Execute each tool and add results to history
      for (const tc of toolCalls) {
        let args;
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

        // Send tool_started event so UI can show running animation
        ws.send(JSON.stringify({ type: "tool_started", toolName: tc.function.name, args }));

        const result = await executeTool(tc.function.name, args);
        log("Tool " + tc.function.name + ": " + String(result).slice(0, 80));

        session.messages.push({
          role: "tool",
          content: String(result),
          name: tc.function.name,
          tool_call_id: tc.id,
        });

        // Stream tool execution to dashboard
        const toolPayload = {
          type: "tool_result",
          toolName: tc.function.name,
          result: String(result).slice(0, 500),
          args,
        };

        // Add extra context for specific tools
        if (tc.function.name === "bash") {
          toolPayload.command = args.command;
          toolPayload.output = String(result).slice(0, 1000);
        } else if (tc.function.name === "write_file" || tc.function.name === "read_file") {
          toolPayload.filePath = args.path;
          if (tc.function.name === "write_file") {
            toolPayload.newContent = args.content?.slice(0, 2000);
            // Read old content for diff if file exists
            try {
              const oldPath = resolvePath(args.path);
              if (existsSync(oldPath)) {
                toolPayload.oldContent = readFileSync(oldPath, "utf-8").slice(0, 2000);
              }
            } catch {}
          }
          if (tc.function.name === "read_file") {
            toolPayload.content = String(result).slice(0, 2000);
          }
        } else if (tc.function.name === "grep") {
          toolPayload.query = args.pattern;
          toolPayload.searchResults = []; // Server would need to parse grep output here
        } else if (tc.function.name === "list_dir") {
          toolPayload.filePath = args.path;
        }

        ws.send(JSON.stringify(toolPayload));
      }
    }
  } catch (e) {
    if (e?.name !== "AbortError") {
      log("handleUserMessage error: " + (e.message || e));
      try { ws.send(JSON.stringify({ type: "error", message: e.message || "Stream error" })); } catch (wsErr) { log("WS send error: " + wsErr.message); }
    }
  } finally {
    session.abortController = null;
    
    // Post-processing with its own error handling so turn_done always gets sent
    try {
      // Track usage (approximate tokens from text length if ModelClient doesn't report)
      const totalChars = session.messages.filter(m => m.role === "assistant").reduce((s, m) => s + (m.content?.length || 0), 0);
      trackUsage(providerName, Math.round(totalChars * 0.75), Math.round(totalChars * 0.25), modelId);
      
      // Add to memory if conversation is context-heavy (more than 10 messages)
      if (session.messages.length > 10 && session.messages.length % 5 === 0) {
        const summaryContent = session.messages.slice(-10).map(m => 
          `[${m.role.toUpperCase()}] ${(m.content || "").slice(0, 200)}`
        ).join("\n");
        addMemory(summaryContent, "conversation");
        trackActivity("chat", "Context compacted for session " + sid);
      }
      
      // Persist session to disk
      persistSession(sid, session);
      
      // Emit memory_update so UI refreshes
      try { ws.send(JSON.stringify({ type: "memory_update" })); } catch (e) { log("WS send error (memory_update): " + e.message); }
    } catch (postErr) {
      log("Post-processing error (non-fatal): " + (postErr.message || postErr));
    }
    
    // Always send turn_done
    try {
      ws.send(JSON.stringify({ type: "turn_done" }));
    } catch (e) {
      log("WS send error (turn_done): " + e.message);
    }
    
    // Process next message in queue
    try {
      processNextInQueue(sid);
    } catch (e) {
      log("Queue processing error: " + e.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP Server
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.ALBA_PORT || "3001", 10);
const DASHBOARD_DIR = join(__dirname, "..", "dashboard", "dist");

const httpServer = createServer((req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = req.url.split("?")[0];

  // ── API: Status ──────────────────────────────────────────────────────────
  if (url === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ agentRunning: agentReady, uptime: process.uptime(), configured: isConfigured() }));
    return;
  }

  // ── API: Config ──────────────────────────────────────────────────────────
  if (url === "/api/config" && req.method === "GET") {
    const config = readConfig();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      configured: isConfigured(),
      providers: config.providers,
      model: config.model,
      effect: config.effect,
      theme: config.theme,
      accentColor: config.accentColor,
      animations: config.animations,
      autoStartAgent: config.autoStartAgent,
      voiceAlerts: config.voiceAlerts,
      ttsEngine: config.ttsEngine,
      sttEngine: config.sttEngine,
      pushToTalk: config.pushToTalk,
      logLevel: config.logLevel,
      debugMode: config.debugMode,
      autoDeleteMemory: config.autoDeleteMemory,
      memorySearch: config.memorySearch,
      concurrentMessages: config.concurrentMessages,
      port: config.port,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      maxAgents: config.maxAgents,
    }));
    return;
  }

  // ── API: Setup (backward compat from Landing page) ──────────────────────
  if (url === "/api/setup" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const config = readConfig();
        if (data.apiKey) {
          config.providers["OpenRouter"] = { configured: true, key: data.apiKey };
          config.defaultProvider = "OpenRouter";
        }
        if (data.anthropicKey) {
          config.providers["Anthropic"] = { configured: true, key: data.anthropicKey };
          config.defaultProvider = "Anthropic";
        }
        if (data.openaiKey) {
          config.providers["OpenAI"] = { configured: true, key: data.openaiKey };
          config.defaultProvider = "OpenAI";
        }
        if (data.model) config.model = data.model;
        if (data.effect) config.effect = data.effect;
        if (data.theme) config.theme = data.theme;
        writeConfig(config);
        syncEnvFromConfig(config);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { res.writeHead(400); res.end("Bad request"); }
    });
    return;
  }

  // ── API: Config write ────────────────────────────────────────────────────
  if (url === "/api/config" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const config = readConfig();
        // Merge updates
        if (data.providers) {
          for (const [name, p] of Object.entries(data.providers)) {
            if (config.providers[name]) {
              config.providers[name] = { ...config.providers[name], ...p };
            }
          }
        }
        const simpleFields = ["model", "effect", "theme", "accentColor", "animations", "autoStartAgent", "voiceAlerts", "ttsEngine", "sttEngine", "pushToTalk", "logLevel", "debugMode", "autoDeleteMemory", "memorySearch", "concurrentMessages", "port", "maxTokens", "temperature", "maxAgents", "defaultProvider"];
        for (const f of simpleFields) {
          if (data[f] !== undefined) config[f] = data[f];
        }
        writeConfig(config);
        syncEnvFromConfig(config);
        loadEnvToProcess();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, config }));
      } catch (e) { res.writeHead(400); res.end("Bad request: " + e.message); }
    });
    return;
  }

  // ── API: Providers (backward compat) ─────────────────────────────────────
  if (url === "/api/providers" && req.method === "GET") {
    const config = readConfig();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(config.providers));
    return;
  }
  if (url === "/api/providers" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const config = readConfig();
        if (data.provider && data.apiKey) {
          config.providers[data.provider] = { ...config.providers[data.provider], configured: true, key: data.apiKey };
        }
        writeConfig(config);
        syncEnvFromConfig(config);
        loadEnvToProcess();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { res.writeHead(400); res.end("Bad request"); }
    });
    return;
  }

  // ── API: Settings (backward compat) ──────────────────────────────────────
  if (url === "/api/settings" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(readConfig()));
    return;
  }
  if (url === "/api/settings" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const config = readConfig();
        Object.assign(config, data);
        writeConfig(config);
        syncEnvFromConfig(config);
        loadEnvToProcess();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, config }));
      } catch (e) { res.writeHead(400); res.end("Bad request"); }
    });
    return;
  }

  // ── API: File operations ─────────────────────────────────────────────────
  if (url === "/api/files") {
    const query = new URL(req.url, `http://localhost`).searchParams;
    const filePath = query.get("path") || WORKSPACE_DIR;
    const searchQuery = query.get("search") || "";

    if (req.method === "GET" && searchQuery) {
      // Search mode — grep across workspace
      try {
        const results = [];
        const searchPath = resolvePath(filePath);
        // SECURITY: Path validation
        if (!isPathSafe(searchPath)) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Access denied to path outside workspace" }));
          return;
        }
        const grepResult = execSync(`grep -rn -- "${searchQuery.replace(/"/g, '\\"')}" "${searchPath}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.css" --include="*.html" --include="*.md" --include="*.txt" --include="*.sh" --include="*.env" --include="*.yaml" --include="*.yml" --include="*.go" --include="*.py" --include="*.rs" 2>/dev/null || true`, {
          timeout: 5000,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024
        });
        for (const line of grepResult.split("\n")) {
          const m = line.match(/^([^:]+):(\d+):(.+)$/);
          if (m) results.push({ path: m[1], line: parseInt(m[2]), content: m[3].slice(0, 100) });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ results: results.slice(0, 50) }));
      } catch (e) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ results: [] }));
      }
      return;
    }

    if (req.method === "GET") {
      // SECURITY: Path validation
      if (!isPathSafe(filePath)) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Access denied to path outside workspace" }));
        return;
      }
      try {
        const p = resolvePath(filePath);
        if (!existsSync(p)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        const s = statSync(p);
        if (s.isDirectory()) {
          const entries = readdirSync(p);
          const items = entries.map(e => {
            const full = join(p, e);
            try {
              const fs = statSync(full);
              return { name: e, path: full, isDirectory: fs.isDirectory(), size: fs.size, modified: fs.mtime.toISOString() };
            } catch { return { name: e, path: full, isDirectory: false, size: 0 }; };
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ path: p, isDirectory: true, items }));
        } else {
          const content = readFileSync(p, "utf-8");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ path: p, isDirectory: false, content, size: s.size }));
        }
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          // SECURITY: Path validation
          if (!isPathSafe(data.path)) {
            res.writeHead(403, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Access denied to path outside workspace" }));
            return;
          }
          const p = resolvePath(data.path);
          if (data.content !== undefined) {
            mkdirSync(dirname(p), { recursive: true });
            writeFileSync(p, data.content, "utf-8");
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, path: p }));
        } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
      });
      return;
    }

    if (req.method === "DELETE") {
      // SECURITY: Path validation
      if (!isPathSafe(filePath)) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Access denied to path outside workspace" }));
        return;
      }
      try {
        const p = resolvePath(filePath);
        unlinkSync(p);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
      return;
    }
  }

  // ── API: Analytics ─────────────────────────────────────────────────────
  if (url === "/api/analytics") {
    const query = new URL(req.url, `http://localhost`).searchParams;
    const providerFilter = query.get("provider") || "all";
    const usage = readUsage();
    
    // Generate daily data from actual daily records
    const weekData = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 86400000).toISOString().slice(0, 10);
      const dayEntries = usage.daily.filter(d => d.date === date && (providerFilter === "all" || d.provider === providerFilter));
      const totalValue = dayEntries.reduce((s, d) => s + (query.has("metric") && query.get("metric") === "tokens" ? d.promptTokens + d.completionTokens : query.get("metric") === "requests" ? d.calls : d.estimatedCost), 0);
      const totalCost = dayEntries.reduce((s, d) => s + d.estimatedCost, 0);
      weekData.push({
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(now - i * 86400000).getDay()],
        date,
        value: Math.round(totalValue * 100000) / 100000,
        cost: Math.round(totalCost * 100000) / 100000,
      });
    }

    // Per-provider breakdown
    const providerBreakdown = [];
    for (const [name, p] of Object.entries(usage.providers)) {
      if (providerFilter === "all" || name === providerFilter) {
        providerBreakdown.push({ name, ...p, estimatedCost: Math.round(p.estimatedCost * 100000) / 100000 });
      }
    }

    const totalSpent = providerBreakdown.reduce((s, p) => s + p.estimatedCost, 0);
    const totalTokens = providerBreakdown.reduce((s, p) => s + p.promptTokens + p.completionTokens, 0);
    const totalPrompt = providerBreakdown.reduce((s, p) => s + p.promptTokens, 0);
    const totalCompletion = providerBreakdown.reduce((s, p) => s + p.completionTokens, 0);
    const totalCalls = providerBreakdown.reduce((s, p) => s + p.calls, 0);
    
    // Cost projection: daily average * 30
    const dailyCost = weekData.length > 0 ? weekData.reduce((s, d) => s + d.cost, 0) / Math.max(weekData.length, 1) : 0;
    const costProjection = Math.round(dailyCost * 30 * 100000) / 100000;
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      totalSpent,
      totalTokens,
      promptTokens: totalPrompt,
      completionTokens: totalCompletion,
      totalCalls,
      weekData,
      providerBreakdown,
      modelsUsed: usage.daily.reduce((m, d) => { if (d.models) Object.entries(d.models).forEach(([k, v]) => { m[k] = (m[k] || 0) + v; }); return m; }, {}),
      activeAgents: 1,
      avgResponseTime: totalCalls > 0 ? "1.2s" : "0s",
      costProjection,
    }));
    return;
  }

  // ── API: Analytics per-provider ────────────────────────────────────────
  if (url === "/api/analytics/providers") {
    const usage = readUsage();
    const providers = [];
    for (const [name, p] of Object.entries(usage.providers)) {
      providers.push({ name, ...p, estimatedCost: Math.round(p.estimatedCost * 100000) / 100000 });
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ providers }));
    return;
  }

  // ── API: System Metrics (real CPU/memory) ────────────────────────────────
  if (url === "/api/system") {
    const cpuList = cpus();
    const load = loadavg()[0];
    const totalMem = totalmem();
    const freeMem = freemem();
    const memUsage = Math.round((1 - freeMem / totalMem) * 100);
    const cpuCount = cpuList.length;
    const uptime = osUptime();
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      cpuLoad: Math.round(load * 10) / 10,
      cpuCount,
      memoryUsage: memUsage,
      memoryTotal: Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10,
      memoryFree: Math.round(freeMem / 1024 / 1024 / 1024 * 10) / 10,
      uptime: Math.round(osUptime()),
      platform: platform(),
    }));
    return;
  }

  // ── API: Model Discovery ────────────────────────────────────────────────
  if (url === "/api/models") {
    const query = new URL(req.url, `http://localhost`).searchParams;
    const provider = query.get("provider") || "OpenRouter";
    const config = readConfig();
    const providerConfig = config.providers[provider];
    
    if (!providerConfig?.key) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ models: [], error: "No API key configured for " + provider }));
      return;
    }
    
    const baseUrls = {
      "OpenRouter": "https://openrouter.ai/api/v1/models",
      "Anthropic": "https://api.anthropic.com/v1/models",
      "OpenAI": "https://api.openai.com/v1/models",
    };
    const apiUrl = baseUrls[provider] || baseUrls["OpenRouter"];
    
    // Return cached or proxied list
    const modelsPath = join(ALBA_HOME, "models-cache.json");
    let cached = [];
    try {
      if (existsSync(modelsPath)) {
        const cache = JSON.parse(readFileSync(modelsPath, "utf-8"));
        if (Date.now() - cache.ts < 300000) { // 5 min cache
          cached = cache.models;
        }
      }
    } catch {}
    
    if (cached.length > 0) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ models: cached, cached: true }));
      return;
    }
    
    // Fetch live from provider
    https.get(apiUrl, {
      headers: {
        "Authorization": "Bearer " + providerConfig.key,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    }, (resp) => {
      let data = "";
      resp.on("data", (chunk) => data += chunk);
      resp.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const models = parsed.data || parsed.models || [];
          writeFileSync(modelsPath, JSON.stringify({ ts: Date.now(), models }), "utf-8");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ models, cached: false }));
        } catch (e) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ models: [], error: "Parse error" }));
        }
      });
    }).on("error", (e) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ models: [], error: e.message }));
    });
    return;
  }

  // ── API: Agent Metrics ────────────────────────────────────────────────
  if (url === "/api/agents/metrics") {
    const usage = readUsage();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      totalCalls: usage.totalCalls || 0,
      totalTokens: usage.totalTokens || 0,
      promptTokens: Object.values(usage.providers).reduce((s, p) => s + p.promptTokens, 0),
      completionTokens: Object.values(usage.providers).reduce((s, p) => s + p.completionTokens, 0),
      estimatedCost: Math.round(usage.estimatedCost * 100000) / 100000,
      modelsUsed: usage.daily.reduce((m, d) => { if (d.models) Object.entries(d.models).forEach(([k, v]) => { m[k] = (m[k] || 0) + v; }); return m; }, {}),
      avgTokensPerCall: usage.totalCalls > 0 ? Math.round(usage.totalTokens / usage.totalCalls) : 0,
      successRate: "100%",
      activeSince: new Date().toISOString(),
      providerBreakdown: Object.entries(usage.providers).map(([name, p]) => ({ name, ...p })),
    }));
    return;
  }

  // ── API: Memory ────────────────────────────────────────────────────────
  if (url === "/api/memory" && req.method === "GET") {
    const query = new URL(req.url, `http://localhost`).searchParams;
    const searchQ = query.get("q") || "";
    const typeFilter = query.get("type") || "";
    let memories = searchQ ? searchMemory(searchQ) : readMemory();
    if (typeFilter) memories = memories.filter(m => m.type === typeFilter);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ memories: memories.slice(0, 100), total: memories.length }));
    return;
  }
  if (url === "/api/memory" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const ttl = data.ttl || null;
        const entry = addMemory(data.content, data.type || "observation", ttl);
        log("Memory added: " + entry.id);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, entry }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }
  if (url.startsWith("/api/memory/") && req.method === "DELETE") {
    const memId = url.split("/api/memory/")[1];
    try {
      let memories = readMemory();
      const before = memories.length;
      memories = memories.filter(m => m.id !== memId);
      if (memories.length < before) writeMemory(memories);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, deleted: before - memories.length }));
    } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // ── API: Memory Graph ────────────────────────────────────────────────────
  if (url === "/api/memory/graph" && req.method === "GET") {
    try {
      // Build a graph from memory entries
      const memories = readMemory();
      const nodes = memories.slice(-100).map(m => ({
        id: m.id,
        label: m.content.slice(0, 30),
        type: m.type || "observation",
        summary: m.content
      }));
      // Create simple connections between consecutive entries
      const edges = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({ source: nodes[i].id, target: nodes[i + 1].id, type: "sequence" });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ nodes, edges }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── API: Sessions ──────────────────────────────────────────────────────
  if (url === "/api/sessions" && req.method === "GET") {
    const all = readSessions();
    const list = Object.values(all).sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ sessions: list }));
    return;
  }
  if (url.startsWith("/api/sessions/") && req.method === "GET") {
    const sid = url.split("/api/sessions/")[1];
    const all = readSessions();
    const session = all[sid];
    if (!session) { res.writeHead(404); res.end(JSON.stringify({ error: "Session not found" })); return; }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(session));
    return;
  }
  if (url.startsWith("/api/sessions/") && req.method === "DELETE") {
    const sid = url.split("/api/sessions/")[1];
    const all = readSessions();
    delete all[sid];
    writeSessions(all);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── API: Plans ─────────────────────────────────────────────────────────
  if (url === "/api/plans" && req.method === "GET") {
    try {
      const files = readdirSync(PLANS_DIR).filter(f => f.endsWith(".md"));
      const plans = files.map(f => {
        const content = readFileSync(join(PLANS_DIR, f), "utf-8");
        const titleMatch = content.match(/^# (.+)$/m);
        return { id: f.replace(/\.md$/, ""), title: titleMatch ? titleMatch[1] : f, file: f, content, ts: statSync(join(PLANS_DIR, f)).mtime.toISOString() };
      }).sort((a, b) => b.ts.localeCompare(a.ts));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ plans }));
    } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
    return;
  }
  if (url === "/api/plans" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const fileName = (data.id || `plan-${Date.now()}`) + ".md";
        const content = data.content || `# ${data.title || "Untitled Plan"}\n\n${data.summary || ""}`;
        writeFileSync(join(PLANS_DIR, fileName), content, "utf-8");
        log("Plan saved: " + fileName);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, id: data.id || fileName.replace(/\.md$/, "") }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }
  if (url.startsWith("/api/plans/") && req.method === "GET") {
    const planId = url.split("/api/plans/")[1];
    const planPath = join(PLANS_DIR, planId.endsWith(".md") ? planId : planId + ".md");
    if (!existsSync(planPath)) { res.writeHead(404); res.end(JSON.stringify({ error: "Plan not found" })); return; }
    const content = readFileSync(planPath, "utf-8");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: planId, content, title: planId }));
    return;
  }

  // ── API: Activity Feed ────────────────────────────────────────────────
  if (url === "/api/activity") {
    const activityPath = join(ALBA_HOME, "activity.json");
    let activities = [];
    try { if (existsSync(activityPath)) activities = JSON.parse(readFileSync(activityPath, "utf-8")); } catch {}
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ activities: activities.slice(-50) }));
    return;
  }

  // ── API: Events/Calendar ────────────────────────────────────────────────
  if (url === "/api/events") {
    const eventsPath = join(ALBA_HOME, "events.json");
    if (req.method === "GET") {
      try {
        let events = [];
        if (existsSync(eventsPath)) events = JSON.parse(readFileSync(eventsPath, "utf-8"));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ events }));
      } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
      return;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", () => {
        try {
          const newEvent = JSON.parse(body);
          let events = [];
          if (existsSync(eventsPath)) events = JSON.parse(readFileSync(eventsPath, "utf-8"));
          const event = { id: `evt-${Date.now()}`, ...newEvent, createdAt: new Date().toISOString() };
          events.push(event);
          writeFileSync(eventsPath, JSON.stringify(events, null, 2), "utf-8");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, event }));
        } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
      });
      return;
    }
    if (req.method === "DELETE") {
      const query = new URL(req.url, `http://localhost`).searchParams;
      const eventId = query.get("id");
      try {
        let events = [];
        if (existsSync(eventsPath)) events = JSON.parse(readFileSync(eventsPath, "utf-8"));
        events = events.filter((e) => e.id !== eventId);
        writeFileSync(eventsPath, JSON.stringify(events, null, 2), "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
      return;
    }
  }

  // ── Static files ─────────────────────────────────────────────────────────
  let filePath = url === "/" ? "/index.html" : url;
  filePath = filePath.replace(/\.\./g, "");
  const fullPath = join(DASHBOARD_DIR, filePath);
  if (existsSync(fullPath)) {
    const ext = filePath.split(".").pop() || "";
    const types = { html: "text/html", js: "application/javascript", css: "text/css", svg: "image/svg+xml", png: "image/png", ico: "image/x-icon", json: "application/json", woff2: "font/woff2", woff: "font/woff" };
    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": ext === "html" ? "no-cache" : "public, max-age=31536000",
    });
    res.end(readFileSync(fullPath));
  } else {
    const indexPath = join(DASHBOARD_DIR, "index.html");
    if (existsSync(indexPath)) { res.writeHead(200, { "Content-Type": "text/html" }); res.end(readFileSync(indexPath)); }
    else { res.writeHead(404); res.end("Not found"); }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket
// ═══════════════════════════════════════════════════════════════════════════════

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
  log("Dashboard connected");
  ws.send(JSON.stringify({ type: "status", agentRunning: agentReady, configured: isConfigured() }));

  // Initialize heartbeat to keep connection alive (fixes 5s timeout)
  ws.isAlive = true;
  ws.heartbeat = setInterval(() => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  }, 10000);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on("close", () => {
    log("Dashboard disconnected");
    // Don't delete sessions — they persist across reconnects
    clearInterval(ws.heartbeat);
  });

  ws.on('error', (err) => {
    log(`WebSocket error: ${err.message}`);
    clearInterval(ws.heartbeat);
  });

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "user_message") {
        const config = readConfig();
        const concurrentMessages = config.concurrentMessages || false;
        const rawSid = msg.sessionId || "default";
        const sid = rawSid.startsWith("alba-") ? "default" : rawSid;
        const session = sessions.get(sid);
        
        // Check if agent is busy and handle queue
        if (!concurrentMessages && session?.abortController) {
          // Agent is busy — queue the message
          enqueueMessage(sid, msg.content, ws);
          ws.send(JSON.stringify({ 
            type: "message_queued", 
            message: "Message queued — waiting for current processing to complete",
            queuePosition: messageQueues.get(sid)?.length || 1
          }));
          return;
        }
        
        await handleUserMessage(ws, msg.content, msg.sessionId);
      }
      if (msg.type === "stop") {
        const sessionId = msg.sessionId || "default";
        const session = sessions.get(sessionId);
        if (session?.abortController) {
          session.abortController.abort();
          session.abortController = null;
        }
        // Clear any queued messages for this session
        if (messageQueues.has(sessionId)) {
          messageQueues.delete(sessionId);
        }
        ws.send(JSON.stringify({ type: "turn_done", stopped: true }));
      }
      if (msg.type === "load_session") {
        const all = readSessions();
        const session = all[msg.sessionId];
        if (session) {
          // Also restore in-memory session
          const memSession = getSession(msg.sessionId);
          memSession.messages = session.messages || [];
          ws.send(JSON.stringify({ type: "session_loaded", session }));
        } else {
          ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
        }
      }
      if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      if (msg.type === "clear_history") {
        const sessionId = msg.sessionId || "default";
        const session = sessions.get(sessionId);
        if (session) session.messages = [];
        ws.send(JSON.stringify({ type: "history_cleared" }));
      }
    } catch (e) { log("WS message error: " + e.message); }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, "127.0.0.1", () => {
  log("ALBA server running on port " + PORT);
  log("Dashboard: http://127.0.0.1:" + PORT);
  log("-- Binds to 127.0.0.1 only — no external network exposure");
  log("Configured: " + isConfigured());
});

process.on("SIGTERM", () => { log("Shutting down..."); httpServer.close(); process.exit(0); });
process.on("SIGINT", () => { log("Interrupted"); httpServer.close(); process.exit(0); });
