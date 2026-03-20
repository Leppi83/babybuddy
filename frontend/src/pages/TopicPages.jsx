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

const TOPIC_CONFIG = {
  sleep: {
    label: "Sleep",
    color: "#fbbf24",
    apiPath: "/api/sleep/",
    timeField: "start",
    columns: (s) => [
      {
        title: s.start,
        dataIndex: "start",
        render: (v) => formatAppDateTime(v),
      },
      {
        title: s.end,
        dataIndex: "end",
        render: (v) => (v ? formatAppDateTime(v) : "—"),
      },
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
          v ? (
            <Tag color="blue">{s.naps}</Tag>
          ) : (
            <Tag color="purple">{s.nightSleep}</Tag>
          ),
      },
    ],
  },
  feeding: {
    label: "Feeding",
    color: "var(--accent-feedings)",
    apiPath: "/api/feedings/",
    timeField: "start",
    columns: (s) => [
      {
        title: s.start,
        dataIndex: "start",
        render: (v) => formatAppDateTime(v),
      },
      {
        title: s.end,
        dataIndex: "end",
        render: (v) => (v ? formatAppDateTime(v) : "—"),
      },
      {
        title: s.method,
        dataIndex: "method",
        render: (v) => v || "—",
      },
      {
        title: s.amount,
        dataIndex: "amount",
        render: (v) => (v ? `${v} ml` : "—"),
      },
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
    color: "#ff6b8b",
    apiPath: "/api/changes/",
    timeField: "time",
    columns: (s) => [
      {
        title: s.start,
        dataIndex: "time",
        render: (v) => formatAppDateTime(v),
      },
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
      {
        title: s.amount,
        dataIndex: "amount",
        render: (v) => (v ? `${v}` : "—"),
      },
    ],
  },
  pumping: {
    label: "Pumping",
    color: "#c084fc",
    apiPath: "/api/pumping/",
    timeField: "start",
    columns: (s) => [
      {
        title: s.start,
        dataIndex: "start",
        render: (v) => formatAppDateTime(v),
      },
      {
        title: s.end,
        dataIndex: "end",
        render: (v) => (v ? formatAppDateTime(v) : "—"),
      },
      {
        title: s.amount,
        dataIndex: "amount",
        render: (v) => (v ? `${v} ml` : "—"),
      },
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
        <Card size="small">
          <Statistic
            title={`${strings.total} ${strings.today}`}
            value={totalHours}
          />
        </Card>
        <Card size="small">
          <Statistic title={strings.naps} value={overview.napCountToday} />
        </Card>
        <Card size="small">
          <Statistic
            title={strings.nightSleep}
            value={overview.nightSleepCountToday}
          />
        </Card>
        {overview.lastSleep && (
          <Card size="small">
            <Statistic
              title={strings.last}
              value={formatAppTime(overview.lastSleep.start)}
              suffix={
                overview.lastSleep.duration
                  ? `(${formatDurationCompact(overview.lastSleep.duration)})`
                  : ""
              }
            />
          </Card>
        )}
      </div>
    );
  }

  if (topic === "feeding") {
    return (
      <div className="topic-page__overview-grid">
        <Card size="small">
          <Statistic
            title={`${strings.count} ${strings.today}`}
            value={overview.countToday}
          />
        </Card>
        {overview.methodBreakdown &&
          Object.entries(overview.methodBreakdown).map(([method, count]) => (
            <Card size="small" key={method}>
              <Statistic title={method} value={count} />
            </Card>
          ))}
        {overview.lastFeeding && (
          <Card size="small">
            <Statistic
              title={strings.last}
              value={formatAppTime(overview.lastFeeding.start)}
              suffix={overview.lastFeeding.method || ""}
            />
          </Card>
        )}
      </div>
    );
  }

  if (topic === "diaper") {
    return (
      <div className="topic-page__overview-grid">
        <Card size="small">
          <Statistic
            title={`${strings.count} ${strings.today}`}
            value={overview.countToday}
          />
        </Card>
        <Card size="small">
          <Statistic title={strings.wet} value={overview.wetToday} />
        </Card>
        <Card size="small">
          <Statistic title={strings.solid} value={overview.solidToday} />
        </Card>
        {overview.lastChange && (
          <Card size="small">
            <Statistic
              title={strings.last}
              value={formatAppTime(overview.lastChange.time)}
            />
          </Card>
        )}
      </div>
    );
  }

  if (topic === "pumping") {
    return (
      <div className="topic-page__overview-grid">
        <Card size="small">
          <Statistic
            title={`${strings.count} ${strings.today}`}
            value={overview.countToday}
          />
        </Card>
        <Card size="small">
          <Statistic
            title={`${strings.total} ${strings.amount}`}
            value={overview.totalAmountToday}
            suffix="ml"
          />
        </Card>
        {overview.lastPump && (
          <Card size="small">
            <Statistic
              title={strings.last}
              value={formatAppTime(overview.lastPump.start)}
              suffix={
                overview.lastPump.amount ? `${overview.lastPump.amount} ml` : ""
              }
            />
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

  useEffect(() => {
    fetchData(page);
  }, [fetchData, page]);

  return (
    <Table
      dataSource={data}
      columns={config.columns(strings)}
      rowKey="id"
      loading={loading}
      size="small"
      pagination={{
        current: page,
        pageSize,
        total,
        onChange: setPage,
        showSizeChanger: false,
      }}
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

    if (window.Plotly) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = graphJsUrl;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [graphJsUrl, charts]);

  useEffect(() => {
    if (!loaded || !charts) return;

    if (window.Plotly && plotlyLocale) {
      window.Plotly.setPlotConfig({ locale: plotlyLocale });
    }

    for (const chart of charts) {
      const ref = chartRefs.current[chart.key];
      if (!ref) continue;
      ref.innerHTML = chart.html;
      if (chart.js) {
        try {
          const scriptContent = chart.js
            .replace(/<script[^>]*>/gi, "")
            .replace(/<\/script>/gi, "");
          new Function(scriptContent)();
        } catch (e) {
          console.warn("Chart render error:", e);
        }
      }
    }
  }, [loaded, charts, plotlyLocale]);

  if (!charts || charts.length === 0) {
    return <Empty description={strings.noData} />;
  }

  if (!loaded) {
    return (
      <Spin size="large" style={{ display: "block", margin: "40px auto" }} />
    );
  }

  return (
    <>
      {charts.map((chart) => (
        <Card
          key={chart.key}
          title={chart.title}
          className="topic-page__chart-card ant-section-card"
          size="small"
        >
          <div
            className="ant-report-graph"
            ref={(el) => {
              chartRefs.current[chart.key] = el;
            }}
          />
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
      children: (
        <HistoryTab
          topic={topic}
          childId={childId}
          csrfToken={bootstrap.csrfToken}
          strings={s}
        />
      ),
    },
    {
      key: "charts",
      label: s.charts || "Charts",
      children: (
        <ChartsTab
          charts={charts}
          plotlyLocale={plotlyLocale}
          graphJsUrl={bootstrap.urls.graphJs}
          strings={s}
        />
      ),
    },
  ];

  return (
    <div className="topic-page">
      <div className="topic-page__header">
        <div className="topic-page__icon" style={{ background: config.color }}>
          {topic === "sleep" && "\u263D"}
          {topic === "feeding" && "\uD83C\uDF7C"}
          {topic === "diaper" && "\uD83D\uDCA7"}
          {topic === "pumping" && "\u229B"}
        </div>
        <Title level={4} style={{ margin: 0 }}>
          {s[`${topic}Label`] || config.label}
        </Title>
      </div>
      <Tabs items={tabItems} size="large" />
    </div>
  );
}
