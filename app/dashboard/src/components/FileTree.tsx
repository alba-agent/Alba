import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, FolderOpen, File, FileText, FileCode, ChevronRight, Trash2, Plus, RefreshCw, ArrowLeft, X, Loader2 } from "lucide-react";

interface FileEntry { name: string; path: string; isDirectory: boolean; size?: number; modified?: string; children?: FileEntry[] }

function getFileIcon(name: string) {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const map: Record<string, { color: string }> = {
    ".ts": { color: "text-blue-400" }, ".tsx": { color: "text-blue-500" },
    ".js": { color: "text-yellow-400" }, ".jsx": { color: "text-yellow-500" },
    ".py": { color: "text-green-400" }, ".go": { color: "text-cyan-400" },
    ".rs": { color: "text-orange-400" }, ".json": { color: "text-yellow-300" },
    ".css": { color: "text-purple-400" }, ".html": { color: "text-orange-500" },
    ".md": { color: "text-alba-muted" }, ".env": { color: "text-alba-warn" },
    ".sh": { color: "text-green-400" },
  };
  return map[ext] || { color: "text-alba-muted" };
}

function TreeNode({ node, depth = 0, onSelect, onDelete, highlightedPaths }: {
  node: FileEntry;
  depth?: number;
  onSelect: (path: string, isDir: boolean) => void;
  onDelete: (path: string) => void;
  highlightedPaths?: Set<string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isDir = node.isDirectory;
  const icon = getFileIcon(node.name);
  const isHighlighted = highlightedPaths?.has(node.path);

  return (
    <div>
      <div
        className={`group relative flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-all duration-200 ${
          isHighlighted ? "bg-alba-accent/10 border-l-2 border-alba-accent" : isHovered ? "bg-white/5" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => { if (isDir) setIsOpen(!isOpen); onSelect(node.path, isDir); }}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      >
        {/* Indentation guide */}
        {depth > 0 && <div className="absolute left-[${depth * 16 + 4}px] top-0 bottom-0 w-px bg-alba-border/30 pointer-events-none" />}

        {/* Chevron / spacing */}
        <div className={`w-3.5 flex items-center justify-center transition-transform duration-200 ${isDir && isOpen ? "rotate-90" : ""}`}>
          {isDir ? <ChevronRight size={10} className="text-alba-muted" /> : <span className="w-3.5" />}
        </div>

        {/* Icon */}
        {isDir
          ? <FolderOpen size={14} className={isOpen ? "text-alba-accent" : "text-alba-accent/60"} />
          : <File size={14} className={icon.color} />
        }

        {/* Name */}
        <span className={`text-xs truncate flex-1 ${isDir ? "font-medium" : ""}`}>{node.name}</span>

        {/* Size */}
        {!isDir && node.size !== undefined && !isNaN(node.size) && (
          <span className="text-[9px] text-alba-muted/40">{node.size < 1024 ? `${node.size}B` : `${(node.size / 1024).toFixed(1)}K`}</span>
        )}

        {/* Delete button */}
        {isHovered && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(node.path); }}
            className="p-0.5 rounded hover:bg-alba-error/10 text-alba-muted hover:text-alba-error opacity-0 group-hover:opacity-100 transition-all">
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {isDir && isOpen && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map(child => (
              <TreeNode key={child.path} node={child} depth={depth + 1} onSelect={onSelect} onDelete={onDelete} highlightedPaths={highlightedPaths} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FileTree({ basePath = "/Users/tj/.alba/workspace", onFileSelect, highlightedPaths }: {
  basePath?: string;
  onFileSelect?: (path: string) => void;
  highlightedPaths?: string[];
}) {
  const [currentPath, setCurrentPath] = useState(basePath);
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const highlightSet = highlightedPaths ? new Set(highlightedPaths) : undefined;

  // Build tree from flat list (recursively fetch children)
  const fetchTree = useCallback(async (path: string): Promise<FileEntry[]> => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!data.isDirectory || !data.items) return data.items || [];
      const items = data.items as FileEntry[];
      for (const item of items) {
        if (item.isDirectory) {
          item.children = await fetchTree(item.path);
        }
      }
      return items;
    } catch { return []; }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const items = await fetchTree(currentPath);
    setTree(items);
    setLoading(false);
  }, [currentPath, fetchTree]);

  useEffect(() => { load(); }, [load]);

  const handleSelect = (path: string, isDir: boolean) => {
    if (isDir) { setCurrentPath(path); }
    else { onFileSelect?.(path); }
  };

  const handleDelete = async (path: string) => {
    try { await fetch(`/api/files?path=${encodeURIComponent(path)}`, { method: "DELETE" }); load(); }
    catch { /* ignore */ }
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length > 1) { parts.pop(); setCurrentPath("/" + parts.join("/")); }
  };

  const createItem = async () => {
    if (!newName.trim()) return;
    const fullPath = `${currentPath}/${newName.trim()}`;
    try { await fetch("/api/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: fullPath, content: "" }) }); setNewName(""); setShowNew(null); load(); }
    catch { /* ignore */ }
  };

  const pathParts = currentPath.split("/").filter(Boolean);
  const rootLabel = currentPath === basePath ? "workspace" : pathParts[pathParts.length - 1] || "files";

  return (
    <div className="h-full flex flex-col bg-alba-surface/50 border-r border-alba-border">
      {/* Terminal-style header with colored dots */}
      <div className="h-10 border-b border-alba-border flex items-center gap-2 px-3 bg-alba-bg/50 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[10px] font-mono text-alba-muted/60 ml-2 truncate">{rootLabel}</span>
        <div className="flex-1" />
        <button onClick={navigateUp} className="p-0.5 rounded hover:bg-white/5 text-alba-muted"><ArrowLeft size={12} /></button>
        <button onClick={load} className="p-0.5 rounded hover:bg-white/5 text-alba-muted"><RefreshCw size={12} /></button>
        <button onClick={() => setShowNew("file")} className="p-0.5 rounded hover:bg-white/5 text-alba-muted"><Plus size={12} /></button>
      </div>

      {/* New item dialog */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-alba-border">
            <div className="p-2 space-y-1">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={showNew === "folder" ? "folder-name" : "file.txt"}
                className="w-full bg-alba-bg border border-alba-border rounded px-2 py-1 text-xs focus:outline-none focus:border-alba-accent" autoFocus
                onKeyDown={e => { if (e.key === "Enter") createItem(); if (e.key === "Escape") setShowNew(null); }} />
              <div className="flex gap-1">
                <button onClick={createItem} className="flex-1 py-1 rounded bg-alba-accent text-alba-bg text-[10px] font-medium">Create</button>
                <button onClick={() => setShowNew(null)} className="px-2 py-1 rounded text-alba-muted text-[10px] hover:text-white"><X size={10} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb */}
      <div className="px-2 py-1 border-b border-alba-border/30 flex items-center gap-1 text-[10px] text-alba-muted overflow-x-auto shrink-0">
        {pathParts.slice(0, -1).map((part, i) => (
          <span key={i} className="flex items-center gap-0.5 shrink-0">
            {i > 0 && <ChevronRight size={8} />}
            <button onClick={() => setCurrentPath("/" + pathParts.slice(0, i + 1).join("/"))} className="hover:text-alba-accent">{part}</button>
          </span>
        ))}
        <span className="flex items-center gap-0.5 shrink-0">{pathParts.length > 1 && <ChevronRight size={8} />}<span className="text-alba-muted">{pathParts[pathParts.length - 1]}</span></span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="flex items-center justify-center h-16"><Loader2 size={14} className="text-alba-accent animate-spin" /></div>
        ) : tree.length === 0 ? (
          <div className="p-4 text-center text-[10px] text-alba-muted">Empty directory</div>
        ) : (
          tree.map(entry => <TreeNode key={entry.path} node={entry} onSelect={handleSelect} onDelete={handleDelete} highlightedPaths={highlightSet} />)
        )}
      </div>
    </div>
  );
}