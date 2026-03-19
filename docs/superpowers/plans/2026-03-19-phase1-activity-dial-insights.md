# Phase 1: Activity Dial + Insights Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 19-card child dashboard with a streamlined view containing a 24h activity dial and an always-visible insights card.

**Architecture:** New `ActivityDial` SVG component renders a 24h clock with day/night atmosphere ring and outer activity ring. New `DashboardInsightsCard` component replaces the dismiss-able banner. Both are composed into a new lean `ChildDashboardPage` that replaces the current 3685-line version. The Django `ChildDashboard` view is simplified to only serialize dial-relevant data (24h of activities) and insights. Existing API endpoints are reused for data. A "Classic View" toggle preserves access to old cards during transition.

**Tech Stack:** React 18, Ant Design 5, SVG (inline JSX), dayjs, Django 5, existing REST API endpoints.

**Spec:** `docs/superpowers/specs/2026-03-19-dashboard-redesign-design.md` §2–§3, §13, §16

---

## File Structure

### New Files

| File                                                | Responsibility                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `frontend/src/components/ActivityDial.jsx`          | SVG activity dial: atmosphere ring, activity ring, center, tooltips         |
| `frontend/src/components/ActivityDial.css`          | Dial-specific styles, animations, tooltip positioning                       |
| `frontend/src/components/DashboardInsightsCard.jsx` | Always-visible insights card with severity grouping, actions, AI summary    |
| `frontend/src/lib/dial-utils.js`                    | Pure functions: angle calculations, time→position, arc math, gradient stops |
| `frontend/src/lib/__tests__/dial-utils.test.js`     | Unit tests for dial math                                                    |

### Modified Files

| File                                    | Changes                                                                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/pages/DashboardPages.jsx` | Add new `ChildDashboardPageV2` component (~200 lines) alongside existing. Wire via feature check.                      |
| `frontend/src/components/AppShell.jsx`  | No changes in Phase 1 (nav changes are Phase 3)                                                                        |
| `frontend/src/App.jsx`                  | No changes needed — pageType `"dashboard-child"` already routes to `ChildDashboardPage`                                |
| `frontend/src/index.css`                | Add typography tokens (`--font-title`, `--font-body`, `--font-chart`, `--font-caption`)                                |
| `frontend/src/lib/app-utils.jsx`        | Add activity color constants, export for dial                                                                          |
| `dashboard/views.py`                    | Add `_build_dial_bootstrap()` helper that serializes 24h of activities for the dial. Add `use_dial` flag to bootstrap. |
| `babybuddy/views.py`                    | Add `dashboard_use_dial` to settings bootstrap (user preference toggle)                                                |
| `babybuddy/models.py`                   | Add `dashboard_use_dial` BooleanField to Settings (default True)                                                       |

---

## Task 1: Dial Math Utilities

**Files:**

- Create: `frontend/src/lib/dial-utils.js`
- Create: `frontend/src/lib/__tests__/dial-utils.test.js`

The dial needs pure math functions to convert times to angles and compute SVG arc parameters. Build and test these first — no UI yet.

- [ ] **Step 1: Create test file with initial tests**

```js
// frontend/src/lib/__tests__/dial-utils.test.js
import { describe, it, expect } from "vitest";
import {
  timeToAngle,
  arcDasharray,
  pointOnCircle,
  hourLabels,
} from "../dial-utils";

describe("timeToAngle", () => {
  it("returns 0 for the current time (NOW at top)", () => {
    const now = new Date("2026-03-19T14:30:00");
    expect(timeToAngle(now, now)).toBe(0);
  });

  it("returns 180 for 12 hours ago (bottom of dial)", () => {
    const now = new Date("2026-03-19T14:30:00");
    const twelve = new Date("2026-03-19T02:30:00");
    expect(timeToAngle(twelve, now)).toBe(180);
  });

  it("returns 90 for 6 hours ahead (right side — counter-clockwise)", () => {
    const now = new Date("2026-03-19T14:30:00");
    const sixAhead = new Date("2026-03-19T20:30:00");
    // Counter-clockwise: future is to the right = positive angles
    expect(timeToAngle(sixAhead, now)).toBe(90);
  });

  it("returns -90 (or 270) for 6 hours ago (left side)", () => {
    const now = new Date("2026-03-19T14:30:00");
    const sixAgo = new Date("2026-03-19T08:30:00");
    const angle = timeToAngle(sixAgo, now);
    expect(angle).toBe(270); // normalized to 0-360
  });
});

describe("arcDasharray", () => {
  it("computes dasharray and offset for a given start/end angle", () => {
    const circumference = 1000;
    const result = arcDasharray(90, 180, circumference);
    expect(result.dasharray).toContain(" ");
    expect(result.offset).toBeDefined();
    expect(typeof result.offset).toBe("number");
  });

  it("handles arcs that cross 0 degrees", () => {
    const circumference = 1000;
    const result = arcDasharray(350, 10, circumference);
    expect(result.dasharray).toBeDefined();
  });
});

