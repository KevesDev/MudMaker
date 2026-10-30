import { describe, expect, it } from "vitest";
import { HOME_VIEWPORT, clampZoom, panBy, screenToWorld, snapToStep, toDevicePixel, worldToScreen, zoomAbout, type Viewport } from "./viewport";

const RANGE = { min: 0.25, max: 4 };

/** A small deterministic generator, so a failing sequence can be replayed. */
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe("panning", () => {
  it("moves the content with the drag: a drag of 100 right and 50 down at scale 2 shows 50 and 25 world units further left and up", () => {
    expect(panBy({ originX: 0, originY: 0, zoom: 2 }, 100, 50)).toEqual({ originX: -50, originY: -25, zoom: 2 });
  });

  it("returns to the start after a long sequence of pans is undone in reverse", () => {
    const random = sequence(7);
    const steps = Array.from({ length: 5000 }, () => [(random() - 0.5) * 400, (random() - 0.5) * 400] as const);
    const start: Viewport = { originX: 12.5, originY: -300, zoom: 1.75 };
    let view = start;
    for (const [dx, dy] of steps) view = panBy(view, dx, dy);
    for (const [dx, dy] of [...steps].reverse()) view = panBy(view, -dx, -dy);
    expect(view.originX).toBeCloseTo(start.originX, 6);
    expect(view.originY).toBeCloseTo(start.originY, 6);
    expect(view.zoom).toBe(start.zoom);
  });
});

describe("zooming about a screen point", () => {
  it("doubling at (200, 100) from the home view puts the world point (200, 100) still at (200, 100) with origin (100, 50)", () => {
    expect(zoomAbout(HOME_VIEWPORT, 2, { x: 200, y: 100 }, RANGE)).toEqual({ originX: 100, originY: 50, zoom: 2 });
  });

  it("keeps the world point under the pointer fixed through a long random sequence, including clamped steps", () => {
    const random = sequence(11);
    let view: Viewport = { originX: -40, originY: 90, zoom: 1 };
    let clamped = 0;
    for (let step = 0; step < 5000; step += 1) {
      const anchor = { x: random() * 1920, y: random() * 1080 };
      const before = screenToWorld(view, anchor);
      const next = zoomAbout(view, Math.exp((random() - 0.5) * 2), anchor, RANGE);
      if (next.zoom === RANGE.min || next.zoom === RANGE.max) clamped += 1;
      const after = screenToWorld(next, anchor);
      expect(after.x).toBeCloseTo(before.x, 5);
      expect(after.y).toBeCloseTo(before.y, 5);
      view = next;
    }
    expect(clamped).toBeGreaterThan(0);
  });

  it("stops at both ends of the range and leaves the view unchanged when it cannot move further", () => {
    const anchor = { x: 10, y: 10 };
    const widest = zoomAbout(HOME_VIEWPORT, 1000, anchor, RANGE);
    expect(widest.zoom).toBe(RANGE.max);
    expect(zoomAbout(widest, 2, anchor, RANGE)).toBe(widest);
    const smallest = zoomAbout(HOME_VIEWPORT, 0.0001, anchor, RANGE);
    expect(smallest.zoom).toBe(RANGE.min);
    expect(zoomAbout(smallest, 0.5, anchor, RANGE)).toBe(smallest);
    expect(clampZoom(10, RANGE)).toBe(RANGE.max);
  });

  it("returns to the starting view after as many zoom ins as zoom outs about the same point", () => {
    const anchor = { x: 333, y: 217 };
    let view: Viewport = { originX: 5, originY: 6, zoom: 1 };
    for (let step = 0; step < 1000; step += 1) view = zoomAbout(zoomAbout(view, 1.1, anchor, RANGE), 1 / 1.1, anchor, RANGE);
    expect(view.originX).toBeCloseTo(5, 6);
    expect(view.originY).toBeCloseTo(6, 6);
    expect(view.zoom).toBeCloseTo(1, 9);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("refuses the factor %s", (factor) => {
    expect(() => zoomAbout(HOME_VIEWPORT, factor, { x: 0, y: 0 }, RANGE)).toThrow(RangeError);
  });
});

describe("coordinates", () => {
  it("converts between world and screen as exact inverses", () => {
    const view: Viewport = { originX: 30, originY: -20, zoom: 2 };
    expect(worldToScreen(view, { x: 40, y: -10 })).toEqual({ x: 20, y: 20 });
    expect(screenToWorld(view, { x: 20, y: 20 })).toEqual({ x: 40, y: -10 });
  });

  it.each([
    [10.3, 2, 21],
    [10.2, 1.5, 15],
    [7.5, 1, 8],
    [-0.4, 1, -0],
  ])("puts the screen position %f at device scale %f on device pixel %f", (screen, scale, expected) => {
    expect(toDevicePixel(screen, scale)).toBe(expected);
  });

  it("refuses a device scale that is not positive", () => {
    expect(() => toDevicePixel(1, 0)).toThrow(RangeError);
  });
});

describe("snapping in world units", () => {
  it.each([
    [{ x: 5, y: 7 }, 12, { x: 0, y: 12 }],
    [{ x: 6, y: 18 }, 12, { x: 12, y: 24 }],
    [{ x: -5, y: -7 }, 12, { x: 0, y: -12 }],
    [{ x: 13.4, y: 2 }, 0.5, { x: 13.5, y: 2 }],
  ])("rounds %j to the nearest multiple of %f", (point, step, expected) => {
    expect(snapToStep(point, step)).toEqual(expected);
  });

  it("refuses a step that is not positive", () => {
    expect(() => snapToStep({ x: 1, y: 1 }, 0)).toThrow(RangeError);
  });
});
