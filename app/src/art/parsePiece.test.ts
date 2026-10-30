import { afterEach, describe, expect, it, vi } from "vitest";
import { ART_ROLES } from "../theme";
import { ArtParseError, CLEAR_PIXEL, MAX_PIECE_HEIGHT, MAX_PIECE_WIDTH, parseArtPiece, pixelRole, type ArtParseErrorCode, type ArtRole } from "./parsePiece";
import parserSource from "./parsePiece.ts?raw";
import sample from "./fixtures/sample.art.txt?raw";

const SOURCE = "test.art.txt";
const BYTE_ORDER_MARK = "\uFEFF";

/** What one pixel byte holds: the position of its role in the schema list plus one, and zero for a pixel left clear. */
function byteOf(role: ArtRole | null): number {
  return role === null ? CLEAR_PIXEL : ART_ROLES.indexOf(role) + 1;
}

/** A valid piece whose lines a test then breaks in exactly one way. */
function piece(options: { header?: readonly string[]; grid?: readonly string[] } = {}): string {
  const header = options.header ?? ["name: tower", "legend: g=glow a=accent .=."];
  const grid = options.grid ?? ["ga", "..", "ag", "gg"];
  return [...header, "", ...grid].join("\n");
}

function failure(text: string): ArtParseError {
  try {
    parseArtPiece(text, SOURCE);
  } catch (error) {
    if (error instanceof ArtParseError) return error;
    throw error;
  }
  throw new Error("The piece parsed, but the test expected it to be refused");
}

describe("parseArtPiece reads a valid piece", () => {
  it("returns the name, the size and one byte per pixel, mapped through the legend", () => {
    const parsed = parseArtPiece(piece(), SOURCE);
    expect(parsed.name).toBe("tower");
    expect(parsed.width).toBe(2);
    expect(parsed.height).toBe(4);
    expect(parsed.pixels).toBeInstanceOf(Uint8Array);
    expect(parsed.pixels).toHaveLength(parsed.width * parsed.height);
    expect([...parsed.pixels]).toEqual([
      ...[byteOf("glow"), byteOf("accent")],
      ...[byteOf(null), byteOf(null)],
      ...[byteOf("accent"), byteOf("glow")],
      ...[byteOf("glow"), byteOf("glow")],
    ]);
  });

  it("names a role from its byte and nothing from the clear byte", () => {
    expect(pixelRole(CLEAR_PIXEL)).toBeNull();
    expect(ART_ROLES.map((role) => pixelRole(byteOf(role)))).toEqual([...ART_ROLES]);
  });

  it("accepts every role of the theme schema in a legend", () => {
    const legend = ART_ROLES.map((role, index) => `${String.fromCharCode(97 + index)}=${role}`).join(" ");
    const letters = ART_ROLES.map((_, index) => String.fromCharCode(97 + index)).join("");
    const parsed = parseArtPiece(piece({ header: ["name: all", `legend: ${legend}`], grid: [letters, letters] }), SOURCE);
    expect([...parsed.pixels.subarray(0, ART_ROLES.length)].map(pixelRole)).toEqual([...ART_ROLES]);
  });

  it("reads the shipped sample file as the name, size and pixels its legend gives", () => {
    const parsed = parseArtPiece(sample, "sample.art.txt");
    const legend: Readonly<Record<string, ArtRole | null>> = { ".": null, g: "glow", m: "mid", l: "light", n: "near" };
    const rows = [
      "......gg........",
      "......gg........",
      ".....mmmm.......",
      "....mmmmmm......",
      "....mmllmm......",
      "....mmllmm......",
      "...mmmmmmmm.....",
      "...mmmmmmmm.....",
      "nnnnnnnnnnnnnnnn",
      "nnnnnnnnnnnnnnnn",
    ];
    expect({ name: parsed.name, width: parsed.width, height: parsed.height }).toEqual({ name: "sample-tower", width: 16, height: 10 });
    expect([...parsed.pixels]).toEqual(rows.flatMap((row) => [...row].map((character) => byteOf(legend[character] ?? null))));
  });

  it("keeps no cache of parsed pieces: each parse returns a new piece, and the module holds no store", () => {
    const first = parseArtPiece(piece(), SOURCE);
    const second = parseArtPiece(piece(), SOURCE);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.pixels).not.toBe(first.pixels);
    const moduleStore = /^(?:export )?(?:const|let|var)\s+\w+\s*(?::[^=]+)?=\s*new (?:Map|WeakMap|Set|WeakSet)\b/m;
    expect(moduleStore.test("const parsed = new Map<string, ArtPiece>();")).toBe(true);
    expect(moduleStore.test("export const parsed: Map<string, ArtPiece> = new Map();")).toBe(true);
    expect(moduleStore.test(parserSource)).toBe(false);
  });
});

