import { useState, useRef, useEffect } from "react";

interface Suggestion {
  text: string;
  description: string;
  category: string;
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  file: [
    { text: "list all files in the workspace", description: "Browse workspace files", category: "Files" },
    { text: "read the current config", description: "View config.json", category: "Files" },
    { text: "create a new file called ", description: "Create a file", category: "Files" },
  ],
  code: [
    { text: "search for ", description: "Search across files", category: "Code" },
    { text: "build the project", description: "Run the build command", category: "Code" },
    { text: "run tests", description: "Execute test suite", category: "Code" },
  ],
  system: [
    { text: "check system status", description: "View server health", category: "System" },
    { text: "show me the analytics", description: "Open analytics page", category: "System" },
    { text: "clear my history", description: "Reset conversation", category: "System" },
  ],
  chat: [
    { text: "what can you do?", description: "Learn about ALBA's capabilities", category: "Chat" },
    { text: "tell me a joke", description: "Lighten the mood", category: "Chat" },
    { text: "help me get started", description: "Beginner onboarding", category: "Chat" },
  ],
};

function matchSuggestions(input: string): Suggestion[] {
  const lower = input.toLowerCase();
  if (!lower) return [];
  
  const all: Suggestion[] = [];
  // If input mentions files or workspace, prioritize file suggestions
  if (lower.includes("file") || lower.includes("folder") || lower.includes("workspace")) {
    all.push(...SUGGESTIONS.file);
  }
  if (lower.includes("build") || lower.includes("run") || lower.includes("test") || lower.includes("search")) {
    all.push(...SUGGESTIONS.code);
  }
  if (lower.includes("status") || lower.includes("health") || lower.includes("analytics") || lower.includes("clear")) {
    all.push(...SUGGESTIONS.system);
  }
  // Always include chat suggestions as fallback
  if (all.length < 2) all.push(...SUGGESTIONS.chat);
  
  return all.slice(0, 4);
}

export default function SmartSuggestions({ input, onSelect, active }: { input: string; onSelect: (text: string) => void; active: boolean }) {
  const suggestions = matchSuggestions(input);
  const [selected, setSelected] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSelected(0); }, [input]);

  if (!active || suggestions.length === 0) return null;

  return (
    <div ref={ref} className="absolute bottom-full left-0 right-0 mb-1 mx-3 z-50">
      <div className="glass rounded-xl border border-alba-border shadow-lg overflow-hidden">
        <div className="px-3 py-1.5 border-b border-alba-border/50">
          <span className="text-[10px] text-alba-muted font-medium uppercase tracking-wider">Suggestions</span>
        </div>
        {suggestions.map((s, i) => (
          <button
            key={s.text}
            onClick={() => onSelect(s.text)}
            onMouseEnter={() => setSelected(i)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              i === selected ? "bg-alba-accent/10" : "hover:bg-white/5"
            }`}
          >
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-alba-accent/10 text-alba-accent font-medium shrink-0">{s.category}</span>
            <span className="text-sm text-alba-muted truncate flex-1">{s.text}</span>
            <span className="text-[10px] text-alba-muted/50">Tab</span>
          </button>
        ))}
      </div>
    </div>
  );
}