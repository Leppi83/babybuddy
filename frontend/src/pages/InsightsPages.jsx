import { useState, useRef } from "react";
import { Empty, Tag, Button, Modal, Spin } from "antd";

const SEVERITY_COLORS = {
  alert: "var(--accent-diaper)",
  warning: "var(--accent-sleep)",
  info: "var(--app-primary)",
};

function InsightCard({ insight }) {
  return (
    <div
      style={{
        background: "var(--app-card-bg-start)",
        border: `1px solid ${SEVERITY_COLORS[insight.severity] ?? "var(--app-card-border)"}`,
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
            color: "var(--app-text-primary)",
            border: "none",
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {insight.severity.toUpperCase()}
        </Tag>
        <span style={{ color: "var(--app-text-primary)", fontWeight: 600 }}>
          {insight.title}
        </span>
      </div>
      <p
        style={{
          color: "var(--app-text-secondary)",
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {insight.body}
      </p>
      {insight.actionLabel && insight.actionUrl && (
        <div style={{ marginTop: 10 }}>
          <Button
            size="small"
            href={insight.actionUrl}
            style={{
              borderColor: "var(--app-card-border)",
              color: "var(--app-link)",
            }}
          >
            {insight.actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function AskAIModal({ childId, open, onClose, strings }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const esRef = useRef(null);
  const loadingRef = useRef(false);

  const start = () => {
    if (esRef.current) esRef.current.close();
    setText("");
    setError(null);
    setLoading(true);
    loadingRef.current = true;

    const es = new EventSource(`/api/insights/summary/?child=${childId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        setText((prev) => prev + JSON.parse(e.data));
      } catch {}
    };
    es.addEventListener("done", () => {
      setLoading(false);
      loadingRef.current = false;
      es.close();
    });
    es.addEventListener("error", (e) => {
      setLoading(false);
      loadingRef.current = false;
      try {
        setError(JSON.parse(e.data));
      } catch {
        setError("Connection error");
      }
      es.close();
    });
    es.onerror = () => {
      if (loadingRef.current) {
        setLoading(false);
        loadingRef.current = false;
        setError("Connection lost");
      }
      es.close();
    };
  };

  const handleOpen = () => {
    if (!text && !loading) start();
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        esRef.current?.close();
        onClose();
      }}
      footer={null}
      title={strings?.aiSummaryTitle ?? "AI Summary"}
      styles={{
        body: { background: "var(--app-card-bg-start)", minHeight: 120 },
      }}
      afterOpenChange={(visible) => {
        if (visible) handleOpen();
      }}
    >
      {loading && !text && (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      )}
      {error && <p style={{ color: "var(--accent-diaper)" }}>{error}</p>}
      {text && (
        <p
          style={{
            color: "var(--app-text-primary)",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
          {loading && <span style={{ opacity: 0.5 }}>▌</span>}
        </p>
      )}
    </Modal>
  );
}

export function InsightsPage({ bootstrap }) {
  const { child, insights, urls, strings } = bootstrap;
  const showAI =
    bootstrap.settings?.ai?.provider &&
    bootstrap.settings.ai.provider !== "none";
  const [aiOpen, setAiOpen] = useState(false);

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
      <div className="ant-shell-header-band" style={{ marginBottom: 20 }}>
        <div className="ant-shell-header-band__eyebrow">
          {child.name} · {child.ageWeeks}w
        </div>
        <div className="ant-shell-header-band__title">
          {strings?.["insights.title"] ?? "Insights"}
        </div>
      </div>

      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="link"
          href={urls.childDashboard}
          style={{ color: "var(--app-link)", padding: 0 }}
        >
          ← {strings?.["insights.backToDashboard"] ?? "Back to dashboard"}
        </Button>
      </div>

      {/* AI summary button */}
      {showAI && (
        <>
          <Button
            onClick={() => setAiOpen(true)}
            style={{
              marginBottom: 16,
              borderColor: "var(--app-card-border)",
              color: "var(--app-link)",
            }}
          >
            ✨ Ask AI for summary
          </Button>
          <AskAIModal
            childId={child.id}
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            strings={strings}
          />
        </>
      )}

      {/* Empty state */}
      {insights.length === 0 && (
        <Empty
          description={
            <span style={{ color: "var(--app-timeline-axis)" }}>
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
              color: "var(--app-timeline-axis)",
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
