import { describe, it, expect } from "vitest";
import {
  timeToAngle,
  arcDasharray,
  pointOnCircle,
  hourLabels,
  dayBrightness,
  atmosphereStops,
  classifyActivities,
} from "../dial-utils.js";

// Fixed reference point for deterministic tests
const NOW = new Date("2024-01-15T12:00:00.000Z");

describe("timeToAngle", () => {
  it("returns 0° for now", () => {
    expect(timeToAngle(NOW, NOW)).toBeCloseTo(0, 5);
  });

  it("returns 180° for 12h ago", () => {
    const twelveHoursAgo = new Date(NOW.getTime() - 12 * 60 * 60 * 1000);
    expect(timeToAngle(twelveHoursAgo, NOW)).toBeCloseTo(180, 5);
  });

  it("returns 90° for 6h in the future (counter-clockwise = future right)", () => {
    const sixHoursAhead = new Date(NOW.getTime() + 6 * 60 * 60 * 1000);
    expect(timeToAngle(sixHoursAhead, NOW)).toBeCloseTo(90, 5);
  });

  it("returns 270° for 6h ago", () => {
    const sixHoursAgo = new Date(NOW.getTime() - 6 * 60 * 60 * 1000);
    expect(timeToAngle(sixHoursAgo, NOW)).toBeCloseTo(270, 5);
  });

  it("normalizes result to 0-360 range", () => {
    // 13h in future → 13/24 * 360 = 195° (future is positive, wraps)
    const thirteenHoursAhead = new Date(NOW.getTime() + 13 * 60 * 60 * 1000);
    const angle = timeToAngle(thirteenHoursAhead, NOW);
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(360);
  });

  it("handles exact 24h difference as 0° (full circle)", () => {
    const twentyFourHoursAgo = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    expect(timeToAngle(twentyFourHoursAgo, NOW)).toBeCloseTo(0, 5);
  });
});

describe("arcDasharray", () => {
  it("computes basic arc covering half the circle", () => {
    const circumference = 2 * Math.PI * 100; // r=100
    const result = arcDasharray(0, 180, circumference);
    const halfCircumference = circumference / 2;
    expect(result.dasharray).toContain(halfCircumference.toFixed(2));
    expect(typeof result.dashoffset).toBe("number");
  });

  it("computes arc covering full circle (360°)", () => {
    const circumference = 2 * Math.PI * 100;
    const result = arcDasharray(0, 360, circumference);
    const arcLength = circumference;
    expect(result.dasharray).toContain(arcLength.toFixed(2));
  });

  it("handles arc crossing 0° (wrapping from 350° to 10°)", () => {
    const circumference = 2 * Math.PI * 100;
    const result = arcDasharray(350, 10, circumference);
    // Arc is only 20° wide (350→360→10)
    const expectedArcLength = (20 / 360) * circumference;
    expect(result.dasharray).toContain(expectedArcLength.toFixed(2));
  });

  it("returns dasharray and dashoffset as strings/numbers", () => {
    const circumference = 2 * Math.PI * 50;
    const result = arcDasharray(45, 135, circumference);
    expect(typeof result.dasharray).toBe("string");
    expect(typeof result.dashoffset).toBe("number");
  });

  it("small arc is shorter than large arc", () => {
    const circumference = 2 * Math.PI * 100;
    const small = arcDasharray(0, 30, circumference);
    const large = arcDasharray(0, 270, circumference);
    const smallLength = parseFloat(small.dasharray.split(" ")[0]);
    const largeLength = parseFloat(large.dasharray.split(" ")[0]);
    expect(smallLength).toBeLessThan(largeLength);
  });
});

