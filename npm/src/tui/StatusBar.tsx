/**
 * StatusBar — single line at the top of the TUI showing live agent state.
 */

import React from "react";
import { Box, Text } from "ink";
import { ALBA_COLORS } from "./theme.js";

export interface StatusBarProps {
  model:        string;
  chain:        string;
  effectLevel:  string;
  toolRunning:  string | null;
  connected:    boolean;
  statusLine?:  string | null;
}

export function StatusBar({
  model, chain, effectLevel, toolRunning, connected, statusLine,
}: StatusBarProps) {
  const chainShort = chain.slice(0, 8);
  const modelShort = model.split("/").pop()?.slice(0, 18) ?? model.slice(0, 18);
  const effectIcon = ({ eco: "🌿", normal: "⚡", turbo: "🚀", max: "🌊" } as Record<string, string>)[effectLevel] ?? "⚡";

  return (
    <Box flexDirection="column" width="100%">
      <Text color={ALBA_COLORS.dim}>{"".padEnd(80, "─")}</Text>
      <Box paddingX={1} flexDirection="row" justifyContent="space-between">
        <Box gap={2}>
          <Text color={ALBA_COLORS.accent} bold>ALBA</Text>
          <Text color={ALBA_COLORS.muted}>{modelShort}</Text>
        </Box>

        <Box>
          {toolRunning
            ? <Text color={ALBA_COLORS.warn}>⚙ {toolRunning}</Text>
            : statusLine
              ? <Text color={ALBA_COLORS.muted}>{statusLine.slice(0, 80)}</Text>
              : <Text color={ALBA_COLORS.muted}>{connected ? "ready" : "connecting…"}</Text>
          }
        </Box>

        <Box gap={2}>
          <Text color={ALBA_COLORS.muted}>{chainShort}</Text>
          <Text color={ALBA_COLORS.header}>{effectIcon} {effectLevel}</Text>
        </Box>
      </Box>
    </Box>
  );
}
