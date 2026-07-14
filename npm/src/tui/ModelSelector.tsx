/**
 * ModelSelector — interactive model picker overlay for ALBA.
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { ALBA_COLORS, T } from "./theme.js";
import { modelRegistry } from "../models/ModelRegistry.js";

export interface ModelSelectorProps {
  currentModelId: string;
  onSelect(modelId: string): void;
  onCancel():                void;
  initialQuery?:            string;
}

const STATIC_FALLBACK = [
  { id: "anthropic/claude-sonnet-4-5", provider: "Anthropic" },
  { id: "openai/gpt-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", provider: "OpenAI" },
  { id: "google/gemini-flash-1.5", provider: "Google" },
  { id: "meta-llama/llama-3-8b-instruct:free", provider: "Meta" },
  { id: "deepseek/deepseek-chat", provider: "DeepSeek" },
];

function getAvailableModels(): Array<{ id: string; provider: string }> {
  try {
    const registryModels = modelRegistry.search("");
    if (registryModels && registryModels.length > 0) {
      return registryModels.map(m => ({
        id: m.model.id,
        provider: m.tier.charAt(0).toUpperCase() + m.tier.slice(1),
      }));
    }
  } catch { /* fall through to static */ }
  return STATIC_FALLBACK;
}

export function ModelSelector({
  currentModelId,
  onSelect,
  onCancel,
  initialQuery = "",
}: ModelSelectorProps) {
  const [query, setQuery]                   = useState(initialQuery);
  const [selectedIndex, setSelectedIndex]   = useState(0);
  const availableModels                     = useMemo(() => getAvailableModels(), []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return availableModels;
    return availableModels.filter(m => `${m.id} ${m.provider}`.toLowerCase().includes(q));
  }, [query, availableModels]);

  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    const idx = availableModels.findIndex(m => m.id === currentModelId);
    if (idx >= 0) setSelectedIndex(idx);
  }, [currentModelId]);

  const handleSubmit = useCallback(() => {
    const selected = filtered[selectedIndex];
    if (selected) onSelect(selected.id);
  }, [filtered, selectedIndex, onSelect]);

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }
    if (key.return) { handleSubmit(); return; }
    if (key.upArrow) {
      setSelectedIndex(prev => (prev <= 0 ? filtered.length - 1 : prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev >= filtered.length - 1 ? 0 : prev + 1));
      return;
    }
    if (key.backspace || key.delete) {
      setQuery(prev => prev.slice(0, -1));
      return;
    }
    if (!key.ctrl && !key.meta && input) {
      setQuery(prev => prev + input);
      return;
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      <Box borderStyle="round" borderColor={ALBA_COLORS.accent} marginY={1} paddingX={1}>
        <Text color={ALBA_COLORS.accent} bold>Select Model</Text>
      </Box>

      <Box paddingX={2}>
        <Text color={ALBA_COLORS.muted}>  Search: </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          placeholder="type to filter..."
        />
      </Box>

      <Box paddingX={1}>
        <Text color={ALBA_COLORS.dim}>  Up/Down navigate · Enter select · Esc cancel</Text>
      </Box>

      <Box flexDirection="column" paddingX={2} marginTop={1}>
        {filtered.length === 0 ? (
          <Text color={ALBA_COLORS.warn}>  No models match "{query}"</Text>
        ) : (
          filtered.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const isCurrent  = item.id === currentModelId;
            const checkMark  = isCurrent ? T.success(" (current)") : "";

            return (
              <Text key={item.id} color={isSelected ? ALBA_COLORS.accent : undefined}>
                <Text color={ALBA_COLORS.accent}>{isSelected ? ">" : " "}</Text>{" "}
                <Text color={isSelected ? ALBA_COLORS.accent : ALBA_COLORS.header} bold={isSelected}>
                  {item.id}
                </Text>
                <Text color={ALBA_COLORS.muted}> [{item.provider}]</Text>
                {checkMark}
              </Text>
            );
          })
        )}
      </Box>
    </Box>
  );
}
