import { useState, useEffect, Component, ReactNode } from "react";
import { Routes, Route, useLocation, Link, Navigate } from "react-router-dom";
import {
  Home, MessageSquare, Bot, Brain, Settings, FolderOpen, Zap, Shield,
  BarChart3, Calendar, Mic, Cpu, Palette, Terminal, ChevronRight, Rocket,
} from "lucide-react";
import { useAgent } from "./hooks/useAgent";
import type { ConnectionState } from "./hooks/useAgent";
import { ChatProvider } from "./hooks/useChatContext";
import { ToastProvider, ToastContainer } from "./components/Toast";
import CommandPalette from "./components/CommandPalette";
import QuickActions from "./components/QuickActions";
import TourOverlay from "./components/TourOverlay";
import ShortcutsReference from "./components/ShortcutsReference";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Agents from "./pages/Agents";
import Memory from "./pages/Memory";
import MemoryGraph from "./pages/MemoryGraph";
import SettingsPage from "./pages/Settings";
import Providers from "./pages/Providers";
import Files from "./pages/Files";
import Analytics from "./pages/Analytics";
import CalendarPage from "./pages/Calendar";
import MindMap from "./components/MindMap";
import TokenIntel from "./pages/TokenIntel";
import StrategyLab from "./pages/StrategyLab";
import Tools from "./pages/Tools";
import { GraphProvider } from "./hooks/useGraph";


// ── Error Boundary ──────────────────────────────────────────────────────────
interface EBProps { children: ReactNode; fallback?: ReactNode }
interface EBState { hasError: boolean; error: Error | null }
class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-alba-error/10 flex items-center justify-center mx-auto mb-4">
              <Shield size={24} className="text-alba-error" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-alba-muted mb-4">{this.state.error?.message}</p>
            <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-4 py-2 rounded-lg bg-alba-accent text-alba-bg text-sm font-medium">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Navigation Config ───────────────────────────────────────────────────────
