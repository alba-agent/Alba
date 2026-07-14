/**
 * App — ALBA root Ink component.
 * Clean TUI: status bar + REPL + model selector overlay.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { StatusBar }    from "./StatusBar.js";
import { REPL }         from "./REPL.js";
import { ModelSelector } from "./ModelSelector.js";
import type { ChatMessage } from "./REPL.js";
import { makeTheme, T, ALBA_COLORS } from "./theme.js";
import { Registry }     from "../api/Registry.js";
import { AgentRunner }  from "../runner/AgentRunner.js";
import { SessionManager } from "../session/SessionManager.js";
import type { SessionContext, UIContext } from "../api/ExtensionAPI.js";
import { resolveModelConfig } from "../runner/ModelClient.js";

export interface AppProps {
  registry:    Registry;
  systemPrompt?: string;
  effectLevel?: string;
  chain?:       string;
  onNotifyReady?: (fn: (msg: string) => void) => void;
  onStatusReady?: (fn: (key: string, val: string) => void) => void;
  onModelSelectorReady?: (fn: (query?: string) => void) => void;
}

let _msgIdCounter = 0;
function nextId() { return String(++_msgIdCounter); }

export function App({
  registry,
  systemPrompt,
  effectLevel: initialEffect = "normal",
  chain:       initialChain  = "ethereum",
  onNotifyReady,
  onStatusReady,
  onModelSelectorReady,
}: AppProps) {
  const { exit }                      = useApp();
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [streaming, setStreaming]     = useState("");
  const [toolRunning, setToolRunning] = useState<string | null>(null);
  const [disabled, setDisabled]       = useState(false);
  const [effectLevel, setEffectLevel] = useState(initialEffect);
  const [chain, setChain]             = useState(initialChain);
  const [statusBadges, setStatusBadges] = useState<Record<string, string>>({});
  const [showModelSelector, setShowModelSelector]         = useState(false);
  const [modelSelectorInitialQuery, setModelSelectorInitialQuery] = useState("");
  const runnerRef                     = useRef<AgentRunner | null>(null);
  const sessionRef                    = useRef<SessionManager | null>(null);
  const sessionCtxRef                 = useRef<SessionContext | null>(null);
  const theme                         = makeTheme();

  let modelName = "no-model";
  try { modelName = resolveModelConfig().model; } catch { /* shown via banner */ }

  const push = useCallback((msg: Omit<ChatMessage, "id" | "ts">) => {
    setMessages(prev => [...prev, { ...msg, id: nextId(), ts: Date.now() }]);
  }, []);

  const notify = useCallback((content: string) => {
    push({ role: "notify", content });
  }, [push]);

  const setStatus = useCallback((key: string, value: string) => {
    setStatusBadges(prev => ({ ...prev, [key]: value }));
    if (key === "chain" || key === "active_chain") setChain(value);
    if (key === "effect_level") setEffectLevel(value);
  }, []);

  const uiCtx: UIContext = {
    notify, setStatus,
    setTheme(_n) {},
    setHeader(_f) {},
    showModelSelector: (query?: string) => {
      setModelSelectorInitialQuery(query ?? "");
      setShowModelSelector(true);
    },
    theme,
  };

  // Wire live callbacks
  useEffect(() => {
    onNotifyReady?.(notify);
    onStatusReady?.(setStatus);
  }, [notify, setStatus, onNotifyReady, onStatusReady]);

  useEffect(() => {
    onModelSelectorReady?.((initialQuery?: string) => {
      setModelSelectorInitialQuery(initialQuery ?? "");
      setShowModelSelector(true);
    });
  }, [onModelSelectorReady]);

  // Boot: fire session_start
  useEffect(() => {
    const session = new SessionManager();
    session.setSystemPrompt(
      registry.getSystemPrompt() || systemPrompt ||
      "You are ALBA, a personal AI assistant. You run locally, respect privacy, and help with any task."
    );
    sessionRef.current = session;

    const sessionCtx: SessionContext = {
      ui:     uiCtx,
      hasUI:  true,
      config: {
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        ANTHROPIC_API_KEY:  process.env.ANTHROPIC_API_KEY,
        OPENAI_API_KEY:     process.env.OPENAI_API_KEY,
        OPENAI_BASE_URL:    process.env.OPENAI_BASE_URL,
        DEFAULT_MODEL:      process.env.DEFAULT_MODEL,
      },
    };
    sessionCtxRef.current = sessionCtx;

    registry.fireHook("session_start", sessionCtx).then(() => {
      push({ role: "system", content: T.muted("Session started. Type a message or /help.") });
    });

    const runner = new AgentRunner(registry, session, (event) => {
      if (event.type === "text_delta") {
        setStreaming(prev => prev + event.text);
      } else if (event.type === "tool_start") {
        setToolRunning(event.name);
      } else if (event.type === "tool_done") {
        setToolRunning(null);
        push({
          role:     "tool",
          content:  event.result,
          toolName: event.name,
          isError:  event.isError,
        });
      } else if (event.type === "turn_done") {
        setDisabled(false);
        setToolRunning(null);
        setStreaming(prev => {
          if (prev.trim()) push({ role: "assistant", content: prev });
          return "";
        });
      } else if (event.type === "error") {
        setDisabled(false);
        setToolRunning(null);
        setStreaming("");
        notify(T.error(`Error: ${event.message}`));
      }
    }, sessionCtx);

    runnerRef.current = runner;

    return () => {
      if (sessionCtxRef.current) {
        registry.fireHook("session_end", sessionCtxRef.current).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live effect level
  useEffect(() => {
    runnerRef.current?.setEffectLevel(effectLevel);
  }, [effectLevel]);

  // Ctrl-C
  useInput((_input, key) => {
    if (key.ctrl && _input === "c") {
      push({ role: "system", content: T.muted("Goodbye") });
      setTimeout(exit, 200);
    }
  });

  // Input handler
  const handleSubmit = useCallback(async (raw: string) => {
    const input = raw.trim();
    if (!input) return;

    if (input.startsWith("/")) {
      const [cmd, ...rest] = input.slice(1).split(" ");
      const args           = rest.join(" ");

      if (cmd === "exit" || cmd === "quit") {
        push({ role: "system", content: T.muted("Goodbye") });
        setTimeout(exit, 200);
        return;
      }

      if (cmd === "help") {
        const lines = registry.listCommands().map(
          ([n, d]) => T.accent(`/${n}`.padEnd(16)) + " " + d.description,
        );
        notify("Available commands:\n\n" + lines.join("\n"));
        return;
      }

      if (cmd === "clear") {
        setMessages([]);
        return;
      }

      const def = registry.getCommand(cmd);
      if (!def) {
        notify(T.error(`Unknown command: /${cmd}\nType /help to list all commands.`));
        return;
      }

      try { await def.handler(args, { ui: uiCtx }); } catch (e: any) {
        notify(T.error(`Command error: ${e.message}`));
      }
      return;
    }

    if (!runnerRef.current) { notify(T.error("Agent not ready")); return; }

    push({ role: "user", content: input });
    setDisabled(true);
    setStreaming("");

    try {
      await runnerRef.current.run(input);
    } catch (e: any) {
      setDisabled(false);
      notify(T.error(`Runner error: ${e.message}`));
    }
  }, [registry, exit, push, notify, uiCtx]);

  // Model selection
  const handleModelSelect = useCallback(async (modelId: string) => {
    setShowModelSelector(false);
    try {
      const { writeFileSync, readFileSync, existsSync, mkdirSync } = await import("node:fs");
      const { join } = await import("node:path");
      const { homedir } = await import("node:os");
      const ALBA_HOME = process.env.ALBA_HOME ?? join(homedir(), ".alba");
      const envFile = join(ALBA_HOME, ".env");
      mkdirSync(ALBA_HOME, { recursive: true });
      const content = existsSync(envFile) ? readFileSync(envFile, "utf-8") : "";
      const re = /^DEFAULT_MODEL=.*$/m;
      const line = `DEFAULT_MODEL=${modelId}`;
      writeFileSync(envFile, re.test(content) ? content.replace(re, line) : content + "\n" + line + "\n", "utf-8");
      process.env.DEFAULT_MODEL = modelId;
      const ctxPath = join(ALBA_HOME, "context.json");
      const store = existsSync(ctxPath) ? JSON.parse(readFileSync(ctxPath, "utf-8")) : {};
      store.model = modelId;
      writeFileSync(ctxPath, JSON.stringify(store, null, 2), "utf-8");
    } catch { /* non-fatal */ }
    notify(T.accent(`Model set to: ${modelId}\nRestart albacli to apply.`));
  }, [notify]);

  const handleModelCancel = useCallback(() => {
    setShowModelSelector(false);
  }, []);

  const statusLine = Object.values(statusBadges).join("  ") || null;

  if (showModelSelector) {
    return (
      <Box flexDirection="column" height="100%">
        <StatusBar
          model={modelName}
          chain={chain}
          effectLevel={effectLevel}
          toolRunning={toolRunning}
          connected={true}
          statusLine={statusLine}
        />
        <ModelSelector
          currentModelId={process.env.DEFAULT_MODEL ?? ""}
          onSelect={handleModelSelect}
          onCancel={handleModelCancel}
          initialQuery={modelSelectorInitialQuery}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar
        model={modelName}
        chain={chain}
        effectLevel={effectLevel}
        toolRunning={toolRunning}
        connected={true}
        statusLine={statusLine}
      />
      <REPL
        messages={messages}
        streamingText={streaming}
        toolRunning={toolRunning}
        onSubmit={handleSubmit}
        disabled={disabled}
      />
    </Box>
  );
}
