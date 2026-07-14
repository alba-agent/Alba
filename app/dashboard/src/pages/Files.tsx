import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, X, ChevronRight, Eye, Edit3 } from "lucide-react";
import FileTree from "../components/FileTree";
import FileSearch from "../components/FileSearch";

// Simple markdown renderer (converts basic markdown to HTML)
function renderMarkdown(text: string): string {
  let html = text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\`(.+?)\`/g, '<code class="bg-alba-bg px-1 rounded text-[11px] font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-alba-muted list-disc">$1</li>')
    .replace(/(?:\r\n|\r|\n){2,}/g, '</p><p class="text-sm mb-2">')
    .replace(/(?:\r\n|\r|\n)/g, '<br />');
  return '<p class="text-sm mb-2">' + html + '</p>';
}

export default function Files() {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [preview, setPreview] = useState(false);
  const isMarkdown = selectedFilePath?.endsWith(".md") || false;

  const fetchFile = useCallback(async (path: string) => {
    setLoading(true);
    setSelectedFilePath(path);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.isDirectory) return;
      setFileContent(data.content || "");
      setEditContent(data.content || "");
      setEditing(false);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const saveFile = async () => {
    if (!selectedFilePath) return;
    try {
      await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedFilePath, content: editContent }),
      });
      setFileContent(editContent);
      setEditing(false);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex h-full">
      {/* File Tree Panel */}
      <div className="w-64 shrink-0 flex flex-col">
        <FileSearch workspacePath="/Users/tj/.alba/workspace" onOpen={(path) => fetchFile(path)} />
        <div className="flex-1 overflow-hidden">
          <FileTree basePath="/Users/tj/.alba/workspace" onFileSelect={(path) => fetchFile(path)} />
        </div>
      </div>

      {/* Editor Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFilePath ? (
          <>
            <div className="h-11 border-b border-alba-border px-4 flex items-center justify-between bg-alba-surface/50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-alba-muted shrink-0" />
                <span className="text-sm font-medium truncate">{selectedFilePath.split("/").pop()}</span>
                <span className="text-[10px] text-alba-muted/60 truncate">{selectedFilePath}</span>
              </div>
              <div className="flex items-center gap-2">
                {isMarkdown && (
                  <button onClick={() => setPreview(!preview)} className={`px-2 py-1 rounded-lg text-xs transition-colors ${preview ? "bg-alba-accent/20 text-alba-accent" : "text-alba-muted hover:text-white hover:bg-white/5"}`}>
                    {preview ? <Edit3 size={12} className="inline mr-1" /> : <Eye size={12} className="inline mr-1" />}
                    {preview ? "Edit" : "Preview"}
                  </button>
                )}
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="px-3 py-1 rounded-lg bg-alba-accent/10 text-alba-accent text-xs font-medium hover:bg-alba-accent/20">Edit</button>
                ) : (
                  <>
                    <button onClick={() => { setEditContent(fileContent || ""); setEditing(false); }} className="px-3 py-1 rounded-lg border border-alba-border text-alba-muted text-xs hover:text-white">Cancel</button>
                    <button onClick={saveFile} className="px-3 py-1 rounded-lg bg-alba-accent text-alba-bg text-xs font-medium hover:bg-alba-accent/90">Save</button>
                  </>
                )}
              </div>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 size={20} className="text-alba-accent animate-spin" /></div>
            ) : preview && isMarkdown ? (
              <div className="flex-1 overflow-y-auto p-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(editing ? editContent : fileContent || "") }} />
            ) : (
              <textarea
                value={editing ? editContent : fileContent || ""}
                onChange={e => setEditContent(e.target.value)}
                readOnly={!editing}
                className="flex-1 bg-alba-bg text-sm font-mono p-4 resize-none outline-none"
                spellCheck={false}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-alba-muted text-sm">
            Select a file to view or edit
          </div>
        )}
      </div>
    </div>
  );
}