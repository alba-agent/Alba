import { useState, useEffect, useRef, useCallback, createContext, useContext, ReactNode } from "react";

// ── Types ───────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "error";
  content: string;
  ts: number;
  toolName?: string;
  toolData?: unknown;
  toolState?: string;
  command?: string;
  output?: string;
  filePath?: string;
  oldContent?: string;
  newContent?: string;
  planTitle?: string;
  planSummary?: string;
  query?: string;
  searchResults?: unknown[];
}

export interface SessionSummary {
  id: string;
  title: string;
  lastActive: number;
  messageCount: number;
}

// ── Context ───────────────────────────────────────────────────────────────────
interface ChatContextType {
  // Tab-based state
  tabs: Array<{ id: string; name: string }>;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  addTab: (name?: string) => string;
  setTabs: (tabs: Array<{ id: string; name: string }>) => void;

  // Legacy single-session state (used by Chat.tsx)
  sessionId: string;
  userMessages: ChatMessage[];
  assistantMessages: Array<{ id: string; content: string; ts: number }>;
  toolMessages: ChatMessage[];
  streamingText: string;
  isThinking: boolean;
  messages: ChatMessage[];
  sessions: SessionSummary[];
  queueLength: number;

  // Setters
  setSessionId: (id: string) => void;
  setUserMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setAssistantMessages: (msgs: Array<{ id: string; content: string; ts: number }> | ((prev: Array<{ id: string; content: string; ts: number }>) => Array<{ id: string; content: string; ts: number }>)) => void;
  setToolMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setStreamingText: (text: string) => void;
  setIsThinking: (v: boolean) => void;
  setSessions: (sessions: SessionSummary[] | ((prev: SessionSummary[]) => SessionSummary[])) => void;
  setQueueLength: (n: number) => void;
}

const ChatCtx = createContext<ChatContextType | null>(null);

// ── Storage ───────────────────────────────────────────────────────────────────
const SESSION_KEY = "alba_active_session";
const TABS_KEY = "alba_chat_tabs";

function loadSessionId(): string {
  try {
    return localStorage.getItem(SESSION_KEY) || `session-${Date.now()}`;
  } catch {
    return `session-${Date.now()}`;
  }
}

function storeSessionId(id: string) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch { /* */ }
}

// ── Provider ────────────────────────────────────────────────────────────────
export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState(loadSessionId);
  const [userMessages, setUserMessages] = useState<ChatMessage[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ id: string; content: string; ts: number }>>([]);
  const [toolMessages, setToolMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [queueLength, setQueueLength] = useState(0);

  // Tab state (for future multi-tab feature)
  const [tabs, setTabs] = useState<Array<{ id: string; name: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem(TABS_KEY) ?? "[]") || [{ id: sessionId, name: "Chat" }];
    } catch {
      return [{ id: sessionId, name: "Chat" }];
    }
  });
  const [activeTabId, setActiveTabIdState] = useState(sessionId);

  useEffect(() => {
    try {
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    } catch { /* */ }
  }, [tabs]);

  const addTab = useCallback((name?: string) => {
    const id = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id, name: name ?? `Chat ${prev.length + 1}` }]);
    setActiveTabIdState(id);
    return id;
  }, []);

  const setActiveTabId = useCallback((id: string) => {
    setActiveTabIdState(id);
  }, []);

  const setSessionId = useCallback((id: string) => {
    storeSessionId(id);
    setSessionIdState(id);
    setUserMessages([]);
    setAssistantMessages([]);
    setToolMessages([]);
  }, []);

  // Merge all messages
  const messages: ChatMessage[] = [
    ...userMessages,
    ...assistantMessages.map(m => ({ id: m.id, role: (m.content.startsWith("⚠️") ? "error" : "assistant") as "error" | "assistant" | "user" | "tool", content: m.content, ts: m.ts })),
    ...toolMessages,
  ].sort((a, b) => a.ts - b.ts);

  const value: ChatContextType = {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    setTabs,
    sessionId,
    setSessionId,
    userMessages,
    setUserMessages,
    assistantMessages,
    setAssistantMessages,
    toolMessages,
    setToolMessages,
    streamingText: "",
    setStreamingText: () => {},
    isThinking,
    setIsThinking,
    messages,
    sessions,
    setSessions,
    queueLength,
    setQueueLength,
  };

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}