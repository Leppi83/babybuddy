import { Empty, Tag, Button } from "antd";

const SEVERITY_COLORS = {
  alert: "#ff7875",
  warning: "#ffd666",
  info: "#4db6ff",
};

function InsightCard({ insight }) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: `1px solid ${SEVERITY_COLORS[insight.severity] ?? "#1e3a5f"}`,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Tag
          color={SEVERITY_COLORS[insight.severity]}
          style={{
            color: "#020617",
            border: "none",
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {insight.severity.toUpperCase()}
        </Tag>
        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
          {insight.title}
        </span>
      </div>
      <p style={{ color: "#94a3b8", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        {insight.body}
      </p>
      {insight.actionLabel && insight.actionUrl && (
        <div style={{ marginTop: 10 }}>
          <Button
            size="small"
            href={insight.actionUrl}
            style={{ borderColor: "#1e3a5f", color: "#4db6ff" }}
          >
            {insight.actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function InsightsPage({ bootstrap }) {
  const { child, insights, urls, strings } = bootstrap;

  const byCategory = insights.reduce((acc, ins) => {
    const cat = ins.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ins);
    return acc;
  }, {});

  const categories = Object.keys(byCategory).sort();

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 2 }}>
          {child.name} · {child.ageWeeks}w
        </div>
        <h1
          style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: 0 }}
        >
          {strings?.["insights.title"] ?? "Insights"}
        </h1>
      </div>

      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="link"
          href={urls.childDashboard}
          style={{ color: "#4db6ff", padding: 0 }}
        >
          ← {strings?.["insights.backToDashboard"] ?? "Back to dashboard"}
        </Button>
      </div>

      {/* Empty state */}
      {insights.length === 0 && (
        <Empty
          description={
            <span style={{ color: "#64748b" }}>
              {strings?.["insights.emptyState"] ??
                "No issues detected — everything looks on track."}
            </span>
          }
          style={{ marginTop: 60 }}
        />
      )}

      {/* Insights grouped by category */}
      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div
            style={{
              color: "#64748b",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {strings?.[`insights.category.${cat}`] ?? cat}
          </div>
          {byCategory[cat].map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </div>
      ))}
    </div>
  );
}
