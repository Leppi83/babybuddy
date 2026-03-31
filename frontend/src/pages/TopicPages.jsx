import React, { useCallback, useEffect, useRef, useState } from "react";
import { createApiClient, asItems, formatAppDateTime, formatAppTime, formatDurationCompact, durationMinutesFromValue } from "../lib/app-utils";

// ── Icons ─────────────────────────────────────────────────────

function SleepIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M22 17v-3H2m0-6v9m10-3h10v-2a3 3 0 0 0-3-3h-7z" />
    </svg>
  );
}
function FeedingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10.5s1 2.5 1 5.75c0 1.171-.13 2.245-.296 3.14c-.209 1.124-.313 1.686-.869 2.148S15.617 22 14.292 22H9.708c-1.325 0-1.987 0-2.543-.462s-.66-1.024-.869-2.149A17.3 17.3 0 0 1 6 16.25C6 13 7 10.5 7 10.5" />
      <path d="M7 10.51h10c.148-.815-.079-2.388-2.04-3.01c-.465-.148-1.01-.424-1.256-.888a1.64 1.64 0 0 1 .007-1.587a2.067 2.067 0 0 0-1.229-2.938A1.7 1.7 0 0 0 12 2a1.7 1.7 0 0 0-.515.087a2.067 2.067 0 0 0-1.23 2.938c.327.618.225 1.175.008 1.587c-.238.45-.756.85-1.24 1.003C7.672 8.045 6.74 9.068 7 10.51" />
    </svg>
  );
}
function DiaperIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.323c0-.579 0-.868.044-1.11a2.7 2.7 0 0 1 2.17-2.169C5.453 5 5.743 5 6.323 5h11.353c.579 0 .868 0 1.11.044a2.7 2.7 0 0 1 2.169 2.17c.044.24.044.53.044 1.11V11a9 9 0 0 1-18 0z" />
      <path d="M17 9h4M3 9h4" />
    </svg>
  );
}
function PumpingIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M35 25c0-4-6-6-6-6v-5H17v5s-6 2-6 6v19h24z" />
      <path d="M20 4l-7 6m10 4l-6-7m9 1h9v7l6 5" />
    </svg>
  );
}

const TOPIC_CONFIG = {
  sleep: {
    label: "Sleep",
    color: "#ffd666",
    apiPath: "/api/sleep/",
    timeField: "start",
    cols: (s) => [
      { title: s.start || "Start", key: "start", render: (r) => formatAppDateTime(r.start) },
      { title: s.end || "End", key: "end", render: (r) => r.end ? formatAppDateTime(r.end) : "—" },
      { title: s.duration || "Duration", key: "duration", render: (r) => { const m = durationMinutesFromValue(r.duration); return m ? formatDurationCompact(m * 60) : "—"; } },
      { title: s.type || "Type", key: "nap", render: (r) => r.nap ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">{s.naps || "Nap"}</span> : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{s.nightSleep || "Night"}</span> },
    ],
  },
  feeding: {
    label: "Feeding",
    color: "#69b1ff",
    apiPath: "/api/feedings/",
    timeField: "start",
    cols: (s) => [
      { title: s.start || "Start", key: "start", render: (r) => formatAppDateTime(r.start) },
      { title: s.end || "End", key: "end", render: (r) => r.end ? formatAppDateTime(r.end) : "—" },
      { title: s.method || "Method", key: "method", render: (r) => r.method || "—" },
      { title: s.amount || "Amount", key: "amount", render: (r) => r.amount ? `${r.amount} ml` : "—" },
    ],
  },
  diaper: {
    label: "Diaper",
    color: "#ff7875",
    apiPath: "/api/changes/",
    timeField: "time",
    cols: (s) => [
      { title: s.start || "Time", key: "time", render: (r) => formatAppDateTime(r.time) },
      { title: s.type || "Type", key: "type", render: (r) => { const p = [r.wet && (s.wet || "Wet"), r.solid && (s.solid || "Solid")].filter(Boolean); return p.join(" + ") || "—"; } },
      { title: s.amount || "Amount", key: "amount", render: (r) => r.amount || "—" },
    ],
  },
  pumping: {
    label: "Pumping",
    color: "#b37feb",
    apiPath: "/api/pumping/",
    timeField: "start",
    cols: (s) => [
      { title: s.start || "Start", key: "start", render: (r) => formatAppDateTime(r.start) },
      { title: s.end || "End", key: "end", render: (r) => r.end ? formatAppDateTime(r.end) : "—" },
      { title: s.amount || "Amount", key: "amount", render: (r) => r.amount ? `${r.amount} ml` : "—" },
    ],
  },
};

const TOPIC_ICONS = { sleep: SleepIcon, feeding: FeedingIcon, diaper: DiaperIcon, pumping: PumpingIcon };

// ── Overview ──────────────────────────────────────────────────

function StatTile({ label, value, suffix }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-extrabold text-slate-100 tabular-nums">{value ?? "—"}<span className="text-base font-medium text-slate-400 ml-1">{suffix}</span></div>
    </div>
  );
}

