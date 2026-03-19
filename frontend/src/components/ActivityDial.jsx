import React, { useState, useEffect, useMemo } from "react";
import {
  atmosphereStops,
  dayBrightness,
  pointOnCircle,
  timeToAngle,
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
const ACTIVITY_STROKE = 5;
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
  info: "#1890ff",
};

/* ── Atmosphere ring — CSS conic-gradient for truly smooth blending ── */
function AtmosphereRing({ now, theme }) {
  const stops = useMemo(() => atmosphereStops(now, 24, theme), [now, theme]);

  // Build a CSS conic-gradient string from the stops
  const gradientStr = useMemo(() => {
    const parts = stops.map((s) => `${s.color} ${s.angle.toFixed(1)}deg`);
    // Close the loop by repeating the first stop at 360deg
    parts.push(`${stops[0].color} 360deg`);
    // Rotate so 0° (NOW) is at the top: conic-gradient starts at 3 o'clock,
    // so rotate -90deg to put 0° at 12 o'clock
    return `conic-gradient(from -90deg, ${parts.join(", ")})`;
  }, [stops]);

  const outerR = ATMO_R + ATMO_STROKE / 2;
  const innerR = ATMO_R - ATMO_STROKE / 2;
  const size = outerR * 2;

  return (
    <foreignObject x={CX - outerR} y={CY - outerR} width={size} height={size}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: gradientStr,
          mask: `radial-gradient(circle, transparent ${innerR}px, black ${innerR}px, black ${outerR}px, transparent ${outerR}px)`,
          WebkitMask: `radial-gradient(circle, transparent ${innerR}px, black ${innerR}px, black ${outerR}px, transparent ${outerR}px)`,
        }}
      />
    </foreignObject>
  );
}

/* ── Tick marks at 15-minute intervals ───────────────────────── */
function TickMarks({ now }) {
  const ticks = useMemo(() => {
    const result = [];
    for (let i = 0; i < 96; i++) {
      // 96 ticks = every 15 minutes
      const minuteOffset = i * 15;
      const t = new Date(now.getTime() + minuteOffset * 60000);
      // Wrap to same 24h window
      const angle = (minuteOffset / (24 * 60)) * 360;
      const isHour = minuteOffset % 60 === 0;
      const innerR = ATMO_R - ATMO_STROKE / 2;
      const outerR = ATMO_R - ATMO_STROKE / 2 + (isHour ? 6 : 3);
      const inner = pointOnCircle(angle, innerR, CX, CY);
      const outer = pointOnCircle(angle, outerR, CX, CY);
      result.push({ inner, outer, isHour, key: i });
    }
    return result;
  }, [now]);

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

/* ── Hour labels — snapped to same angles as hourly tick marks ─ */
function HourLabels({ now }) {
  const labels = useMemo(() => {
    const LABEL_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
    const nowHour = now.getHours() + now.getMinutes() / 60;
    const labelR = ATMO_R - 16; // inside the atmosphere ring
    return LABEL_HOURS.map((hour) => {
      // Compute hour offset from now, matching tick mark angle formula
      let hourOffset = hour - nowHour;
      if (hourOffset < 0) hourOffset += 24;
      const angle = (hourOffset / 24) * 360;
      const { x, y } = pointOnCircle(angle, labelR, CX, CY);
      return { hour, angle, x, y };
    });
  }, [now]);
  return (
    <g>
      {labels.map((l) => {
        const brightness = dayBrightness(l.hour);
        const opacity = 0.6 + brightness * 0.4;
        return (
          <text
            key={l.hour}
            x={l.x}
            y={l.y}
            className="activity-dial__label"
            opacity={opacity}
          >
            {l.hour === 0 ? 24 : l.hour}
          </text>
        );
      })}
    </g>
  );
}

/* ── Bedtime marker — dot + bed icon ─────────────────────────── */
function BedtimeMarker({ bedtime, now }) {
  if (!bedtime) return null;
  const [hStr, mStr] = bedtime.split(":");
  const bedDate = new Date(now);
  bedDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  const angle = timeToAngle(bedDate, now);
  const pos = pointOnCircle(angle, ATMO_R, CX, CY);

  const iconPos = pointOnCircle(angle, ATMO_R - 14, CX, CY);

  return (
    <g>
      {/* Dot at exact bedtime position on atmosphere ring */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={4}
        fill="#818cf8"
        stroke="var(--app-card-bg-start, #020617)"
        strokeWidth={1.5}
      >
        <title>
          Bedtime: {hStr}:{mStr}
        </title>
      </circle>
      {/* Bed SVG icon — inset on the atmosphere ring */}
      <g
        transform={`translate(${iconPos.x - 6}, ${iconPos.y - 6}) scale(0.5)`}
        opacity={0.85}
        style={{ pointerEvents: "none" }}
      >
        <rect x="2" y="14" width="20" height="2" rx="1" fill="#818cf8" />
        <rect x="3" y="8" width="8" height="6" rx="2" fill="#818cf8" />
        <path d="M13 10h6a2 2 0 0 1 2 2v2H13v-4z" fill="#818cf8" />
        <rect x="3" y="14" width="1.5" height="3" rx="0.5" fill="#818cf8" />
        <rect x="19.5" y="14" width="1.5" height="3" rx="0.5" fill="#818cf8" />
        <circle cx="7" cy="7" r="2" fill="#818cf8" />
      </g>
    </g>
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
      ? topInsight.title.slice(0, 21) + "…"
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
            ↓ Tap for details
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

/* ── Activity arcs ───────────────────────────────────────────── */
function ActivityArcs({ arcs, cx, cy, radius, strokeWidth }) {
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
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: `${cx}px ${cy}px`,
              cursor: "pointer",
            }}
          >
            <title>{arc.tooltip || arc.type}</title>
          </circle>
        );
      })}
    </g>
  );
}