describe("parseArtPiece takes the layout of a file as written", () => {
  const rows = ["ga", "..", "ag", "gg"];
  const expected = [...parseArtPiece(piece(), SOURCE).pixels];

  it("ignores any number of blank lines between the header and the first row", () => {
    expect([...parseArtPiece(piece({ grid: ["", "", ...rows] }), SOURCE).pixels]).toEqual(expected);
  });

  it("ignores blank lines after the last row, whether empty or only spaces and tabs", () => {
    expect([...parseArtPiece(`${piece()}\n\n  \n\t\n`, SOURCE).pixels]).toEqual(expected);
  });

  it("refuses a blank line inside the grid, naming its line and row", () => {
    const error = failure(piece({ grid: ["ga", "..", "", "ag", "gg"] }));
    expect({ code: error.code, line: error.line, row: error.row, column: error.column }).toEqual({ code: "blank-row", line: 6, row: 3, column: 1 });
  });

  it("refuses a line of only spaces inside the grid as a blank row", () => {
    expect(failure(piece({ grid: ["ga", "  ", "ag", "gg"] })).code).toBe("blank-row");
  });

  it("accepts a byte order mark at the start of the file and counts columns from the first visible character", () => {
    expect([...parseArtPiece(`${BYTE_ORDER_MARK}${piece()}`, SOURCE).pixels]).toEqual(expected);
    const error = failure(`${BYTE_ORDER_MARK}${piece({ header: ["name: tower", "legend: g=glow ab"] })}`);
    expect({ code: error.code, line: error.line, column: error.column }).toEqual({ code: "bad-legend-entry", line: 2, column: 16 });
  });

  it("accepts tabs between legend entries and after a header colon", () => {
    const parsed = parseArtPiece(piece({ header: ["name:\ttower", "legend:\tg=glow\ta=accent\t.=."] }), SOURCE);
    expect(parsed.name).toBe("tower");
    expect([...parsed.pixels]).toEqual(expected);
  });

  it("refuses a tab inside a row as an unknown character at its column", () => {
    const error = failure(piece({ grid: ["gg", "g\t", "gg", "gg"] }));
    expect({ code: error.code, row: error.row, column: error.column }).toEqual({ code: "unknown-character", row: 2, column: 2 });
  });

  it("accepts Windows line endings together with a byte order mark", () => {
    const text = `${BYTE_ORDER_MARK}${piece()}\n`.replaceAll("\n", "\r\n");
    expect(text).toContain("\r\n");
    expect([...parseArtPiece(text, SOURCE).pixels]).toEqual(expected);
  });
});

describe("parseArtPiece refuses every malformed case with its place", () => {
  const cases: readonly (readonly [string, ArtParseErrorCode, string, { line: number; row: number | null; column: number }])[] = [
    ["a header line that is not key and value", "bad-header", piece({ header: ["name: tower", "legend g=glow"] }), { line: 2, row: null, column: 1 }],
    ["an unknown header key", "unknown-header", piece({ header: ["name: tower", "legend: g=glow", "size: 2"] }), { line: 3, row: null, column: 1 }],
    ["a repeated header key", "duplicate-header", piece({ header: ["name: tower", "legend: g=glow", "name: again"] }), { line: 3, row: null, column: 1 }],
    ["a piece without a name", "missing-name", piece({ header: ["legend: g=glow"] }), { line: 1, row: null, column: 1 }],
    ["a name header with no value, reported at its own line", "missing-name", piece({ header: ["legend: g=glow", "name:"] }), { line: 2, row: null, column: 1 }],
    ["a name header of only spaces, reported at its own line", "missing-name", piece({ header: ["legend: g=glow", "name:   "] }), { line: 2, row: null, column: 1 }],
    ["a legend header with no entries, reported at its own line", "missing-legend", piece({ header: ["name: tower", "legend:"] }), { line: 2, row: null, column: 1 }],
    ["a piece without a legend", "missing-legend", piece({ header: ["name: tower"] }), { line: 1, row: null, column: 1 }],
    ["a legend entry without a role", "bad-legend-entry", piece({ header: ["name: tower", "legend: g=glow ab"] }), { line: 2, row: null, column: 16 }],
    ["a legend character defined twice", "duplicate-legend-char", piece({ header: ["name: tower", "legend: g=glow g=accent"] }), { line: 2, row: null, column: 16 }],
    ["a role that the theme does not define", "unknown-role", piece({ header: ["name: tower", "legend: g=glow a=lava"] }), { line: 2, row: null, column: 18 }],
    ["a grid with no rows", "empty-grid", piece({ grid: [] }), { line: 3, row: null, column: 1 }],
    ["a row shorter than the first", "ragged-row", piece({ grid: ["gg", "g", "gg", "gg"] }), { line: 5, row: 2, column: 2 }],
    ["a row longer than the first", "ragged-row", piece({ grid: ["gg", "ggg", "gg", "gg"] }), { line: 5, row: 2, column: 3 }],
    ["a character that the legend does not define", "unknown-character", piece({ grid: ["gg", "gg", "gx", "gg"] }), { line: 6, row: 3, column: 2 }],
    ["a space inside a row", "unknown-character", piece({ grid: ["gg", "g ", "gg", "gg"] }), { line: 5, row: 2, column: 2 }],
    ["an odd number of pixel rows", "odd-height", piece({ grid: ["gg", "gg", "gg"] }), { line: 6, row: 3, column: 1 }],
  ];

  it.each(cases)("%s", (_title, code, text, place) => {
    const error = failure(text);
    expect({ code: error.code, line: error.line, row: error.row, column: error.column }).toEqual({ code, ...place });
  });

  it("names the piece in the error, by its name once it is known and by the file before that", () => {
    expect(failure(piece({ grid: ["gg", "g", "gg", "gg"] })).piece).toBe("tower");
    expect(failure(piece({ header: ["legend: g=glow"] })).piece).toBe(SOURCE);
  });

  it("puts the piece, the line and the column in the message for the author", () => {
    const error = failure(piece({ grid: ["gg", "gg", "gx", "gg"] }));
    expect(error.message).toContain('"tower"');
    expect(error.message).toContain("line 6");
    expect(error.message).toContain("column 2");
  });

  it("refuses the same refused piece every time", () => {
    const text = piece({ grid: ["gg", "gg", "gg"] });
    expect(failure(text).code).toBe("odd-height");
    expect(failure(text).code).toBe("odd-height");
  });
});

