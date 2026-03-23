import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  Empty,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  createApiClient,
  asItems,
  formatAppDateTime,
  formatAppTime,
  formatDurationCompact,
  durationMinutesFromValue,
} from "../lib/app-utils";
import "./TopicPages.css";

const { Title } = Typography;

/* ── Topic SVG icons ──────────────────────────────────────────── */

function SleepIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {/* Bed frame */}
      <rect x="2" y="20" width="28" height="8" rx="2" />
      {/* Headboard */}
      <rect x="2" y="11" width="4" height="13" rx="2" />
      {/* Footboard */}
      <rect x="26" y="15" width="4" height="9" rx="2" />
      {/* Mattress top */}
      <rect x="6" y="16" width="20" height="5" rx="1.5" opacity="0.4" />
      {/* Pillow */}
      <rect x="8" y="14" width="7" height="4" rx="2" opacity="0.6" />
      {/* Zzz */}
      <text x="19" y="10" fontSize="7" fontWeight="bold" opacity="0.85" fill="currentColor">zzz</text>
    </svg>
  );
}

function FeedingIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {/* Baby bottle — tilted slightly for recognizability */}
      {/* Nipple */}
      <path d="M14 4 Q16 2 18 4 L17.5 7 L14.5 7 Z" opacity="0.75" />
      {/* Cap ring */}
      <rect x="13.5" y="7" width="5" height="2" rx="0.8" opacity="0.6" />
      {/* Bottle body — rounded rectangle */}
      <rect x="12" y="9" width="8" height="18" rx="4" />
      {/* Milk fill */}
      <rect x="12" y="18" width="8" height="9" rx="4" opacity="0.35" />
      {/* Measurement marks */}
      <line x1="13" y1="14" x2="15.5" y2="14" stroke="white" strokeWidth="0.7" opacity="0.4" />
      <line x1="13" y1="17" x2="15" y2="17" stroke="white" strokeWidth="0.7" opacity="0.3" />
      <line x1="13" y1="20" x2="15.5" y2="20" stroke="white" strokeWidth="0.7" opacity="0.4" />
    </svg>
  );
}

function DiaperIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {/* Open diaper — front-facing, recognizable shape */}
      {/* Back panel (wide top) */}
      <path d="M4 8 L28 8 L28 14 Q16 13 4 14 Z" opacity="0.8" />
      {/* Front panel (narrower, folds up between legs) */}
      <path d="M8 14 Q16 28 24 14 L28 14 Q16 32 4 14 Z" />
      {/* Waistband elastic line */}
      <path d="M5 9.5 L27 9.5" stroke="white" strokeWidth="0.7" opacity="0.3" fill="none" />
      {/* Left adhesive tab */}
      <path d="M4 10 L1 12 L4 14" fill="currentColor" opacity="0.65" />
      {/* Right adhesive tab */}
      <path d="M28 10 L31 12 L28 14" fill="currentColor" opacity="0.65" />
      {/* Inner lining suggestion */}
      <path d="M10 15 Q16 25 22 15" stroke="white" strokeWidth="0.6" opacity="0.2" fill="none" />
    </svg>
  );
}

function PumpingIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {/* Breast pump — single side, recognizable */}
      {/* Breast shield / flange (funnel shape) */}
      <path d="M8 6 Q16 4 20 6 L18 14 L10 14 Z" opacity="0.7" />
      {/* Connector */}
      <rect x="11" y="14" width="6" height="3" rx="1" opacity="0.85" />
      {/* Collection bottle */}
      <rect x="10" y="17" width="8" height="11" rx="3" />
      {/* Milk level */}
      <rect x="10" y="22" width="8" height="6" rx="3" opacity="0.35" />
      {/* Handle / pump lever */}
      <path d="M20 8 Q24 8 24 12 L24 16 Q24 18 22 18 L21 18 L21 14 Q21 11 20 10 Z" opacity="0.6" />
      {/* Measurement lines */}
      <line x1="11" y1="21" x2="13.5" y2="21" stroke="white" strokeWidth="0.6" opacity="0.35" />
      <line x1="11" y1="24" x2="13" y2="24" stroke="white" strokeWidth="0.6" opacity="0.3" />
    </svg>
  );
}

function TopicIcon({ topic, size = 40, color }) {
  const icons = { sleep: SleepIcon, feeding: FeedingIcon, diaper: DiaperIcon, pumping: PumpingIcon };
  const Icon = icons[topic];
  if (!Icon) return null;
  return (
    <span
      className="topic-page__icon-badge"
      style={{ background: color, width: size, height: size }}
    >
      <Icon />
    </span>
  );
}

/* ── Topic config ─────────────────────────────────────────────── */

