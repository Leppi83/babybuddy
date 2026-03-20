import React, { useState, useEffect, useMemo } from "react";
import {
  ARC_SPAN,
  ARC_START,
  atmosphereStops,
  dayBrightness,
  hourToAngle,
  pointOnCircle,
  timeToFixedAngle,
  arcDasharray,
  classifyActivities,
} from "../lib/dial-utils.js";
import { ACTIVITY_COLORS } from "../lib/app-utils.jsx";
import "./ActivityDial.css";

/* ── Layout constants ────────────────────────────────────────── */
const SVG_SIZE = 380;
const CX = 190;
const CY = 190;
const ATMO_R = 125;
const ATMO_STROKE = 38;
const ACTIVITY_R = 162;
const TRACK_STROKE = 5;
const ACTIVITY_STROKE = 12;
const CENTER_R = 80;

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function getTheme() {
  if (typeof document === "undefined") return "dark";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light") return "light";
  if (attr === "dark") return "dark";
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  )
    return "light";
  return "dark";
}

const SEVERITY_COLORS = {
  alert: "#ff4d4f",
  warning: "#faad14",
  info: "var(--app-primary)",
};

/* ── Atmosphere ring — CSS conic-gradient over 270° arc ──────── */
function AtmosphereRing({ theme }) {
  const stops = useMemo(() => atmosphereStops(48, theme), [theme]);

  // Build a CSS conic-gradient string from the stops.
  // Stops wrap around 0° (225° → 360° → 0° → 135°) which confuses CSS.
  // Fix: start the conic gradient at 225° and use relative offsets (0° → 270°).
  const gradientStr = useMemo(() => {
    const parts = stops.map((s) => {
      // Convert absolute angle to offset from ARC_START (225°)
      let offset = s.angle - 225;
      if (offset < 0) offset += 360;
      return `${s.color} ${offset.toFixed(1)}deg`;
    });
    // CSS conic "from" is relative to 12 o'clock (top), but CSS 0° = top.
    // We want to start at 225° (bottom-left), so rotate from 225deg.
    return `conic-gradient(from 225deg, ${parts.join(", ")})`;
  }, [stops]);

  const outerR = ATMO_R + ATMO_STROKE / 2;
  const innerR = ATMO_R - ATMO_STROKE / 2;
  const size = outerR * 2;

  // Create a mask that shows only the ring (radial) AND only the 270° arc (conic).
  // The gap is from 135° to 225° (90° centered at bottom = 180°).
  // In CSS conic-gradient terms: transparent from 135° to 225°, black elsewhere.
  const arcMask = [
    // Radial mask for ring shape
    `radial-gradient(circle, transparent ${innerR}px, black ${innerR}px, black ${outerR}px, transparent ${outerR}px)`,
    // Conic mask to hide the 90° gap at the bottom (135° → 225°)
    `conic-gradient(from 0deg, black 0deg, black 135deg, transparent 135deg, transparent 225deg, black 225deg, black 360deg)`,
  ].join(", ");

  return (
    <foreignObject x={CX - outerR} y={CY - outerR} width={size} height={size}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: gradientStr,
          maskImage: arcMask,
          maskComposite: "intersect",
          WebkitMaskImage: arcMask,
          WebkitMaskComposite: "source-in",
        }}
      />
    </foreignObject>
  );
}

/* ── Tick marks at 15-minute intervals along the 270° arc ───── */
function TickMarks() {
  const ticks = useMemo(() => {
    const result = [];
    // 96 ticks = every 15 minutes across 24 hours
    for (let i = 0; i <= 96; i++) {
      const hour = (i * 15) / 60; // fractional hour 0–24
      const angle = hourToAngle(hour);
      const isHour = i % 4 === 0;
      const innerR = ATMO_R - ATMO_STROKE / 2;
      const outerR = ATMO_R - ATMO_STROKE / 2 + (isHour ? 6 : 3);
      const inner = pointOnCircle(angle, innerR, CX, CY);
      const outer = pointOnCircle(angle, outerR, CX, CY);
      result.push({ inner, outer, isHour, key: i });
    }
    return result;
  }, []);

  return (
    <g>
      {ticks.map((t) => (
        <line
          key={t.key}
          x1={t.inner.x}
          y1={t.inner.y}
          x2={t.outer.x}
          y2={t.outer.y}
          className="activity-dial__tick"
          strokeWidth={t.isHour ? 1.5 : 0.5}
          opacity={t.isHour ? 0.4 : 0.2}
        />
      ))}
    </g>
  );
}

