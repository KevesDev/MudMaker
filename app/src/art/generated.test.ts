import { describe, expect, it } from "vitest";
import { lake, starField, type LakeSpec, type StarFieldSpec } from "./generated";
import { MAX_PIECE_WIDTH, pixelRole, type ArtPiece, type ArtRole } from "./parsePiece";

const STARS: StarFieldSpec = { seed: 7, cols: 64, rows: 20, starDensity: 0.01, sparkleDensity: 0.002 };
const LAKE: LakeSpec = { seed: 7, cols: 64, ridgeRows: 6, waterRows: 4, ridgeSpan: 14, ridgeDetailSpan: 5, rippleRun: { min: 4, max: 12 } };

const roleAt = (piece: ArtPiece, x: number, y: number): ArtRole | null => pixelRole(piece.pixels[y * piece.width + x] ?? 0);
const column = (piece: ArtPiece, x: number): (ArtRole | null)[] => Array.from({ length: piece.height }, (_, y) => roleAt(piece, x, y));

describe("starField", () => {
  it("is the same piece for the same spec and a different one for another seed", () => {
    expect(starField(STARS).pixels).toEqual(starField(STARS).pixels);
    expect(starField({ ...STARS, seed: 8 }).pixels).not.toEqual(starField(STARS).pixels);
  });

  it("keeps the stars it already has when the window grows wider", () => {
    const narrow = starField(STARS);
    const wide = starField({ ...STARS, cols: STARS.cols + 32 });
    expect(narrow.pixels.some((pixel) => pixel !== 0)).toBe(true);
    // A sparkle centred in the new columns reaches one column back, so the last column is left out.
    for (let x = 0; x < narrow.width - 1; x += 1) expect(column(wide, x), `column ${x}`).toEqual(column(narrow, x));
  });

  it("holds only stars when sparkles are off, thinning toward the bottom, near the density asked", () => {
    const piece = starField({ ...STARS, cols: 400, rows: 40, sparkleDensity: 0 });
    const half = piece.height / 2;
    let top = 0;
    let bottom = 0;
    for (let y = 0; y < piece.height; y += 1) {
      for (let x = 0; x < piece.width; x += 1) {
        if (roleAt(piece, x, y) === null) continue;
        expect(roleAt(piece, x, y)).toBe("star");
        if (y < half) top += 1;
        else bottom += 1;
      }
    }
    // The density falls linearly from 0.01 at the top to 0 at the foot: the top half expects 0.0075 of its 16000 pixels, 120 stars, and the bottom half 0.0025, 40.
    expect(top).toBeGreaterThan(80);
    expect(top).toBeLessThan(160);
    expect(top).toBeGreaterThan(bottom * 2);
  });

  it("draws each sparkle as a plus of the accent role", () => {
    const piece = starField({ ...STARS, starDensity: 0, sparkleDensity: 0.01 });
    let centres = 0;
    for (let y = 1; y < piece.height - 1; y += 1) {
      for (let x = 1; x < piece.width - 1; x += 1) {
        const plus = [roleAt(piece, x, y), roleAt(piece, x - 1, y), roleAt(piece, x + 1, y), roleAt(piece, x, y - 1), roleAt(piece, x, y + 1)];
        if (plus.every((role) => role === "accent")) centres += 1;
      }
    }
    expect(centres).toBeGreaterThan(0);
  });
});

describe("lake", () => {
  const piece = lake(LAKE);
  const horizon = LAKE.ridgeRows * 2;

  it("draws the horizon as one unbroken line with only hills above it", () => {
    for (let x = 0; x < piece.width; x += 1) expect(roleAt(piece, x, horizon), `column ${x}`).toBe("sky");
    for (let y = 0; y < horizon; y += 1) for (let x = 0; x < piece.width; x += 1) expect(["near", "far", null]).toContain(roleAt(piece, x, y));
  });

  it("makes each hill a solid run from its edge down to the horizon, starting on a text row", () => {
    let hills = 0;
    for (let x = 0; x < piece.width; x += 1) {
      const above = column(piece, x).slice(0, horizon);
      const first = above.findIndex((role) => role !== null);
      if (first === -1) continue;
      hills += 1;
      expect(first % 2, `column ${x} starts on a text row`).toBe(0);
      expect(above.slice(first + 1).every((role) => role === "near"), `column ${x} is solid`).toBe(true);
    }
    expect(hills).toBeGreaterThan(0);
  });

  it("puts ripples only on the lower pixel row of a cell, each within the length asked", () => {
    const { min, max } = LAKE.rippleRun;
    const wide = lake({ ...LAKE, cols: 400 });
    let ripples = 0;
    for (let y = horizon + 1; y < wide.height; y += 1) {
      let start = -1;
      for (let x = 0; x <= wide.width; x += 1) {
        const lit = x < wide.width && roleAt(wide, x, y) !== null;
        if (lit && start === -1) start = x;
        if (!lit && start !== -1) {
          ripples += 1;
          expect((y - horizon) % 2, `row ${y} is a lower pixel row`).toBe(1);
          // A ripple cut by an edge of the piece may be shorter than the least asked.
          if (start > 0 && x < wide.width) {
            expect(x - start).toBeGreaterThanOrEqual(min);
            expect(x - start).toBeLessThanOrEqual(max);
          }
          start = -1;
        }
      }
    }
    expect(ripples).toBeGreaterThan(20);
  });

  it("refuses a piece that is empty, fractional or wider than any piece may be", () => {
    for (const cols of [0, 1.5, MAX_PIECE_WIDTH + 1]) expect(() => lake({ ...LAKE, cols }), String(cols)).toThrow(RangeError);
    expect(() => starField({ ...STARS, rows: 0 })).toThrow(RangeError);
  });
});
