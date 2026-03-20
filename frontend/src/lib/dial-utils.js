/**
 * dial-utils.js — Pure math utilities for the 24h activity dial.
 *
 * Coordinate convention:
 *   0° = top (NOW), increasing clockwise.
 *   Past events drift counter-clockwise (left), future events clockwise (right).
 *   360° = 24 hours.
 */

const HOURS_IN_DAY = 24;
const DEG_PER_HOUR = 360 / HOURS_IN_DAY; // 15°/h
const MS_PER_HOUR = 3_600_000;

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
 * Convert a Date to an angle on the dial.
 * NOW maps to 0°. Counter-clockwise convention: future = right = positive angle.
 * Returns a value in [0, 360).
 */
export function timeToAngle(time, now) {
  const diffMs = time.getTime() - now.getTime();
  const diffHours = diffMs / MS_PER_HOUR;
  const rawAngle = diffHours * DEG_PER_HOUR;
  return normalizeAngle(rawAngle);
}

/**
 * Compute SVG stroke-dasharray and stroke-dashoffset for a circular arc.
 *
 * SVG strokes start at the "right" (3-o'clock) position and go clockwise by
 * default. We rotate the circle so that 0° points up, then compute the offset
 * so the visible portion covers exactly [startAngle, endAngle].
 *
 * Handles arcs that cross 0° (e.g. 350° → 10°).
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
 * Each label is positioned at the given radius from (cx, cy).
 *
 * @param {Date} now
 * @param {number} radius
 * @param {number} cx
 * @param {number} cy
 * @returns {Array<{ hour: number, text: string, angle: number, x: number, y: number }>}
 */
export function hourLabels(now, radius = 125, cx = 190, cy = 190) {
  const LABEL_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

  return LABEL_HOURS.map((hour) => {
    const hourDate = new Date(now);
    // Build a Date that represents this exact wall-clock hour today
    hourDate.setHours(hour, 0, 0, 0);
    const angle = timeToAngle(hourDate, now);
    const { x, y } = pointOnCircle(angle, radius, cx, cy);
    return {
      hour,
      text: String(hour).padStart(2, "0"),
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
 * Generate gradient stops for the day/night atmosphere ring.
 * Angles are evenly distributed 0–360 (exclusive of 360).
 * Each stop's hour is computed relative to `now`.
 *
 * @param {Date} now
 * @param {number} steps - number of stops (default 48)
 * @param {string} theme - "dark" or "light"
 * @returns {Array<{ angle: number, color: string, opacity: number }>}
 */
export function atmosphereStops(now, steps = 48, theme = "dark") {
  const nowHour = now.getHours() + now.getMinutes() / 60;

  return Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * 360;
    // angle=0 → NOW, positive angle → future
    const hourOffset = angle / DEG_PER_HOUR;
    const absoluteHour = (nowHour + hourOffset) % HOURS_IN_DAY;
    const brightness = dayBrightness(absoluteHour);
    return {
      angle,
      color: interpolateColor(brightness, theme),
      opacity: 0.4 + brightness * 0.5, // 0.4 at night → 0.9 at noon
    };
  });
}

const ARC_TYPES = new Set(["sleep", "feeding", "pumping"]);

/**
 * Split activities into arcs (duration-based) and dots (instant events).
 *
 * Input activity shapes:
 *   Arc:  { type: "sleep"|"feeding"|"pumping", start: Date, end: Date, ...rest }
 *   Dot:  { type: "diaper", time: Date, ...rest }
 *
 * @param {Array} activities
 * @param {Date} now
 * @returns {{ arcs: Array, dots: Array }}
 */
export function classifyActivities(activities, now) {
  const arcs = [];
  const dots = [];

  for (const activity of activities) {
    if (ARC_TYPES.has(activity.type)) {
      arcs.push({
        ...activity,
        startAngle: timeToAngle(activity.start, now),
        endAngle: timeToAngle(activity.end, now),
      });
    } else {
      dots.push({
        ...activity,
        angle: timeToAngle(activity.time, now),
      });
    }
  }

  return { arcs, dots };
}
