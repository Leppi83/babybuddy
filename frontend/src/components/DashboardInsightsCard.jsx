import { useState } from "react";
import { Card, Tag, Button, Space } from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  AlertOutlined,
  InfoCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";

const SEVERITY_ORDER = ["alert", "warning", "info"];

const SEVERITY_META = {
  alert: { color: "#ff7875", Icon: AlertOutlined },
  warning: { color: "#ffd666", Icon: WarningOutlined },
  info: { color: "#4db6ff", Icon: InfoCircleOutlined },
};

const DISMISSED_KEY = "dismissed_insights";
const TTL_MS = 24 * 60 * 60 * 1000;

function loadDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const cleaned = Object.fromEntries(
      Object.entries(parsed).filter(([, ts]) => now - ts < TTL_MS),
    );
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return {};
  }
}

function dismissInsight(id, current) {
  const updated = { ...current, [id]: Date.now() };
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

function InsightRow({ insight, onDismiss, strings }) {
  const meta = SEVERITY_META[insight.severity] ?? SEVERITY_META.info;
  return (
    <div
      style={{
        borderBottom: "1px solid var(--app-card-border)",
        padding: "10px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <Tag
          color={meta.color}
          style={{
            color: "#020617",
            border: "none",
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {insight.severity.toUpperCase()}
        </Tag>
        <span
          style={{
            color: "var(--app-text-primary)",
            fontWeight: 600,
            fontSize: "var(--font-title-size, 14px)",
          }}
        >
          {insight.title}
        </span>
      </div>
      <p
        style={{
          color: "var(--app-text-secondary)",
          margin: "0 0 8px",
          fontSize: "var(--font-body-size, 12px)",
          lineHeight: 1.5,
        }}
      >
        {insight.body}
      </p>
      <Space size={8}>
        {insight.action_url && insight.action_label && (
          <Button
            size="small"
            href={insight.action_url}
            icon={<RightOutlined />}
            iconPosition="end"
            style={{
              borderColor: "var(--app-card-border)",
              color: "var(--app-link)",
            }}
          >
            {insight.action_label}
          </Button>
        )}
        <Button
          size="small"
          type="text"
          onClick={() => onDismiss(insight.id)}
          style={{
            color: "var(--app-text-secondary)",
            fontSize: "var(--font-chart-size, 11px)",
          }}
        >
          {strings.dismiss ?? "Dismiss"}
        </Button>
      </Space>
    </div>
  );
}

export function DashboardInsightsCard({ insights = [], strings = {} }) {
  const [dismissed, setDismissed] = useState(() => loadDismissed());

  const visible = insights
    .filter((ins) => !dismissed[ins.id])
    .sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
    );

  const handleDismiss = (id) => {
    setDismissed((prev) => dismissInsight(id, prev));
  };

  return (
    <Card
      size="small"
      style={{
        background: "var(--app-card-bg-start)",
        border: "1px solid var(--app-card-border)",
        borderRadius: 16,
      }}
    >
      {visible.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 0",
            gap: 8,
            color: "var(--app-text-secondary)",
          }}
        >
          <CheckCircleOutlined style={{ fontSize: 28, color: "#5cdb8b" }} />
          <span style={{ fontSize: "var(--font-body-size, 12px)" }}>
            {strings.allGood ?? "All good — no alerts right now"}
          </span>
        </div>
      ) : (
        <div>
          {visible.map((ins) => (
            <InsightRow
              key={ins.id}
              insight={ins}
              onDismiss={handleDismiss}
              strings={strings}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
