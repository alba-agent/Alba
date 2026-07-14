/**
 * cli.ts — ALBA entry point.
 * Completely standalone — all outbound, no inbound ports exposed.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import { render } from "ink";
import React from "react";
import { config as loadDotenv } from "dotenv";
import { Registry } from "./api/Registry.js";
import { loadExtension } from "./loader.js";
import { App } from "./tui/App.js";
import { T } from "./tui/theme.js";
import { wireNotify } from "./util/safeLog.js";
import { priceFeed } from "./tools/PriceFeed.js";
import { newsFeed } from "./tools/NewsSentiment.js";

// ── Load env vars from ~/.alba/.env ─────────────────────────────────────────
const ALBA_HOME = process.env.ALBA_HOME ?? join(homedir(), ".alba");
const envPath    = join(ALBA_HOME, ".env");
if (existsSync(envPath)) loadDotenv({ path: envPath, override: false });

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const subcmd = args[0];

// ── Setup Command ───────────────────────────────────────────────────────────
function runSetup() {
  (async () => {
    console.log(T.accent("\n  ALBA Setup\n"));
    const readline = await import("node:readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (prompt: string) => new Promise<string>((res) => rl.question(prompt, res));

    const fs = await import("node:fs");
    fs.mkdirSync(ALBA_HOME, { recursive: true });

    const existingLines = existsSync(envPath) ? readFileSync(envPath, "utf-8").split("\n") : [];
    const existingValues: Record<string, string> = {};
    for (const line of existingLines) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) existingValues[m[1]] = m[2];
    }

    const requiredFields = [
      { key: "OPENROUTER_API_KEY", label: "OpenRouter API key", hint: "https://openrouter.ai/keys (or use local Ollama)", required: false },
    ];

    const optionalFields = [
      { key: "ANTHROPIC_API_KEY", label: "Anthropic API key", hint: "https://console.anthropic.com", required: false },
      { key: "OPENAI_API_KEY", label: "OpenAI API key", hint: "https://platform.openai.com", required: false },
      { key: "OPENAI_BASE_URL", label: "Local API base URL", hint: "e.g. http://localhost:11434/v1 for Ollama", required: false },
    ];

    const updateEnv = (key: string, value: string) => {
      const re = new RegExp(`^${key}=.*$`, "m");
      const content = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";
      const newContent = re.test(content) ? content.replace(re, `${key}=${value}`) : content + (content ? "\n" : "") + `${key}=${value}`;
      writeFileSync(envPath, newContent, "utf-8");
    };

    console.log(T.bold("  Required Configuration\n"));
    for (const f of requiredFields) {
      const current = existingValues[f.key] || process.env[f.key] || "";
      const hint = f.hint ? ` (${f.hint})` : "";
      const prompt = `  ${f.label}${hint}${current ? " [set]" : ""}: `;
      const val = (await ask(prompt)).trim();
      if (val) updateEnv(f.key, val);
    }

    console.log("\n" + T.bold("  Optional Configuration\n"));
    for (const f of optionalFields) {
      const current = existingValues[f.key] || "";
      const hint = f.hint ? ` (${f.hint})` : "";
      const prompt = `  ${f.label}${hint}${current ? " [set]" : ""}: `;
      const val = (await ask(prompt)).trim();
      if (val) updateEnv(f.key, val);
    }

    rl.close();
    console.log(T.success(`\n  ✓ Config saved → ${envPath}\n`));
    console.log(T.muted("  Run: albacli  (terminal mode)\n"));
  })();
  process.exit(0);
}

// ── Config Command ───────────────────────────────────────────────────────────
function runConfig() {
  console.log(T.accent("ALBA Config"));
  console.log(T.muted(`Config file: ${envPath}`));
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (!m) continue;
      const masked = m[2].length > 12 ? m[2].slice(0, 6) + "******" : "******";
      console.log(`  ${m[1].padEnd(28)} ${masked}`);
    }
  } else {
    console.log(T.warn("No config found. Run: albacli setup"));
  }
  process.exit(0);
}

// ── Resolve extension + prompt ────────────────────────────────────────────────
let extensionPath: string | null = null;
let promptPath:    string | null = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--extension" && args[i + 1]) extensionPath = args[i + 1]!;
  if (args[i] === "--prompt"    && args[i + 1]) promptPath    = args[i + 1]!;
}

if (!extensionPath) {
  for (const c of ["extensions/alba.ts", "extensions/alba.js", "extension.ts", "extension.js"]) {
    const abs = resolve(c);
    if (existsSync(abs)) { extensionPath = abs; break; }
  }
}

let systemPrompt = "";
if (promptPath && existsSync(promptPath)) {
  systemPrompt = readFileSync(promptPath, "utf-8");
} else {
  const dp = resolve("prompts/alba.md");
  if (existsSync(dp)) systemPrompt = readFileSync(dp, "utf-8");
}

function loadContext(): { effectLevel: string; chain: string } {
  const ctxPath = join(ALBA_HOME, "context.json");
  if (!existsSync(ctxPath)) return { effectLevel: "normal", chain: "ethereum" };
  try {
    const ctx = JSON.parse(readFileSync(ctxPath, "utf-8"));
    if (ctx.model && typeof ctx.model === "string") {
      process.env.DEFAULT_MODEL = ctx.model;
      try {
        const envFile = join(ALBA_HOME, ".env");
        const content = existsSync(envFile) ? readFileSync(envFile, "utf-8") : "";
        const re = /^DEFAULT_MODEL=.*$/m;
        const line = `DEFAULT_MODEL=${ctx.model}`;
        writeFileSync(envFile, re.test(content) ? content.replace(re, line) : content + "\n" + line + "\n", "utf-8");
      } catch { /* non-fatal */ }
    }
    return { effectLevel: ctx.effect_level ?? "normal", chain: ctx.active_chain ?? "ethereum" };
  } catch { return { effectLevel: "normal", chain: "ethereum" }; }
}

