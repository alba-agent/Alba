/**
 * server-entry.ts — Lean entry point for the dashboard server.
 * Exports only what app/server/server.js needs, avoiding Ink/React/React DOM deps.
 *
 * Import from: import { ModelClient, resolveModelConfig, PriceFeed, NewsFeed, SwarmRouter } from "@albalink/agent";
 */

// Model client — used by server for OpenAI-compatible chat completions
export { ModelClient, resolveModelConfig } from "./runner/ModelClient.js";

// Price feed singleton — real-time crypto prices
export { PriceFeed, priceFeed } from "./tools/PriceFeed.js";

// News feed singleton — crypto news sentiment
export { NewsFeed, newsFeed } from "./tools/NewsSentiment.js";

// SwarmRouter — sub-agent orchestration
export { SwarmRouter, scoreComplexity } from "./runner/SwarmRouter.js";