import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Grid3x3, List, X, Trash2 } from "lucide-react";

interface Event { id: string; title: string; date: string; color: string; category: string; description?: string; }

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "day" | "list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", color: "#00e5ff", category: "Meeting", description: "" });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/events"); const data = await res.json(); setEvents(data.events || []); } catch { /* ignore */ }
    setLoading(false);
  }, []);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const year = currentDate.getFullYear(), month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const isToday = (d: number) => { const t = new Date(); return d === t.getDate() && month === t.getMonth() && year === t.getFullYear(); };
  const getEventsForDay = (d: number) => { const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; return events.filter(e => e.date === ds); };
  const navigate = (dir: "prev" | "next") => { setCurrentDate(p => { const d = new Date(p); if (view === "month") d.setMonth(p.getMonth() + (dir === "next" ? 1 : -1)); else if (view === "week") d.setDate(p.getDate() + (dir === "next" ? 7 : -7)); else d.setDate(p.getDate() + (dir === "next" ? 1 : -1)); return d; }); };
  const addEvent = async () => { if (!newEvent.title || !newEvent.date) return; try { await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newEvent) }); setShowDialog(false); setNewEvent({ title: "", date: "", color: "#00e5ff", category: "Meeting", description: "" }); fetchEvents(); } catch { /* ignore */ } };
  const deleteEvent = async (id: string) => { try { await fetch(`/api/events?id=${id}`, { method: "DELETE" }); fetchEvents(); } catch { /* ignore */ } };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">{view === "month" && currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}{view === "list" && "All Events"}</h1>
            <div className="flex items-center gap-1">
              <button onClick={() => navigate("prev")} className="p-1.5 rounded-lg hover:bg-white/5"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 rounded-lg text-xs hover:bg-white/5">Today</button>
              <button onClick={() => navigate("next")} className="p-1.5 rounded-lg hover:bg-white/5"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-alba-surface rounded-lg p-1">
              {([["month", Calendar, "Month"], ["week", Grid3x3, "Week"], ["day", Clock, "Day"], ["list", List, "List"]] as const).map(([v, Icon, label]) => (
                <button key={v} onClick={() => setView(v)} title={label} className={`p-1.5 rounded-md transition-colors ${view === v ? "bg-alba-accent/10 text-alba-accent" : "text-alba-muted hover:text-white"}`}><Icon size={14} /></button>
              ))}
            </div>
            <button onClick={() => setShowDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-alba-accent text-alba-bg text-sm font-medium hover:bg-alba-accent/90"><Plus size={14} /> New</button>
          </div>
        </div>

        {loading ? <div className="flex items-center justify-center h-64"><div className="text-sm text-alba-muted">Loading...</div></div> : (
          <div>
            {view === "month" && (
              <div className="glass rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 border-b border-alba-border/50">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="p-2 text-center text-xs font-medium text-alba-muted">{d}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((day, i) => {
                    const dayEvents = day ? getEventsForDay(day) : [];
                    return (
                      <div key={i} className={`min-h-24 border-b border-r border-alba-border/30 p-1.5 ${!day ? "bg-alba-bg/30" : ""}`}>
                        {day && (
                          <>
                            <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 ${isToday(day) ? "bg-alba-accent text-alba-bg font-bold" : "text-alba-muted"}`}>{day}</div>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 2).map(ev => (
                                <div key={ev.id} className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 flex items-center gap-1" style={{ backgroundColor: ev.color + "20", color: ev.color }}>
                                  <span className="truncate flex-1">{ev.title}</span>
                                  <button onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }}><X size={8} /></button>
                                </div>
                              ))}
                              {dayEvents.length > 2 && <div className="text-[9px] text-alba-muted/50">+{dayEvents.length - 2}</div>}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {view === "week" && (
              <div className="glass rounded-xl overflow-hidden">
                <div className="grid grid-cols-8 border-b border-alba-border/50">
                  <div className="p-2 text-xs text-alba-muted">Time</div>
                  {Array.from({ length: 7 }, (_, i) => { const d = new Date(currentDate); d.setDate(d.getDate() - d.getDay() + i); return <div key={i} className="p-2 text-center text-xs font-medium">{d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}</div>; })}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {Array.from({ length: 12 }, (_, h) => (
                    <div key={h} className="grid grid-cols-8 border-b border-alba-border/20">
                      <div className="p-2 text-[10px] text-alba-muted">{String(h + 8).padStart(2, "0")}:00</div>
                      {Array.from({ length: 7 }, (_, d) => <div key={d} className="min-h-10 border-l border-alba-border/20 p-0.5 hover:bg-white/[0.02]" />)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view === "day" && (
              <div className="glass rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="flex border-b border-alba-border/20">
                    <div className="w-16 shrink-0 p-2 text-xs text-alba-muted border-r border-alba-border/20">{String(h).padStart(2, "0")}:00</div>
                    <div className="flex-1 min-h-12 p-1 hover:bg-white/[0.02]" />
                  </div>
                ))}
              </div>
            )}
            {view === "list" && (
              <div className="glass rounded-xl p-4 space-y-2">
                {events.length === 0 ? <div className="text-center py-12 text-alba-muted"><Calendar size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No events yet</p></div> : (
                  events.sort((a, b) => a.date.localeCompare(b.date)).map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors group">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium">{ev.title}</p><p className="text-xs text-alba-muted">{ev.date} · {ev.category}</p></div>
                      <button onClick={() => deleteEvent(ev.id)} className="text-alba-muted hover:text-alba-error opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {showDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDialog(false)}>
            <div className="glass rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">New Event</h3>
              <div className="space-y-3">
                <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Event title" className="w-full bg-alba-bg/50 border border-alba-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent/50" />
                <input type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} className="w-full bg-alba-bg/50 border border-alba-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent/50" />
                <select value={newEvent.category} onChange={e => setNewEvent(p => ({ ...p, category: e.target.value }))} className="w-full bg-alba-bg/50 border border-alba-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-alba-accent/50">
                  <option>Meeting</option><option>Task</option><option>Reminder</option><option>Personal</option>
                </select>
                <div className="flex gap-2">
                  {["#00e5ff", "#69ff94", "#c792ea", "#ffcb6b", "#ff5370"].map(c => (
                    <button key={c} onClick={() => setNewEvent(p => ({ ...p, color: c }))} className={`w-8 h-8 rounded-full border-2 transition-all ${newEvent.color === c ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowDialog(false)} className="flex-1 py-2 rounded-lg border border-alba-border text-sm text-alba-muted hover:text-white">Cancel</button>
                <button onClick={addEvent} className="flex-1 py-2 rounded-lg bg-alba-accent text-alba-bg text-sm font-medium hover:bg-alba-accent/90">Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
