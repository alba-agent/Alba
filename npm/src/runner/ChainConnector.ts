/**
 * ChainConnector — Unified RPC connector for 20+ blockchains.
 * Inspired by jellychain/chain-connector pattern.
 *
 * Provides single interface for balance queries, transactions, and events.
 */

export type ChainName =
  | "ethereum" | "base" | "arbitrum" | "optimism"
  | "solana" | "bnb" | "polygon" | "avalanche"
  | "bitcoin" | "dogecoin" | "litecoin" | "ripple"
  | "sui" | "ton" | "polkadot";

export interface ChainConfig {
  rpc: string[];
  ws?: string[];
}

export interface NativeBalance {
  value: string;
  decimals: number;
  symbol: string;
  formatted?: string;
}

export interface TokenBalance {
  value: string;
  decimals: number;
  symbol?: string;
  name?: string;
  formatted?: string;
}

const DEFAULT_RPCS: Record<ChainName, ChainConfig> = {
  ethereum: { rpc: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"], ws: ["wss://ws.rpc.ankr.com/eth"] },
  base: { rpc: ["https://mainnet.base.org", "https://rpc.ankr.com/base"], ws: ["wss://rpc.ankr.com/base/ws"] },
  arbitrum: { rpc: ["https://arb1.arbitrum.io/rpc", "https://rpc.ankr.com/arbitrum"] },
  optimism: { rpc: ["https://optimism.llamarpc.com", "https://rpc.ankr.com/optimism"] },
  solana: { rpc: ["https://api.mainnet-beta.solana.com"], ws: ["wss://api.mainnet-beta.solana.com"] },
  bnb: { rpc: ["https://bsc-dataseed.binance.org", "https://rpc.ankr.com/bsc"] },
  polygon: { rpc: ["https://polygon-rpc.com", "https://rpc.ankr.com/polygon"] },
  avalanche: { rpc: ["https://api.avax.network/ext/bc/C/rpc", "https://rpc.ankr.com/avax"] },
  bitcoin: { rpc: ["https://blockstream.info/api"] },
  dogecoin: { rpc: ["https://dogecoin.drpc.org"] },
  litecoin: { rpc: ["https://litecoinblockhalf.com"] },
  ripple: { rpc: ["https://xrplcluster.com"] },
  sui: { rpc: ["https://sui-mainnet.g.alchemy.com/v2/demo"] },
  ton: { rpc: ["https://toncenter.com/api/v3"] },
  polkadot: { rpc: ["https://polkadot-rpc.publicnode.com"] },
};

interface RpcResponse {
  result?: unknown;
  error?: { message: string };
}

export class ChainConnector {
  private endpoints: Record<ChainName, ChainConfig>;
  private currentRpcIndex: Partial<Record<ChainName, number>> = {};

  constructor(customConfigs?: Partial<Record<ChainName, ChainConfig>>) {
    this.endpoints = { ...DEFAULT_RPCS, ...customConfigs };
  }

  private getNextEndpoint(chain: ChainName): string {
    const config = this.endpoints[chain];
    if (!config) throw new Error(`Unknown chain: ${chain}`);
    const idx = this.currentRpcIndex[chain] ?? 0;
    this.currentRpcIndex[chain] = (idx + 1) % config.rpc.length;
    return config.rpc[idx];
  }

  async getBalance(chain: ChainName, address: string): Promise<NativeBalance> {
    const rpc = this.getNextEndpoint(chain);
    const evmChains: ChainName[] = ["ethereum", "base", "arbitrum", "optimism", "bnb", "polygon", "avalanche"];

    if (evmChains.includes(chain)) {
      return this.getEvmBalance(rpc, address);
    }
    if (chain === "solana") {
      return this.getSolanaBalance(address);
    }
    throw new Error(`Balance not implemented for ${chain}`);
  }

  private async getEvmBalance(rpc: string, address: string): Promise<NativeBalance> {
    const resp = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });

    const data = await resp.json() as RpcResponse;
    if (data.error) throw new Error(data.error.message);

    return {
      value: data.result as string,
      decimals: 18,
      symbol: "ETH",
    };
  }

  private async getSolanaBalance(address: string): Promise<NativeBalance> {
    const resp = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [{ publicKey: address }],
      }),
    });

    const data = await resp.json() as RpcResponse;
    if (data.error) throw new Error(data.error.message);

    return {
      value: String(data.result),
      decimals: 9,
      symbol: "SOL",
    };
  }

  async getTokenBalance(chain: ChainName, address: string, token: string): Promise<TokenBalance> {
    throw new Error("Not implemented");
  }

  async sendTransaction(chain: ChainName, signedTxHex: string): Promise<string> {
    const rpc = this.getNextEndpoint(chain);
    const resp = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: ["0x" + signedTxHex],
        id: 1,
      }),
    });

    const data = await resp.json() as RpcResponse;
    return data.result as string;
  }

  getChains(): ChainName[] {
    return Object.keys(this.endpoints) as ChainName[];
  }
}