const mainNav = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/chat", icon: MessageSquare, label: "Chat" },
  { path: "/agents", icon: Bot, label: "Agents" },
  { path: "/files", icon: FolderOpen, label: "Files" },
  { path: "/memory", icon: Brain, label: "Memory" },
  { path: "/mindmap", icon: Zap, label: "Mind Map" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/token-intel", icon: Rocket, label: "Token Intel" },
  { path: "/strategy", icon: BarChart3, label: "Strategy" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const settingsNav = [
  { path: "/settings", icon: Settings, label: "General" },
  { path: "/settings/ai", icon: Cpu, label: "AI Model" },
  { path: "/settings/voice", icon: Mic, label: "Voice" },
  { path: "/settings/appearance", icon: Palette, label: "Appearance" },
  { path: "/settings/advanced", icon: Terminal, label: "Advanced" },
  { path: "/providers", icon: Zap, label: "Providers" },
];

// ── Layout ──────────────────────────────────────────────────────────────────
function Layout({ children, connected, connectionState }: { children: ReactNode; connected: boolean; connectionState: ConnectionState }) {
  const location = useLocation();
  const isSettings = location.pathname.startsWith("/settings") || location.pathname === "/providers";
  const currentNav = isSettings ? settingsNav : mainNav;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [uptime, setUptime] = useState(0);

  // Session timer
  useEffect(() => {
    const iv = setInterval(() => {
      setUptime(u => u + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPaletteOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "/") { e.preventDefault(); setShortcutsOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-alba-bg overflow-hidden">
      {/* Main Nav Sidebar — always visible, icon-only */}
      <aside className="w-14 flex flex-col items-center py-3 gap-1 bg-alba-surface border-r border-alba-border shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-alba-accent/30 to-cyan-600/30 flex items-center justify-center mb-3 glow-accent overflow-hidden">
          <img src="/logos/alba-logo.png" alt="ALBA" className="w-full h-full object-cover" />
        </div>
        {mainNav.map((item) => {
          const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link key={item.path} to={item.path}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative ${
                active ? "bg-alba-accent/15 text-alba-accent" : "text-alba-muted hover:text-white hover:bg-white/5"
              }`}>
              <item.icon size={18} />
              <span className="absolute left-12 bg-alba-surface text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-alba-border pointer-events-none z-50">
                {item.label}
              </span>
            </Link>
          );
        })}
        <div className="flex-1" />
      {/* Connection indicator with session timer */}
        <div className="flex flex-col items-center gap-1.5 pb-2">
          <div className={`w-2 h-2 rounded-full ${
              connectionState === "connected" ? "bg-alba-success animate-pulse" :
              connectionState === "connecting" ? "bg-alba-warn animate-pulse-slow" :
              "bg-alba-error"
            }`}
            title={connectionState === "connected" ? "Connected" : connectionState === "connecting" ? "Connecting..." : "Disconnected"} />
          {connectionState === "connected" && uptime > 0 && (
            <span className="text-[8px] text-alba-muted/50">{Math.floor(uptime / 60)}m</span>
          )}
        </div>
      </aside>

      {/* Settings Sub-Nav — only when in settings area */}
      {isSettings && (
        <aside className="w-44 flex flex-col py-3 px-2 bg-alba-surface/50 border-r border-alba-border/50 shrink-0 overflow-y-auto">
          <div className="px-2 mb-3">
            <h3 className="text-xs font-semibold text-alba-muted uppercase tracking-wider">Settings</h3>
          </div>
          {currentNav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                  active
                    ? "bg-alba-accent/10 text-alba-accent"
                    : "text-alba-muted hover:text-white hover:bg-white/5"
                }`}>
                <item.icon size={16} />
                <span className="truncate">{item.label}</span>
                {active && <ChevronRight size={12} className="ml-auto" />}
              </Link>
            );
          })}
        </aside>
      )}

      {/* Main Content — wide */}
      {/* Quick Actions FAB */}
      <QuickActions />
      {/* Welcome Tour */}
      <TourOverlay />
      {/* Keyboard Shortcuts Reference */}
      <ShortcutsReference open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {/* Toast Container */}
      <ToastContainer />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

// ── App Root ────────────────────────────────────────────────────────────────
export default function App() {
  const { connected, connectionState } = useAgent();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => { setConfigured(data.configured); setLoading(false); })
      .catch(() => { setConfigured(false); setLoading(false); });
  }, []);

  // Apply theme from config
  useEffect(() => {
    if (!configured) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.theme) document.documentElement.setAttribute("data-theme", data.theme);
        if (data.accentColor) document.documentElement.style.setProperty("--color-alba-accent", data.accentColor);
      })
      .catch(() => {});
  }, [configured]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-alba-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-alba-accent/30 to-cyan-600/30 flex items-center justify-center glow-accent animate-pulse overflow-hidden">
            <img src="/logos/alba-logo.png" alt="ALBA" className="w-full h-full object-cover" />
          </div>
          <p className="text-sm text-alba-muted">Loading ALBA...</p>
        </div>
      </div>
    );
  }

  if (!configured) {
    return <Landing onComplete={() => setConfigured(true)} />;
  }

  return (
    <ToastProvider>
      <ChatProvider>
        <Layout connected={connected} connectionState={connectionState}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/files" element={<Files />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/memory" element={<Memory />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/mindmap" element={<MindMap />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/settings" element={<SettingsPage tab="general" />} />
              <Route path="/settings/ai" element={<SettingsPage tab="ai" />} />
              <Route path="/settings/voice" element={<SettingsPage tab="voice" />} />
              <Route path="/settings/appearance" element={<SettingsPage tab="appearance" />} />
              <Route path="/settings/advanced" element={<SettingsPage tab="advanced" />} />
              <Route path="/memory/graph" element={<MemoryGraph />} />
              <Route path="/strategy" element={<StrategyLab />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </Layout>
      </ChatProvider>
    </ToastProvider>
  );
}
