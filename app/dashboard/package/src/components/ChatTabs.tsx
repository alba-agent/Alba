import { memo, useState, useCallback } from "react";
import { X, Plus, MessageSquare } from "lucide-react";

interface ChatTab {
  id: string;
  name: string;
  lastMessage?: string;
}

interface ChatTabsProps {
  tabs: ChatTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabAdd: () => void;
  onTabRename: (id: string, name: string) => void;
}

export default memo(function ChatTabs({
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  onTabAdd,
  onTabRename,
}: ChatTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleRename = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  }, []);

  const saveRename = useCallback((id: string) => {
    if (editName.trim()) {
      onTabRename(id, editName.trim());
    }
    setEditingId(null);
  }, [editName, onTabRename]);

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-alba-border bg-alba-surface/50 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          onDoubleClick={() => handleRename(tab.id, tab.name)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all glow-sm ${
            activeTab === tab.id
              ? "bg-alba-accent/20 text-alba-accent"
              : "text-alba-muted hover:bg-alba-bg"
          }`}
        >
          <MessageSquare size={14} />
          {editingId === tab.id ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => saveRename(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename(tab.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="bg-transparent outline-none w-24"
              autoFocus
            />
          ) : (
            <span>{tab.name}</span>
          )}
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-alba-error"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onTabAdd}
        className="p-1.5 rounded-lg text-alba-muted hover:bg-alba-bg hover:text-alba-accent transition-all glow-sm"
        title="New chat"
      >
        <Plus size={16} />
      </button>
    </div>
  );
});