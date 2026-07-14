# @albalink/agent

**THE AGENT • THE WEB3 AGENT**

A React dashboard and open SDK. Bring any provider — Anthropic, OpenAI, local models on your Mac — and let ALBA reason, act and transact across chains. Fully open-source.

## Links

- **GitHub:** [github.com/alba-agent](https://github.com/alba-agent)
- **Website:** [albaagent.xyz](https://albaagent.xyz)
- **npm:** [@albalink/agent](https://www.npmjs.com/package/@albalink/agent)

---

## What is ALBA?

Open-source Web3 agent. React dashboard. Bring your own AI provider — cloud or local.

```typescript
TypeScript
React
Web3
MIT
```

---

## Install

```bash
npm i @albalink/agent
```

Install the agent SDK in any project. Plug providers from Anthropic API to local Mac models. More coming soon.

---

## Features

- **Multi-Provider Support:** OpenRouter, Anthropic, OpenAI, local models (Ollama, etc.)
- **Tool System:** File operations, shell commands, grep, price feeds, news sentiment
- **Memory Layer:** Persistent context across sessions
- **Swarm Mode:** Sub-agent orchestration for complex tasks
- **Zero Cloud Dependency:** Runs entirely on your machine

---

## Quick Start

```javascript
import { ModelClient, resolveModelConfig, PriceFeed, NewsFeed, SwarmRouter } from "@albalink/agent";

// Configure with your provider
const cfg = resolveModelConfig();
const client = new ModelClient(cfg);

// Stream chat completions
for await (const chunk of client.stream(messages, tools)) {
  console.log(chunk.type, chunk.text || "");
}
```

---

## // WEB VERSION — COMING SOON

NOTIFY ME

Drop your Telegram username. We'll ping you the moment the web app opens.
@

---

## // 04 — ROADMAP

### THE DAWN

**PHASE 01 · DONE**  
GENESIS  
$ALBA launch, liquidity burned, contract audited, community formed.

**PHASE 02 · LIVE**  
ALBA AGENT SDK  
Open-source Web3 agent — React dashboard + @albalink/agent npm package. Any provider, any chain, run locally on your Mac.

**PHASE 03 · Q3 2026**  
OPEN MIND — WEB APP  
Public web app, memory layer and community-driven training. Notify list first.

**PHASE 04 · Q4 2026**  
CROSS-CHAIN DAWN  
Multi-chain presence, DAO governance and an open SDK to build on top of ALBA.
