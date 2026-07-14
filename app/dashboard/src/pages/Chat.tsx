import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, Paperclip, Loader2, Wifi, WifiOff, AlertCircle, Mic, MicOff, Plus, FileText, X, Download, Clock, MessageSquare, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAgent } from "../hooks/useAgent";
import { useChatContext } from "../hooks/useChatContext";
import type { ChatMessage, SessionSummary } from "../hooks/useChatContext";
import { useVoice } from "../hooks/useVoice";
import AgentAvatar from "../components/agents/AgentAvatar";
import { BashTool, EditTool, SearchTool, PlanTool } from "../components/tools/ToolCards";
import ThinkingFace from "../components/ThinkingFace";
import SmartSuggestions from "../components/SmartSuggestions";
import { getProviderLogo } from "../components/ProviderIcon";

// ── Sanitize text — strip special characters / excessive formatting ─────────
function sanitizeText(text: string): string {
  if (!text) return text;
  // Remove excessive markdown formatting characters that look bad
  let cleaned = text
    // Replace triple backtick sections with just the content (but keep as plain text)
    .replace(/```[\s\S]*?```/g, (match) => {
      const inner = match.replace(/```\w*\n?/g, "").trim();
      return inner;
    })
    // Remove excessive bold/italic markers but keep the text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    // Remove headings markers
    .replace(/^#+\s*/gm, "")
    // Remove horizontal rules
    .replace(/^---+\s*$/gm, "")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n");
  return cleaned;
}

// ── SUGGESTIONS ────────────────────────────────────────────────────────────
const SUGGESTIONS = ["What can you do?", "Help me get started", "Tell me a joke"];

// ── Message bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const filePreview = (() => {
    if (msg.role !== "assistant") return null;
    const fileMatch = msg.content.match(/\`([^`]+?(?:\.(png|jpg|jpeg|gif|svg|md|txt|json|js|ts|tsx|jsx|css|html)))\`/i);
    if (!fileMatch) return null;
    const ext = fileMatch[2].toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) {
      return <div className="mt-2 rounded-lg overflow-hidden border border-alba-border"><img src={fileMatch[1]} alt="preview" className="max-w-full h-auto" /></div>;
    }
    return null;
  })();

  const renderContent = (text: string) => {
    const parts = text.split(/(```\w*\n[\s\S]*?```)/g);
    return parts.map((part, i) => {
      const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
      if (codeMatch) {
        const lang = codeMatch[1] || "plaintext";
        const code = codeMatch[2];
        return (
          <div key={i} className="relative group my-2">
            <div className="flex items-center justify-between px-3 py-1 bg-alba-bg/50 border border-alba-border rounded-t-lg text-[10px] text-alba-muted">
              <span>{lang}</span>
              <button onClick={() => navigator.clipboard.writeText(code)}
                className="px-2 py-0.5 rounded hover:bg-alba-accent/10 text-alba-muted hover:text-alba-accent transition-colors text-[10px]">
                Copy
              </button>
            </div>
            <pre className="bg-alba-bg border border-t-0 border-alba-border rounded-b-lg p-3 overflow-x-auto">
              <code className="text-[12px] font-mono leading-relaxed whitespace-pre">{code}</code>
            </pre>
          </div>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] bg-alba-accent/10 border border-alba-accent/20 rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  if (msg.role === "error") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] bg-alba-error/10 border border-alba-error/20 rounded-2xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-alba-error shrink-0 mt-0.5" />
          <p className="text-sm text-alba-error">{msg.content.replace(/^⚠️ /, "")}</p>
        </div>
      </div>
    );
  }

  if (msg.role === "tool") {
    const tn = msg.toolName || "";
    if (tn === "bash") return <BashTool command={msg.command || ""} output={msg.output} state={msg.toolState === "running" ? "running" : "idle"} />;
    if (tn === "read_file") {
      return (
        <div className="rounded-[10px] border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black overflow-hidden w-full mb-2">
          <div className="flex items-center justify-between px-2.5 h-7 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-xs text-neutral-500 truncate">Read {msg.filePath?.split("/").pop() || "file"}</span>
          </div>
          <pre className="text-[12px] font-mono leading-[1.5] p-3 bg-white dark:bg-black text-neutral-700 dark:text-neutral-300 max-h-40 overflow-y-auto whitespace-pre-wrap">{msg.content}</pre>
        </div>
      );
    }
    if (tn === "write_file" || tn === "edit" || tn === "write") {
      return <EditTool state={(msg.toolState === "running" || msg.toolState === "pending") ? "pending" : "completed"}
        variant={msg.oldContent ? "edit" : "write"}
        filePath={msg.filePath} oldContent={msg.oldContent} newContent={msg.newContent} />;
    }
    if (tn === "search" || tn === "grep") return <SearchTool state={msg.toolState === "searching" ? "searching" : "done"} query={msg.query || msg.content} results={msg.searchResults} />;
    if (tn === "plan") return <PlanTool state={msg.toolState === "pending" ? "pending" : "idle"} plan={{ id: msg.filePath, title: msg.planTitle || msg.content, summary: msg.planSummary }} />;
  }

  return (
    <div className="flex justify-start group">
      <div className="max-w-[80%]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-alba-accent to-cyan-600 flex items-center justify-center">
            <span className="text-[8px] font-bold text-alba-bg">M</span>
          </div>
          <span className="text-xs text-alba-muted">ALBA</span>
        </div>
        <div className="bg-alba-surface border border-alba-border rounded-2xl rounded-tl-md px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{renderContent(msg.content)}</p>
          {filePreview}
        </div>
      </div>
    </div>
  );
}

// ── Session Viewer ─────────────────────────────────────────────────────────
function SessionViewer({ sessions, activeSessionId, onSelect, onNew, onDelete }: {
  sessions: SessionSummary[]; activeSessionId: string;
  onSelect: (id: string) => void; onNew: () => void; onDelete: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`border-r border-alba-border bg-alba-surface/30 flex flex-col transition-all duration-200 ${collapsed ? "w-10" : "w-56"}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-alba-border shrink-0">
        {!collapsed && <h3 className="text-[10px] font-semibold text-alba-muted uppercase tracking-wider">Sessions</h3>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-white/5 text-alba-muted">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      {!collapsed && (
        <>
          <button onClick={onNew} className="flex items-center gap-2 mx-2 mt-2 px-3 py-2 rounded-lg text-xs bg-alba-accent/10 text-alba-accent hover:bg-alba-accent/20 transition-colors">
            <Plus size={12} /> New Session
          </button>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => (
              <div key={s.id} 
                className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  s.id === activeSessionId ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:text-white hover:bg-white/5"
                }`}
                onClick={() => onSelect(s.id)}>
                <MessageSquare size={12} className="shrink-0" />
                <span className="truncate flex-1">{s.title || "Untitled"}</span>
                <span className="text-[9px] text-alba-muted/40">{s.messageCount}</span>
                <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-alba-error">
                  <X size={10} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-[10px] text-alba-muted/50 text-center py-4">No saved sessions</div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

// ── Main Chat Page ────────────────────────────────────────────────────────
export default function Chat() {
  // ── Hooks ──────────────────────────────────────────────────────────────
  const { connected, connectionState, streamingText: wsStreamingText, isThinking: wsIsThinking, agents, toolResults, sendMessage, stopGeneration, clearHistory, reconnectCount, isSending, assistantMessages: wsAssistantMessages } = useAgent();
  const chatCtx = useChatContext();
  
  // ── Local state ────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [queueMode, setQueueMode] = useState<"queue" | "parallel">("queue");
  const [planMode, setPlanMode] = useState(false);
  const [messageQueue, setMessageQueue] = useState<Array<{ text: string; ts: number }>>([]);
  const generationStoppedRef = useRef(false);
  const lastStreamFlushRef = useRef(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentProvider, setCurrentProvider] = useState<{ name: string; model: string } | null>(null);

  // Streaming text — use local copy with force-flush
  const [localStreamingText, setLocalStreamingText] = useState("");
  const localStreamingRef = useRef("");

  // ── Fetch sessions on mount ────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/sessions")
      .then(r => r.json())
      .then(d => chatCtx.setSessions(d.sessions || []))
      .catch(() => {});
  }, []);

  // ── Fetch provider config ─────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(d => setCurrentProvider({ name: d.defaultProvider || "OpenRouter", model: d.model || "openrouter/owl-alpha" }))
      .catch(() => {});
  }, []);

  // ── Voice ──────────────────────────────────────────────────────────────
  const [handsFree, setHandsFree] = useState(false);
  const voice = useVoice({
    onTranscript: (text) => {
      // Queue voice messages same as text
      if (wsIsThinking || localStreamingRef.current) {
        setMessageQueue(prev => [...prev, { text, ts: Date.now() }]);
        chatCtx.setQueueLength(messageQueue.length + 1);
      } else {
        chatCtx.setUserMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content: text, ts: Date.now() }]);
        sendMessage(text);
      }
    },
    handsFree,
    wakeWord: "alba",
    silenceTimeout: 3000,
  });

  // ── Streaming flush fix ───────────────────────────────────────────────
  useEffect(() => {
    setLocalStreamingText(wsStreamingText);
    // Force flush every 2 seconds if streaming is active
    const iv = setInterval(() => {
      if (wsStreamingText && Date.now() - lastStreamFlushRef.current > 2000) {
        setLocalStreamingText(prev => prev + ""); // force re-render
        lastStreamFlushRef.current = Date.now();
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [wsStreamingText]);

  // ── Sync WS thinking state ────────────────────────────────────────────
  useEffect(() => {
    chatCtx.setIsThinking(wsIsThinking);
  }, [wsIsThinking]);

  // ── Sync assistant messages to chat context ───────────────────────────────
  const lastSyncedRef = useRef<string[]>([]);
  useEffect(() => {
    const currentIds = wsAssistantMessages.map(m => m.id);
    const lastIds = lastSyncedRef.current;
    // Only sync if new messages arrived
    if (currentIds.length > lastIds.length || !arraysEqual(currentIds, lastIds)) {
      chatCtx.setAssistantMessages(wsAssistantMessages.map(m => ({ id: m.id, content: m.content, ts: m.ts })));
      lastSyncedRef.current = currentIds;
    }
  }, [wsAssistantMessages]);

// Helper for array comparison
function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

  // ── Tool results → chat messages ──────────────────────────────────────
  useEffect(() => {
    if (toolResults.length === 0) return;
    const newTools: ChatMessage[] = toolResults.map((tr: any) => {
      const tn = tr.toolName || "";
      const base: ChatMessage = { id: tr.id || `tr-${Date.now()}-${Math.random()}`, role: "tool", content: tr.result || "", ts: tr.ts || Date.now(), toolName: tn, toolState: tr.toolState || "completed" };
      if (tn === "bash") { base.command = tr.args?.command || tr.command; base.output = tr.output; }
      else if (tn === "write_file" || tn === "read_file" || tn === "edit") { base.filePath = tr.args?.path || tr.filePath; base.newContent = tr.newContent; base.oldContent = tr.oldContent; }
      else if (tn === "grep" || tn === "search") { base.query = tr.args?.pattern || tr.query; base.searchResults = tr.searchResults; }
      else if (tn === "plan") { base.planTitle = tr.args?.title; base.planSummary = tr.args?.summary; }
      return base;
    });
    chatCtx.setToolMessages(newTools);
  }, [toolResults]);

  // ── Auto-scroll ───────────────────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatCtx.messages, localStreamingText, wsIsThinking]);

  // ── Auto-resize textarea ──────────────────────────────────────────────
  useEffect(() => { const ta = textareaRef.current; if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 128) + "px"; } }, [input]);

  const hasContent = chatCtx.messages.length > 0 || localStreamingText || wsIsThinking;

  // ── Send message with queue support ───────────────────────────────────
  const handleSend = useCallback((text?: string) => {
    const content = (text || input).trim();
    if (!content || !connected) return;
    
    // If agent is busy and queue mode is queue, enqueue
    if ((wsIsThinking || isSending) && queueMode === "queue") {
      setMessageQueue(prev => [...prev, { text: content, ts: Date.now() }]);
      chatCtx.setQueueLength(messageQueue.length + 1);
      setInput("");
      return;
    }
    
    generationStoppedRef.current = false;
    chatCtx.setUserMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content, ts: Date.now() }]);
    setInput("");
    
    if (planMode) {
      // Send with plan mode flag
      sendMessage(`[PLAN MODE] ${content}`);
    } else {
      sendMessage(content);
    }
  }, [input, connected, sendMessage, wsIsThinking, isSending, queueMode, planMode, messageQueue.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Stop generation ───────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    generationStoppedRef.current = true;
    stopGeneration();
    localStreamingRef.current = "";
    setLocalStreamingText("");
    chatCtx.setIsThinking(false);
    // Clear queue
    setMessageQueue([]);
    chatCtx.setQueueLength(0);
  }, [stopGeneration]);

  // ── Prevent turn_done from committing stopped text ────────────────────
  // This is handled by checking generationStoppedRef in the WS message processor
  // and by the server-side changes we made

  // ── Session management ─────────────────────────────────────────────────
  const handleSessionSelect = useCallback(async (id: string) => {
    // Load session from server
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) return;
      const session = await res.json();
      chatCtx.setSessionId(id);
      if (session.messages) {
        // Restore messages from session
        const restored: ChatMessage[] = session.messages.map((m: any, i: number) => ({
          id: `msg-${id}-${i}`,
          role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : m.role === "tool" ? "tool" : (m.content?.startsWith("⚠️") ? "error" : "assistant"),
          content: m.content || "",
          ts: Date.now() - (session.messages.length - i) * 1000,
          toolName: m.name,
          command: m.command,
          filePath: m.filePath,
        }));
        chatCtx.setUserMessages(restored.filter(m => m.role === "user"));
        chatCtx.setAssistantMessages(restored.filter(m => m.role === "assistant" || m.role === "error").map(m => ({ id: m.id, content: m.content, ts: m.ts })));
        chatCtx.setToolMessages(restored.filter(m => m.role === "tool"));
      }
    } catch { /* ignore */ }
  }, []);

  const handleNewSession = useCallback(() => {
    const id = `session-${Date.now()}`;
    chatCtx.setSessionId(id);
  }, []);

  const handleDeleteSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      chatCtx.setSessions(prev => prev.filter(s => s.id !== id));
      if (id === chatCtx.sessionId) handleNewSession();
    } catch { /* ignore */ }
  }, [chatCtx.sessionId]);

  // ── Export ────────────────────────────────────────────────────────────
  const exportChat = () => {
    const text = chatCtx.messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `alba-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Process queued messages ───────────────────────────────────────────
  useEffect(() => {
    if (!wsIsThinking && !isSending && messageQueue.length > 0 && !generationStoppedRef.current) {
      const next = messageQueue[0];
      setMessageQueue(prev => prev.slice(1));
      chatCtx.setQueueLength(messageQueue.length - 1);
      chatCtx.setUserMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content: next.text, ts: Date.now() }]);
      sendMessage(next.text);
    }
  }, [wsIsThinking, isSending, messageQueue.length]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full">
      {/* Session Viewer (replaces pin section) */}
      <SessionViewer 
        sessions={chatCtx.sessions}
        activeSessionId={chatCtx.sessionId}
        onSelect={handleSessionSelect}
        onNew={handleNewSession}
        onDelete={handleDeleteSession}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-alba-border px-4 flex items-center justify-between bg-alba-surface/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-medium shrink-0">Chat</h1>
            {currentProvider && (() => {
              const logo = getProviderLogo(currentProvider.name);
              return (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-alba-bg/50 border border-alba-border/30 min-w-0">
                  {logo ? <img src={logo} alt={currentProvider.name} className="w-4 h-4 object-contain" /> : <span className="text-[10px]">{currentProvider.name[0]}</span>}
                  <span className="text-[10px] text-alba-muted truncate max-w-[120px]">{currentProvider.model.split("/").pop()}</span>
                </div>
              );
            })()}
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              connectionState === "connected" ? "bg-alba-success/10 text-alba-success" :
              connectionState === "connecting" ? "bg-alba-warn/10 text-alba-warn" : "bg-alba-error/10 text-alba-error"
            }`}>
              {connectionState === "connected" ? "Connected" :
               connectionState === "connecting" ? `Connecting${reconnectCount > 0 ? ` (${reconnectCount})` : "..."}` : "Disconnected"}
            </span>
            {/* Queue indicator */}
            {messageQueue.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-alba-warn/10 text-alba-warn flex items-center gap-1">
                <Clock size={10} /> {messageQueue.length} queued
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasContent && (
              <>
                <button onClick={clearHistory} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-alba-muted hover:text-alba-accent hover:bg-alba-accent/10 transition-colors">
                  <Plus size={14} /> New
                </button>
                <button onClick={exportChat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-alba-muted hover:text-alba-accent hover:bg-alba-accent/10 transition-colors" title="Export conversation">
                  <Download size={14} /> Export
                </button>
              </>
            )}
            {voice.voiceSupported && (
              <button onClick={() => setHandsFree(!handsFree)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${handsFree ? "bg-alba-accent/20 text-alba-accent" : "text-alba-muted hover:text-white hover:bg-white/5"}`}
                title="Hands-free mode">
                {handsFree ? "Hands-Free" : "Push-to-Talk"}
              </button>
            )}
            <button onClick={voice.toggleMic}
              className={`p-2 rounded-lg transition-colors ${!voice.voiceSupported ? "opacity-40 cursor-not-allowed" : voice.listening ? "bg-alba-accent/20 text-alba-accent" : "text-alba-muted hover:text-white hover:bg-white/5"}`}
              title={!voice.voiceSupported ? "Voice not supported" : voice.listening ? "Stop listening" : "Start voice input"}>
              {voice.listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            {agents.filter(a => a.status === "working").map(agent => (
              <AgentAvatar key={agent.id} agent={agent} size="sm" />
            ))}
          </div>
        </header>

        {/* Voice indicator */}
        {voice.listening && (
          <div className="border-b border-alba-border px-4 py-2 bg-alba-accent/5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 h-8">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="w-0.5 rounded-full transition-all duration-150 bg-alba-accent"
                    style={{ height: `${8 + Math.random() * 24}px`, animationDelay: `${i * 30}ms` }} />
                ))}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-alba-accent">Listening{voice.voiceText ? "" : "..."}</p>
                {voice.voiceText && <p className="text-xs text-alba-muted truncate">{voice.voiceText}</p>}
              </div>
              <button onClick={voice.stopListening} className="p-1 rounded hover:bg-alba-accent/10"><X size={14} className="text-alba-muted" /></button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!hasContent && (
            <div className="flex flex-col items-center justify-center h-full text-center min-h-[300px]">
              <ThinkingFace state="idle" size="lg" />
              <h2 className="text-lg font-semibold mb-2 mt-4">Welcome to ALBA</h2>
              <p className="text-alba-muted text-sm max-w-md mb-2">Your personal AI assistant. Ask anything, and ALBA will help.</p>
              {voice.listening && <p className="text-xs text-alba-accent mb-4">🎤 Voice mode active — say "ALBA" followed by your command</p>}
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => handleSend(s)}
                    className="px-3 py-1.5 rounded-lg border border-alba-border text-xs text-alba-muted hover:text-alba-accent hover:border-alba-accent/30 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasContent && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {chatCtx.messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <MessageBubble msg={msg} />
                </motion.div>
              ))}

              {/* Streaming text */}
              {localStreamingText && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-alba-accent to-cyan-600 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-alba-bg">M</span>
                      </div>
                      <span className="text-xs text-alba-muted">ALBA</span>
                    </div>
                    <div className="bg-alba-surface border border-alba-border rounded-2xl rounded-tl-md px-4 py-3">
                      <p className="text-sm whitespace-pre-wrap">{localStreamingText}</p>
                      <span className="inline-block w-1.5 h-4 bg-alba-accent animate-pulse mt-1" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Thinking face */}
              {wsIsThinking && !localStreamingText && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3 bg-alba-surface border border-alba-border rounded-2xl rounded-tl-md px-4 py-3">
                    <ThinkingFace state="thinking" size="sm" />
                    <span className="text-sm text-alba-muted shimmer-text">ALBA is thinking</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-alba-border px-4 py-3 bg-alba-surface/30">
          <div className="max-w-3xl mx-auto relative">
            <SmartSuggestions input={input} onSelect={(text) => { setInput(text); }} active={input.length > 0 && input.length < 20} />
            <div className="flex items-end gap-2 bg-alba-surface border border-alba-border rounded-2xl px-3 py-2 focus-within:border-alba-accent/50 transition-colors">
              {/* Mode selector */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => setPlanMode(false)} 
                  className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${!planMode ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:text-white"}`}>
                  ⚡
                </button>
                <button onClick={() => setPlanMode(true)}
                  className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${planMode ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:text-white"}`}>
                  📋
                </button>
              </div>
              
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={connected ? (planMode ? "Describe a complex task to plan..." : "Message ALBA...") : "Waiting for connection..."}
                rows={1} className="flex-1 bg-transparent outline-none text-sm resize-none placeholder:text-alba-muted/50 min-h-[24px] max-h-32" disabled={!connected} />
              
              <button onClick={voice.toggleMic}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${voice.listening ? "bg-alba-accent/20 text-alba-accent" : "text-alba-muted hover:text-white hover:bg-white/5"}`}>
                {voice.listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              
              {/* Queue mode toggle */}
              <div className="flex items-center gap-1 shrink-0 mr-1">
                <span className="text-[10px] text-alba-muted">{queueMode === "queue" ? "Queue" : "Parallel"}</span>
                <button onClick={() => setQueueMode(queueMode === "queue" ? "parallel" : "queue")}
                  className={`w-8 h-4 rounded-full relative transition-colors ${queueMode === "queue" ? "bg-alba-accent" : "bg-alba-border"}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${queueMode === "queue" ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
              
              {(wsIsThinking || localStreamingText) ? (
                <button onClick={handleStop} className="p-1.5 rounded-lg bg-alba-error/10 text-alba-error hover:bg-alba-error/20 transition-colors shrink-0">
                  <Square size={14} />
                </button>
              ) : (
                <button onClick={() => handleSend()} disabled={!input.trim() || !connected}
                  className="p-1.5 rounded-lg bg-alba-accent/10 text-alba-accent hover:bg-alba-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                  <Send size={14} />
                </button>
              )}
            </div>
            {!connected && <p className="text-xs text-alba-error mt-1 text-center"><Loader2 size={10} className="inline animate-spin mr-1" />Connecting...</p>}
            {planMode && <p className="text-xs text-alba-muted mt-1 text-center">📋 Plan mode — ALBA will first create a plan for complex tasks</p>}
          </div>
        </div>
      </div>
    </div>
  );
}