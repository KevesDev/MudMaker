/** Reads the banner data and the step arithmetic only; how the block characters look is checked by eye. */
import { describe, expect, it } from "vitest";
import { SHELL_INFO } from "./homeTestSupport";
import { WORDMARK_ROWS, WORDMARK_TEXT, largestFittingStep } from "./wordmark";

const SOLID = "█▀▄";
const SHADE = "░▒▓";
const BLANK = " ";

const isSolidRow = (row: string): boolean => [...row].some((character) => SOLID.includes(character));
const isShadeRow = (row: string): boolean => [...row].some((character) => SHADE.includes(character));

/** Characters that are neither blocks, shades nor blanks. */
function strayCharacters(rows: readonly string[]): string[] {
  const allowed = new Set([...SOLID, ...SHADE, BLANK]);
  return rows.flatMap((row) => [...row].filter((character) => !allowed.has(character)));
}

/** Rows that do not share one length. */
function raggedRows(rows: readonly string[]): boolean {
  return new Set(rows.map((row) => [...row].length)).size > 1;
}

/** Whether every shade row lies below every solid row. */
function shadeOnlyBelowSolid(rows: readonly string[]): boolean {
  const lastSolid = rows.reduce((last, row, index) => (isSolidRow(row) ? index : last), -1);
  const firstShade = rows.findIndex(isShadeRow);
  return lastSolid >= 0 && firstShade > lastSolid && rows.slice(0, lastSolid + 1).every((row) => !isShadeRow(row));
}

/** The number of separated shapes: runs of columns that hold a block in any solid row. */
function shapeCount(rows: readonly string[]): number {
  const solid = rows.filter(isSolidRow);
  const width = Math.max(...solid.map((row) => [...row].length));
  const lit = Array.from({ length: width }, (_, column) => solid.some((row) => ![BLANK, undefined].includes([...row][column])));
  return lit.filter((isLit, column) => isLit && (column === 0 || !lit[column - 1])).length;
}

describe("the wordmark banner data", () => {
  it("is a grid: every row has the same length", () => {
    expect(WORDMARK_ROWS.length).toBeGreaterThan(1);
    expect(raggedRows(WORDMARK_ROWS)).toBe(false);
    expect(raggedRows(["██", "█"])).toBe(true);
  });

  it("uses only full and half blocks, shade characters and blanks", () => {
    expect(strayCharacters(WORDMARK_ROWS)).toEqual([]);
    expect(strayCharacters(["█x█", "▓ y"])).toEqual(["x", "y"]);
  });

  it("puts shade characters only below the last solid row, as a dithered lower edge", () => {
    expect(WORDMARK_ROWS.some(isShadeRow)).toBe(true);
    expect(shadeOnlyBelowSolid(WORDMARK_ROWS)).toBe(true);
    expect(shadeOnlyBelowSolid(["██", "▒▒", "██"])).toBe(false);
    expect(shadeOnlyBelowSolid(["▒▒", "██"])).toBe(false);
  });

  it("draws one separated letter shape for each letter of the product name", () => {
    expect(shapeCount(WORDMARK_ROWS)).toBe(SHELL_INFO.name.length);
    expect(shapeCount(["██ ██ ██"])).toBe(3);
    expect(shapeCount(["██████"])).toBe(1);
  });

  it("is the same text every time, one line per row", () => {
    expect(WORDMARK_TEXT).toBe(WORDMARK_ROWS.join("\n"));
    expect(WORDMARK_TEXT.split("\n")).toEqual([...WORDMARK_ROWS]);
  });
});

describe("the largest whole step that fits", () => {
  /** A banner whose width grows in proportion to the step. */
  const linear = (unit: number) => (step: number) => unit * step;
  /** A banner of 76 columns whose character advance is rounded to whole pixels, as a real font renders it: 304 at step 4, 456 at step 5, 532 at step 6. */
  const rounded = (step: number): number => 76 * Math.round(1.1 * step);

  it.each([
    [100, 30, 3],
    [90, 30, 3],
    [89, 30, 2],
    [30, 30, 1],
    [29, 30, 1],
    [0, 30, 1],
    [-5, 30, 1],
  ])("fits %s of room for a banner %s wide per step in %s whole steps, never fewer than one", (available, unit, expected) => {
    expect(largestFittingStep(linear(unit), available, 1)).toBe(expected);
  });

  it("measures each candidate instead of assuming widths grow evenly, so rounded character widths cannot make it flip", () => {
    expect([rounded(4), rounded(5), rounded(6)]).toEqual([304, 456, 532]);
    // A linear guess from the width at step 5 (91.2 a step) says 4, and from step 4 (76 a step) says 5: the loop the measurement avoids.
    expect(largestFittingStep(rounded, 400, 5)).toBe(4);
    expect(largestFittingStep(rounded, 455, 4)).toBe(4);
    expect(largestFittingStep(rounded, 456, 4)).toBe(5);
    expect(largestFittingStep(rounded, 531, 5)).toBe(5);
    expect(largestFittingStep(rounded, 532, 5)).toBe(6);
  });

  it("gives the same step from every starting step: it moves up or down from the current step until it is stable", () => {
    for (const [room, expected] of [[300, 3], [400, 4], [460, 5], [540, 6], [20, 1]] as const) {
      for (let from = 1; from <= 9; from += 1) expect(largestFittingStep(rounded, room, from), `room ${room} from ${from}`).toBe(expected);
    }
  });

  it("measures only the current step and its neighbour when the step is already right, instead of probing from one", () => {
    const asked: number[] = [];
    const counted = (step: number): number => {
      asked.push(step);
      return rounded(step);
    };
    expect(largestFittingStep(counted, 400, 4)).toBe(4);
    expect(asked).toEqual([4, 5]);
    asked.length = 0;
    expect(largestFittingStep(counted, 300, 4)).toBe(3);
    expect(asked).toEqual([4, 3]);
  });

  it.each([[Number.NaN], [Number.POSITIVE_INFINITY]])("falls back to one step when the room is %s", (available) => {
    expect(largestFittingStep(linear(30), available, 3)).toBe(1);
  });

  it.each([[0], [-1], [Number.NaN]])("falls back to one step when the banner is %s wide, which means it has not been laid out", (width) => {
    expect(largestFittingStep(() => width, 500, 3)).toBe(1);
  });

  it("stops when a larger step does not make the banner any wider", () => {
    expect(largestFittingStep(() => 40, 500, 1)).toBe(1);
  });
});
