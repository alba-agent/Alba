import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Brain, Clock, Tag, Sparkles, Trash2, Loader2, RefreshCw, Filter } from "lucide-react";

interface MemoryEntry {
  id: string;
  content: string;
  type: string;
  ts: number;
  ttl?: number | null;
}

export default function Memory() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMemories = useCallback(async (query?: string, type?: string) => {
    setLoading(true);
    try {
      let url = "/api/memory";
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (type) params.set("type", type);
      const qs = params.toString();
      if (qs) url += "?" + qs;
      
      const res = await fetch(url);
      const data = await res.json();
      setMemories(data.memories || []);
      setTotal(data.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMemories(search || undefined, typeFilter || undefined);
  }, [search, typeFilter, fetchMemories]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const deleteMemory = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/memory/${id}`, { method: "DELETE" });
      setMemories(prev => prev.filter(m => m.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const uniqueTypes = [...new Set(memories.map(m => m.type))];
  
  const stats = {
    totalEntries: total,
    oldest: memories.length > 0 ? Math.min(...memories.map(m => m.ts)) : null,
    newest: memories.length > 0 ? Math.max(...memories.map(m => m.ts)) : null,
    types: uniqueTypes.length,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Memory</h1>
            <p className="text-sm text-alba-muted">Persistent context across sessions</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-alba-muted">
            <Brain size={14} />
            <span>{total} entries</span>
            <span className="w-px h-4 bg-alba-border" />
            <span>{uniqueTypes.length} types</span>
            <button onClick={() => { fetchMemories(search || undefined, typeFilter || undefined); }}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-alba-muted" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search memories..."
              className="w-full bg-alba-surface border border-alba-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-alba-accent/50 transition-colors placeholder:text-alba-muted/50" />
          </div>
          {uniqueTypes.length > 0 && (
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-alba-muted pointer-events-none" />
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="bg-alba-surface border border-alba-border rounded-xl pl-9 pr-8 py-3 text-sm focus:outline-none focus:border-alba-accent/50 appearance-none cursor-pointer">
                <option value="">All types</option>
                {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        {memories.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-xs text-alba-muted">Total Entries</p>
              <p className="text-xl font-semibold">{stats.totalEntries}</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-xs text-alba-muted">Oldest</p>
              <p className="text-sm font-medium">{stats.oldest ? new Date(stats.oldest).toLocaleDateString() : "-"}</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-xs text-alba-muted">Newest</p>
              <p className="text-sm font-medium">{stats.newest ? new Date(stats.newest).toLocaleDateString() : "-"}</p>
            </div>
          </div>
        )}

        {/* Memory List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-alba-accent animate-spin" />
          </div>
        ) : memories.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-alba-accent/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-alba-accent" size={28} />
            </div>
            <h3 className="text-lg font-medium mb-2">{search ? "No matches" : "No memories yet"}</h3>
            <p className="text-sm text-alba-muted max-w-md mx-auto">
              {search ? `Try a different search term for "${search}"` : "As you chat with ALBA, it remembers important context. Search and browse them here."}
            </p>
            {search && (
              <button onClick={() => { setSearchInput(""); setSearch(""); }} 
                className="mt-4 text-xs text-alba-accent hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {memories.map((mem, i) => (
              <motion.div key={mem.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="glass rounded-xl p-4 hover:border-alba-accent/20 transition-colors group relative">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-alba-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Tag size={14} className="text-alba-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono bg-alba-bg/30 rounded-lg p-3 text-xs">
                      {mem.content.length > 500 ? mem.content.slice(0, 500) + "..." : mem.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-alba-muted flex items-center gap-1">
                        <Clock size={10} />{mem.ts ? new Date(mem.ts).toLocaleString() : "Just now"}
                      </span>
                      {mem.type && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-alba-accent/10 text-alba-accent capitalize">
                          {mem.type}
                        </span>
                      )}
                      {mem.ttl && (
                        <span className="text-xs text-alba-muted/50">
                          Expires: {new Date(mem.ttl).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteMemory(mem.id)}
                    disabled={deleting === mem.id}
                    className="p-1.5 rounded-lg text-alba-muted hover:text-alba-error hover:bg-alba-error/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                    {deleting === mem.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}