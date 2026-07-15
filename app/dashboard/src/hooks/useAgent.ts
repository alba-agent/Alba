import { useState, useEffect, useRef, useCallback } from "react";

// ── Persistent Session ID ───────────────────────────────────────────────────
const SESSION_ID = (() => {
  try {
    let id = localStorage.getItem("alba_session_id");
    if (!id) { id = "alba-" + Math.random().toString(36).slice(2, 10); localStorage.setItem("alba_session_id", id); }
    return id;
  } catch { return "alba-" + Math.random().toString(36).slice(2, 10); }
})();

// ── Types ───────────────────────────────────────────────────────────────────
export interface WSMessage { type: string; agentId?: string; role?: string; status?: string; task?: string; text?: string; toolName?: string; result?: string; message?: string; [key: string]: unknown; }
export interface Agent { id: string; role: string; status: "idle" | "working" | "done" | "error"; task: string; progress?: number; elapsed?: string; }
export type ConnectionState = "connecting" | "connected" | "disconnected";

// ── Singleton WebSocket Manager ─────────────────────────────────────────────
let _ws: WebSocket | null = null;
let _listeners: Array<(msg: WSMessage) => void> = [];
let _statusListeners: Array<(connected: boolean) => void> = [];
let _reconnectCount = 0;
let _url = "";

function getWS(url: string): WebSocket {
  _url = url;
  if (!_ws || _ws.readyState === WebSocket.CLOSED || _ws.readyState === WebSocket.CLOSING) {
    _ws = new WebSocket(url);
    _ws.onopen = () => { _reconnectCount = 0; _statusListeners.forEach(fn => fn(true)); };
    _ws.onmessage = (e) => { try { const msg = JSON.parse(e.data); _listeners.forEach(fn => fn(msg)); } catch { /* ignore */ } };
    _ws.onclose = () => { _statusListeners.forEach(fn => fn(false)); scheduleReconnect(); };
    _ws.onerror = () => { try { _ws?.close(); } catch { /* ignore */ } };
  }
  return _ws;
}

function scheduleReconnect() {
  if (_reconnectCount >= 10) return;
  _reconnectCount++;
  setTimeout(() => { if (_url) getWS(_url); }, Math.min(1000 * _reconnectCount, 10000));
}

