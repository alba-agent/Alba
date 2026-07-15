/**
 * Binance Tools — Spot trading, market data, and account queries.
 * Based on binance-skills-hub pattern.
 */

import { Type, type Static } from "@sinclair/typebox";
import crypto from "node:crypto";

const BINANCE_API = "https://api.binance.com/api";

function signParams(params: Record<string, string>, secret: string): string {
  const query = new URLSearchParams(params).toString();
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

// ── Tool: get_binance_prices ───────────────────────────────────────────────
export const binancePricesParams = Type.Object({
  symbols: Type.Optional(Type.Array(Type.String())),
});

export async function binancePricesTool(
  _id: string,
  params: Static<typeof binancePricesParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const symbols = params.symbols ?? ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  const prices = await Promise.all(
    symbols.map(async (s) => {
      const resp = await fetch(`${BINANCE_API}/v3/ticker/price?symbol=${s}`);
      const data = await resp.json() as Record<string, unknown>;
      return { symbol: s, price: data.price as string };
    })
  );
  return { content: [{ type: "text", text: JSON.stringify(prices, null, 2) }] };
}

// ── Tool: get_binance_klines ────────────────────────────────────────────────
export const binanceKlinesParams = Type.Object({
  symbol: Type.String({ description: "Trading pair (e.g. BTCUSDT)" }),
  interval: Type.Optional(Type.String({ default: "1h" })),
  limit: Type.Optional(Type.Number({ default: 100 })),
});

export async function binanceKlinesTool(
  _id: string,
  params: Static<typeof binanceKlinesParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const url = `${BINANCE_API}/v3/klines?symbol=${params.symbol}&interval=${params.interval}&limit=${params.limit}`;
  const resp = await fetch(url);
  const data = await resp.json() as Array<Array<unknown>>;

  const klines = data.map((k) => ({
    openTime: Number(k[0]),
    open: String(k[1]),
    high: String(k[2]),
    low: String(k[3]),
    close: String(k[4]),
    volume: String(k[5]),
  }));

  return { content: [{ type: "text", text: JSON.stringify(klines, null, 2) }] };
}

// ── Tool: get_account_balance (authenticated) ───────────────────────────────
export const binanceBalanceParams = Type.Object({
  apiKey: Type.Optional(Type.String()),
});

export async function binanceBalanceTool(
  _id: string,
  params: Static<typeof binanceBalanceParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const apiKey = params.apiKey ?? process.env.BINANCE_API_KEY;
  const secret = process.env.BINANCE_SECRET_KEY;

  if (!apiKey || !secret) {
    throw new Error("Binance API key and secret required for account balance");
  }

  const timestamp = Date.now().toString();
  const signature = signParams({ timestamp }, secret);

  const resp = await fetch(`${BINANCE_API}/v3/account?timestamp=${timestamp}&signature=${signature}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });

  const data = await resp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// ── Tool: place_order (authenticated) ───────────────────────────────────────
export const binanceOrderParams = Type.Object({
  symbol: Type.String(),
  side: Type.Union([Type.Literal("BUY"), Type.Literal("SELL")]),
  type: Type.Union([Type.Literal("LIMIT"), Type.Literal("MARKET")]),
  quantity: Type.String(),
  price: Type.Optional(Type.String()),
});

export async function binanceOrderTool(
  _id: string,
  params: Static<typeof binanceOrderParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const apiKey = process.env.BINANCE_API_KEY;
  const secret = process.env.BINANCE_SECRET_KEY;

  if (!apiKey || !secret) {
    throw new Error("Binance API credentials required");
  }

  const requestParams: Record<string, string> = {
    symbol: params.symbol,
    side: params.side,
    type: params.type,
    quantity: params.quantity,
    timestamp: Date.now().toString(),
  };

  if (params.price && params.type === "LIMIT") {
    requestParams.price = params.price;
    requestParams.timeInForce = "GTC";
  }

  const signature = signParams(requestParams, secret);

  const resp = await fetch(`${BINANCE_API}/v3/order`, {
    method: "POST",
    headers: { "X-MBX-APIKEY": apiKey },
    body: new URLSearchParams({ ...requestParams, signature }).toString(),
  });

  const data = await resp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// ── Tool: get_order_book ─────────────────────────────────────────────────────
export const binanceOrderBookParams = Type.Object({
  symbol: Type.String(),
  limit: Type.Optional(Type.Number({ default: 100 })),
});

export async function binanceOrderBookTool(
  _id: string,
  params: Static<typeof binanceOrderBookParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const url = `${BINANCE_API}/v3/depth?symbol=${params.symbol}&limit=${params.limit}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}