/* ── Hour labels — fixed positions on the 270° arc ───────────── */
function HourLabels() {
  const labels = useMemo(() => {
    const LABEL_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
    const labelR = ATMO_R; // center of the atmosphere ring
    return LABEL_HOURS.map((hour) => {
      const angle = hourToAngle(hour);
      const { x, y } = pointOnCircle(angle, labelR, CX, CY);
      return { hour, angle, x, y, text: String(hour).padStart(2, "0") };
    });
  }, []);

  return (
    <g>
      {labels.map((l) => {
        const brightness = dayBrightness(l.hour);
        const opacity = 0.6 + brightness * 0.4;
        return (
          <text
            key={`h${l.hour}`}
            x={l.x}
            y={l.y}
            className="activity-dial__label"
            opacity={opacity}
          >
            {l.text}
          </text>
        );
      })}
    </g>
  );
}

/* ── Bedtime marker — dashed line across atmosphere ring ─────── */
function BedtimeMarker({ bedtime, now }) {
  if (!bedtime) return null;
  const [hStr, mStr] = bedtime.split(":");
  const bedDate = new Date(now);
  bedDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  const angle = timeToFixedAngle(bedDate);

  // Line marker across the atmosphere ring
  const innerR = ATMO_R - ATMO_STROKE / 2;
  const outerR = ATMO_R + ATMO_STROKE / 2;
  const inner = pointOnCircle(angle, innerR, CX, CY);
  const outer = pointOnCircle(angle, outerR, CX, CY);

  return (
    <g>
      <line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke="#4a88b8"
        strokeWidth={2}
        strokeDasharray="4 3"
        strokeLinecap="round"
        opacity={0.8}
      >
        <title>{`Bedtime: ${hStr}:${mStr}`}</title>
      </line>
    </g>
  );
}

/* ── Red dot marking current time on the inner edge of atmosphere ring ── */
function CurrentTimeDot({ now }) {
  const angle = timeToFixedAngle(now);
  const innerEdge = ATMO_R - ATMO_STROKE / 2;
  const { x, y } = pointOnCircle(angle, innerEdge, CX, CY);

  return (
    <circle cx={x} cy={y} r={5} fill="#ff4d4f" stroke="#020617" strokeWidth={2}>
      <title>Now</title>
    </circle>
  );
}

/* ── Center display ──────────────────────────────────────────── */
function CenterDisplay({
  now,
  currentStatus,
  showInsight,
  topInsight,
  onCenterClick,
}) {
  const hasInsight = Boolean(topInsight);
  const insightColor = hasInsight
    ? (SEVERITY_COLORS[topInsight.severity] ?? SEVERITY_COLORS.info)
    : null;
  const insightTitle = hasInsight
    ? topInsight.title.length > 22
      ? topInsight.title.slice(0, 21) + "\u2026"
      : topInsight.title
    : null;

  return (
    <g
      onClick={hasInsight ? onCenterClick : undefined}
      style={{ cursor: hasInsight ? "pointer" : "default" }}
    >
      <circle
        cx={CX}
        cy={CY}
        r={CENTER_R}
        className="activity-dial__center-bg"
      />
      {showInsight && hasInsight ? (
        <>
          <text
            x={CX}
            y={CY - 8}
            className="activity-dial__center-insight"
            style={{ fill: insightColor }}
          >
            {insightTitle}
          </text>
          <text
            x={CX}
            y={CY + 12}
            className="activity-dial__center-hint"
            style={{ fill: insightColor }}
          >
            {"\u2193"} Tap for details
          </text>
        </>
      ) : (
        <>
          <text x={CX} y={CY - 4} className="activity-dial__center-time">
            {formatTime(now)}
          </text>
          {currentStatus && (
            <text x={CX} y={CY + 16} className="activity-dial__center-status">
              {currentStatus}
            </text>
          )}
        </>
      )}
    </g>
  );
}

