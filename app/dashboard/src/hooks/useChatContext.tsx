import { useState, useEffect, useRef, useCallback, createContext, useContext, ReactNode } from "react";

// ── Types ───────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string; role: "user" | "assistant" | "tool" | "error"; content: string; ts: number;
  toolName?: string; toolData?: any; toolState?: string;
  command?: string; output?: string; filePath?: string; oldContent?: string; newContent?: string;
  planTitle?: string; planSummary?: string; query?: string; searchResults?: any[];
}

export interface SessionSummary {
  id: string; title: string; lastActive: number; messageCount: number;
}

interface ChatState {
  sessionId: string;
  userMessages: ChatMessage[];
  assistantMessages: Array<{ id: string; content: string; ts: number }>;
  toolMessages: ChatMessage[];
  streamingText: string;
  isThinking: boolean;
  messages: ChatMessage[];
  sessions: SessionSummary[];
  queueLength: number;
}

interface ChatContextType extends ChatState {
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

// ── SESSION ID ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "alba_active_session";
function getStoredSessionId(): string {
  try { return localStorage.getItem(STORAGE_KEY) || `session-${Date.now()}`; } catch { return `session-${Date.now()}`; }
}
function storeSessionId(id: string) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* */ }
}

// ── Provider ────────────────────────────────────────────────────────────────
export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState(getStoredSessionId);
  const [userMessages, setUserMessages] = useState<ChatMessage[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ id: string; content: string; ts: number }>>([]);
  const [toolMessages, setToolMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [queueLength, setQueueLength] = useState(0);

  const setSessionId = useCallback((id: string) => {
    storeSessionId(id);
    setSessionIdState(id);
    // Reset messages when switching sessions
    setUserMessages([]);
    setAssistantMessages([]);
    setToolMessages([]);
    setStreamingText("");
    setIsThinking(false);
  }, []);

  // Merge all messages
  const messages: ChatMessage[] = [
    ...userMessages,
    ...assistantMessages.map(m => ({ id: m.id, role: (m.content.startsWith("⚠️") ? "error" : "assistant") as "error" | "assistant" | "user" | "tool", content: m.content, ts: m.ts })),
    ...toolMessages,
  ].sort((a, b) => a.ts - b.ts);

  const value: ChatContextType = {
    sessionId, setSessionId,
    userMessages, setUserMessages,
    assistantMessages, setAssistantMessages,
    toolMessages, setToolMessages,
    streamingText, setStreamingText,
    isThinking, setIsThinking,
    messages,
    sessions, setSessions,
    queueLength, setQueueLength,
  };

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}