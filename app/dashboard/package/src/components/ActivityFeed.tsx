import { useState, useEffect } from "react";
import { FileText, Terminal, MessageSquare, Settings, Clock } from "lucide-react";

interface Activity {
  id: string;
  type: "file_edit" | "command" | "chat" | "config_change" | "other";
  description: string;
  ts: number;
}

const ICONS = { file_edit: FileText, command: Terminal, chat: MessageSquare, config_change: Settings, other: Clock };

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/activity")
      .then(r => r.json())
      .then(data => setActivities(data.activities || []))
      .catch(() => {});
  }, []);

  if (activities.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2"><Clock size={14} className="text-alba-accent" /><span className="text-sm font-medium">Recent Activity</span></div>
        <span className="text-[10px] text-alba-muted">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
          {activities.map(a => {
            const Icon = ICONS[a.type] || Clock;
            const time = new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <Icon size={12} className="text-alba-muted shrink-0" />
                <span className="text-xs text-alba-muted truncate flex-1">{a.description}</span>
                <span className="text-[10px] text-alba-muted/40 shrink-0">{time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}