// ── Subcommand Router ───────────────────────────────────────────────────────
if (subcmd === "setup") {
  runSetup();
}

if (subcmd === "config") {
  runConfig();
}

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  console.clear();
  console.log(T.accent(`
   █████╗ ██╗     ██████╗  █████╗
   ██╔══██╗██║     ██╔══██╗██╔══██╗
   ███████║██║     ██████╔╝███████║
   ██╔══██║██║     ██╔══██╗██╔══██║
   ██║  ██║███████╗██████╔╝██║  ██║
   ╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝  ╚═╝
  `));
  console.log(T.muted("  Personal AI assistant — all local, zero exposure\n"));

  const registry                   = new Registry();
  const { effectLevel, chain }     = loadContext();

  let _notifyFn:   ((msg: string)           => void) | null = null;
  let _setStatusFn:((k: string, v: string) => void) | null = null;
  let _showModelSelectorFn: ((q?: string)   => void) | null = null;

  if (extensionPath) {
    try {
      console.log(T.muted(`  Loading: ${extensionPath}`));
      await loadExtension(extensionPath, registry, {
        onNotify:      (msg) => { _notifyFn?.(msg); },
        onStatusUpdate:(k, v) => { _setStatusFn?.(k, v); },
        onShowModelSelector: (q) => { _showModelSelectorFn?.(q); },
      });
      console.log(T.success(`  ✓ ${registry.listTools().length} tools · ${registry.listCommands().length} commands`));
    } catch (e: any) {
      console.error(T.error(`  ✗ Extension load failed: ${e.message}`));
      process.exit(1);
    }
  } else {
    console.log(T.warn("  No extension found — base agent only."));
    console.log(T.muted("  Run from alba project root or pass --extension path\n"));
  }

  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log(T.warn("  No API key found. Set OPENROUTER_API_KEY in ~/.alba/.env\n"));
    console.log(T.muted("  Or use local Ollama: OPENAI_BASE_URL=http://localhost:11434/v1\n"));
  }

  await new Promise(r => setTimeout(r, 500));
  console.clear();

  // Start price + news feeds
  priceFeed.start();
  newsFeed.start();

  // Graceful shutdown
  let shutdownInProgress = false;
  function handleShutdown() {
    if (shutdownInProgress) return;
    shutdownInProgress = true;
    console.log(T.muted("\n  Shutting down..."));
    priceFeed.stop();
    newsFeed.stop();
    process.exit(0);
  }
  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);

  render(
    React.createElement(App, {
      registry,
      systemPrompt,
      effectLevel,
      chain,
      onNotifyReady:  (fn) => { _notifyFn = fn; wireNotify(fn); },
      onStatusReady:  (fn) => { _setStatusFn = fn; },
      onModelSelectorReady: (fn) => { _showModelSelectorFn = fn; },
    }),
    { exitOnCtrlC: false },
  );

  const _safeLog = (...args: any[]) => {
    const msg = args.map(a => (typeof a === "string" ? a : String(a))).join(" ");
    _notifyFn?.(msg);
  };
  console.log   = _safeLog as typeof console.log;
  console.error = _safeLog as typeof console.error;
  console.warn  = _safeLog as typeof console.warn;
})();
