import React, { useRef, useState } from "react";
import { Sparkles, X, AlertTriangle, Info, Bell } from "lucide-react";

const SEVERITY_COLORS = {
  alert: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", badge: "bg-rose-500/20 text-rose-300" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-300" },
  info: { bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-400", badge: "bg-sky-500/20 text-sky-300" },
};

const SEVERITY_ICON = {
  alert: <AlertTriangle size={14} />,
  warning: <Bell size={14} />,
  info: <Info size={14} />,
};

function InsightCard({ insight, strings }) {
  const c = SEVERITY_COLORS[insight.severity] || SEVERITY_COLORS.info;
  return (
    <div className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${c.badge}`}>
          {SEVERITY_ICON[insight.severity]}
          {insight.severity.toUpperCase()}
        </span>
        <span className="font-bold text-slate-100 text-sm">{insight.title}</span>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed">{insight.body}</p>
      {insight.actionLabel && insight.actionUrl && (
        <div className="mt-3">
          <a href={insight.actionUrl} className={`text-xs font-bold ${c.text} hover:underline`}>{insight.actionLabel} →</a>
        </div>
      )}
    </div>
  );
}

function AskAIPanel({ childId, open, onClose, strings }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const esRef = useRef(null);
  const loadingRef = useRef(false);

  function start() {
    if (esRef.current) esRef.current.close();
    setText("");
    setError(null);
    setLoading(true);
    loadingRef.current = true;
    const es = new EventSource(`/api/insights/summary/?child=${childId}`);
    esRef.current = es;
    es.onmessage = (e) => { try { setText(prev => prev + JSON.parse(e.data)); } catch {} };
    es.addEventListener("done", () => { setLoading(false); loadingRef.current = false; es.close(); });
    es.addEventListener("error", (e) => {
      setLoading(false);
      loadingRef.current = false;
      try { setError(JSON.parse(e.data)); } catch { setError(strings.connectionError || "Connection error"); }
      es.close();
    });
    es.onerror = () => {
      if (loadingRef.current) { setLoading(false); loadingRef.current = false; setError(strings.connectionError || "Connection lost"); }
      es.close();
    };
  }

  function handleOpen() {
    if (!text && !loading) start();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-sky-500/20 shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <Sparkles size={16} className="text-sky-400" />{strings?.aiSummaryTitle ?? "AI Summary"}
          </h3>
          <button onClick={() => { esRef.current?.close(); onClose(); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto px-6 py-5 min-h-[120px]"
          ref={(el) => { if (el && open && !text && !loading) handleOpen(); }}
        >
          {loading && !text && (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
            </div>
          )}
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          {text && (
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {text}{loading && <span className="opacity-50">▌</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function InsightsPage({ bootstrap }) {
  const { child, insights, strings } = bootstrap;
  const showAI = bootstrap.settings?.ai?.provider && bootstrap.settings.ai.provider !== "none";
  const [aiOpen, setAiOpen] = useState(false);

  const byCategory = (insights || []).reduce((acc, ins) => {
    if (!acc[ins.category]) acc[ins.category] = [];
    acc[ins.category].push(ins);
    return acc;
  }, {});
  const categories = Object.keys(byCategory).sort();

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl">
      {showAI && (
        <>
          <button
            onClick={() => setAiOpen(true)}
            className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-sm hover:bg-sky-500/20 transition-colors"
          >
            <Sparkles size={15} />
            {strings?.askAI ?? "✨ Ask AI for summary"}
          </button>
          <AskAIPanel childId={child?.id} open={aiOpen} onClose={() => setAiOpen(false)} strings={strings} />
        </>
      )}

      {(insights || []).length === 0 && (
        <div className="py-16 text-center">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-slate-400 font-medium">{strings?.["insights.emptyState"] ?? "No issues detected — everything looks on track."}</p>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} className="flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{strings?.[`insights.category.${cat}`] ?? cat}</div>
          {byCategory[cat].map(ins => <InsightCard key={ins.id} insight={ins} strings={strings} />)}
        </div>
      ))}
    </div>
  );
}
