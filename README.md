# ALBA — Personal AI Assistant

<div align="center">

```
   █████╗ ██╗     ██████╗  █████╗
   ██╔══██╗██║     ██╔══██╗██╔══██╗
   ███████║██║     ██████╔╝███████║
   ██╔══██║██║     ██╔══██╗██╔══██║
   ██║  ██║███████╗██████╔╝██║  ██║
   ╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝  ╚═╝
```

**Personal AI assistant. Runs 100% locally. Private. Fast. Extensible.**

</div>

---

## What is ALBA?

ALBA is a personal AI assistant that runs entirely on your machine. It features a React dashboard, sub-agent swarm orchestration, persistent memory, local voice, and 5 built-in skills — all with zero cloud dependency.

---

## Quick Start

```bash
# Terminal mode
npm install -g @albalink/agent
albacli setup
albacli
```

---

## Project Structure

```
local-agent/
├── npm/              ← @albalink/agent (engine, published to npm)
├── app/
│   ├── server/       ← Express + WebSocket bridge
│   ├── dashboard/    ← React SPA (Vite + Tailwind v4)
│   ├── native/       ← macOS .app bundle builder
│   └── bin/          ← `alba` CLI launcher
├── skills/           ← 5 built-in skills
├── storage/          ← Local data (memory.db, config, etc.)
├── extensions/       ← User extensions
├── start.sh          ← One-command startup
└── README.md
```

---

## Packages

| Package | Description |
|---------|-------------|
| `@albalink/agent` | Standalone agent engine (npm dependency) |
| `@albalink/app` | Full desktop app (depends on @albalink/agent) |

---

## Features

- **Chat** — Natural conversation with streaming responses
- **Sub-agents** — Automatic parallel agent spawning for complex tasks
- **Memory** — Persistent context via claude-mem (port 37777)
- **Voice** — Local STT (whisper.cpp) + TTS (macOS `say`)
- **Skills** — 5 built-in: memory, design, anti-slop, commands, motion
- **Terminal TUI** — Full Ink-based terminal interface (`albacli`)
- **React Dashboard** — Beautiful dark-themed SPA
- **macOS App** — Launchpad icon with Safari webapp mode
- **Multi-model** — OpenRouter, Anthropic, OpenAI, Ollama fallback
- **100% Local** — No cloud dependency for core functionality

---

## Development

```bash
# Build agent engine
cd npm && npm run build

# Build dashboard
cd app/dashboard && npm run build

# Run everything
cd ../..
bash start.sh
```

---

## License

MIT