/* ── Activity track — 270° arc baseline ─────────────────────── */
function ActivityTrack() {
  const circumference = 2 * Math.PI * ACTIVITY_R;
  const { dasharray, dashoffset } = arcDasharray(
    ARC_START, // start at 225°
    (ARC_START + ARC_SPAN) % 360, // end at 135°
    circumference,
  );

  return (
    <circle
      cx={CX}
      cy={CY}
      r={ACTIVITY_R}
      fill="none"
      className="activity-dial__track"
      strokeWidth={TRACK_STROKE}
      strokeDasharray={dasharray}
      strokeDashoffset={dashoffset}
    />
  );
}

/* ── Activity arcs ───────────────────────────────────────────── */
function ActivityArcs({ arcs, cx, cy, radius, strokeWidth, onHover }) {
  const circumference = 2 * Math.PI * radius;
  return (
    <g>
      {arcs.map((arc, i) => {
        const { dasharray, dashoffset } = arcDasharray(
          arc.startAngle,
          arc.endAngle,
          circumference,
        );
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={ACTIVITY_COLORS[arc.type]}
            strokeWidth={strokeWidth}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            opacity={0.9}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) =>
              onHover?.({
                text: arc.tooltip || arc.type,
                x: e.clientX,
                y: e.clientY,
              })
            }
            onMouseLeave={() => onHover?.(null)}
          >
            <title>{arc.tooltip || arc.type}</title>
          </circle>
        );
      })}
    </g>
  );
}

/* ── Activity dots ───────────────────────────────────────────── */
function ActivityDots({ dots, cx, cy, radius, onHover }) {
  return (
    <g>
      {dots.map((dot, i) => {
        const { x, y } = pointOnCircle(dot.angle, radius, cx, cy);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={6}
            fill={ACTIVITY_COLORS[dot.type]}
            className="activity-dial__dot-stroke"
            strokeWidth={2}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) =>
              onHover?.({
                text: dot.tooltip || dot.type,
                x: e.clientX,
                y: e.clientY,
              })
            }
            onMouseLeave={() => onHover?.(null)}
          >
            <title>{dot.tooltip || dot.type}</title>
          </circle>
        );
      })}
    </g>
  );
}