describe("pointOnCircle", () => {
  it("0° is at the top (y = cy - radius)", () => {
    const { x, y } = pointOnCircle(0, 100, 150, 150);
    expect(x).toBeCloseTo(150, 1);
    expect(y).toBeCloseTo(50, 1); // cy - radius
  });

  it("90° is at the right (x = cx + radius)", () => {
    const { x, y } = pointOnCircle(90, 100, 150, 150);
    expect(x).toBeCloseTo(250, 1); // cx + radius
    expect(y).toBeCloseTo(150, 1);
  });

  it("180° is at the bottom (y = cy + radius)", () => {
    const { x, y } = pointOnCircle(180, 100, 150, 150);
    expect(x).toBeCloseTo(150, 1);
    expect(y).toBeCloseTo(250, 1); // cy + radius
  });

  it("270° is at the left (x = cx - radius)", () => {
    const { x, y } = pointOnCircle(270, 100, 150, 150);
    expect(x).toBeCloseTo(50, 1); // cx - radius
    expect(y).toBeCloseTo(150, 1);
  });

  it("uses default cx=cy=190, radius=125 when not specified", () => {
    const { x, y } = pointOnCircle(0);
    expect(x).toBeCloseTo(190, 1);
    expect(y).toBeCloseTo(65, 1); // 190 - 125
  });
});

describe("hourLabels", () => {
  it("returns exactly 8 items", () => {
    const labels = hourLabels(NOW);
    expect(labels).toHaveLength(8);
  });

  it("each label has angle, x, y, and hour properties", () => {
    const labels = hourLabels(NOW);
    labels.forEach((label) => {
      expect(typeof label.angle).toBe("number");
      expect(typeof label.x).toBe("number");
      expect(typeof label.y).toBe("number");
      expect(typeof label.hour).toBe("number");
    });
  });

  it("includes hours 0, 3, 6, 9, 12, 15, 18, 21", () => {
    const labels = hourLabels(NOW);
    const hours = labels.map((l) => l.hour).sort((a, b) => a - b);
    expect(hours).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
  });

  it("each label has a text property", () => {
    const labels = hourLabels(NOW);
    labels.forEach((label) => {
      expect(typeof label.text).toBe("string");
    });
  });

  it("accepts custom radius, cx, cy", () => {
    const labels1 = hourLabels(NOW, 125, 190, 190);
    const labels2 = hourLabels(NOW, 100, 150, 150);
    // Different radii → different positions
    expect(labels1[0].x).not.toEqual(labels2[0].x);
  });
});

describe("dayBrightness", () => {
  it("peaks at noon (hour=12)", () => {
    const noon = dayBrightness(12);
    expect(noon).toBeCloseTo(1, 5);
  });

  it("troughs at midnight (hour=0)", () => {
    const midnight = dayBrightness(0);
    expect(midnight).toBeCloseTo(0, 5);
  });

  it("troughs at midnight (hour=24 = next midnight)", () => {
    const midnight24 = dayBrightness(24);
    expect(midnight24).toBeCloseTo(0, 5);
  });

  it("returns ~0.5 at 6am (dawn)", () => {
    const dawn = dayBrightness(6);
    expect(dawn).toBeCloseTo(0.5, 1);
  });

  it("returns ~0.5 at 18 (dusk)", () => {
    const dusk = dayBrightness(18);
    expect(dusk).toBeCloseTo(0.5, 1);
  });

  it("always returns values between 0 and 1", () => {
    for (let h = 0; h <= 24; h += 0.5) {
      const b = dayBrightness(h);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    }
  });
});