/* ── Activity dots ───────────────────────────────────────────── */
function ActivityDots({ dots, cx, cy, radius }) {
  return (
    <g>
      {dots.map((dot, i) => {
        const { x, y } = pointOnCircle(dot.angle, radius, cx, cy);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={5}
            fill={ACTIVITY_COLORS[dot.type]}
            className="activity-dial__dot-stroke"
            strokeWidth={1.5}
            style={{ cursor: "pointer" }}
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
  const [theme, setTheme] = useState(getTheme);

  // When viewing a past date, anchor the dial to that day's current-equivalent time
  // so activities render at the correct angular positions
  const now = useMemo(() => {
    if (!referenceDate) return realNow;
    const ref =
      referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    // Set hours/minutes/seconds from real now onto the reference date
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
    () => classifyActivities(parsedActivities, now),
    [parsedActivities, now],
  );

  return (
    <div className="activity-dial">
      <svg
        className="activity-dial__svg"
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        role="img"
        aria-label="24-hour activity dial"
      >
        {/* Atmosphere gradient ring */}
        <AtmosphereRing now={now} theme={theme} />

        {/* 15-minute tick marks */}
        <TickMarks now={now} />

        {/* Outer activity ring — thin baseline track */}
        <circle
          cx={CX}
          cy={CY}
          r={ACTIVITY_R}
          fill="none"
          className="activity-dial__track"
          strokeWidth={ACTIVITY_STROKE}
        />

        {/* Activity arcs overlay the track */}
        <ActivityArcs
          arcs={arcs}
          cx={CX}
          cy={CY}
          radius={ACTIVITY_R}
          strokeWidth={ACTIVITY_STROKE}
        />

        {/* Activity dots overlay the track */}
        <ActivityDots dots={dots} cx={CX} cy={CY} radius={ACTIVITY_R} />

        {/* Bedtime marker on inner ring */}
        <BedtimeMarker bedtime={bedtime} now={now} />

        {/* Hour labels */}
        <HourLabels now={now} />

        {/* Center display */}
        <CenterDisplay
          now={now}
          currentStatus={currentStatus}
          showInsight={showInsight}
          topInsight={topInsight}
          onCenterClick={handleCenterClick}
        />
      </svg>

      <Legend strings={strings} />
    </div>
  );
}
