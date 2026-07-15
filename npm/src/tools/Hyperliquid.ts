/**
 * Hyperliquid Tools — Perpetuals and spot trading on Hyperliquid L1.
 */

import { Type, type Static } from "@sinclair/typebox";

const HYPERLIQUID_API = "https://api.hyperliquid.xyz";

const ASSET_INDEX: Record<string, number> = {
  BTC: 0, ETH: 1, ARB: 2, SOL: 3, AVAX: 4, BNB: 5, MATIC: 6,
  DOGE: 11, SUI: 14, XRP: 15, TRUMP: 16, MSTR: 17,
};

export const hyperliquidInfoParams = Type.Object({
  user: Type.Optional(Type.String()),
});

export async function hyperliquidInfoTool(
  _id: string,
  params: Static<typeof hyperliquidInfoParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const user = params.user || process.env.HYPERLIQUID_WALLET_ADDRESS;
  if (!user) {
    throw new Error("Hyperliquid wallet address required. Set HYPERLIQUID_WALLET_ADDRESS env var.");
  }

  const resp = await fetch(HYPERLIQUID_API + "/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user }),
  });

  const data = await resp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const hyperliquidFundingParams = Type.Object({});

interface HyperliquidAssetContext {
  funding?: number;
  markPx?: number;
}

export async function hyperliquidFundingTool(
  _id: string,
  _params: Static<typeof hyperliquidFundingParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const resp = await fetch(HYPERLIQUID_API + "/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs" }),
  });

  const data = await resp.json();
  if (!Array.isArray(data) || data.length < 2) {
    return { content: [{ type: "text", text: "No funding data available" }] };
  }

  const [universeRaw, contextsRaw] = data;
  const universe = universeRaw as Array<{ name: string }>;
  const contexts = contextsRaw as Array<HyperliquidAssetContext>;
  const pairs = universe.map((u, i) => ({
    coin: u.name,
    funding: contexts[i]?.funding ?? 0,
    price: contexts[i]?.markPx ?? 0,
  }));

  return { content: [{ type: "text", text: JSON.stringify(pairs, null, 2) }] };
}

export const hyperliquidLeaderboardParams = Type.Object({});

export async function hyperliquidLeaderboardTool(
  _id: string,
  _params: Static<typeof hyperliquidLeaderboardParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const resp = await fetch(HYPERLIQUID_API + "/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "leaderboard" }),
  });

  const data = await resp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const hyperliquidMetaParams = Type.Object({});

export async function hyperliquidMetaTool(
  _id: string
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const resp = await fetch(HYPERLIQUID_API + "/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "meta" }),
  });

  const data = await resp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const hyperliquidOrderParams = Type.Object({
  symbol: Type.String(),
  side: Type.Union([Type.Literal("BUY"), Type.Literal("SELL")]),
  size: Type.String(),
  price: Type.Optional(Type.String()),
});

export async function hyperliquidOrderTool(
  _id: string,
  params: Static<typeof hyperliquidOrderParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("HYPERLIQUID_PRIVATE_KEY required for trading");
  }

  const assetIndex = ASSET_INDEX[params.symbol.toUpperCase()];
  if (assetIndex === undefined) {
    throw new Error(`Unknown symbol: ${params.symbol}. Use meta endpoint to get indices.`);
  }

  const order = {
    type: "order",
    orders: [{
      a: assetIndex,
      b: params.side === "BUY",
      p: params.price || "0",
      s: params.size,
      r: false,
      t: { limit: { tif: "Gtc" } },
    }],
    grouping: "na",
  };

  return { content: [{ type: "text", text: "Signing not implemented. Use CLI for trading." }] };
}