describe("pointOnCircle", () => {
  it("returns top of circle for 0 degrees", () => {
    const { x, y } = pointOnCircle(0, 100, 100, 100);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(0);
  });

  it("returns right of circle for 90 degrees", () => {
    const { x, y } = pointOnCircle(90, 100, 100, 100);
    expect(x).toBeCloseTo(200);
    expect(y).toBeCloseTo(100);
  });
});

describe("hourLabels", () => {
  it("returns 8 labels for the 24h clock", () => {
    const now = new Date("2026-03-19T14:30:00");
    const labels = hourLabels(now);
    expect(labels).toHaveLength(8);
    expect(labels[0]).toHaveProperty("hour");
    expect(labels[0]).toHaveProperty("angle");
    expect(labels[0]).toHaveProperty("x");
    expect(labels[0]).toHaveProperty("y");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/__tests__/dial-utils.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement dial-utils.js**

```js
// frontend/src/lib/dial-utils.js

/**
 * Convert a Date to its angle on the dial relative to `now`.
 * NOW is at 0° (top). Counter-clockwise rotation:
 *   - Future (right side) = positive angles 0°→90°
 *   - Past (left side) = 270°→360°
 *
 * @param {Date} time - The time to place on the dial
 * @param {Date} now - Current time (top of dial)
 * @returns {number} Angle in degrees, 0-360
 */
export function timeToAngle(time, now) {
  const diffMs = time.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  // 360° = 24h, counter-clockwise: future = right = positive
  let angle = (diffHours / 24) * 360;
  // Normalize to 0-360
  angle = ((angle % 360) + 360) % 360;
  return angle;
}

/**
 * Compute SVG stroke-dasharray and stroke-dashoffset for an arc.
 *
 * @param {number} startAngle - Start angle in degrees (0=top)
 * @param {number} endAngle - End angle in degrees
 * @param {number} circumference - Circle circumference in px
 * @returns {{ dasharray: string, offset: number }}
 */
export function arcDasharray(startAngle, endAngle, circumference) {
  let sweep = endAngle - startAngle;
  if (sweep <= 0) sweep += 360;
  const arcLength = (sweep / 360) * circumference;
  const gapLength = circumference - arcLength;
  // SVG dashoffset: negative = shift forward (clockwise from 3 o'clock default)
  // We rotate -90° in SVG to put 0° at top, so offset from startAngle
  const offset = -(startAngle / 360) * circumference;
  return {
    dasharray: `${arcLength} ${gapLength}`,
    offset,
  };
}

/**
 * Get (x, y) coordinates for a point on a circle at a given angle.
 * 0° = top center, clockwise.
 *
 * @param {number} angleDeg - Angle in degrees (0=top, 90=right)
 * @param {number} radius
 * @param {number} cx - Circle center x
 * @param {number} cy - Circle center y
 * @returns {{ x: number, y: number }}
 */
export function pointOnCircle(angleDeg, radius, cx, cy) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/**
 * Generate hour label positions for the dial.
 * Labels at 0, 3, 6, 9, 12, 15, 18, 21.
 *
 * @param {Date} now - Current time
 * @param {number} radius - Label ring radius
 * @param {number} cx - Center x
 * @param {number} cy - Center y
 * @returns {Array<{ hour: number, angle: number, x: number, y: number }>}
 */
export function hourLabels(now, radius = 125, cx = 190, cy = 190) {
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];
  return hours.map((hour) => {
    const labelTime = new Date(now);
    labelTime.setHours(hour, 0, 0, 0);
    // If this puts it more than 12h ahead, subtract a day
    if (labelTime.getTime() - now.getTime() > 12 * 60 * 60 * 1000) {
      labelTime.setDate(labelTime.getDate() - 1);
    }
    // If more than 12h behind, add a day
    if (now.getTime() - labelTime.getTime() > 12 * 60 * 60 * 1000) {
      labelTime.setDate(labelTime.getDate() + 1);
    }
    const angle = timeToAngle(labelTime, now);
    const pos = pointOnCircle(angle, radius, cx, cy);
    return { hour, angle, ...pos };
  });
}

/**
 * Compute the day/night brightness for a given hour (0-23).
 * Returns a value 0 (darkest, midnight) to 1 (brightest, noon).
 *
 * @param {number} hour - Hour of day (0-23)
 * @returns {number} Brightness 0-1
 */
export function dayBrightness(hour) {
  // Sinusoidal: peak at 12 (noon), trough at 0 (midnight)
  return (Math.cos(((hour - 12) / 12) * Math.PI) + 1) / 2;
}

/**
 * Generate atmosphere gradient stops for the day/night ring.
 * Returns an array of { angle, color } for smooth blending.
 *
 * @param {Date} now - Current time
 * @param {number} steps - Number of gradient steps (default 48 for smooth)
 * @returns {Array<{ angle: number, color: string, opacity: number }>}
 */
export function atmosphereStops(now, steps = 48) {
  const stops = [];
  for (let i = 0; i < steps; i++) {
    const hoursOffset = (i / steps) * 24 - 12; // -12 to +12 from now
    const t = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);
    const hour = t.getHours() + t.getMinutes() / 60;
    const brightness = dayBrightness(hour);
    const angle = timeToAngle(t, now);

    // Interpolate between night (#060b18) and day (#87CEEB)
    const r = Math.round(6 + brightness * (135 - 6));
    const g = Math.round(11 + brightness * (206 - 11));
    const b = Math.round(24 + brightness * (235 - 24));
    stops.push({
      angle,
      color: `rgb(${r}, ${g}, ${b})`,
      opacity: 0.9,
    });
  }
  return stops;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/__tests__/dial-utils.test.js`
Expected: PASS (all tests green)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/dial-utils.js frontend/src/lib/__tests__/dial-utils.test.js
git commit -m "feat: add dial math utilities with tests"
```

---

## Task 2: Typography and Activity Color Tokens

**Files:**

- Modify: `frontend/src/index.css`
- Modify: `frontend/src/lib/app-utils.jsx`

Add the typography scale and centralized activity color constants defined in the spec §13 and §1.

- [ ] **Step 1: Add typography CSS custom properties**

In `frontend/src/index.css`, add to the `:root` block (after the existing `--app-*` variables):

```css
/* Typography scale (spec §13) */
--font-title-size: 14px;
--font-title-weight: 600;
--font-body-size: 12px;
--font-body-weight: 400;
--font-chart-size: 10px;
--font-chart-weight: 400;
--font-caption-size: 14px;
--font-caption-weight: 500;
```

Add the same tokens in the `:root[data-theme="light"]` block (same values — sizes don't change per theme).

- [ ] **Step 2: Add activity color constants to app-utils.jsx**

In `frontend/src/lib/app-utils.jsx`, add after the existing `SECTION_META`:

```js
/**
 * Core activity colors — used by the activity dial and throughout the app.
 * These match the spec §1 activity type table.
 */
export const ACTIVITY_COLORS = {
  sleep: "#fbbf24",
  feeding: "#38bdf8",
  diaper: "#ff6b8b",
  pumping: "#c084fc",
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css frontend/src/lib/app-utils.jsx
git commit -m "feat: add typography scale tokens and activity color constants"
```

---

## Task 3: ActivityDial Component — Atmosphere Ring

**Files:**

- Create: `frontend/src/components/ActivityDial.jsx`
- Create: `frontend/src/components/ActivityDial.css`

Build the inner atmosphere ring first (day/night gradient, hour labels, celestial accents, bedtime marker). No activity data yet.

- [ ] **Step 1: Create ActivityDial.css**

```css
/* frontend/src/components/ActivityDial.css */
.activity-dial {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.activity-dial svg {
  max-width: 100%;
  height: auto;
}

.activity-dial__label {
  font-size: var(--font-chart-size, 10px);
  font-weight: var(--font-chart-weight, 400);
  fill: currentColor;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
  user-select: none;
}

.activity-dial__center-time {
  font-size: var(--font-body-size, 12px);
  font-weight: 600;
  fill: var(--app-text-primary, #f1f5f9);
  text-anchor: middle;
}

.activity-dial__center-status {
  font-size: var(--font-chart-size, 10px);
  fill: var(--app-text-secondary, #94a3b8);
  text-anchor: middle;
}

.activity-dial__legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
  font-size: var(--font-chart-size, 10px);
  color: var(--app-text-secondary, #94a3b8);
}

.activity-dial__legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.activity-dial__legend-line {
  width: 16px;
  height: 4px;
  border-radius: 2px;
  display: inline-block;
}

.activity-dial__legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.activity-dial__tooltip {
  position: absolute;
  background: var(--app-card-bg-start, #1e293b);
  border: 1px solid var(--app-card-border, #1e3a5f);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: var(--font-chart-size, 10px);
  color: var(--app-text-primary, #f1f5f9);
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 2: Create ActivityDial.jsx with atmosphere ring and center**

```jsx
// frontend/src/components/ActivityDial.jsx
import { useMemo, useState, useEffect } from "react";
import {
  timeToAngle,
  arcDasharray,
  pointOnCircle,
  hourLabels,
  atmosphereStops,
  dayBrightness,
} from "../lib/dial-utils";
import { ACTIVITY_COLORS } from "../lib/app-utils";
import "./ActivityDial.css";

const SIZE = 380;
const CX = SIZE / 2;
const CY = SIZE / 2;
const ATMO_R = 125;
const ATMO_STROKE = 38;
const ACTIVITY_R = 162;
const ACTIVITY_STROKE = 7;

export function ActivityDial({
  activities = [],
  bedtime = null,
  currentStatus = null,
  insights = [],
  strings = {},
}) {
  const [now, setNow] = useState(() => new Date());

  // Update every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const atmoCirc = 2 * Math.PI * ATMO_R;
  const stops = useMemo(() => atmosphereStops(now), [now]);
  const labels = useMemo(() => hourLabels(now, ATMO_R, CX, CY), [now]);

  // Bedtime marker
  const bedtimeAngle = useMemo(() => {
    if (!bedtime) return null;
    const [h, m] = bedtime.split(":").map(Number);
    const bt = new Date(now);
    bt.setHours(h, m, 0, 0);
    if (bt.getTime() - now.getTime() > 12 * 60 * 60 * 1000) {
      bt.setDate(bt.getDate() - 1);
    }
    if (now.getTime() - bt.getTime() > 12 * 60 * 60 * 1000) {
      bt.setDate(bt.getDate() + 1);
    }
    return timeToAngle(bt, now);
  }, [bedtime, now]);

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="activity-dial">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* ── Atmosphere ring (gradient segments) ── */}
        {stops.map((stop, i) => {
          const nextStop = stops[(i + 1) % stops.length];
          let sweep = nextStop.angle - stop.angle;
          if (sweep <= 0) sweep += 360;
          const arcLen = (sweep / 360) * atmoCirc;
          const offset = -(stop.angle / 360) * atmoCirc;
          return (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={ATMO_R}
              fill="none"
              stroke={stop.color}
              strokeWidth={ATMO_STROKE}
              strokeDasharray={`${arcLen + 2} ${atmoCirc - arcLen - 2}`}
              strokeDashoffset={offset}
              opacity={stop.opacity}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: `${CX}px ${CY}px`,
              }}
            />
          );
        })}

        {/* ── Stars (night zone) ── */}
        <Stars now={now} cx={CX} cy={CY} radius={ATMO_R} />

        {/* ── Hour labels on the atmosphere ring ── */}
        {labels.map(({ hour, x, y }) => {
          const brightness = dayBrightness(hour);
          const opacity = 0.2 + brightness * 0.4;
          return (
            <text
              key={hour}
              x={x}
              y={y}
              className="activity-dial__label"
              style={{ opacity }}
            >
              {hour}
            </text>
          );
        })}

        {/* ── Bedtime marker ── */}
        {bedtimeAngle != null && (
          <BedtimeMarker
            angle={bedtimeAngle}
            cx={CX}
            cy={CY}
            radius={ATMO_R}
            strokeWidth={ATMO_STROKE}
          />
        )}

        {/* ── NOW marker (triangle at top) ── */}
        <polygon
          points={`${CX},${CY - ACTIVITY_R - 8} ${CX - 4},${CY - ACTIVITY_R} ${CX + 4},${CY - ACTIVITY_R}`}
          fill="#fbbf24"
        />

        {/* ── Center ── */}
        <circle
          cx={CX}
          cy={CY}
          r={80}
          fill="var(--app-card-bg-start, #0b1120)"
          stroke="var(--app-card-border, #1e3a5f)"
          strokeWidth={0.5}
        />
        <text x={CX} y={CY - 10} className="activity-dial__center-time">
          {timeStr}
        </text>
        <text
          x={CX}
          y={CY + 10}
          className="activity-dial__center-status"
          fill="#fbbf24"
        >
          {currentStatus || ""}
        </text>
      </svg>

      {/* ── Legend ── */}
      <div className="activity-dial__legend">
        <span className="activity-dial__legend-item">
          <span
            className="activity-dial__legend-line"
            style={{ background: ACTIVITY_COLORS.sleep }}
          />
          {strings.sleep || "Sleep"}
        </span>
        <span className="activity-dial__legend-item">
          <span
            className="activity-dial__legend-line"
            style={{ background: ACTIVITY_COLORS.feeding }}
          />
          {strings.feed || "Feed"}
        </span>
        <span className="activity-dial__legend-item">
          <span
            className="activity-dial__legend-dot"
            style={{ background: ACTIVITY_COLORS.diaper }}
          />
          {strings.diaper || "Diaper"}
        </span>
        <span className="activity-dial__legend-item">
          <span
            className="activity-dial__legend-line"
            style={{ background: ACTIVITY_COLORS.pumping }}
          />
          {strings.pump || "Pump"}
        </span>
      </div>
    </div>
  );
}

/** Stars scattered in night zones of the atmosphere ring */
function Stars({ now, cx, cy, radius }) {
  const stars = useMemo(() => {
    const result = [];
    for (let i = 0; i < 15; i++) {
      const hoursOffset = (i / 15) * 24 - 12;
      const t = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);
      const hour = t.getHours() + t.getMinutes() / 60;
      const brightness = dayBrightness(hour);
      if (brightness > 0.3) continue; // only in dark zones
      const angle = timeToAngle(t, now);
      const jitter = ((i * 137) % 20) - 10; // pseudo-random offset
      const pos = pointOnCircle(angle, radius + jitter, cx, cy);
      result.push({
        ...pos,
        size: 0.7 + (i % 3) * 0.4,
        opacity: 0.3 + (1 - brightness) * 0.3,
      });
    }
    return result;
  }, [now, cx, cy, radius]);

  return (
    <g>
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.size}
          fill="#c8d6e5"
          opacity={s.opacity}
        />
      ))}
    </g>
  );
}

/** Bedtime marker on the atmosphere ring */
function BedtimeMarker({ angle, cx, cy, radius, strokeWidth }) {
  const inner = pointOnCircle(angle, radius - strokeWidth / 2 - 2, cx, cy);
  const outer = pointOnCircle(angle, radius + strokeWidth / 2 + 2, cx, cy);
  return (
    <g>
      <line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke="#818cf8"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.7}
      />
      <text
        x={outer.x}
        y={outer.y - 8}
        textAnchor="middle"
        fontSize={8}
        fill="#818cf8"
        opacity={0.6}
      >
        ☽
      </text>
    </g>
  );
}

export default ActivityDial;
```

- [ ] **Step 3: Verify it renders without errors**

Add a temporary test render in the browser by importing into `DashboardPages.jsx` at the top:

```jsx
import { ActivityDial } from "../components/ActivityDial";
```

And add `<ActivityDial />` inside `ChildDashboardPage` render (before the section cards) to see it visually.

Run: `cd frontend && npm run dev`
Check: Navigate to a child dashboard in the browser. The atmosphere ring should render with day/night gradient, hour labels, and stars.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ActivityDial.jsx frontend/src/components/ActivityDial.css
git commit -m "feat: add ActivityDial component with atmosphere ring"
```

---

## Task 4: ActivityDial — Activity Ring (Arcs + Dots)

**Files:**

- Modify: `frontend/src/components/ActivityDial.jsx`
- Modify: `frontend/src/lib/dial-utils.js`

Add the outer activity ring that renders sleep/feeding/pumping arcs and diaper dots.

- [ ] **Step 1: Add activity arc/dot rendering to dial-utils.js**

Add to `frontend/src/lib/dial-utils.js`:

```js
/**
 * Classify activities into arcs (duration events) and dots (instant events).
 *
 * @param {Array} activities - Array of { type, start, end?, time?, details }
 * @param {Date} now - Current time
 * @returns {{ arcs: Array, dots: Array }}
 */
export function classifyActivities(activities, now) {
  const arcs = [];
  const dots = [];

  for (const a of activities) {
    if (a.type === "diaper") {
      const time = new Date(a.time || a.start);
      dots.push({
        ...a,
        angle: timeToAngle(time, now),
      });
    } else {
      const start = new Date(a.start);
      const end = a.end ? new Date(a.end) : now;
      arcs.push({
        ...a,
        startAngle: timeToAngle(start, now),
        endAngle: timeToAngle(end, now),
      });
    }
  }

  return { arcs, dots };
}
```

- [ ] **Step 2: Add tests for classifyActivities**

Add to `frontend/src/lib/__tests__/dial-utils.test.js`:

```js
import { classifyActivities } from "../dial-utils";

describe("classifyActivities", () => {
  const now = new Date("2026-03-19T14:30:00");

  it("classifies diaper as dots", () => {
    const activities = [{ type: "diaper", time: "2026-03-19T10:00:00" }];
    const { arcs, dots } = classifyActivities(activities, now);
    expect(dots).toHaveLength(1);
    expect(arcs).toHaveLength(0);
    expect(dots[0].angle).toBeDefined();
  });

  it("classifies sleep as arcs", () => {
    const activities = [
      {
        type: "sleep",
        start: "2026-03-19T01:00:00",
        end: "2026-03-19T07:00:00",
      },
    ];
    const { arcs, dots } = classifyActivities(activities, now);
    expect(arcs).toHaveLength(1);
    expect(dots).toHaveLength(0);
    expect(arcs[0].startAngle).toBeDefined();
    expect(arcs[0].endAngle).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run src/lib/__tests__/dial-utils.test.js`
Expected: PASS

- [ ] **Step 4: Add ActivityArcs and ActivityDots to ActivityDial.jsx**

Add these components inside `ActivityDial.jsx` and render them in the main SVG after the atmosphere ring:

```jsx
/** Activity arcs (sleep, feeding, pumping — duration events) */
function ActivityArcs({ arcs, cx, cy, radius, strokeWidth }) {
  const circumference = 2 * Math.PI * radius;
  return (
    <g>
      {arcs.map((arc, i) => {
        const { dasharray, offset } = arcDasharray(
          arc.startAngle,
          arc.endAngle,
          circumference,
        );
        const color = ACTIVITY_COLORS[arc.type] || "#666";
        return (
          <circle
            key={`arc-${i}`}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dasharray}
            strokeDashoffset={offset}
            strokeLinecap="round"
            opacity={0.9}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: `${cx}px ${cy}px`,
              cursor: "pointer",
            }}
          >
            <title>{arc.tooltip || `${arc.type}: ${arc.details || ""}`}</title>
          </circle>
        );
      })}
    </g>
  );
}

/** Activity dots (diaper — instant events) */
function ActivityDots({ dots, cx, cy, radius }) {
  return (
    <g>
      {dots.map((dot, i) => {
        const pos = pointOnCircle(dot.angle, radius, cx, cy);
        const color = ACTIVITY_COLORS[dot.type] || "#666";
        return (
          <circle
            key={`dot-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={5}
            fill={color}
            stroke="var(--app-card-bg-start, #0f172a)"
            strokeWidth={1.5}
            style={{ cursor: "pointer" }}
          >
            <title>{dot.tooltip || `${dot.type}: ${dot.details || ""}`}</title>
          </circle>
        );
      })}
    </g>
  );
}
```

In the main `ActivityDial` function, add after the atmosphere ring JSX:

```jsx
const { arcs, dots } = useMemo(
  () => classifyActivities(activities, now),
  [activities, now]
);

// In the SVG, after the NOW marker:
<ActivityArcs arcs={arcs} cx={CX} cy={CY} radius={ACTIVITY_R} strokeWidth={ACTIVITY_STROKE} />
<ActivityDots dots={dots} cx={CX} cy={CY} radius={ACTIVITY_R} />
```

- [ ] **Step 5: Verify visually**

Run: `cd frontend && npm run dev`
Pass test activities to the dial to verify arcs and dots render correctly on the outer ring.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ActivityDial.jsx frontend/src/lib/dial-utils.js frontend/src/lib/__tests__/dial-utils.test.js
git commit -m "feat: add activity ring with arcs and dots to ActivityDial"
```

---

## Task 5: DashboardInsightsCard Component

**Files:**

- Create: `frontend/src/components/DashboardInsightsCard.jsx`

Build the always-visible insights card. Reuses insight rendering logic from the existing `InsightsPages.jsx` but is a card, not a page.

- [ ] **Step 1: Create DashboardInsightsCard.jsx**

```jsx
// frontend/src/components/DashboardInsightsCard.jsx
import { useState, useCallback } from "react";
import { Card, Tag, Button, Space, Typography, Empty } from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  AlertOutlined,
  InfoCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";

const { Text, Paragraph } = Typography;

const SEVERITY_CONFIG = {
  alert: { color: "#ff4d4f", icon: <AlertOutlined />, label: "Alert" },
  warning: { color: "#faad14", icon: <WarningOutlined />, label: "Warning" },
  info: { color: "#1890ff", icon: <InfoCircleOutlined />, label: "Info" },
};

const SEVERITY_ORDER = ["alert", "warning", "info"];

/**
 * Always-visible insights card for the dashboard.
 * Shows active insights grouped by severity, or "All good" when clear.
 */
export function DashboardInsightsCard({ insights = [], strings = {} }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = localStorage.getItem("dismissed_insights");
      const data = JSON.parse(raw || "{}");
      const now = Date.now();
      // Clean expired (24h TTL)
      const valid = {};
      for (const [id, ts] of Object.entries(data)) {
        if (now - ts < 24 * 60 * 60 * 1000) valid[id] = ts;
      }
      return valid;
    } catch {
      return {};
    }
  });

  const dismissInsight = useCallback((id) => {
    setDismissed((prev) => {
      const next = { ...prev, [id]: Date.now() };
      localStorage.setItem("dismissed_insights", JSON.stringify(next));
      return next;
    });
  }, []);

  const visible = insights.filter((i) => !dismissed[i.id]);
  const grouped = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    items: visible.filter((i) => i.severity === sev),
  })).filter((g) => g.items.length > 0);

  return (
    <Card
      size="small"
      style={{
        background: "var(--app-card-bg-start, #0f172a)",
        border: "1px solid var(--app-card-border, #1e3a5f)",
        borderRadius: 16,
      }}
    >
      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <CheckCircleOutlined
            style={{ fontSize: 24, color: "#52c41a", marginBottom: 8 }}
          />
          <Paragraph
            style={{
              color: "var(--app-text-secondary)",
              margin: 0,
              fontSize: "var(--font-body-size, 12px)",
            }}
          >
            {strings.allGood || "All good — no alerts right now"}
          </Paragraph>
        </div>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {grouped.map(({ severity, items }) => (
            <div key={severity}>
              {items.map((insight) => (
                <InsightRow
                  key={insight.id}
                  insight={insight}
                  config={SEVERITY_CONFIG[severity]}
                  onDismiss={() => dismissInsight(insight.id)}
                  strings={strings}
                />
              ))}
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
}

function InsightRow({ insight, config, onDismiss, strings }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid var(--app-card-border, #1e3a5f)",
      }}
    >
      <Tag color={config.color} style={{ marginTop: 2, flexShrink: 0 }}>
        {config.label}
      </Tag>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text
          strong
          style={{
            fontSize: "var(--font-title-size, 14px)",
            color: "var(--app-text-primary)",
          }}
        >
          {insight.title}
        </Text>
        <Paragraph
          style={{
            fontSize: "var(--font-body-size, 12px)",
            color: "var(--app-text-secondary)",
            margin: "4px 0 0",
          }}
        >
          {insight.body}
        </Paragraph>
      </div>
      <Space size={4}>
        {insight.action_url && (
          <Button
            type="link"
            size="small"
            href={insight.action_url}
            icon={<RightOutlined />}
            style={{ fontSize: "var(--font-chart-size, 10px)" }}
          >
            {insight.action_label}
          </Button>
        )}
        <Button
          type="text"
          size="small"
          onClick={onDismiss}
          style={{
            fontSize: "var(--font-chart-size, 10px)",
            color: "var(--app-text-secondary)",
          }}
        >
          {strings.dismiss || "Dismiss"}
        </Button>
      </Space>
    </div>
  );
}

export default DashboardInsightsCard;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/DashboardInsightsCard.jsx
git commit -m "feat: add DashboardInsightsCard component"
```

---

## Task 6: Django — Dial Data Bootstrap

**Files:**

- Modify: `dashboard/views.py`

Add a helper that serializes 24h of activities into a flat list for the activity dial. The existing `ChildDashboard.get_context_data` will include this data in the bootstrap.

- [ ] **Step 1: Add `_build_dial_activities()` helper to dashboard/views.py**

Add before the `ChildDashboard` class:

```python
def _build_dial_activities(child):
    """Serialize last 24h of activities for the activity dial."""
    from django.utils import timezone
    from core import models

    now = timezone.now()
    since = now - datetime.timedelta(hours=24)
    activities = []

    # Sleep entries
    for s in models.Sleep.objects.filter(
        child=child, start__gte=since
    ).order_by("start"):
        activities.append({
            "type": "sleep",
            "start": s.start.isoformat(),
            "end": s.end.isoformat() if s.end else None,
            "tooltip": f"Sleep: {s.start.strftime('%H:%M')}–{s.end.strftime('%H:%M') if s.end else 'ongoing'}",
        })

    # Feeding entries
    for f in models.Feeding.objects.filter(
        child=child, start__gte=since
    ).order_by("start"):
        method = f.method or ""
        activities.append({
            "type": "feeding",
            "start": f.start.isoformat(),
            "end": f.end.isoformat() if f.end else None,
            "details": method,
            "tooltip": f"Feed: {f.start.strftime('%H:%M')}–{f.end.strftime('%H:%M') if f.end else '?'} ({method})",
        })

    # Pumping entries
    for p in models.Pumping.objects.filter(
        child=child, start__gte=since
    ).order_by("start"):
        amt = f"{p.amount}ml" if p.amount else ""
        activities.append({
            "type": "pumping",
            "start": p.start.isoformat(),
            "end": p.end.isoformat() if p.end else None,
            "details": amt,
            "tooltip": f"Pump: {p.start.strftime('%H:%M')}–{p.end.strftime('%H:%M') if p.end else '?'} {amt}",
        })

    # Diaper changes (instant events)
    for d in models.DiaperChange.objects.filter(
        child=child, time__gte=since
    ).order_by("time"):
        types = []
        if d.wet:
            types.append("wet")
        if d.solid:
            types.append("solid")
        activities.append({
            "type": "diaper",
            "time": d.time.isoformat(),
            "details": " + ".join(types) if types else "",
            "tooltip": f"Diaper: {d.time.strftime('%H:%M')} ({', '.join(types)})",
        })

    return activities
```

- [ ] **Step 2: Wire dial data into the bootstrap**

In `ChildDashboard.get_context_data()` (around line 870), add `dialActivities` to the bootstrap dict:

```python
"dialActivities": _build_dial_activities(child),
"bedtime": child.usual_bedtime.strftime("%H:%M") if child.usual_bedtime else None,
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/views.py
git commit -m "feat: add dial activity serialization to dashboard bootstrap"
```

---

## Task 7: New Dashboard Page (V2) — Compose Dial + Insights

**Files:**

- Modify: `frontend/src/pages/DashboardPages.jsx`

Add a new `ChildDashboardPageV2` that composes the `ActivityDial` and `DashboardInsightsCard`. Wire it into the existing page as the default view.

- [ ] **Step 1: Add ChildDashboardPageV2 to DashboardPages.jsx**

Add at the end of the file, before the final closing:

```jsx
import { ActivityDial } from "../components/ActivityDial";
import { DashboardInsightsCard } from "../components/DashboardInsightsCard";

export function ChildDashboardPageV2({ bootstrap }) {
  const { dashboard, insights, dialActivities, bedtime, strings } = bootstrap;
  const s = strings || {};

  // Build current status string
  const statusText = useMemo(() => {
    const qs = bootstrap.quickStatus;
    if (!qs) return "";
    if (qs.activeSleepTimer) return `Sleeping ${qs.activeSleepTimer}`;
    if (qs.lastSleep) return `Awake since ${qs.lastSleep}`;
    return "";
  }, [bootstrap.quickStatus]);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px" }}>
      <ActivityDial
        activities={dialActivities || []}
        bedtime={bedtime}
        currentStatus={statusText}
        insights={insights || []}
        strings={{
          sleep: s.sleepLabel || "Sleep",
          feed: s.feedingLabel || "Feed",
          diaper: s.diaperLabel || "Diaper",
          pump: s.pumpingLabel || "Pump",
        }}
      />
      <div style={{ marginTop: 20 }}>
        <DashboardInsightsCard
          insights={insights || []}
          strings={{
            allGood: s.insightsAllGood || "All good — no alerts right now",
            dismiss: s.dismiss || "Dismiss",
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire V2 as default in ChildDashboardPage**

At the top of the existing `ChildDashboardPage` function, add a check to render V2:

```jsx
export function ChildDashboardPage({ bootstrap }) {
  // Use new dial-based dashboard by default
  if (bootstrap.dialActivities !== undefined) {
    return <ChildDashboardPageV2 bootstrap={bootstrap} />;
  }
  // Fall through to existing card-based dashboard
  // ... (existing code unchanged)
}
```

This means: if the Django view provides `dialActivities` in the bootstrap, render V2. Otherwise render the classic view. This provides a clean transition path.

- [ ] **Step 3: Verify end-to-end**

Run: `cd frontend && npm run dev` and `pipenv run python manage.py runserver`
Navigate to a child dashboard. Should see:

1. Activity dial with atmosphere ring + any logged activities as arcs/dots
2. Insights card below (either with active insights or "All good")

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DashboardPages.jsx
git commit -m "feat: add dial-based dashboard (V2) with classic fallback"
```

---

## Task 8: Polish — Dial Center Insight Rotation + Scroll

**Files:**

- Modify: `frontend/src/components/ActivityDial.jsx`

Add the rotating insight in the dial center (when insights exist) and tap-to-scroll behavior.

- [ ] **Step 1: Add insight rotation to dial center**

In `ActivityDial.jsx`, update the center rendering:

```jsx
const [showInsight, setShowInsight] = useState(false);
const topInsight =
  insights.find((i) => i.severity === "alert") ||
  insights.find((i) => i.severity === "warning") ||
  insights[0];

// Rotate between time and insight every 5 seconds
useEffect(() => {
  if (!topInsight) return;
  const id = setInterval(() => setShowInsight((v) => !v), 5000);
  return () => clearInterval(id);
}, [topInsight]);

const handleCenterClick = () => {
  const el = document.getElementById("dashboard-insights-card");
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

// Replace center text section with:
<g
  onClick={handleCenterClick}
  style={{ cursor: topInsight ? "pointer" : "default" }}
>
  <circle
    cx={CX}
    cy={CY}
    r={80}
    fill="var(--app-card-bg-start, #0b1120)"
    stroke="var(--app-card-border, #1e3a5f)"
    strokeWidth={0.5}
  />
  {showInsight && topInsight ? (
    <>
      <text
        x={CX}
        y={CY - 6}
        className="activity-dial__center-status"
        fill={SEVERITY_CONFIG[topInsight.severity]?.color || "#faad14"}
      >
        {topInsight.title.length > 25
          ? topInsight.title.slice(0, 25) + "…"
          : topInsight.title}
      </text>
      <text x={CX} y={CY + 10} className="activity-dial__center-status">
        ↓ {strings.tapForDetails || "Tap for details"}
      </text>
    </>
  ) : (
    <>
      <text x={CX} y={CY - 10} className="activity-dial__center-time">
        {timeStr}
      </text>
      <text
        x={CX}
        y={CY + 10}
        className="activity-dial__center-status"
        fill="#fbbf24"
      >
        {currentStatus || ""}
      </text>
    </>
  )}
</g>;
```

And add `id="dashboard-insights-card"` to the `DashboardInsightsCard` wrapper div in `ChildDashboardPageV2`.

- [ ] **Step 2: Test the rotation**

Navigate to a child dashboard with active insights. The dial center should alternate between time/status and the top insight every 5 seconds. Tapping should scroll to the insights card.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ActivityDial.jsx frontend/src/pages/DashboardPages.jsx
git commit -m "feat: add insight rotation and scroll-to in dial center"
```

---

## Task 9: Frontend Build + Manual Testing

**Files:**

- No new files — testing and verification only

- [ ] **Step 1: Run the production build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run existing tests**

```bash
cd frontend && npx vitest run
```

Expected: All existing tests pass. New dial-utils tests pass.

- [ ] **Step 3: Manual testing checklist**

Test in browser (both dark and light themes):

- [ ] Dial renders with correct day/night gradient
- [ ] Hour labels appear on the atmosphere ring with correct opacity
- [ ] Stars appear in night zones only
- [ ] Bedtime marker appears if child has `usual_bedtime` set
- [ ] Activity arcs render for sleep, feeding, pumping in the last 24h
- [ ] Diaper dots render at correct positions
- [ ] Hover/tap on arcs/dots shows tooltip with details
- [ ] NOW marker is at the top
- [ ] Center shows current time and awake/sleeping status
- [ ] Insights card shows active insights or "All good"
- [ ] Dismiss button works (persists via localStorage)
- [ ] Insight rotation in dial center works when insights exist
- [ ] Tap on insight in center scrolls to insights card
- [ ] Responsive: dial scales down on narrow viewport

- [ ] **Step 4: Commit build output (if applicable) and push**

```bash
git push origin master
```

---

## Summary

| Task | What it builds                                    | Files                               |
| ---- | ------------------------------------------------- | ----------------------------------- |
| 1    | Dial math utilities + tests                       | `dial-utils.js`, tests              |
| 2    | Typography tokens + activity colors               | `index.css`, `app-utils.jsx`        |
| 3    | ActivityDial — atmosphere ring + center           | `ActivityDial.jsx`, `.css`          |
| 4    | ActivityDial — activity arcs + dots               | `ActivityDial.jsx`, `dial-utils.js` |
| 5    | DashboardInsightsCard                             | `DashboardInsightsCard.jsx`         |
| 6    | Django dial data serialization                    | `dashboard/views.py`                |
| 7    | New dashboard page (V2) composing dial + insights | `DashboardPages.jsx`                |
| 8    | Dial center insight rotation + scroll             | `ActivityDial.jsx`                  |
| 9    | Build verification + manual testing               | —                                   |

**Next:** After Phase 1 is deployed and stable, write Phase 2 plan (Topic Pages).
