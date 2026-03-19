import { useState, useRef, useEffect, useCallback } from "react";
import { Drawer, message } from "antd";

const TILES = [
  {
    key: "diaper",
    labelKey: "quickLog.tile.diaper",
    icon: "💧",
    instant: true,
  },
  {
    key: "feeding",
    labelKey: "quickLog.tile.feeding",
    icon: "🍼",
    instant: true,
  },
  { key: "sleep", labelKey: "quickLog.tile.sleep", icon: "😴", instant: true },
  {
    key: "pumping",
    labelKey: "quickLog.tile.pumping",
    icon: "🫧",
    instant: true,
  },
  {
    key: "temperature",
    labelKey: "quickLog.tile.temperature",
    icon: "🌡️",
    instant: false,
  },
  { key: "timer", labelKey: "quickLog.tile.timer", icon: "⏱️", instant: true },
  { key: "note", labelKey: "quickLog.tile.note", icon: "📝", instant: false },
  {
    key: "weight",
    labelKey: "quickLog.tile.weight",
    icon: "⚖️",
    instant: false,
  },
];

const DEFAULT_TILE_LABELS = {
  "quickLog.tile.diaper": "Diaper",
  "quickLog.tile.feeding": "Feed",
  "quickLog.tile.sleep": "Sleep",
  "quickLog.tile.pumping": "Pump",
  "quickLog.tile.temperature": "Temp",
  "quickLog.tile.timer": "Timer",
  "quickLog.tile.note": "Note",
  "quickLog.tile.weight": "Weight",
};

const LONG_PRESS_MS = 500;

function TileButton({
  tile,
  child,
  csrfToken,
  quickStatus,
  onInstantLog,
  strings,
}) {
  const timerRef = useRef(null);
  const [pressing, setPressing] = useState(false);

  const isActiveSleep = tile.key === "sleep" && quickStatus?.activeSleep;
  const label = strings?.[tile.labelKey] ?? DEFAULT_TILE_LABELS[tile.labelKey];

  const startPress = useCallback(() => {
    setPressing(true);
    timerRef.current = setTimeout(() => {
      setPressing(false);
      // Long press → navigate to full form
      window.location.href = `/log/${tile.key}/${child ? `?child=${child.id}` : ""}`;
    }, LONG_PRESS_MS);
  }, [tile.key, child]);

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
    setPressing(false);
  }, []);

  const handleTap = useCallback(() => {
    clearTimeout(timerRef.current);
    setPressing(false);
    if (!tile.instant) {
      window.location.href = `/log/${tile.key}/${child ? `?child=${child.id}` : ""}`;
      return;
    }
    onInstantLog(tile.key);
  }, [tile, child, onInstantLog]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button
      onPointerDown={startPress}
      onPointerUp={handleTap}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        width: "100%",
        aspectRatio: "1",
        background: pressing ? "var(--app-card-border)" : "var(--app-list-bg)",
        border: `1px solid ${pressing ? "var(--colorPrimary, #4db6ff)" : "var(--app-card-border)"}`,
        borderRadius: 18,
        color: "var(--app-text-primary)",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        position: "relative",
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      <span style={{ fontSize: 24 }}>{tile.icon}</span>
      <span style={{ fontSize: 11, opacity: 0.8 }}>{label}</span>
      {isActiveSleep && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#ffd666",
            animation: "pulse 1.5s infinite",
          }}
        />
      )}
    </button>
  );
}

export function QuickLogSheet({
  open,
  onClose,
  child,
  csrfToken,
  quickStatus,
  strings,
}) {
  const [messageApi, contextHolder] = message.useMessage();

  const handleInstantLog = useCallback(
    async (entryType) => {
      if (!child) {
        messageApi.warning("No child selected");
        return;
      }
      try {
        const res = await fetch(`/api/quick-log/${entryType}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({ child: child.id }),
        });
        const data = await res.json();
        if (data.status === "ok") {
          const labels = {
            sleep: "Sleep timer started ✓",
            timer: "Timer started ✓",
          };
          messageApi.success(labels[entryType] ?? `${entryType} logged ✓`);
        } else if (res.status === 409) {
          messageApi.warning(data.errors?.[0] ?? "Already active");
        } else {
          messageApi.error(data.errors?.join(", ") ?? "Error");
        }
      } catch {
        messageApi.error("Network error");
      }
    },
    [child, csrfToken, messageApi],
  );

  const statusItems = quickStatus
    ? [
        quickStatus.lastDiaper && `Diaper ${quickStatus.lastDiaper}`,
        quickStatus.lastFeeding && `Fed ${quickStatus.lastFeeding}`,
        quickStatus.activeSleep
          ? `Sleeping ${quickStatus.activeSleep}`
          : quickStatus.lastSleep && `Slept ${quickStatus.lastSleep}`,
      ].filter(Boolean)
    : [];

  return (
    <>
      {contextHolder}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
      <Drawer
        open={open}
        onClose={onClose}
        placement="bottom"
        height="auto"
        closable={false}
        styles={{
          body: {
            padding: "8px 16px 16px",
            background: "var(--app-card-bg-start)",
          },
          mask: { backdropFilter: "blur(2px)" },
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingBottom: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "var(--app-card-border)",
            }}
          />
        </div>

        {/* 4×2 tile grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: statusItems.length ? 12 : 0,
          }}
        >
          {TILES.map((tile) => (
            <TileButton
              key={tile.key}
              tile={tile}
              child={child}
              csrfToken={csrfToken}
              quickStatus={quickStatus}
              onInstantLog={handleInstantLog}
              strings={strings}
            />
          ))}
        </div>

        {/* Status strip */}
        {statusItems.length > 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--app-timeline-axis)",
              textAlign: "center",
              paddingBottom: `max(8px, env(safe-area-inset-bottom))`,
            }}
          >
            {statusItems.join(" · ")}
          </div>
        )}
      </Drawer>
    </>
  );
}
