/**
 * dial-utils.js — Pure math utilities for the 24h activity dial.
 *
 * Coordinate convention:
 *   0° = top (12 o'clock), increasing clockwise.
 *   The visible arc spans 270° from 225° (bottom-left, midnight)
 *   clockwise through 0° (top, noon) to 135° (bottom-right, ~24:00).
 *   The 90° gap at the bottom (135°–225°) is hidden.
 */

const HOURS_IN_DAY = 24;

/** Arc geometry constants */
export const ARC_SPAN = 270; // degrees of visible arc
export const ARC_START = 225; // angle where hour 0 (midnight) starts
const DEG_PER_HOUR_ARC = ARC_SPAN / HOURS_IN_DAY; // 11.25°/hour

// Atmosphere gradient endpoints — bright blue (day) → deep navy (night)
const COLOR_NIGHT_DARK = { r: 0x08, g: 0x0d, b: 0x1e }; // #080d1e deep navy
const COLOR_DAY_DARK = { r: 0x4d, g: 0xb6, b: 0xff }; // #4db6ff bright sky blue
const COLOR_NIGHT_LIGHT = { r: 0x0a, g: 0x12, b: 0x25 }; // #0a1225 dark navy
const COLOR_DAY_LIGHT = { r: 0x6a, g: 0xc8, b: 0xff }; // #6ac8ff light sky blue

/** Clamp n into [0, 360). */
function normalizeAngle(deg) {
  return ((deg % 360) + 360) % 360;
}

/**
 * Convert a wall-clock hour (0–24) to a fixed angle on the 270° arc.
 * Hour 0 (midnight) = 225° (bottom-left).
 * Hour 12 (noon) = 0° (top).
 * Hour 24 = 135° (bottom-right).
 */
export function hourToAngle(hour) {
  return (ARC_START + (hour / HOURS_IN_DAY) * ARC_SPAN) % 360;
}

/**
 * Convert a Date to its fixed angle on the 270° arc based on wall-clock time.
 */
export function timeToFixedAngle(date) {
  const hour =
    date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  return hourToAngle(hour);
}

/**
 * Compute SVG stroke-dasharray and stroke-dashoffset for a circular arc
 * segment within the 270° visible arc.
 *
 * @param {number} startAngle - degrees, 0 = top, clockwise
 * @param {number} endAngle   - degrees
 * @param {number} circumference - 2πr
 * @returns {{ dasharray: string, dashoffset: number }}
 */
export function arcDasharray(startAngle, endAngle, circumference) {
  const start = normalizeAngle(startAngle);
  const end = normalizeAngle(endAngle);

  // Arc length (handle wrap-around)
  let spanDeg = end - start;
  if (spanDeg <= 0) spanDeg += 360;

  const arcLength = (spanDeg / 360) * circumference;
  const gapLength = circumference - arcLength;
  const dasharray = `${arcLength.toFixed(2)} ${gapLength.toFixed(2)}`;

  // Offset: SVG starts drawing from angle 0 (right = 3 o'clock).
  // We want the arc to begin at `start` degrees measured from top (12 o'clock).
  // Top = -90° in standard SVG coords, so our start in SVG coords = start - 90.
  const svgStart = start - 90;
  const dashoffset = -((svgStart / 360) * circumference);

  return { dasharray, dashoffset };
}

/**
 * Get the (x, y) coordinates of a point on a circle.
 * 0° = top, 90° = right (clockwise).
 */
export function pointOnCircle(angleDeg, radius = 125, cx = 190, cy = 190) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/**
 * Generate label descriptors for the 8 canonical hours (0,3,6,9,12,15,18,21).
 * Each label is positioned at a fixed angle on the 270° arc.
 *
 * @param {number} radius
 * @param {number} cx
 * @param {number} cy
 * @returns {Array<{ hour: number, text: string, angle: number, x: number, y: number }>}
 */
export function hourLabels(radius = 125, cx = 190, cy = 190) {
  const LABEL_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

  return LABEL_HOURS.map((hour) => {
    const angle = hourToAngle(hour);
    const { x, y } = pointOnCircle(angle, radius, cx, cy);
    return {
      hour,
      text: hour === 0 ? "24" : String(hour).padStart(2, "0"),
      angle,
      x,
      y,
    };
  });
}

/**
 * Sinusoidal day brightness in [0, 1].
 * Peak at noon (hour=12), trough at midnight (hour=0 or 24).
 */
export function dayBrightness(hour) {
  return (1 - Math.cos((hour / 12) * Math.PI)) / 2;
}

/** Linear interpolation between two values. */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Convert 0-255 integer to 2-digit hex. */
function toHex(n) {
  return Math.round(n).toString(16).padStart(2, "0");
}

/** Interpolate between night and day colour given a brightness in [0,1]. */
function interpolateColor(brightness, theme = "dark") {
  const night = theme === "light" ? COLOR_NIGHT_LIGHT : COLOR_NIGHT_DARK;
  const day = theme === "light" ? COLOR_DAY_LIGHT : COLOR_DAY_DARK;
  const r = lerp(night.r, day.r, brightness);
  const g = lerp(night.g, day.g, brightness);
  const b = lerp(night.b, day.b, brightness);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate gradient stops for the 270° day/night atmosphere arc.
 * Stops are distributed along the arc from hour 0 (225°) to hour 24 (135°).
 * Each stop's color is based on its wall-clock hour brightness.
 *
 * @param {number} steps - number of stops (default 48)
 * @param {string} theme - "dark" or "light"
 * @returns {Array<{ angle: number, color: string, opacity: number }>}
 */
export function atmosphereStops(steps = 48, theme = "dark") {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const fraction = i / steps; // 0 → 1 along the arc
    const hour = fraction * HOURS_IN_DAY; // wall-clock hour
    const angle = hourToAngle(hour);
    const brightness = dayBrightness(hour);
    return {
      angle,
      color: interpolateColor(brightness, theme),
      opacity: 0.4 + brightness * 0.5, // 0.4 at night → 0.9 at noon
    };
  });
}

const ARC_TYPES = new Set(["sleep", "feeding", "breastfeeding", "pumping"]);

/**
 * Split activities into arcs (duration-based) and dots (instant events).
 * Uses fixed angles based on wall-clock time (no rotation).
 *
 * @param {Array} activities
 * @returns {{ arcs: Array, dots: Array }}
 */
export function classifyActivities(activities) {
  const arcs = [];
  const dots = [];

  for (const activity of activities) {
    if (ARC_TYPES.has(activity.type)) {
      arcs.push({
        ...activity,
        startAngle: timeToFixedAngle(activity.start),
        endAngle: timeToFixedAngle(activity.end),
      });
    } else {
      dots.push({
        ...activity,
        angle: timeToFixedAngle(activity.time),
      });
    }
  }

  return { arcs, dots };
}
