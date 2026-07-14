/**
 * MCP CLI entry point
 */

import { Registry } from "../api/Registry.js";
import { MCPServer } from "./server.js";
import { loadExtension } from "../loader.js";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

export async function runServer(extensionPath: string | null) {
  const registry = new Registry();

  if (extensionPath) {
    await loadExtension(extensionPath, registry, {});
  } else {
    // Load default extension
    const defaultPaths = ["extensions/alba.ts", "extensions/alba.js", "extension.ts", "extension.js"];
    for (const p of defaultPaths) {
      const abs = resolve(p);
      if (existsSync(abs)) {
        await loadExtension(abs, registry, {});
        break;
      }
    }
  }

  const server = new MCPServer(registry);
  await server.run();
}