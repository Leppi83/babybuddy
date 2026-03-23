import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ARC_SPAN,
  ARC_START,
  atmosphereStops,
  hourToAngle,
  pointOnCircle,
  timeToFixedAngle,
  arcDasharray,
  classifyActivities,
  celestialPosition,
  skyGradient,
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

/* ── Stars — fixed random positions, rendered as small circles ── */
const STARS = [
  { x: 10, y: 15, r: 1.2, o: 0.6 },
  { x: 25, y: 8, r: 0.8, o: 0.4 },
  { x: 45, y: 22, r: 1.2, o: 0.5 },
  { x: 65, y: 5, r: 0.8, o: 0.35 },
  { x: 80, y: 18, r: 1.5, o: 0.55 },
  { x: 90, y: 12, r: 0.8, o: 0.4 },
  { x: 15, y: 85, r: 1.1, o: 0.45 },
  { x: 35, y: 92, r: 0.8, o: 0.35 },
  { x: 55, y: 78, r: 1.2, o: 0.5 },
  { x: 75, y: 88, r: 0.8, o: 0.4 },
  { x: 88, y: 82, r: 1.5, o: 0.6 },
  { x: 5, y: 50, r: 0.8, o: 0.3 },
  { x: 95, y: 45, r: 1.1, o: 0.45 },
  { x: 50, y: 3, r: 0.8, o: 0.35 },
  { x: 70, y: 95, r: 0.8, o: 0.3 },
  { x: 20, y: 40, r: 1.5, o: 0.5 },
  { x: 40, y: 60, r: 0.8, o: 0.35 },
  { x: 60, y: 35, r: 1.1, o: 0.45 },
  { x: 82, y: 55, r: 0.8, o: 0.3 },
  { x: 30, y: 70, r: 1.4, o: 0.55 },
  { x: 12, y: 65, r: 0.8, o: 0.4 },
];

/* ── Cloud shapes — organic cubic-bezier paths ─────────────── */
function CloudSVG({ opacity = 0.9 }) {
  return (
    <svg
      viewBox="0 0 500 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "38%", opacity }}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Small wispy cloud, upper-left */}
      <path opacity="0.85" fill="white"
        d="M100,65 Q110,40 135,42 Q148,22 170,32 Q190,20 205,38 Q225,30 232,48 Q245,44 248,58 Q252,68 240,72 L108,72 Q95,72 100,65 Z" />
      {/* Larger fluffy cloud, right side */}
      <path opacity="0.9" fill="white"
        d="M290,68 Q298,48 318,50 Q325,28 350,35 Q368,18 388,30 Q408,22 415,42 Q432,38 435,55 Q440,68 428,72 L298,72 Q285,72 290,68 Z" />
    </svg>
  );
}

/* ── Overcast clouds — layered organic paths ──────────────── */
function OvercastClouds() {
  return (
    <svg
      viewBox="0 0 500 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "50%", opacity: 0.88 }}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Background layer — wide, soft */}
      <path opacity="0.7" fill="rgba(160,170,185,0.9)"
        d="M-20,90 Q0,55 40,60 Q55,35 85,42 Q110,20 140,35 Q165,15 195,30 Q220,18 248,35 Q275,22 300,38 Q325,25 350,40 Q380,28 405,45 Q430,35 455,50 Q480,42 510,58 L520,100 L-20,100 Z" />
      {/* Middle layer — more defined bumps */}
      <path opacity="0.8" fill="rgba(175,185,198,0.92)"
        d="M-10,95 Q15,62 50,68 Q68,42 100,48 Q125,28 155,42 Q180,30 210,45 Q238,32 265,48 Q292,35 320,50 Q348,38 375,52 Q400,42 425,56 Q448,48 475,62 L520,95 L-10,95 Z" />
      {/* Foreground layer — darkest, closest */}
      <path opacity="0.85" fill="rgba(185,195,208,0.95)"
        d="M-15,100 Q10,75 45,80 Q62,58 95,65 Q118,48 148,58 Q172,45 200,58 Q228,48 255,62 Q282,50 310,65 Q338,55 365,68 Q390,58 418,70 Q442,62 470,75 L520,100 L-15,100 Z" />
    </svg>
  );
}