const TOPIC_CONFIG = {
  sleep: {
    label: "Sleep",
    color: "var(--accent-sleep)",
    apiPath: "/api/sleep/",
    timeField: "start",
    columns: (s) => [
      { title: s.start, dataIndex: "start", render: (v) => formatAppDateTime(v) },
      { title: s.end, dataIndex: "end", render: (v) => (v ? formatAppDateTime(v) : "—") },
      {
        title: s.duration,
        dataIndex: "duration",
        render: (v) => {
          const mins = durationMinutesFromValue(v);
          return mins ? formatDurationCompact(mins * 60) : "—";
        },
      },
      {
        title: s.type,
        dataIndex: "nap",
        render: (v) =>
          v ? <Tag color="blue">{s.naps}</Tag> : <Tag color="purple">{s.nightSleep}</Tag>,
      },
    ],
  },
  feeding: {
    label: "Feeding",
    color: "var(--accent-feedings)",
    apiPath: "/api/feedings/",
    timeField: "start",
    columns: (s) => [
      { title: s.start, dataIndex: "start", render: (v) => formatAppDateTime(v) },
      { title: s.end, dataIndex: "end", render: (v) => (v ? formatAppDateTime(v) : "—") },
      { title: s.method, dataIndex: "method", render: (v) => v || "—" },
      { title: s.amount, dataIndex: "amount", render: (v) => (v ? `${v} ml` : "—") },
      {
        title: s.duration,
        dataIndex: "duration",
        render: (v) => {
          const mins = durationMinutesFromValue(v);
          return mins ? formatDurationCompact(mins * 60) : "—";
        },
      },
    ],
  },
  diaper: {
    label: "Diaper",
    color: "var(--accent-diaper)",
    apiPath: "/api/changes/",
    timeField: "time",
    columns: (s) => [
      { title: s.start, dataIndex: "time", render: (v) => formatAppDateTime(v) },
      {
        title: s.type,
        key: "type",
        render: (_, rec) => {
          const parts = [];
          if (rec.wet) parts.push(s.wet);
          if (rec.solid) parts.push(s.solid);
          return parts.join(" + ") || "—";
        },
      },
      { title: s.amount, dataIndex: "amount", render: (v) => (v ? `${v}` : "—") },
    ],
  },
  pumping: {
    label: "Pumping",
    color: "var(--accent-pumpings)",
    apiPath: "/api/pumping/",
    timeField: "start",
    columns: (s) => [
      { title: s.start, dataIndex: "start", render: (v) => formatAppDateTime(v) },
      { title: s.end, dataIndex: "end", render: (v) => (v ? formatAppDateTime(v) : "—") },
      { title: s.amount, dataIndex: "amount", render: (v) => (v ? `${v} ml` : "—") },
      {
        title: s.duration,
        dataIndex: "duration",
        render: (v) => {
          const mins = durationMinutesFromValue(v);
          return mins ? formatDurationCompact(mins * 60) : "—";
        },
      },
    ],
  },
};

/* ── Overview Tab ─────────────────────────────────────────────── */

function OverviewTab({ topic, overview, strings }) {
  if (!overview) return <Empty description={strings.noData} />;

  if (topic === "sleep") {
    const totalHours = overview.totalMinutesToday
      ? formatDurationCompact(overview.totalMinutesToday * 60)
      : "0m";
    return (
      <div className="topic-page__overview-grid">
        <Card size="small"><Statistic title={`${strings.total} ${strings.today}`} value={totalHours} /></Card>
        <Card size="small"><Statistic title={strings.naps} value={overview.napCountToday} /></Card>
        <Card size="small"><Statistic title={strings.nightSleep} value={overview.nightSleepCountToday} /></Card>
        {overview.lastSleep && (
          <Card size="small">
            <Statistic
              title={strings.last}
              value={formatAppTime(overview.lastSleep.start)}
              suffix={overview.lastSleep.duration ? `(${formatDurationCompact(overview.lastSleep.duration)})` : ""}
            />
          </Card>
        )}
      </div>
    );
  }

  if (topic === "feeding") {
    return (
      <div className="topic-page__overview-grid">
        <Card size="small"><Statistic title={`${strings.count} ${strings.today}`} value={overview.countToday} /></Card>
        {overview.methodBreakdown &&
          Object.entries(overview.methodBreakdown).map(([method, count]) => (
            <Card size="small" key={method}><Statistic title={method} value={count} /></Card>
          ))}
        {overview.lastFeeding && (
          <Card size="small">
            <Statistic title={strings.last} value={formatAppTime(overview.lastFeeding.start)} suffix={overview.lastFeeding.method || ""} />
          </Card>
        )}
      </div>
    );
  }

  if (topic === "diaper") {
    return (
      <div className="topic-page__overview-grid">
        <Card size="small"><Statistic title={`${strings.count} ${strings.today}`} value={overview.countToday} /></Card>
        <Card size="small"><Statistic title={strings.wet} value={overview.wetToday} /></Card>
        <Card size="small"><Statistic title={strings.solid} value={overview.solidToday} /></Card>
        {overview.lastChange && (
          <Card size="small"><Statistic title={strings.last} value={formatAppTime(overview.lastChange.time)} /></Card>
        )}
      </div>
    );
  }

  if (topic === "pumping") {
    return (
      <div className="topic-page__overview-grid">
        <Card size="small"><Statistic title={`${strings.count} ${strings.today}`} value={overview.countToday} /></Card>
        <Card size="small"><Statistic title={`${strings.total} ${strings.amount}`} value={overview.totalAmountToday} suffix="ml" /></Card>
        {overview.lastPump && (
          <Card size="small">
            <Statistic title={strings.last} value={formatAppTime(overview.lastPump.start)} suffix={overview.lastPump.amount ? `${overview.lastPump.amount} ml` : ""} />
          </Card>
        )}
      </div>
    );
  }

  return null;
}