/* ── Legend ───────────────────────────────────────────────────── */
function Legend({ strings }) {
  const items = [
    {
      key: "sleep",
      color: ACTIVITY_COLORS.sleep,
      label: strings.sleep,
      type: "line",
    },
    {
      key: "feeding",
      color: ACTIVITY_COLORS.feeding,
      label: strings.feed,
      type: "line",
    },
    {
      key: "diaper",
      color: ACTIVITY_COLORS.diaper,
      label: strings.diaper,
      type: "dot",
    },
    {
      key: "pumping",
      color: ACTIVITY_COLORS.pumping,
      label: strings.pump,
      type: "line",
    },
  ];
  return (
    <div className="activity-dial__legend">
      {items.map((item) => (
        <span key={item.key} className="activity-dial__legend-item">
          {item.type === "line" ? (
            <span
              className="activity-dial__legend-line"
              style={{ background: item.color }}
            />
          ) : (
            <span
              className="activity-dial__legend-dot"
              style={{ background: item.color }}
            />
          )}
          {item.label || item.key}
        </span>
      ))}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */

export default function ActivityDial({
  activities = [],
  bedtime = null,
  currentStatus = null,
  insights = [],
  strings = {},
  referenceDate = null,
}) {
  const [realNow, setRealNow] = useState(() => new Date());
  const [showInsight, setShowInsight] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [theme, setTheme] = useState(getTheme);

  // When viewing a past date, anchor the dial to that day's current-equivalent time
  const now = useMemo(() => {
    if (!referenceDate) return realNow;
    const ref =
      referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const anchored = new Date(ref);
    anchored.setHours(
      realNow.getHours(),
      realNow.getMinutes(),
      realNow.getSeconds(),
      0,
    );
    return anchored;
  }, [referenceDate, realNow]);

  useEffect(() => {
    const id = setInterval(() => setRealNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(getTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const topInsight =
    insights.find((i) => i.severity === "alert") ||
    insights.find((i) => i.severity === "warning") ||
    insights[0] ||
    null;

  useEffect(() => {
    if (!topInsight) return;
    const id = setInterval(() => setShowInsight((v) => !v), 5000);
    return () => clearInterval(id);
  }, [topInsight]);

  const handleCenterClick = () => {
    const el = document.getElementById("dashboard-insights-card");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const parsedActivities = useMemo(
    () =>
      activities.map((a) => {
        if (a.type === "diaper") {
          return { ...a, time: new Date(a.time) };
        }
        return {
          ...a,
          start: new Date(a.start),
          end: a.end ? new Date(a.end) : new Date(),
        };
      }),
    [activities],
  );

  const { arcs, dots } = useMemo(
    () => classifyActivities(parsedActivities),
    [parsedActivities],
  );

  // Compute day/night background gradient based on current hour
  const isNight = useMemo(() => {
    const hour = now.getHours() + now.getMinutes() / 60;
    return dayBrightness(hour) < 0.3;
  }, [now]);

  const bgStyle = useMemo(() => {
    const hour = now.getHours() + now.getMinutes() / 60;
    const brightness = dayBrightness(hour);

    if (brightness > 0.7) {
      return {
        background:
          "linear-gradient(135deg, #FFD700 0%, #87CEEB 30%, #6BB3E0 55%, #7BC67E 100%)",
      };
    } else if (brightness > 0.3) {
      return {
        background:
          "linear-gradient(135deg, #e8956a 0%, #0a1e3a 40%, #0f2848 70%, #3a5a3a 100%)",
      };
    } else {
      return {
        background: "var(--app-bg-start)",
      };
    }
  }, [now]);

  return (
    <div
      className={`activity-dial${isNight ? " is-night" : ""}`}
      style={bgStyle}
    >
      <svg
        className="activity-dial__svg"
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        role="img"
        aria-label="24-hour activity dial"
      >
        {/* Atmosphere gradient ring — 270° arc */}
        <AtmosphereRing theme={theme} />

        {/* 15-minute tick marks along the arc */}
        <TickMarks />

        {/* Outer activity ring — 270° baseline track */}
        <ActivityTrack />

        {/* Activity arcs overlay the track */}
        <ActivityArcs
          arcs={arcs}
          cx={CX}
          cy={CY}
          radius={ACTIVITY_R}
          strokeWidth={ACTIVITY_STROKE}
          onHover={setTooltip}
        />

        {/* Activity dots overlay the track */}
        <ActivityDots
          dots={dots}
          cx={CX}
          cy={CY}
          radius={ACTIVITY_R}
          onHover={setTooltip}
        />

        {/* Bedtime marker on inner ring */}
        <BedtimeMarker bedtime={bedtime} now={now} />

        {/* Hour labels */}
        <HourLabels />

        {/* Red dot for current time */}
        <CurrentTimeDot now={now} />

        {/* Center display */}
        <CenterDisplay
          now={now}
          currentStatus={currentStatus}
          showInsight={showInsight}
          topInsight={topInsight}
          onCenterClick={handleCenterClick}
        />
      </svg>

      {tooltip && (
        <div
          className="activity-dial__tooltip"
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 8,
          }}
        >
          {tooltip.text}
        </div>
      )}

      {bedtime && (
        <div className="activity-dial__bedtime-label">
          <span className="activity-dial__bedtime-title">Usual bedtime</span>
          <span className="activity-dial__bedtime-time">{bedtime}</span>
        </div>
      )}

      <Legend strings={strings} />
    </div>
  );
}