describe("parseArtPiece bounds what it allocates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Source text for a piece of the given size in pixels, every pixel the same role. */
  function sized(width: number, height: number): string {
    return ["name: big", "legend: g=glow", "", ...Array.from({ length: height }, () => "g".repeat(width))].join("\n");
  }

  it("refuses a ragged row before it allocates anything for the pixels, even when the first row is wide", () => {
    const sizes: number[] = [];
    const Original = Uint8Array;
    vi.stubGlobal(
      "Uint8Array",
      class extends Original {
        constructor(...args: ConstructorParameters<typeof Uint8Array>) {
          super(...args);
          sizes.push(this.length);
        }
      },
    );
    const wide = MAX_PIECE_WIDTH;
    const text = ["name: wide", "legend: g=glow", "", "g".repeat(wide), "g", "g", "g"].join("\n");
    const error = failure(text);
    expect({ code: error.code, row: error.row, column: error.column }).toEqual({ code: "ragged-row", row: 2, column: 2 });
    expect(sizes).toEqual([]);
  });

  it("accepts a piece at the limit in each direction", () => {
    expect(parseArtPiece(sized(MAX_PIECE_WIDTH, 2), SOURCE).pixels).toHaveLength(MAX_PIECE_WIDTH * 2);
    expect(parseArtPiece(sized(2, MAX_PIECE_HEIGHT), SOURCE).pixels).toHaveLength(2 * MAX_PIECE_HEIGHT);
  });

  it("refuses a piece wider than the limit with a too-large error that names its size and where the limit is passed", () => {
    const error = failure(sized(MAX_PIECE_WIDTH + 2, 2));
    expect({ code: error.code, line: error.line, row: error.row, column: error.column }).toEqual({ code: "too-large", line: 4, row: 1, column: MAX_PIECE_WIDTH + 1 });
    expect(error.message).toContain(`${MAX_PIECE_WIDTH + 2} pixels wide`);
    expect(error.message).toContain("2 pixel rows");
    expect(error.message).toContain(String(MAX_PIECE_WIDTH));
  });

  it("refuses a piece taller than the limit with a too-large error at the first row past it", () => {
    const error = failure(sized(2, MAX_PIECE_HEIGHT + 2));
    expect({ code: error.code, line: error.line, row: error.row, column: error.column }).toEqual({ code: "too-large", line: 3 + MAX_PIECE_HEIGHT + 1, row: MAX_PIECE_HEIGHT + 1, column: 1 });
    expect(error.message).toContain(`${MAX_PIECE_HEIGHT + 2} pixel rows`);
  });

  it("raises only a typed error for a piece far past the limit, never a raw range error", () => {
    const hugeWidth = 5_000_000;
    const error = failure(["name: huge", "legend: g=glow", "", "g".repeat(hugeWidth), "g".repeat(hugeWidth)].join("\n"));
    expect(error).toBeInstanceOf(ArtParseError);
    expect(error.code).toBe("too-large");
  });
});