describe("atmosphereStops", () => {
  it("returns 48 stops by default", () => {
    const stops = atmosphereStops(NOW);
    expect(stops).toHaveLength(48);
  });

  it("accepts custom step count", () => {
    const stops = atmosphereStops(NOW, 24);
    expect(stops).toHaveLength(24);
  });

  it("each stop has angle, color, and opacity properties", () => {
    const stops = atmosphereStops(NOW);
    stops.forEach((stop) => {
      expect(typeof stop.angle).toBe("number");
      expect(typeof stop.color).toBe("string");
      expect(typeof stop.opacity).toBe("number");
    });
  });

  it("angles span 0-360 evenly", () => {
    const stops = atmosphereStops(NOW, 4);
    expect(stops[0].angle).toBeCloseTo(0, 1);
    expect(stops[1].angle).toBeCloseTo(90, 1);
    expect(stops[2].angle).toBeCloseTo(180, 1);
    expect(stops[3].angle).toBeCloseTo(270, 1);
  });

  it("color is a valid hex string", () => {
    const stops = atmosphereStops(NOW);
    stops.forEach((stop) => {
      expect(stop.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it("opacity is between 0 and 1", () => {
    const stops = atmosphereStops(NOW);
    stops.forEach((stop) => {
      expect(stop.opacity).toBeGreaterThanOrEqual(0);
      expect(stop.opacity).toBeLessThanOrEqual(1);
    });
  });
});

describe("classifyActivities", () => {
  it("returns { arcs, dots } structure", () => {
    const result = classifyActivities([], NOW);
    expect(result).toHaveProperty("arcs");
    expect(result).toHaveProperty("dots");
    expect(Array.isArray(result.arcs)).toBe(true);
    expect(Array.isArray(result.dots)).toBe(true);
  });

  it("maps diaper activities to dots", () => {
    const activities = [
      {
        type: "diaper",
        time: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      },
    ];
    const { arcs, dots } = classifyActivities(activities, NOW);
    expect(dots).toHaveLength(1);
    expect(arcs).toHaveLength(0);
  });

  it("maps sleep activities to arcs", () => {
    const activities = [
      {
        type: "sleep",
        start: new Date(NOW.getTime() - 4 * 60 * 60 * 1000),
        end: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      },
    ];
    const { arcs, dots } = classifyActivities(activities, NOW);
    expect(arcs).toHaveLength(1);
    expect(dots).toHaveLength(0);
  });

  it("maps feeding activities to arcs", () => {
    const activities = [
      {
        type: "feeding",
        start: new Date(NOW.getTime() - 3 * 60 * 60 * 1000),
        end: new Date(NOW.getTime() - 2.5 * 60 * 60 * 1000),
      },
    ];
    const { arcs } = classifyActivities(activities, NOW);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].type).toBe("feeding");
  });

  it("maps pumping activities to arcs", () => {
    const activities = [
      {
        type: "pumping",
        start: new Date(NOW.getTime() - 1 * 60 * 60 * 1000),
        end: new Date(NOW.getTime() - 0.5 * 60 * 60 * 1000),
      },
    ];
    const { arcs } = classifyActivities(activities, NOW);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].type).toBe("pumping");
  });

  it("arc has startAngle, endAngle, and type", () => {
    const activities = [
      {
        type: "sleep",
        start: new Date(NOW.getTime() - 4 * 60 * 60 * 1000),
        end: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      },
    ];
    const { arcs } = classifyActivities(activities, NOW);
    expect(typeof arcs[0].startAngle).toBe("number");
    expect(typeof arcs[0].endAngle).toBe("number");
    expect(arcs[0].type).toBe("sleep");
  });

  it("dot has angle and type", () => {
    const activities = [
      {
        type: "diaper",
        time: new Date(NOW.getTime() - 1 * 60 * 60 * 1000),
      },
    ];
    const { dots } = classifyActivities(activities, NOW);
    expect(typeof dots[0].angle).toBe("number");
    expect(dots[0].type).toBe("diaper");
  });

  it("handles mixed activities", () => {
    const activities = [
      {
        type: "diaper",
        time: new Date(NOW.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        type: "sleep",
        start: new Date(NOW.getTime() - 4 * 60 * 60 * 1000),
        end: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        type: "feeding",
        start: new Date(NOW.getTime() - 6 * 60 * 60 * 1000),
        end: new Date(NOW.getTime() - 5.5 * 60 * 60 * 1000),
      },
    ];
    const { arcs, dots } = classifyActivities(activities, NOW);
    expect(dots).toHaveLength(1);
    expect(arcs).toHaveLength(2);
  });

  it("empty activities returns empty arcs and dots", () => {
    const { arcs, dots } = classifyActivities([], NOW);
    expect(arcs).toHaveLength(0);
    expect(dots).toHaveLength(0);
  });

  it("arc angles are in 0-360 range", () => {
    const activities = [
      {
        type: "sleep",
        start: new Date(NOW.getTime() - 4 * 60 * 60 * 1000),
        end: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      },
    ];
    const { arcs } = classifyActivities(activities, NOW);
    expect(arcs[0].startAngle).toBeGreaterThanOrEqual(0);
    expect(arcs[0].startAngle).toBeLessThan(360);
    expect(arcs[0].endAngle).toBeGreaterThanOrEqual(0);
    expect(arcs[0].endAngle).toBeLessThan(360);
  });
});