function OverviewTab({ topic, overview, strings: s }) {
  if (!overview) return <div className="py-10 text-center text-slate-500 italic">{s.noData || "No data"}</div>;

  if (topic === "sleep") {
    const totalH = overview.totalMinutesToday ? formatDurationCompact(overview.totalMinutesToday * 60) : "0m";
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={`${s.total || "Total"} ${s.today || "today"}`} value={totalH} />
        <StatTile label={s.naps || "Naps"} value={overview.napCountToday} />
        <StatTile label={s.nightSleep || "Night sleeps"} value={overview.nightSleepCountToday} />
        {overview.lastSleep && <StatTile label={s.last || "Last"} value={formatAppTime(overview.lastSleep.start)} suffix={overview.lastSleep.duration ? formatDurationCompact(overview.lastSleep.duration) : ""} />}
      </div>
    );
  }
  if (topic === "feeding") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={`${s.count || "Count"} ${s.today || "today"}`} value={overview.countToday} />
        {overview.methodBreakdown && Object.entries(overview.methodBreakdown).map(([m, c]) => <StatTile key={m} label={m} value={c} />)}
        {overview.lastFeeding && <StatTile label={s.last || "Last"} value={formatAppTime(overview.lastFeeding.start)} suffix={overview.lastFeeding.method || ""} />}
      </div>
    );
  }
  if (topic === "diaper") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={`${s.count || "Count"} ${s.today || "today"}`} value={overview.countToday} />
        <StatTile label={s.wet || "Wet"} value={overview.wetToday} />
        <StatTile label={s.solid || "Solid"} value={overview.solidToday} />
        {overview.lastChange && <StatTile label={s.last || "Last"} value={formatAppTime(overview.lastChange.time)} />}
      </div>
    );
  }
  if (topic === "pumping") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={`${s.count || "Count"} ${s.today || "today"}`} value={overview.countToday} />
        <StatTile label={`${s.total || "Total"} ${s.amount || "amount"}`} value={overview.totalAmountToday} suffix="ml" />
        {overview.lastPump && <StatTile label={s.last || "Last"} value={formatAppTime(overview.lastPump.start)} suffix={overview.lastPump.amount ? `${overview.lastPump.amount} ml` : ""} />}
      </div>
    );
  }
  return null;
}

// ── History ───────────────────────────────────────────────────

function HistoryTab({ topic, childId, csrfToken, strings: s }) {
  const api = useRef(createApiClient(csrfToken));
  const config = TOPIC_CONFIG[topic];
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(async (p) => {
    setLoading(true);
    const offset = (p - 1) * pageSize;
    const orderField = config.timeField === "time" ? "-time" : "-start";
    try {
      const res = await api.current.get(`${config.apiPath}?child=${childId}&ordering=${orderField}&limit=${pageSize}&offset=${offset}`);
      setData(asItems(res));
      setTotal(res?.count ?? 0);
    } catch { setData([]); }
    setLoading(false);
  }, [childId, config]);

  useEffect(() => { fetchData(page); }, [fetchData, page]);

  const cols = config.cols(s);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              {cols.map(c => <th key={c.key} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{c.title}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={cols.length} className="px-4 py-10 text-center"><div className="inline-block w-5 h-5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-slate-500 italic">{s.noData || "No data"}</td></tr>
            ) : data.map((row, i) => (
              <tr key={row.id || i} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                {cols.map(c => <td key={c.key} className="px-4 py-3 text-slate-300">{c.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > pageSize && (
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">Page {page} of {Math.ceil(total / pageSize)}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40">{s.previous || "Previous"}</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40">{s.next || "Next"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────

function ChartsTab({ charts, plotlyLocale, graphJsUrl, strings: s }) {
  const [loaded, setLoaded] = useState(false);
  const chartRefs = useRef({});

  useEffect(() => {
    if (!charts?.length) return;
    if (window.Plotly) { setLoaded(true); return; }
    const script = document.createElement("script");
    script.src = graphJsUrl;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [graphJsUrl, charts]);

  useEffect(() => {
    if (!loaded || !charts) return;
    if (window.Plotly && plotlyLocale) window.Plotly.setPlotConfig({ locale: plotlyLocale });
    for (const chart of charts) {
      const ref = chartRefs.current[chart.key];
      if (!ref) continue;
      ref.innerHTML = chart.html;
      if (chart.js) {
        try { new Function(chart.js.replace(/<\/?script[^>]*>/gi, ""))(); } catch (e) { console.warn(e); }
      }
    }
  }, [loaded, charts, plotlyLocale]);

  if (!charts?.length) return <div className="py-10 text-center text-slate-500 italic">{s.noData || "No data"}</div>;
  if (!loaded) return <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-5">
      {charts.map(chart => (
        <div key={chart.key} className="glass-card p-4">
          {chart.title && <h4 className="text-sm font-bold text-slate-300 mb-3">{chart.title}</h4>}
          <div className="w-full overflow-x-auto bg-white rounded-xl p-2" ref={(el) => { chartRefs.current[chart.key] = el; }} />
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

const TABS = ["overview", "history", "charts"];

export function TopicPage({ bootstrap }) {
  const { topicPage, strings: s } = bootstrap;
  const { topic, overview, charts, plotlyLocale, childId } = topicPage;
  const config = TOPIC_CONFIG[topic] || { label: topic, color: "#38bdf8" };
  const Icon = TOPIC_ICONS[topic];
  const [tab, setTab] = useState("overview");

  const tabLabels = { overview: s.overview || "Overview", history: s.history || "History", charts: s.charts || "Charts" };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      <div className="flex items-center gap-4">
        {Icon && (
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center p-2.5" style={{ background: config.color + "20", color: config.color, border: `1px solid ${config.color}44` }}>
            <Icon />
          </span>
        )}
        <h2 className="text-2xl font-extrabold text-white">{s[`${topic}Label`] || config.label}</h2>
      </div>

      <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 border border-slate-700/50 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? "bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]" : "text-slate-400 hover:text-slate-200"}`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div>
        {tab === "overview" && <OverviewTab topic={topic} overview={overview} strings={s} />}
        {tab === "history" && <HistoryTab topic={topic} childId={childId} csrfToken={bootstrap.csrfToken} strings={s} />}
        {tab === "charts" && <ChartsTab charts={charts} plotlyLocale={plotlyLocale} graphJsUrl={bootstrap.urls?.graphJs} strings={s} />}
      </div>
    </div>
  );
}
