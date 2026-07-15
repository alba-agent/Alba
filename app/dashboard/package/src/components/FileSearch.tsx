import { useState, useCallback } from "react";
import { Search, X, Loader2, FileText, FolderOpen } from "lucide-react";

interface SearchResult {
  path: string;
  line: number;
  content: string;
}

export default function FileSearch({ workspacePath, onOpen }: { workspacePath: string; onOpen: (path: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(workspacePath)}&search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { setResults([]); }
    setSearching(false);
  }, [workspacePath]);

  if (!active) {
    return (
      <button onClick={() => setActive(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-alba-muted hover:text-alba-accent hover:bg-alba-accent/10 transition-colors">
        <Search size={12} /> Search Files
      </button>
    );
  }

  return (
    <div className="border-b border-alba-border bg-alba-surface/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Search size={14} className="text-alba-muted shrink-0" />
        <input value={query} onChange={e => { setQuery(e.target.value); doSearch(e.target.value); }} placeholder="Search file names and contents..."
          className="flex-1 bg-transparent outline-none text-xs placeholder:text-alba-muted/50" autoFocus />
        {searching && <Loader2 size={12} className="text-alba-accent animate-spin shrink-0" />}
        <button onClick={() => { setActive(false); setQuery(""); setResults([]); }} className="text-alba-muted hover:text-white"><X size={14} /></button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
          {results.map((r, i) => (
            <button key={i} onClick={() => onOpen(r.path)} className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 text-left text-xs">
              <FileText size={10} className="text-alba-muted shrink-0" />
              <span className="text-alba-muted truncate flex-1">{r.path.split("/").pop()}</span>
              <span className="text-[10px] text-alba-muted/40">:{r.line}</span>
              <span className="text-[10px] text-alba-muted/50 truncate max-w-[200px]">{r.content}</span>
            </button>
          ))}
        </div>
      )}
      {results.length === 0 && query && !searching && <p className="text-[10px] text-alba-muted/50 mt-1">No results</p>}
    </div>
  );
}