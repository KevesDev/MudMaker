import { describe, expect, it } from "vitest";
import { MAX_PIECE_HEIGHT, MAX_PIECE_WIDTH } from "../art/parsePiece";
import { FALLBACK_GRID, generatedLayers, gridFor } from "./sceneLayout";

describe("gridFor", () => {
  it("counts the cells of a 1920 by 1040 area at 8 by 13 pixels, 240 by 80, rounded up to whole steps of 32 and 8", () => {
    expect(gridFor({ width: 1920, height: 1040 }, { width: 8, height: 13 })).toEqual({ cols: 256, rows: 80 });
  });

  it("rounds up to the next step and never down, so the layers always cover the area", () => {
    expect(gridFor({ width: 8 * 257, height: 13 * 81 }, { width: 8, height: 13 })).toEqual({ cols: 288, rows: 88 });
    expect(gridFor({ width: 8, height: 13 }, { width: 8, height: 13 })).toEqual({ cols: 32, rows: 8 });
  });

  it("measures nothing when the area or the cell has no size", () => {
    expect(gridFor({ width: 0, height: 1040 }, { width: 8, height: 13 })).toBeNull();
    expect(gridFor({ width: 1920, height: 1040 }, { width: 0, height: 13 })).toBeNull();
  });

  it("stays within the largest piece for an area larger than any display", () => {
    const grid = gridFor({ width: 100_000, height: 100_000 }, { width: 8, height: 13 });
    expect(grid).not.toBeNull();
    expect(grid?.cols).toBeLessThanOrEqual(MAX_PIECE_WIDTH);
    expect((grid?.rows ?? 0) * 2).toBeLessThanOrEqual(MAX_PIECE_HEIGHT);
  });
});

describe("generatedLayers", () => {
  it("covers the width of the grid with both layers and the top three fifths of its height with stars", () => {
    const { stars, lake } = generatedLayers(FALLBACK_GRID);
    expect([stars.width, lake.width]).toEqual([FALLBACK_GRID.cols, FALLBACK_GRID.cols]);
    expect(stars.height / 2).toBe(48);
  });
});
