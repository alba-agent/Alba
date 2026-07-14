import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ALBA_HOME = process.env.ALBA_HOME ?? join(homedir(), ".alba");
const DEBUG_LOG = join(ALBA_HOME, "debug.log");

let _notifyFn: ((msg: string) => void) | null = null;

export function wireNotify(fn: (msg: string) => void) { _notifyFn = fn; }

export function safeLog(...args: unknown[]) {
  const msg = args.map(a => (typeof a === "string" ? a : String(a))).join(" ");
  if (_notifyFn) {
    _notifyFn(msg);
  } else {
    try { mkdirSync(ALBA_HOME, { recursive: true }); appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch { /* non-fatal */ }
  }
}
