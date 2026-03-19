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

/* ── Layout constants (spec §2) ──────────────────────────────── */
const SVG_SIZE = 380;
const CX = 190;
const CY = 190;
const ATMO_R = 125;
const ATMO_STROKE = 38;
const ACTIVITY_R = 162;
const ACTIVITY_STROKE = 7;
const CENTER_R = 80;

/* ── Deterministic star seed for night zones ─────────────────── */
const STAR_SEED = [
  0.12, 0.87, 0.34, 0.62, 0.91, 0.05, 0.73, 0.48, 0.29, 0.56, 0.81, 0.17,
  0.68, 0.39, 0.94, 0.02, 0.53, 0.76, 0.21, 0.44, 0.88, 0.33, 0.61, 0.09,
];

/**
 * Generate star positions scattered inside the atmosphere ring's dark zones.
 * Stars appear where dayBrightness < 0.3.
 */
function buildStars(now) {
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const stars = [];
  const count = STAR_SEED.length;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360;
    const hourOffset = angle / 15; // 15 deg per hour
    const absHour = (nowHour + hourOffset) % 24;

    if (dayBrightness(absHour) >= 0.3) continue;

    // Scatter within the atmosphere ring band
    const rJitter = ATMO_R + (STAR_SEED[i] - 0.5) * (ATMO_STROKE - 4);
    const aJitter = angle + (STAR_SEED[(i + 7) % count] - 0.5) * 12;
    const { x, y } = pointOnCircle(aJitter, rJitter, CX, CY);
    const radius = 0.7 + STAR_SEED[(i + 3) % count] * 0.8;
    const opacity = 0.3 + STAR_SEED[(i + 5) % count] * 0.3;

    stars.push({ x, y, r: radius, opacity, key: i });
  }

  return stars;
}

/**
 * Format current time as HH:MM for center display.
 */
function formatTime(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/* ── Sub-components ──────────────────────────────────────────── */

function AtmosphereRing({ now }) {
  const stops = useMemo(() => atmosphereStops(now, 72), [now]);
  const stepDeg = 360 / stops.length;
  const circumference = 2 * Math.PI * ATMO_R;

  return (
    <g>
      {stops.map((stop, i) => {
        const arcLen = (stepDeg / 360) * circumference * 1.15; // slight overlap
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

function HourLabels({ now }) {
  const labels = useMemo(
    () => hourLabels(now, ATMO_R, CX, CY),
    [now],
  );

  return (
    <g>
      {labels.map((l) => {
        const opacity = 0.35 + dayBrightness(l.hour) * 0.65;
        return (
          <text
            key={l.hour}
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

function BedtimeMarker({ bedtime, now }) {
  if (!bedtime) return null;

  const [hStr, mStr] = bedtime.split(":");
  const bedDate = new Date(now);
  bedDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);

  const angle = timeToAngle(bedDate, now);

  const innerR = ATMO_R - ATMO_STROKE / 2 - 2;
  const outerR = ATMO_R + ATMO_STROKE / 2 + 2;
  const inner = pointOnCircle(angle, innerR, CX, CY);
  const outer = pointOnCircle(angle, outerR, CX, CY);
  const labelPos = pointOnCircle(angle, outerR + 12, CX, CY);

  return (
    <g opacity={0.7}>
      <line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke="#818cf8"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <text
        x={labelPos.x}
        y={labelPos.y}
        className="activity-dial__bedtime-label"
      >
        &#9789;
      </text>
    </g>
  );
}

function NowMarker() {
  // Small triangle at top of dial pointing inward
  const tipY = CY - ACTIVITY_R - 7 + 14;
  const baseY = CY - ACTIVITY_R - 7;
  return (
    <polygon
      points={`${CX},${tipY} ${CX - 4},${baseY} ${CX + 4},${baseY}`}
      className="activity-dial__now-marker"
    />
  );
}

function CenterDisplay({ now, currentStatus }) {
  return (
    <g>
      <circle cx={CX} cy={CY} r={CENTER_R} fill="#020617" opacity={0.92} />
      <text x={CX} y={CY - 6} className="activity-dial__center-time">
        {formatTime(now)}
      </text>
      {currentStatus && (
        <text x={CX} y={CY + 12} className="activity-dial__center-status">
          {currentStatus}
        </text>
      )}
    </g>
  );
}

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
            {arc.tooltip && <title>{arc.tooltip}</title>}
          </circle>
        );
      })}
    </g>
  );
}

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
            stroke="#020617"
            strokeWidth={1.5}
            style={{ cursor: "pointer" }}
          >
            {dot.tooltip && <title>{dot.tooltip}</title>}
          </circle>
        );
      })}
    </g>
  );
}

function Legend({ strings }) {
  const items = [
    { key: "sleep", color: ACTIVITY_COLORS.sleep, label: strings.sleep, type: "line" },
    { key: "feeding", color: ACTIVITY_COLORS.feeding, label: strings.feed, type: "line" },
    { key: "diaper", color: ACTIVITY_COLORS.diaper, label: strings.diaper, type: "dot" },
    { key: "pumping", color: ACTIVITY_COLORS.pumping, label: strings.pump, type: "line" },
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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const parsedActivities = useMemo(
    () =>
      activities.map((a) => {
        if (a.type === "diaper") {
          return { ...a, time: new Date(a.time) };
        }
        return { ...a, start: new Date(a.start), end: new Date(a.end) };
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
        <AtmosphereRing now={now} />

        {/* Stars in night zones */}
        <Stars now={now} />

        {/* Activity ring track */}
        <circle
          cx={CX}
          cy={CY}
          r={ACTIVITY_R}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={ACTIVITY_STROKE}
        />

        {/* Activity arcs (sleep, feeding, pumping) */}
        <ActivityArcs
          arcs={arcs}
          cx={CX}
          cy={CY}
          radius={ACTIVITY_R}
          strokeWidth={ACTIVITY_STROKE}
        />

        {/* Activity dots (diaper changes) */}
        <ActivityDots dots={dots} cx={CX} cy={CY} radius={ACTIVITY_R} />

        {/* Bedtime marker */}
        <BedtimeMarker bedtime={bedtime} now={now} />

        {/* Hour labels on atmosphere ring */}
        <HourLabels now={now} />

        {/* NOW marker */}
        <NowMarker />

        {/* Center circle with time + status */}
        <CenterDisplay now={now} currentStatus={currentStatus} />
      </svg>

      <Legend strings={strings} />
    </div>
  );
}
