import { describe, expect, it } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager } from "../theme";
import { fakeContext } from "./canvasTestSupport";
import { drawGrid } from "./drawGrid";
import { computeGridLines, maxLinesOnAxis, readGridStyle, type GridStyle } from "./gridLines";
import { HOME_VIEWPORT } from "./viewport";

const manager = new ThemeManager(themeDefaults);
const STYLE = readGridStyle(manager.getSnapshot("editor").tokens);

describe("reading the grid from the theme", () => {
  it("takes every measure and both colors from the resolved tokens of every preset", () => {
    const presets = manager.listPresets();
    expect(presets.length).toBeGreaterThan(1);
    for (const preset of presets) {
      expect(manager.selectPreset("editor", preset.id).ok).toBe(true);
      const tokens = manager.getSnapshot("editor").tokens;
      expect(readGridStyle(tokens)).toEqual({
        baseStep: tokens["grid.baseStep"],
        majorEvery: tokens["grid.majorEvery"],
        minorVisibilityMinScreenStep: tokens["grid.minorVisibilityMinScreenStep"],
        lineWidth: tokens["grid.lineWidth"],
        minorColor: tokens["color.graph.grid.minor"],
        majorColor: tokens["color.graph.grid.major"],
      });
    }
  });

  it("names the token that is not a color", () => {
    const tokens = { ...manager.getSnapshot("editor").tokens, "color.graph.grid.minor": 3 };
    expect(() => readGridStyle(tokens)).toThrow("color.graph.grid.minor");
  });
});

describe("which lines are drawn", () => {
  it("places a minor line every base step and a major line at every fifth, centered on device pixels, at the home view", () => {
    expect(STYLE.baseStep).toBe(24);
    expect(STYLE.majorEvery).toBe(5);
    const lines = computeGridLines(HOME_VIEWPORT, { width: 240, height: 120 }, 1, STYLE);
    expect(lines.lineWidth).toBe(1);
    expect(lines.majorX).toEqual([0.5, 120.5, 240.5]);
    expect(lines.minorX).toEqual([24.5, 48.5, 72.5, 96.5, 144.5, 168.5, 192.5, 216.5]);
    expect(lines.majorY).toEqual([0.5, 120.5]);
    expect(lines.minorY).toEqual([24.5, 48.5, 72.5, 96.5]);
  });

  it("counts major lines by index across negative world coordinates", () => {
    const lines = computeGridLines({ originX: -130, originY: 0, zoom: 1 }, { width: 100, height: 10 }, 1, STYLE);
    // Index -5 sits at world -120, 10 screen pixels in; the next major line is index 0 at 130.
    expect(lines.majorX).toEqual([10.5]);
    expect(lines.minorX).toEqual([34.5, 58.5, 82.5]);
  });

  it("scales positions by zoom about the origin", () => {
    const lines = computeGridLines({ originX: 0, originY: 0, zoom: 2 }, { width: 100, height: 10 }, 1, STYLE);
    expect(lines.minorX).toEqual([48.5, 96.5]);
    expect(lines.majorX).toEqual([0.5]);
  });

  it("hides minor lines whose spacing is under the visibility threshold and keeps the majors, and shows them exactly at it", () => {
    const style: GridStyle = { ...STYLE, minorVisibilityMinScreenStep: 12 };
    const size = { width: 240, height: 10 };
    const under = computeGridLines({ originX: 0, originY: 0, zoom: 0.49 }, size, 1, style);
    expect(under.minorX).toEqual([]);
    expect(under.majorX.length).toBeGreaterThan(0);
    expect(computeGridLines({ originX: 0, originY: 0, zoom: 0.5 }, size, 1, style).minorX.length).toBeGreaterThan(0);
  });

  it("hides every line when even the major spacing is under the threshold", () => {
    const lines = computeGridLines({ originX: 0, originY: 0, zoom: 0.05 }, { width: 500, height: 500 }, 1, STYLE);
    expect([lines.minorX, lines.minorY, lines.majorX, lines.majorY]).toEqual([[], [], [], []]);
  });

  it("aligns to whole device pixels at other scales: an even device width sits on pixel edges, an odd one on pixel middles", () => {
    const doubled = computeGridLines(HOME_VIEWPORT, { width: 60, height: 10 }, 2, STYLE);
    expect(doubled.lineWidth).toBe(2);
    expect(doubled.majorX).toEqual([0]);
    expect(doubled.minorX).toEqual([48, 96]);
    const fractional = computeGridLines(HOME_VIEWPORT, { width: 60, height: 10 }, 1.25, STYLE);
    expect(fractional.lineWidth).toBe(1);
    expect(fractional.minorX.length).toBeGreaterThan(0);
    for (const position of [...fractional.minorX, ...fractional.majorX]) expect(position % 1).toBe(0.5);
  });
});

