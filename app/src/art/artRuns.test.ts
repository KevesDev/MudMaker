import { describe, expect, it } from "vitest";
import { cellRuns } from "./artRuns";
import { parseArtPiece } from "./parsePiece";
import sample from "./fixtures/sample.art.txt?raw";

const HEADER = "name: small\nlegend: s=sky m=mid h=haze .=.";

/** The pieces below are written pixel by pixel, and their expected cells worked out by hand from the half block rule. */
function small(rows: readonly string[]) {
  return parseArtPiece(`${HEADER}\n\n${rows.join("\n")}`, "small.art.txt");
}

describe("cellRuns turns two pixel rows into one row of text cells", () => {
  it("shows a lower half, an upper half, a full block and nothing, each with the colors the pixels name", () => {
    // Row pair one: upper-only, lower-only, equal. Row pair two: both transparent, sky over mid, mid over sky.
    const runs = cellRuns(small(["s.m", ".sm", ".sm", ".ms"]));
    expect(runs).toEqual([
      [
        { text: "\u2580", fg: "sky", bg: null },
        { text: "\u2584", fg: "sky", bg: null },
        { text: "\u2588", fg: "mid", bg: null },
      ],
      [
        { text: " ", fg: null, bg: null },
        { text: "\u2580", fg: "sky", bg: "mid" },
        { text: "\u2580", fg: "mid", bg: "sky" },
      ],
    ]);
  });

  it("merges neighbours with the same character, foreground and background into one run", () => {
    expect(cellRuns(small(["ssssss", "ssssss"]))).toEqual([[{ text: "\u2588".repeat(6), fg: "sky", bg: null }]]);
    expect(cellRuns(small(["......", "......"]))).toEqual([[{ text: " ".repeat(6), fg: null, bg: null }]]);
  });

  it("starts a new run when only the background differs, or only the foreground, or only the character", () => {
    const runs = cellRuns(small(["sssmmh", "smhmms"]));
    expect(runs).toEqual([
      [
        { text: "\u2588", fg: "sky", bg: null },
        { text: "\u2580", fg: "sky", bg: "mid" },
        { text: "\u2580", fg: "sky", bg: "haze" },
        { text: "\u2588\u2588", fg: "mid", bg: null },
        { text: "\u2580", fg: "haze", bg: "sky" },
      ],
    ]);
  });

  it("merges neighbouring upper-half cells with the same foreground, and lower-half cells with the same foreground", () => {
    expect(cellRuns(small(["sss", "..."]))).toEqual([[{ text: "\u2580".repeat(3), fg: "sky", bg: null }]]);
    expect(cellRuns(small(["...", "mmm"]))).toEqual([[{ text: "\u2584".repeat(3), fg: "mid", bg: null }]]);
  });

  it("merges neighbouring half-block cells that show two colors when both colors match", () => {
    expect(cellRuns(small(["sss", "mmm"]))).toEqual([[{ text: "\u2580".repeat(3), fg: "sky", bg: "mid" }]]);
  });

  it("does not merge an upper-half cell with a lower-half cell of the same color", () => {
    expect(cellRuns(small(["s.", ".s"]))).toEqual([
      [
        { text: "\u2580", fg: "sky", bg: null },
        { text: "\u2584", fg: "sky", bg: null },
      ],
    ]);
  });

  it("keeps the runs of a row apart from the next row, even when the last and first cells match", () => {
    const runs = cellRuns(small(["ss", "ss", "ss", "ss"]));
    expect(runs).toEqual([[{ text: "\u2588\u2588", fg: "sky", bg: null }], [{ text: "\u2588\u2588", fg: "sky", bg: null }]]);
  });

  it("reduces the sample piece from eighty cells to the seventeen runs counted by hand", () => {
    const piece = parseArtPiece(sample, "sample.art.txt");
    const runs = cellRuns(piece);
    // Per text row, counted from the sample file: 3, 5, 5, 3 and 1 runs.
    expect(runs.map((row) => row.length)).toEqual([3, 5, 5, 3, 1]);
    expect(runs.flat()).toHaveLength(17);
    expect(runs.map((row) => Array.from(row.map((run) => run.text).join("")).length)).toEqual(Array(5).fill(16));
  });

  it("computes the runs once per piece", () => {
    const piece = small(["ss", "mm"]);
    expect(cellRuns(piece)).toBe(cellRuns(piece));
  });

  it("gives the exact runs of a large piece: 400 by 120 pixels in stripes eight wide", () => {
    const stripe = 8;
    const width = 400;
    const height = 120;
    const row = Array.from({ length: width }, (_, x) => (Math.floor(x / stripe) % 2 === 0 ? "s" : "m")).join("");
    const piece = small(Array.from({ length: height }, () => row));
    const runs = cellRuns(piece);
    const expectedRow = Array.from({ length: width / stripe }, (_, index) => ({ text: "\u2588".repeat(stripe), fg: index % 2 === 0 ? "sky" : "mid", bg: null }));
    expect(runs).toHaveLength(height / 2);
    expect(runs.every((cells) => cells.length === width / stripe)).toBe(true);
    expect(runs[0]).toEqual(expectedRow);
    expect(runs.at(-1)).toEqual(expectedRow);
    expect(runs.flat()).toHaveLength((height / 2) * (width / stripe));
  });
});
