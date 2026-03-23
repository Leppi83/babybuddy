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
  /* Based on tabler:bed — bed with pillow and person silhouette */
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M22 17v-3H2m0-6v9m10-3h10v-2a3 3 0 0 0-3-3h-7z" />
    </svg>
  );
}

function FeedingIcon() {
  /* Based on hugeicons:baby-bottle — adapted for filled style */
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10.5s1 2.5 1 5.75c0 1.171-.13 2.245-.296 3.14c-.209 1.124-.313 1.686-.869 2.148S15.617 22 14.292 22H9.708c-1.325 0-1.987 0-2.543-.462s-.66-1.024-.869-2.149A17.3 17.3 0 0 1 6 16.25C6 13 7 10.5 7 10.5" />
      <path d="M7 10.51h10c.148-.815-.079-2.388-2.04-3.01c-.465-.148-1.01-.424-1.256-.888a1.64 1.64 0 0 1 .007-1.587a2.067 2.067 0 0 0-1.229-2.938A1.7 1.7 0 0 0 12 2a1.7 1.7 0 0 0-.515.087a2.067 2.067 0 0 0-1.23 2.938c.327.618.225 1.175.008 1.587c-.238.45-.756.85-1.24 1.003C7.672 8.045 6.74 9.068 7 10.51" />
      <path d="M15 14h2.5M15 18h2.5" />
    </svg>
  );
}

function DiaperIcon() {
  /* Based on tabler:diaper — open diaper with side tabs */
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.323c0-.579 0-.868.044-1.11a2.7 2.7 0 0 1 2.17-2.169C5.453 5 5.743 5 6.323 5h11.353c.579 0 .868 0 1.11.044a2.7 2.7 0 0 1 2.169 2.17c.044.24.044.53.044 1.11V11a9 9 0 0 1-18 0z" />
      <path d="M17 9h4M3 9h4" />
      <path d="M14.25 19.7v-1.4a6.3 6.3 0 0 1 6.3-6.3m-10.8 7.7v-1.4a6.3 6.3 0 0 0-6.3-6.3" />
    </svg>
  );
}

function PumpingIcon() {
  /* Based on icon-park-outline:breast-pump — pump with bottle and handle */
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M35 25c0-4-6-6-6-6v-5H17v5s-6 2-6 6v19h24z" />
      <path d="M20 4l-7 6m10 4l-6-7m9 1h9v7l6 5" />
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