/* ── History Tab ──────────────────────────────────────────────── */

function HistoryTab({ topic, childId, csrfToken, strings }) {
  const api = useRef(createApiClient(csrfToken));
  const config = TOPIC_CONFIG[topic];
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(
    async (pageNum) => {
      setLoading(true);
      const offset = (pageNum - 1) * pageSize;
      const orderField = config.timeField === "time" ? "-time" : "-start";
      const url = `${config.apiPath}?child=${childId}&ordering=${orderField}&limit=${pageSize}&offset=${offset}`;
      try {
        const res = await api.current.get(url);
        setData(asItems(res));
        setTotal(res?.count ?? 0);
      } catch {
        setData([]);
      }
      setLoading(false);
    },
    [childId, config, pageSize],
  );

  useEffect(() => { fetchData(page); }, [fetchData, page]);

  return (
    <Table
      dataSource={data}
      columns={config.columns(strings)}
      rowKey="id"
      loading={loading}
      size="small"
      pagination={{ current: page, pageSize, total, onChange: setPage, showSizeChanger: false }}
      scroll={{ x: true }}
    />
  );
}

/* ── Charts Tab ───────────────────────────────────────────────── */

function ChartsTab({ charts, plotlyLocale, graphJsUrl, strings }) {
  const [loaded, setLoaded] = useState(false);
  const chartRefs = useRef({});

  useEffect(() => {
    if (!charts || charts.length === 0) return;
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
        try {
          const scriptContent = chart.js.replace(/<script[^>]*>/gi, "").replace(/<\/script>/gi, "");
          new Function(scriptContent)();
        } catch (e) { console.warn("Chart render error:", e); }
      }
    }
  }, [loaded, charts, plotlyLocale]);

  if (!charts || charts.length === 0) return <Empty description={strings.noData} />;
  if (!loaded) return <Spin size="large" style={{ display: "block", margin: "40px auto" }} />;

  return (
    <>
      {charts.map((chart) => (
        <Card key={chart.key} title={chart.title} className="topic-page__chart-card ant-section-card" size="small">
          <div className="ant-report-graph" ref={(el) => { chartRefs.current[chart.key] = el; }} />
        </Card>
      ))}
    </>
  );
}

/* ── Main TopicPage ───────────────────────────────────────────── */

export function TopicPage({ bootstrap }) {
  const { topicPage, strings } = bootstrap;
  const { topic, overview, charts, plotlyLocale, childId } = topicPage;
  const config = TOPIC_CONFIG[topic];
  const s = strings || {};

  const tabItems = [
    {
      key: "overview",
      label: s.overview || "Overview",
      children: <OverviewTab topic={topic} overview={overview} strings={s} />,
    },
    {
      key: "history",
      label: s.history || "History",
      children: <HistoryTab topic={topic} childId={childId} csrfToken={bootstrap.csrfToken} strings={s} />,
    },
    {
      key: "charts",
      label: s.charts || "Charts",
      children: <ChartsTab charts={charts} plotlyLocale={plotlyLocale} graphJsUrl={bootstrap.urls.graphJs} strings={s} />,
    },
  ];

  return (
    <div className="topic-page">
      <div className="topic-page__title-row">
        <TopicIcon topic={topic} size={48} color={config.color} />
        <Title level={3} style={{ margin: 0 }}>
          {s[`${topic}Label`] || config.label}
        </Title>
      </div>
      <Tabs items={tabItems} size="large" />
    </div>
  );
}
