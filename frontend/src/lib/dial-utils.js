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

  // Arc length (handle wrap-around, but not zero-duration)
  let spanDeg = end - start;
  if (spanDeg < 0) spanDeg += 360;

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

/* ── Celestial position math ────────────────────────────────── */

/**
 * Compute lunar phase for a given date (synodic month approximation).
 * Returns 0–1 where 0 = new moon, 0.5 = full moon, 1 = next new moon.
 * Uses the known new-moon epoch 2000-01-06 12:14 UTC (Julian day 2451550.1).
 */
export function lunarPhase(date) {
  const SYNODIC_MONTH = 29.53058770576;
  const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 12, 14, 0); // 2000-01-06 12:14 UTC
  const daysSinceNewMoon = (date.getTime() - KNOWN_NEW_MOON_MS) / 86_400_000;
  const phase = ((daysSinceNewMoon % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  return phase / SYNODIC_MONTH; // 0–1
}

/**
 * Compute the position of the sun or moon in the sky.
 *
 * The celestial body arcs from bottom-left (rise) over the top (peak)
 * to bottom-right (set). Position is expressed as:
 *   progress: 0 (rise) → 1 (set)
 *   altitude: 0 (horizon) → 1 (zenith), follows sin(progress * π)
 *   x: 0 (left edge) → 1 (right edge)
 *   y: 0 (top/zenith) → 1 (bottom/horizon), = 1 - altitude
 *
 * @param {Date}   now          - current time
 * @param {number} sunriseHour  - fractional hour of sunrise (e.g. 6.5 = 06:30)
 * @param {number} sunsetHour   - fractional hour of sunset (e.g. 19.75 = 19:45)
 * @returns {{ body: "sun"|"moon"|"twilight", progress: number, altitude: number,
 *             x: number, y: number, phase: number, isDaytime: boolean }}
 */
export function celestialPosition(now, sunriseHour = 6, sunsetHour = 18) {
  const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

  // Twilight zone: 30 min before sunrise / after sunset
  const TWILIGHT = 0.5; // half an hour

  const dayLength = sunsetHour - sunriseHour;
  const nightLength = 24 - dayLength;

  if (hour >= sunriseHour && hour <= sunsetHour) {
    // ── Daytime: sun visible ──
    const progress = (hour - sunriseHour) / dayLength;
    const altitude = Math.sin(progress * Math.PI);
    return {
      body: "sun",
      progress,
      altitude,
      x: progress,
      y: 1 - altitude,
      phase: lunarPhase(now),
      isDaytime: true,
    };
  }

  // ── Twilight check ──
  if (hour >= sunriseHour - TWILIGHT && hour < sunriseHour) {
    // Pre-sunrise twilight: sun approaching from below horizon at left
    const t = (hour - (sunriseHour - TWILIGHT)) / TWILIGHT; // 0→1
    return {
      body: "twilight",
      progress: 0,
      altitude: t * 0.1, // barely above horizon
      x: 0,
      y: 1 - t * 0.1,
      phase: lunarPhase(now),
      isDaytime: false,
      twilightProgress: t, // 0 = dark, 1 = about to sunrise
    };
  }
  if (hour > sunsetHour && hour <= sunsetHour + TWILIGHT) {
    // Post-sunset twilight: sun just dropped below horizon at right
    const t = 1 - (hour - sunsetHour) / TWILIGHT; // 1→0
    return {
      body: "twilight",
      progress: 1,
      altitude: t * 0.1,
      x: 1,
      y: 1 - t * 0.1,
      phase: lunarPhase(now),
      isDaytime: false,
      twilightProgress: t,
    };
  }

  // ── Nighttime: moon visible ──
  // Moon rises at sunset, sets at sunrise (fills the entire night evenly).
  // Night spans: sunsetHour → 24 → sunriseHour (wraps around midnight).
  let nightElapsed;
  if (hour > sunsetHour) {
    nightElapsed = hour - sunsetHour;
  } else {
    nightElapsed = (24 - sunsetHour) + hour;
  }
  const moonProgress = Math.min(1, Math.max(0, nightElapsed / nightLength));
  const moonAltitude = Math.sin(moonProgress * Math.PI);

  return {
    body: "moon",
    progress: moonProgress,
    altitude: moonAltitude,
    x: moonProgress,
    y: 1 - moonAltitude,
    phase: lunarPhase(now),
    isDaytime: false,
  };
}

/**
 * Generate a CSS background gradient string for the sky based on sun position.
 *
 * @param {object} celestial - output of celestialPosition()
 * @returns {string} CSS background value
 */
export function skyGradient(celestial, weather = "sunny") {
  const { body, altitude, x, phase } = celestial;

  const glowX = Math.round(3 + x * 94);
  const glowY = Math.round(92 - altitude * 88);

  if (body === "sun") {
    // Overcast/rainy/snowy daytime: muted grey-blue sky, earth in bottom third
    if (weather === "cloudy") {
      return "linear-gradient(180deg, #8BA4B8 0%, #A0B8C8 25%, #B0C0CC 50%, #A8B8B0 67%, #8CA860 80%, #6A8840 90%, #4A6830 100%)";
    }
    if (weather === "rainy") {
      return "linear-gradient(180deg, #6A7A8A 0%, #7A8A98 25%, #8A98A0 50%, #8A9898 67%, #6A8858 80%, #4A6838 92%, #3A5828 100%)";
    }
    if (weather === "snowy") {
      return "linear-gradient(180deg, #8898A8 0%, #98A8B8 25%, #B0C0C8 50%, #C0C8C8 67%, #A8B8A0 80%, #8A9A80 92%, #788A70 100%)";
    }
    // Sunny weather — earth tones start at ~67% (bottom third)
    if (altitude > 0.6) {
      return (
        `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,210,0,0.55) 0%, rgba(255,180,40,0.2) 18%, transparent 38%), ` +
        "linear-gradient(180deg, #6EC6F5 0%, #9ED8F7 30%, #B8E0F8 50%, #D8ECAA 67%, #8CA854 80%, #6E8840 90%, #4A5828 100%)"
      );
    }
    if (altitude > 0.25) {
      return (
        `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,200,20,0.5) 0%, rgba(255,160,40,0.2) 20%, transparent 40%), ` +
        "linear-gradient(180deg, #78BBEA 0%, #A4D4F0 30%, #C0E0F0 50%, #D8E8B8 67%, #8CA854 80%, #6E8840 92%, #5A6E34 100%)"
      );
    }
    // Low sun / golden hour — earth tones still bottom third
    return (
      `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,160,40,0.6) 0%, rgba(255,120,30,0.3) 18%, transparent 40%), ` +
      "linear-gradient(180deg, #E8A060 0%, #D88848 20%, #C8789A 40%, #8A70B8 55%, #5A7A9A 67%, #4A6A4A 82%, #3A5A30 100%)"
    );
  }

  if (body === "twilight") {
    const t = celestial.twilightProgress ?? 0.5;
    if (t > 0.5) {
      return "linear-gradient(180deg, #D88848 0%, #C87898 30%, #7A6AB8 55%, #4A5A8A 67%, #3A5A4A 85%, #2A4A2A 100%)";
    }
    return "linear-gradient(180deg, #4A3A60 0%, #2A2A50 30%, #1A2040 55%, #152030 75%, #0E1828 100%)";
  }

  // Night: deep navy with subtle moon glow
  const moonGlowX = Math.round(x * 100);
  const moonGlowY = Math.round(85 - altitude * 75);
  return (
    `radial-gradient(circle at ${moonGlowX}% ${moonGlowY}%, rgba(180,200,230,0.08) 0%, transparent 30%), ` +
    "linear-gradient(180deg, #080d1e 0%, #0c1428 30%, #0a1020 60%, #060c18 100%)"
  );
}

const ARC_TYPES = new Set(["sleep", "feeding", "breastfeeding", "pumping"]);

/**
 * Split activities into arcs (duration-based) and dots (instant events).
 * Uses fixed angles based on wall-clock time (no rotation).
 *
 * @param {Array} activities
 * @returns {{ arcs: Array, dots: Array }}
 */
// Angles bounding the hidden 90° bottom gap (135° = 24:00, 225° = 00:00).
const GAP_END_ANGLE = (ARC_START + ARC_SPAN) % 360; // 135
const GAP_START_ANGLE = ARC_START;                   // 225

export function classifyActivities(activities) {
  const arcs = [];
  const dots = [];

  for (const activity of activities) {
    if (ARC_TYPES.has(activity.type)) {
      const durationMs = activity.end
        ? activity.end.getTime() - activity.start.getTime()
        : 0;
      if (durationMs < 60_000) {
        // Zero or sub-minute duration — render as an instant dot
        dots.push({
          ...activity,
          angle: timeToFixedAngle(activity.start),
        });
      } else {
        const sa = timeToFixedAngle(activity.start);
        const ea = timeToFixedAngle(activity.end);
        // An arc that crosses midnight (e.g. 22:00→06:00) has sa < GAP_END_ANGLE
        // and ea > GAP_START_ANGLE, meaning it would pass through the hidden
        // bottom gap of the 270° dial.  Split it into two visible segments.
        if (sa < GAP_END_ANGLE && ea > GAP_START_ANGLE) {
          arcs.push({ ...activity, startAngle: sa, endAngle: GAP_END_ANGLE });
          arcs.push({ ...activity, startAngle: GAP_START_ANGLE, endAngle: ea });
        } else {
          arcs.push({ ...activity, startAngle: sa, endAngle: ea });
        }
      }
    } else {
      dots.push({
        ...activity,
        angle: timeToFixedAngle(activity.time),
      });
    }
  }

  return { arcs, dots };
}