describe("the work stays bounded by what is in view", () => {
  const UHD = { width: 3840, height: 2160 };

  it("holds a 4K view at the smallest zoom to the line count the screen spacing allows, and draws majors only", () => {
    const zoom = 0.25;
    const lines = computeGridLines({ originX: 0, originY: 0, zoom }, UHD, 1, STYLE);
    const majorSpacing = STYLE.baseStep * STYLE.majorEvery * zoom;
    expect(majorSpacing).toBe(30);
    expect(lines.minorX.length + lines.minorY.length).toBe(0);
    expect(lines.majorX.length).toBeLessThanOrEqual(maxLinesOnAxis(UHD.width, majorSpacing));
    expect(lines.majorY.length).toBeLessThanOrEqual(maxLinesOnAxis(UHD.height, majorSpacing));
    expect(maxLinesOnAxis(UHD.width, majorSpacing)).toBe(129);
    expect(lines.majorX.length).toBeGreaterThan(120);
  });

  it("holds a 4K view at the home zoom to the formula and does not grow when the view is a billion units from the origin", () => {
    const near = computeGridLines(HOME_VIEWPORT, UHD, 1, STYLE);
    const far = computeGridLines({ originX: 1e9, originY: -1e9, zoom: 1 }, UHD, 1, STYLE);
    for (const lines of [near, far]) {
      expect(lines.minorX.length + lines.majorX.length).toBeLessThanOrEqual(maxLinesOnAxis(UHD.width, STYLE.baseStep));
      expect(lines.minorY.length + lines.majorY.length).toBeLessThanOrEqual(maxLinesOnAxis(UHD.height, STYLE.baseStep));
    }
    expect(maxLinesOnAxis(UHD.width, STYLE.baseStep)).toBe(161);
    expect(far.minorX.length + far.majorX.length).toBeGreaterThan(150);
  });
});

describe("drawing", () => {
  const size = { width: 240, height: 120 };

  it("strokes only straight full-length lines in the token colors, minor first and then major, and issues no other primitive", () => {
    const { ctx, calls, strokes } = fakeContext();
    drawGrid(ctx, computeGridLines(HOME_VIEWPORT, size, 1, STYLE), STYLE, size);
    expect(new Set(calls.map((call) => call.split(" ")[0]))).toEqual(new Set(["clearRect", "beginPath", "moveTo", "lineTo", "stroke"]));
    expect(strokes.map((stroke) => [stroke.color, stroke.width])).toEqual([
      [STYLE.minorColor, 1],
      [STYLE.majorColor, 1],
    ]);
    for (const stroke of strokes) {
      expect(stroke.points.length).toBeGreaterThan(0);
      for (let index = 0; index < stroke.points.length; index += 2) {
        const from = stroke.points[index];
        const to = stroke.points[index + 1];
        expect(from?.[0]).toBe("moveTo");
        expect(to?.[0]).toBe("lineTo");
        const vertical = from?.[1] === to?.[1] && from?.[2] === 0 && to?.[2] === size.height;
        const horizontal = from?.[2] === to?.[2] && from?.[1] === 0 && to?.[1] === size.width;
        expect(vertical || horizontal).toBe(true);
      }
    }
    expect(strokes[0]?.points.length).toBe(2 * (8 + 4));
    expect(strokes[1]?.points.length).toBe(2 * (3 + 2));
  });

  it("only clears when the grid is hidden", () => {
    const { ctx, calls } = fakeContext();
    drawGrid(ctx, null, STYLE, size);
    expect(calls).toEqual(["clearRect 0 0 240 120"]);
  });
});