/* ── Rain streaks ──────────────────────────────────────────── */
function RainStreaks() {
  const drops = useMemo(() => {
    const result = [];
    for (let i = 0; i < 18; i++) {
      result.push({
        x: 8 + (i * 5.2) % 84,
        delay: (i * 0.3) % 2,
        length: 12 + (i % 3) * 4,
        opacity: 0.25 + (i % 4) * 0.08,
      });
    }
    return result;
  }, []);
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {drops.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${d.x}%`,
            top: "40%",
            width: 1.5,
            height: d.length,
            background: `rgba(150,180,220,${d.opacity})`,
            borderRadius: 1,
            animation: `rainFall 1.2s ${d.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Snowflakes ────────────────────────────────────────────── */
function Snowflakes() {
  const flakes = useMemo(() => {
    const result = [];
    for (let i = 0; i < 15; i++) {
      result.push({
        x: 5 + (i * 6.8) % 90,
        delay: (i * 0.4) % 3,
        size: 3 + (i % 3) * 1.5,
        opacity: 0.4 + (i % 3) * 0.15,
      });
    }
    return result;
  }, []);
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {flakes.map((f, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${f.x}%`,
            top: "30%",
            width: f.size,
            height: f.size,
            background: `rgba(255,255,255,${f.opacity})`,
            borderRadius: "50%",
            animation: `snowFall 3s ${f.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Celestial position → elliptical orbit outside the dial ring ── */
function celestialToMarginPos(progress, altitude) {
  // The celestial body follows an elliptical arc OUTSIDE the dial ring.
  // progress: 0 = rise (bottom-left), 0.5 = zenith (top-center), 1 = set (bottom-right)
  // altitude: 0..1 (sine curve, peaks at progress=0.5)
  //
  // Strategy: map progress to an angle on an ellipse that hugs the card edges,
  // staying well outside the dial ring which occupies the center ~80% of the card.
  //
  // The ellipse center is at (50%, 50%) of the card.
  // Semi-axes: rx=48% (horizontal), ry=46% (vertical) — fills nearly to card edge.
  // The arc goes from bottom-left (210°) over top (90°) to bottom-right (330°).
  const startAngle = 210; // bottom-left
  const endAngle = 330;   // bottom-right
  const arcSpan = endAngle - startAngle; // 120° doesn't cover enough

  // Map progress 0→1 to angle 210°→-30° (going counter-clockwise over the top)
  // 210° = bottom-left, 90° = top, -30° (=330°) = bottom-right
  const angleDeg = 210 - progress * 240; // 210 to -30
  const angleRad = (angleDeg * Math.PI) / 180;

  // Ellipse semi-axes (as % of card)
  const rx = 48;
  const ry = 46;

  const left = 50 + rx * Math.cos(angleRad);
  const top = 50 - ry * Math.sin(angleRad);

  return {
    left: `${Math.round(Math.max(2, Math.min(98, left)))}%`,
    top: `${Math.round(Math.max(2, Math.min(96, top)))}%`,
  };
}

/* ── Celestial decoration — sun/moon/clouds + weather ──────── */
function CelestialDecoration({ celestial, weather }) {
  const { body, x, altitude, phase } = celestial;

  const sunPos = celestialToMarginPos(x, altitude);

  if (body === "sun" || (body === "twilight" && (celestial.twilightProgress ?? 0) > 0.5)) {
    const sunScale = 0.7 + altitude * 0.3;
    const sunOpacity = body === "twilight" ? 0.5 : 0.95;
    const showSun = weather !== "cloudy" && weather !== "rainy" && weather !== "snowy";
    return (
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {/* Sun glow + core (hidden behind clouds in overcast/rain/snow) */}
        {showSun && (
          <>
            <div style={{
              position: "absolute", left: sunPos.left, top: sunPos.top,
              transform: `translate(-50%, -50%) scale(${sunScale})`,
              width: 80, height: 80, borderRadius: "50%",
              background: "radial-gradient(circle, #FFF176 0%, #FFD600 35%, rgba(255,179,0,0) 70%)",
              opacity: sunOpacity * 0.7,
            }} />
            <div style={{
              position: "absolute", left: sunPos.left, top: sunPos.top,
              transform: "translate(-50%, -50%)",
              width: 36, height: 36, borderRadius: "50%",
              background: "#FFD600", opacity: sunOpacity,
              boxShadow: "0 0 20px 8px rgba(255,214,0,0.3)",
            }} />
          </>
        )}
        {/* Clouds based on weather */}
        {weather === "sunny" && altitude > 0.2 && <CloudSVG opacity={0.9} />}
        {weather === "cloudy" && <OvercastClouds />}
        {(weather === "rainy" || weather === "snowy") && <OvercastClouds />}
        {weather === "rainy" && <RainStreaks />}
        {weather === "snowy" && <Snowflakes />}
      </div>
    );
  }

  if (body === "moon" || (body === "twilight" && (celestial.twilightProgress ?? 1) <= 0.5)) {
    const moonSize = 28;
    const isWaxing = phase < 0.5;
    const illumination = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
    const shadowOffset = isWaxing
      ? moonSize * (1 - illumination)
      : -moonSize * (1 - illumination);

    const moonPos = celestialToMarginPos(x, altitude);

    return (
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {STARS.map((star, i) => (
          <div key={i} className="activity-dial__star" style={{
            position: "absolute", left: `${star.x}%`, top: `${star.y}%`,
            width: star.r * 2, height: star.r * 2, borderRadius: "50%",
            background: "white", opacity: star.o,
          }} />
        ))}
        <svg style={{
          position: "absolute", left: moonPos.left, top: moonPos.top,
          transform: "translate(-50%, -50%)",
          width: moonSize, height: moonSize, overflow: "visible",
        }} viewBox={`0 0 ${moonSize} ${moonSize}`}>
          <clipPath id="moonClip">
            <circle cx={moonSize / 2} cy={moonSize / 2} r={moonSize / 2} />
          </clipPath>
          <g clipPath="url(#moonClip)">
            <circle cx={moonSize / 2} cy={moonSize / 2} r={moonSize / 2} fill="rgba(230,235,245,0.9)" />
            <circle cx={moonSize / 2 + shadowOffset} cy={moonSize / 2}
              r={moonSize / 2} fill="rgba(8,13,30,0.95)" />
          </g>
        </svg>
      </div>
    );
  }

  // Deep twilight — just stars fading in/out
  const starOpacity = 1 - (celestial.twilightProgress ?? 0.5);
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {STARS.map((star, i) => (
        <div key={i} style={{
          position: "absolute", left: `${star.x}%`, top: `${star.y}%`,
          width: star.r * 2, height: star.r * 2, borderRadius: "50%",
          background: "white", opacity: star.o * starOpacity,
        }} />
      ))}
    </div>
  );
}

/* ── Atmosphere ring — pure SVG arcs (iOS-safe, no foreignObject) ── */
function AtmosphereRing({ theme }) {
  const stops = useMemo(() => atmosphereStops(180, theme), [theme]);
  const segments = useMemo(() => {
    const circumference = 2 * Math.PI * ATMO_R;
    const result = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const s0 = stops[i];
      const s1 = stops[i + 1];
      const { dasharray, dashoffset } = arcDasharray(s0.angle, s1.angle, circumference);
      result.push({
        key: i,
        color: s0.color,
        opacity: s0.opacity,
        dasharray,
        dashoffset,
      });
    }
    return result;
  }, [stops]);

  return (
    <g>
      {segments.map((seg) => (
        <circle
          key={seg.key}
          cx={CX}
          cy={CY}
          r={ATMO_R}
          fill="none"
          stroke={seg.color}
          strokeWidth={ATMO_STROKE}
          strokeDasharray={seg.dasharray}
          strokeDashoffset={seg.dashoffset}
          opacity={seg.opacity}
        />
      ))}
    </g>
  );
}

/* ── Tick marks at 15-minute intervals along the 270° arc ───── */
function TickMarks() {
  const ticks = useMemo(() => {
    const result = [];
    for (let i = 0; i <= 96; i++) {
      const hour = (i * 15) / 60;
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
          x1={t.inner.x} y1={t.inner.y} x2={t.outer.x} y2={t.outer.y}
          className="activity-dial__tick"
          strokeWidth={t.isHour ? 1.5 : 0.5}
          opacity={t.isHour ? 0.4 : 0.2}
        />
      ))}
    </g>
  );
}

/* ── Hour labels ─────────────────────────────────────────────── */
function HourLabels() {
  const labels = useMemo(() => {
    const LABEL_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
    const labelR = ATMO_R;
    return LABEL_HOURS.map((hour) => {
      const angle = hourToAngle(hour);
      const { x, y } = pointOnCircle(angle, labelR, CX, CY);
      return { hour, angle, x, y, text: String(hour).padStart(2, "0") };
    });
  }, []);

  return (
    <g>
      {labels.map((l) => (
        <text key={`h${l.hour}`} x={l.x} y={l.y} className="activity-dial__label">
          {l.text}
        </text>
      ))}
    </g>
  );
}

/* ── Bedtime marker ──────────────────────────────────────────── */
function BedtimeMarker({ bedtime, now }) {
  if (!bedtime) return null;
  const [hStr, mStr] = bedtime.split(":");
  const bedDate = new Date(now);
  bedDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  const angle = timeToFixedAngle(bedDate);
  const innerR = ATMO_R - ATMO_STROKE / 2;
  const outerR = ATMO_R + ATMO_STROKE / 2;
  const inner = pointOnCircle(angle, innerR, CX, CY);
  const outer = pointOnCircle(angle, outerR, CX, CY);

  return (
    <g>
      <line
        x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
        stroke="#4a88b8" strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" opacity={0.8}
      />
    </g>
  );
}

/* ── Current time dot ────────────────────────────────────────── */
function CurrentTimeDot({ now }) {
  const angle = timeToFixedAngle(now);
  const innerEdge = ATMO_R - ATMO_STROKE / 2;
  const { x, y } = pointOnCircle(angle, innerEdge, CX, CY);
  return <circle cx={x} cy={y} r={5} fill="#ff4d4f" stroke="#020617" strokeWidth={2} />;
}

/* ── Center display ──────────────────────────────────────────── */
function CenterDisplay({ now, currentStatus, showInsight, topInsight, onCenterClick }) {
  const hasInsight = Boolean(topInsight);
  const insightColor = hasInsight ? (SEVERITY_COLORS[topInsight.severity] ?? SEVERITY_COLORS.info) : null;
  const insightTitle = hasInsight
    ? topInsight.title.length > 22 ? topInsight.title.slice(0, 21) + "\u2026" : topInsight.title
    : null;

  return (
    <g onClick={hasInsight ? onCenterClick : undefined} style={{ cursor: hasInsight ? "pointer" : "default" }}>
      <circle cx={CX} cy={CY} r={CENTER_R} className="activity-dial__center-bg" />
      {showInsight && hasInsight ? (
        <>
          <text x={CX} y={CY - 8} className="activity-dial__center-insight" style={{ fill: insightColor }}>
            {insightTitle}
          </text>
          <text x={CX} y={CY + 12} className="activity-dial__center-hint" style={{ fill: insightColor }}>
            {"\u2193"} Tap for details
          </text>
        </>
      ) : (
        <>
          <text x={CX} y={CY - 4} className="activity-dial__center-time">{formatTime(now)}</text>
          {currentStatus && (
            <text x={CX} y={CY + 16} className="activity-dial__center-status">{currentStatus}</text>
          )}
        </>
      )}
    </g>
  );
}

/* ── Activity track ──────────────────────────────────────────── */
function ActivityTrack() {
  const circumference = 2 * Math.PI * ACTIVITY_R;
  const { dasharray, dashoffset } = arcDasharray(ARC_START, (ARC_START + ARC_SPAN) % 360, circumference);
  return (
    <circle cx={CX} cy={CY} r={ACTIVITY_R} fill="none" className="activity-dial__track"
      strokeWidth={TRACK_STROKE} strokeDasharray={dasharray} strokeDashoffset={dashoffset} />
  );
}

/* ── Activity arcs ───────────────────────────────────────────── */
function ActivityArcs({ arcs, cx, cy, radius, strokeWidth, onHover }) {
  const circumference = 2 * Math.PI * radius;
  return (
    <g>
      {arcs.map((arc, i) => {
        const { dasharray, dashoffset } = arcDasharray(arc.startAngle, arc.endAngle, circumference);
        return (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="none"
            stroke={ACTIVITY_COLORS[arc.type]} strokeWidth={strokeWidth}
            strokeDasharray={dasharray} strokeDashoffset={dashoffset}
            strokeLinecap="round" opacity={0.9} style={{ cursor: "pointer" }}
            onMouseEnter={(e) => onHover?.({ text: arc.tooltip || arc.type, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => onHover?.(null)}
          />
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
          <circle key={i} cx={x} cy={y} r={6} fill={ACTIVITY_COLORS[dot.type]}
            className="activity-dial__dot-stroke" strokeWidth={2}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => onHover?.({ text: dot.tooltip || dot.type, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => onHover?.(null)}
          />
        );
      })}
    </g>
  );
}

/* ── Legend ───────────────────────────────────────────────────── */
function Legend({ strings }) {
  const items = [
    { key: "sleep", color: ACTIVITY_COLORS.sleep, label: strings.sleep, type: "line" },
    { key: "feeding", color: ACTIVITY_COLORS.feeding, label: strings.feed, type: "dot" },
    { key: "breastfeeding", color: ACTIVITY_COLORS.breastfeeding, label: strings.breast || "Breast", type: "dot" },
    { key: "diaper", color: ACTIVITY_COLORS.diaper, label: strings.diaper, type: "dot" },
    { key: "pumping", color: ACTIVITY_COLORS.pumping, label: strings.pump, type: "line" },
  ];
  return (
    <div className="activity-dial__legend">
      {items.map((item) => (
        <span key={item.key} className="activity-dial__legend-item">
          {item.type === "line" ? (
            <span className="activity-dial__legend-line" style={{ background: item.color }} />
          ) : (
            <span className="activity-dial__legend-dot" style={{ background: item.color }} />
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
  sunriseHour = 6,
  sunsetHour = 18,
  weatherCondition = "sunny",
}) {
  const [realNow, setRealNow] = useState(() => new Date());
  const [showInsight, setShowInsight] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [theme, setTheme] = useState(getTheme);

  // ── Debug overrides (temporary) ──
  const [debugHour, setDebugHour] = useState(null); // null = live
  const [debugWeather, setDebugWeather] = useState(null); // null = real

  const now = useMemo(() => {
    if (debugHour !== null) {
      const d = new Date();
      d.setHours(Math.floor(debugHour), (debugHour % 1) * 60, 0, 0);
      return d;
    }
    if (!referenceDate) return realNow;
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const anchored = new Date(ref);
    anchored.setHours(realNow.getHours(), realNow.getMinutes(), realNow.getSeconds(), 0);
    return anchored;
  }, [referenceDate, realNow, debugHour]);

  useEffect(() => {
    const id = setInterval(() => setRealNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(getTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const topInsight = insights.find((i) => i.severity === "alert") || insights.find((i) => i.severity === "warning") || insights[0] || null;

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
    () => activities.map((a) => {
      if (a.type === "diaper") return { ...a, time: new Date(a.time) };
      return { ...a, start: new Date(a.start), end: a.end ? new Date(a.end) : new Date() };
    }),
    [activities],
  );

  const { arcs, dots } = useMemo(() => classifyActivities(parsedActivities), [parsedActivities]);

  // ── Dynamic sky: celestial position drives everything ──
  const celestial = useMemo(
    () => celestialPosition(now, sunriseHour, sunsetHour),
    [now, sunriseHour, sunsetHour],
  );

  const effectiveWeather = debugWeather || weatherCondition;

  const bgStyle = useMemo(
    () => ({ background: skyGradient(celestial, effectiveWeather) }),
    [celestial, effectiveWeather],
  );

  const isNight = !celestial.isDaytime;

  return (
    <div
      className={`activity-dial${isNight ? " is-night" : " is-day"}`}
      style={bgStyle}
    >
      <CelestialDecoration celestial={celestial} weather={effectiveWeather} />

      {/* ── Debug toolbar (temporary — remove when done testing) ── */}
      <div style={{
        position: "relative", zIndex: 10, display: "flex", flexWrap: "wrap",
        gap: 8, alignItems: "center", fontSize: 11, opacity: 0.85,
        background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "6px 10px",
      }}>
        <label style={{ color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
          Hour:
          <input type="range" min="0" max="24" step="0.5"
            value={debugHour ?? now.getHours() + now.getMinutes() / 60}
            onChange={(e) => setDebugHour(parseFloat(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ color: "#ffd666", minWidth: 32 }}>
            {(debugHour ?? now.getHours() + now.getMinutes() / 60).toFixed(1)}
          </span>
        </label>
        <label style={{ color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
          Weather:
          <select value={debugWeather || ""} onChange={(e) => setDebugWeather(e.target.value || null)}
            style={{ background: "#1a1a2e", color: "#fff", border: "1px solid #333", borderRadius: 4, fontSize: 11 }}>
            <option value="">Live ({weatherCondition})</option>
            <option value="sunny">Sunny</option>
            <option value="cloudy">Cloudy</option>
            <option value="rainy">Rainy</option>
            <option value="snowy">Snowy</option>
          </select>
        </label>
        {(debugHour !== null || debugWeather !== null) && (
          <button onClick={() => { setDebugHour(null); setDebugWeather(null); }}
            style={{ background: "#ff4d4f", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>
            Reset
          </button>
        )}
      </div>
      <svg
        className="activity-dial__svg"
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        role="img"
        aria-label="24-hour activity dial"
      >
        <AtmosphereRing theme={theme} />
        <TickMarks />
        <ActivityTrack />
        <ActivityArcs arcs={arcs} cx={CX} cy={CY} radius={ACTIVITY_R} strokeWidth={ACTIVITY_STROKE} onHover={setTooltip} />
        <ActivityDots dots={dots} cx={CX} cy={CY} radius={ACTIVITY_R} onHover={setTooltip} />
        <HourLabels />
        <CurrentTimeDot now={now} />
        <CenterDisplay now={now} currentStatus={currentStatus} showInsight={showInsight} topInsight={topInsight} onCenterClick={handleCenterClick} />
      </svg>

      {tooltip &&
        createPortal(
          <div className="activity-dial__tooltip" style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 36, zIndex: 9999 }}>
            {tooltip.text}
          </div>,
          document.body,
        )}

      <Legend strings={strings} />
    </div>
  );
}
