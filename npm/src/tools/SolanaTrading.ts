/**
 * Solana Trading Tools — Jupiter aggregator and Raydium liquidity.
 */

import { Type, type Static } from "@sinclair/typebox";

const TOKENS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
};

interface JupiterQuote {
  outAmount?: string;
}

export const jupiterQuoteParams = Type.Object({
  inputMint: Type.String(),
  outputMint: Type.String(),
  amount: Type.String(),
  slippageBps: Type.Optional(Type.Number({ default: 50 })),
});

export async function jupiterQuoteTool(
  _id: string,
  params: Static<typeof jupiterQuoteParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const url = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps),
  });

  const resp = await fetch(`https://quote-api.jup.ag/v6/quote?${url}`);
  const data = await resp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const jupiterSwapParams = Type.Object({
  inputMint: Type.String(),
  outputMint: Type.String(),
  amount: Type.String(),
  slippageBps: Type.Optional(Type.Number({ default: 50 })),
});

export async function jupiterSwapTool(
  _id: string,
  params: Static<typeof jupiterSwapParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const url = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps),
  });

  const quoteResp = await fetch(`https://quote-api.jup.ag/v6/quote?${url}`);
  const quote = await quoteResp.json() as JupiterQuote;
  if (!quote.outAmount) {
    return { content: [{ type: "text", text: "No route found for swap" }] };
  }

  const wallet = process.env.SOLANA_WALLET_ADDRESS;
  if (!wallet) {
    return { content: [{ type: "text", text: `Swap ready. Quote: ${quote.outAmount} out. Sign with your wallet.` }] };
  }

  const swapResp = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: wallet,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    }),
  });

  const data = await swapResp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const jupiterTokensParams = Type.Object({});

export async function jupiterTokensTool(
  _id: string
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const resp = await fetch("https://tokens.jup.ag/tokens?tags=verified");
  const data = await resp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const raydiumSwapParams = Type.Object({
  inputMint: Type.String(),
  outputMint: Type.String(),
  amount: Type.String(),
  slippageBps: Type.Optional(Type.Number({ default: 50 })),
});

export async function raydiumSwapTool(
  _id: string,
  params: Static<typeof raydiumSwapParams>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const url = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps),
    txVersion: "V0",
  });

  const resp = await fetch(`https://transaction-v1.raydium.io/compute/swap-base-in?${url}`);
  const data = await resp.json();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}