function wsSend(data: unknown) {
  if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify(data));
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useAgent() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const streamingTextRef = useRef("");
  const [isThinking, setIsThinking] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memories, setMemories] = useState<Array<{ id: string; content: string; type: string; ts: number }>>([]);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ id: string; content: string; ts: number }>>([]);
  const [toolResults, setToolResults] = useState<Array<any>>([]);
  const [reconnectCount, setReconnectCount] = useState(0);
  const lastProcessedCount = useRef(0);

  // Subscribe to singleton WebSocket
  useEffect(() => {
    const wsUrl = `/ws`;
    const handleMsg = (msg: WSMessage) => setMessages(prev => [...prev.slice(-200), msg]);
    const handleStatus = (c: boolean) => {
      setConnected(c);
      setConnectionState(c ? "connected" : (c === false && _reconnectCount > 0 ? "disconnected" : "connecting"));
      setReconnectCount(_reconnectCount);
    };
    _listeners.push(handleMsg);
    _statusListeners.push(handleStatus);

    const ws = getWS(wsUrl);
    if (ws.readyState === WebSocket.OPEN) {
      setConnected(true);
      setConnectionState("connected");
    } else if (ws.readyState === WebSocket.CONNECTING) {
      setConnectionState("connecting");
    } else {
      setConnectionState("disconnected");
    }

    return () => {
      _listeners = _listeners.filter(l => l !== handleMsg);
      _statusListeners = _statusListeners.filter(l => l !== handleStatus);
    };
  }, []);

  // Process new messages with stable dedup
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);

  // Same as isThinking but for tracking if a message is in-flight
  
  useEffect(() => {
    if (messages.length === 0) return;
    const newMessages = messages.slice(lastProcessedCount.current);
    lastProcessedCount.current = messages.length;
    for (const msg of newMessages) {
      switch (msg.type) {
        case "text_delta":
          streamingTextRef.current += (msg.text || "");
          setStreamingText(streamingTextRef.current);
          break;
        case "thinking":
          setIsThinking(true);
          streamingTextRef.current = "";
          setStreamingText("");
          break;
        case "turn_done":
          isSendingRef.current = false;
          setIsSending(false);
          setIsThinking(false);
          if (msg.stopped) {
            streamingTextRef.current = "";
            setStreamingText("");
          } else if (streamingTextRef.current.trim()) {
            const content = streamingTextRef.current;
            // Add to assistant messages FIRST (before clearing)
            setAssistantMessages(prev => [...prev, { id: `a-${Date.now()}-${Math.random()}`, content, ts: Date.now() }]);
            // Clear AFTER state update to ensure persistence
            setTimeout(() => {
              streamingTextRef.current = "";
              setStreamingText("");
            }, 100);
          } else { setStreamingText(""); }
          break;
        case "error":
          isSendingRef.current = false;
          setIsSending(false);
          setIsThinking(false);
          streamingTextRef.current = "";
          setStreamingText("");
          if (msg.message) setAssistantMessages(prev => [...prev, { id: `e-${Date.now()}`, content: `⚠️ ${msg.message}`, ts: Date.now() }]);
          break;
        case "tool_started":
          setToolResults(prev => [...prev.slice(-50), {
            id: `tr-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            type: "tool_started",
            toolName: msg.toolName,
            args: msg.args,
            toolState: "running",
            ts: Date.now()
          }]);
          break;
        case "tool_result":
          setToolResults(prev => {
            const idx = [...prev].reverse().findIndex((t: any) => t.toolName === msg.toolName && t.toolState === "running");
            if (idx >= 0) {
              const realIdx = prev.length - 1 - idx;
              const copy = [...prev];
              copy[realIdx] = { ...copy[realIdx], ...msg, toolState: "completed" };
              return copy;
            }
            return [...prev.slice(-50), { ...msg, id: `tr-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, toolState: "completed", ts: Date.now() }];
          });
          break;
        case "history_cleared":
          setAssistantMessages([]);
          streamingTextRef.current = "";
          setStreamingText("");
          break;
        case "message_queued":
          break;
        case "session_loaded":
          break;
        case "agent_update": {
          const id = String(msg.agentId || `agent-${Date.now()}`);
          setAgents(prev => {
            const agent: Agent = { id, role: String(msg.role || "worker"), status: (msg.status as Agent["status"]) || "idle", task: String(msg.task || "") };
            const idx = prev.findIndex(a => a.id === id);
            if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], ...agent }; return copy; }
            return [...prev, agent];
          });
          break;
        }
        case "memory_update":
          break;
      }
    }
  }, [messages]);

  const sendMessage = useCallback((text: string) => {
    if (isSendingRef.current) return; // Already sending, prevent double-send
    isSendingRef.current = true;
    setIsSending(true);
    streamingTextRef.current = ""; setStreamingText(""); setIsThinking(false);
    wsSend({ type: "user_message", content: text, sessionId: SESSION_ID });
  }, []);

  const stopGeneration = useCallback(() => {
    isSendingRef.current = false;
    setIsSending(false);
    wsSend({ type: "stop", sessionId: SESSION_ID });
    streamingTextRef.current = ""; setStreamingText(""); setIsThinking(false);
  }, []);

  const clearHistory = useCallback(() => {
    isSendingRef.current = false;
    setIsSending(false);
    setAssistantMessages([]); streamingTextRef.current = ""; setStreamingText(""); setIsThinking(false);
    wsSend({ type: "clear_history", sessionId: SESSION_ID });
  }, []);

  return { connected, connectionState, streamingText, isThinking, agents, memories, assistantMessages, toolResults, sendMessage, stopGeneration, clearHistory, reconnectCount, isSending };
}
