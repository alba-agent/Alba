import { useState, useRef, useEffect, useMemo } from "react";

// ── Classname util to avoid extra dependency ────────────────────────────────
function cm(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

// ── Shimmer styles (injected once) ─────────────────────────────────────────
const SHIMMER_STYLE_ID = "alba-bash-shimmer";
const SHIMMER_STYLES = `
@keyframes alba-bash-shimmer { from { background-position: 100% center; } to { background-position: 0% center; } }
.alba-bash-shimmer { display:inline-block; background-size:250% 100%; background-clip:text; -webkit-background-clip:text; color:transparent; background-image:linear-gradient(90deg,#a3a3a3 0%,#a3a3a3 40%,#525252 50%,#a3a3a3 60%,#a3a3a3 100%); background-repeat:no-repeat; animation:alba-bash-shimmer 1.2s linear infinite; }
@keyframes alba-bash-dot { 0%,60%,100%{opacity:0.2} 30%{opacity:1} }
.alba-bash-dot { animation:alba-bash-dot 1.4s infinite; }
`;

let injected = false;
function ensureStyles() {
  if (injected || typeof document === "undefined") return;
  if (!document.getElementById(SHIMMER_STYLE_ID)) {
    const el = document.createElement("style");
    el.id = SHIMMER_STYLE_ID; el.textContent = SHIMMER_STYLES;
    document.head.appendChild(el);
  }
  injected = true;
}

function extractCommandSummary(cmd: string): string {
  return cmd.split("|").map(s => s.trim().split(/\s+/)[0] || "").filter(Boolean).slice(0, 4).join(", ");
}

export function BashTool({ state = "idle", command, output, className }: {
  state?: "idle" | "running";
  command: string;
  output?: string;
  className?: string;
}) {
  useEffect(() => { ensureStyles(); }, []);
  const isRunning = state === "running";
  const summary = extractCommandSummary(command);

  return (
    <div className={cm("rounded-[10px] border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 overflow-hidden", className)}>
      <div className="flex items-center justify-between pl-2.5 pr-2 h-7">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {isRunning ? (
            <span className="alba-bash-shimmer text-xs leading-none truncate">Running command: {summary}</span>
          ) : (
            <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Ran command: {summary}</span>
          )}
        </div>
        {isRunning && <svg className="w-3 h-3 text-neutral-500 animate-spin shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="7" strokeLinecap="round"/></svg>}
      </div>
      <div className="border-t border-neutral-200 dark:border-neutral-800 px-2.5 py-1.5 font-mono text-[12px] leading-[16px] overflow-hidden bg-white dark:bg-neutral-950">
        <div className="break-all"><span className="text-amber-600 dark:text-amber-400 select-none">$ </span><span className="text-neutral-900 dark:text-neutral-100">{command}</span></div>
        {!isRunning && output && <div className="mt-1 text-neutral-500 dark:text-neutral-400 whitespace-pre-line max-h-20 overflow-hidden">{output}</div>}
      </div>
    </div>
  );
}

export function PlanTool({ state = "idle", plan, className }: {
  state?: "idle" | "pending";
  plan: { id?: string; title: string; summary?: string };
  className?: string;
}) {
  useEffect(() => { ensureStyles(); }, []);
  const [expanded, setExpanded] = useState(false);
  const isPending = state === "pending";
  const fileName = plan.id?.trim() ? (plan.id.endsWith(".md") ? plan.id : `plan-${plan.id}.md`) : "plan-working.md";

  return (
    <div className={cm("rounded-[10px] border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 overflow-hidden", className)}>
      <div className="h-7 pl-3 pr-2.5 flex items-center justify-between">
        <div className="min-w-0 flex items-center gap-1">
          {isPending ? (
            <svg className="w-3 h-3 text-neutral-500 animate-spin shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="7" strokeLinecap="round"/></svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          )}
          <span className="text-xs text-neutral-500 truncate">{fileName}</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="size-5 flex items-center justify-center text-neutral-500">
          <svg className={cm("w-3.5 h-3.5 transition-transform", expanded ? "rotate-180" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 pt-2">
        <div className="text-sm text-neutral-900 dark:text-neutral-100 px-3">{plan.title}</div>
        {plan.summary && (
          <div className={cm("px-3 text-sm text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap", !expanded && "max-h-[94px] overflow-hidden")}>
            <div className={cm(!expanded && "max-h-[60px] overflow-hidden")}>{plan.summary}</div>
            {!expanded && <button onClick={() => setExpanded(true)} className="text-xs text-blue-500 hover:underline mt-1">Read detailed plan</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Line diff engine ─────────────────────────────────────────────────────────
type DiffOp = { type: "context" | "remove" | "add"; text: string };

function lineDiff(oldText: string, newText: string): DiffOp[] {
  const a = oldText.split("\n"), b = newText.split("\n");
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: DiffOp[] = []; let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { ops.push({ type: "context", text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "remove", text: a[i] }); i++; }
    else { ops.push({ type: "add", text: b[j] }); j++; }
  }
  while (i < m) { ops.push({ type: "remove", text: a[i] }); i++; }
  while (j < n) { ops.push({ type: "add", text: b[j] }); j++; }
  return ops;
}

export function EditTool({ state = "completed", variant = "edit", filePath, oldContent, newContent, className }: {
  state?: "completed" | "pending" | "waiting";
  variant?: "edit" | "write";
  filePath?: string;
  oldContent?: string;
  newContent?: string;
  className?: string;
}) {
  useEffect(() => { ensureStyles(); }, []);
  const isPending = state === "pending", isWaiting = state === "waiting", isWrite = variant === "write";
  const fileName = filePath?.split("/").pop();

  const diffOps = useMemo<DiffOp[] | null>(() => {
    if (isWaiting) return null;
    if (isWrite && newContent) return newContent.split("\n").map(t => ({ type: "add" as const, text: t }));
    if (oldContent !== undefined && newContent !== undefined) return lineDiff(oldContent, newContent);
    return null;
  }, [isWaiting, isWrite, oldContent, newContent]);

  const stats = useMemo(() => {
    if (!diffOps) return null;
    let added = 0, removed = 0;
    diffOps.forEach(o => { if (o.type === "add") added++; else if (o.type === "remove") removed++; });
    return { added, removed };
  }, [diffOps]);

  const label = isWaiting ? "Generating..." : isPending ? `${isWrite ? "Creating" : "Editing"}${fileName ? " " + fileName : ""}` : `${isWrite ? "Created" : "Edited"}${fileName ? " " + fileName : ""}`;

  return (
    <div className={cm("rounded-[10px] border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black overflow-hidden w-full", className)}>
      <div className={cm("flex items-center justify-between px-2.5 h-7 bg-neutral-100 dark:bg-neutral-900", (diffOps && diffOps.length > 0) ? "border-b border-neutral-200 dark:border-neutral-800" : "")}>
        <div className="flex items-center gap-1.5 min-w-0">
          {(isPending || isWaiting) ? <span className="alba-bash-shimmer text-xs">{label}</span> : <span className="text-xs text-neutral-500 truncate">{label}</span>}
        </div>
        {stats && !isPending && !isWaiting && (stats.added > 0 || stats.removed > 0) && (
          <span className="text-[11px] font-mono text-neutral-500 inline-flex gap-2 shrink-0">
            {stats.added > 0 && <span className="text-green-600 dark:text-green-400">+{stats.added}</span>}
            {stats.removed > 0 && <span className="text-red-600 dark:text-red-400">-{stats.removed}</span>}
          </span>
        )}
      </div>
      {diffOps && diffOps.length > 0 && (
        <div className="text-[12px] font-mono leading-[1.5] bg-white dark:bg-black overflow-x-auto">
          {diffOps.map((op, i) => (
            <div key={i} className={cm("flex items-start min-w-0",
              op.type === "add" && "bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-200",
              op.type === "remove" && "bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200",
              op.type === "context" && "text-neutral-700 dark:text-neutral-300"
            )}>
              <span className={cm("select-none w-4 text-center shrink-0", op.type === "add" ? "text-green-600 dark:text-green-400" : op.type === "remove" ? "text-red-600 dark:text-red-400" : "text-neutral-400 dark:text-neutral-600")}>{op.type === "add" ? "+" : op.type === "remove" ? "-" : " "}</span>
              <span className="whitespace-pre pr-2 flex-1 min-w-0">{op.text || " "}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchTool({ state = "done", query, results = [], className }: {
  state?: "searching" | "done";
  query: string;
  results?: Array<{ title: string; source: string; date?: string }>;
  className?: string;
}) {
  useEffect(() => { ensureStyles(); }, []);
  const [open, setOpen] = useState(true);
  const isAnimating = state === "searching";
  const total = results.length;

  return (
    <div className={cm("flex flex-col gap-2 w-full", className)}>
      <button onClick={() => setOpen(!open)} disabled={total === 0}
        className="group flex items-center max-w-full select-none gap-1 bg-transparent border-0 p-0 m-0 text-left cursor-pointer">
        <span className="font-[450] text-sm text-neutral-500 dark:text-neutral-400">
          {isAnimating ? <span className="alba-bash-shimmer">Searching...</span> : `Found ${total} result${total === 1 ? "" : "s"}`}
        </span>
        {total > 0 && <svg className={cm("w-3 h-3 text-neutral-500 transition-transform", open ? "rotate-90" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}
      </button>
      {open && total > 0 && (
        <div className="rounded-[10px] overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center px-2.5 py-0 border-b border-neutral-200 dark:border-neutral-800 h-7 text-xs gap-1">
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">Searched for</span>
            <span className="text-neutral-500 truncate">&ldquo;{query}&rdquo;</span>
          </div>
          <div className="max-h-[200px] overflow-y-auto bg-white dark:bg-neutral-950">
            <div className="flex flex-col gap-1 p-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-[6px] hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 cursor-default">
                  <svg className="w-4 h-4 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate flex-1 min-w-0">{r.title}</span>
                  <span className="text-xs text-neutral-500 shrink-0 whitespace-nowrap">{r.date || r.source}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}