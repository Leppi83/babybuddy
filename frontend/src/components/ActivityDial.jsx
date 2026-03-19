import React, { useState, useEffect, useMemo } from "react";
import {
  atmosphereStops,
  hourLabels,
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

/* ── Star positions for night sky ────────────────────────────── */
const STAR_SEED = [
  0.12, 0.87, 0.34, 0.62, 0.91, 0.05, 0.73, 0.48, 0.29, 0.56, 0.81, 0.17, 0.68,
  0.39, 0.94, 0.02, 0.53, 0.76, 0.21, 0.44, 0.88, 0.33, 0.61, 0.09,
];

function buildStars(now) {
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const stars = [];
  const count = STAR_SEED.length;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360;
    const absHour = (nowHour + angle / 15) % 24;
    if (dayBrightness(absHour) >= 0.3) continue;
    const rJitter = ATMO_R + (STAR_SEED[i] - 0.5) * (ATMO_STROKE - 4);
    const aJitter = angle + (STAR_SEED[(i + 7) % count] - 0.5) * 12;
    const { x, y } = pointOnCircle(aJitter, rJitter, CX, CY);
    stars.push({
      x,
      y,
      r: 0.7 + STAR_SEED[(i + 3) % count] * 0.8,
      opacity: 0.3 + STAR_SEED[(i + 5) % count] * 0.3,
      key: i,
    });
  }
  return stars;
}

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

/* ── Atmosphere ring — smooth gradient, no visible segments ── */
function AtmosphereRing({ now, theme }) {
  // Use many stops for smooth blending with generous overlap
  const stops = useMemo(() => atmosphereStops(now, 120, theme), [now, theme]);
  const stepDeg = 360 / stops.length;
  const circumference = 2 * Math.PI * ATMO_R;

  return (
    <g>
      {stops.map((stop, i) => {
        // Each segment overlaps the next by 50% to hide seams
        const arcLen = (stepDeg / 360) * circumference * 1.6;
        const gapLen = circumference - arcLen;
        const svgStart = stop.angle - 90;
        const offset = -((svgStart / 360) * circumference);
        return (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={ATMO_R}
            fill="none"
            stroke={stop.color}
            strokeWidth={ATMO_STROKE}
            strokeDasharray={`${arcLen.toFixed(2)} ${gapLen.toFixed(2)}`}
            strokeDashoffset={offset}
            opacity={stop.opacity}
          />
        );
      })}
    </g>
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

/* ── Hour labels ─────────────────────────────────────────────── */
function HourLabels({ now }) {
  const labels = useMemo(() => hourLabels(now, ATMO_R, CX, CY), [now]);
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

/* ── Stars in night zones ────────────────────────────────────── */
function Stars({ now }) {
  const stars = useMemo(() => buildStars(now), [now]);
  return (
    <g>
      {stars.map((s) => (
        <circle
          key={s.key}
          cx={s.x}
          cy={s.y}
          r={s.r}
          className="activity-dial__star"
          opacity={s.opacity}
        />
      ))}
    </g>
  );
}

/* ── Bedtime marker — dot + small moon icon ──────────────────── */
function BedtimeMarker({ bedtime, now }) {
  if (!bedtime) return null;
  const [hStr, mStr] = bedtime.split(":");
  const bedDate = new Date(now);
  bedDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  const angle = timeToAngle(bedDate, now);
  const pos = pointOnCircle(angle, ATMO_R, CX, CY);

  return (
    <g>
      {/* Dot at exact bedtime position */}
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
      {/* Small moon icon offset slightly outward */}
      <text
        x={pos.x}
        y={pos.y - 12}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: "10px", pointerEvents: "none", userSelect: "none" }}
      >
        🌙
      </text>
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
}) {
  const [now, setNow] = useState(() => new Date());
  const [showInsight, setShowInsight] = useState(false);
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
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

        {/* Stars in night zones */}
        <Stars now={now} />

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
