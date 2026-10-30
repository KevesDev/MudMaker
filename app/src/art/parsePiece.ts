import { ART_ROLES } from "../theme";

export type ArtRole = (typeof ART_ROLES)[number];

/** The byte of a pixel left clear. Any other byte is the position of its role in the schema list plus one. */
export const CLEAR_PIXEL = 0;

/** A parsed piece: one byte per pixel, row by row, so a piece costs width times height bytes. Height is always even. */
export interface ArtPiece {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/**
 * The most pixels a piece may span in each direction. The largest display the application expects is 8K, 7680 by
 * 4320 pixels; at the smallest code size a cell is about 7 pixels wide and 13 tall, so such a screen holds about 1100
 * cells across and 660 pixel rows down. 2048 leaves headroom for a piece anchored to one edge of it and keeps a piece
 * to 4 MiB. A larger file is refused before any pixel memory is allocated.
 */
export const MAX_PIECE_WIDTH = 2048;
export const MAX_PIECE_HEIGHT = 2048;

/** The role a pixel byte names, or null for a pixel left clear. */
export function pixelRole(pixel: number): ArtRole | null {
  return ART_ROLES[pixel - 1] ?? null;
}

export type ArtParseErrorCode =
  | "bad-header"
  | "unknown-header"
  | "duplicate-header"
  | "missing-name"
  | "missing-legend"
  | "bad-legend-entry"
  | "duplicate-legend-char"
  | "unknown-role"
  | "empty-grid"
  | "blank-row"
  | "ragged-row"
  | "unknown-character"
  | "odd-height"
  | "too-large";

/** The place of a problem. `line` and `column` are one-based; `row` is the one-based pixel row of the grid, null in the header. */
export class ArtParseError extends Error {
  constructor(
    readonly code: ArtParseErrorCode,
    readonly piece: string,
    readonly line: number,
    readonly row: number | null,
    readonly column: number,
    detail: string,
  ) {
    const where = row === null ? `line ${line}` : `line ${line}, row ${row}`;
    super(`Art piece "${piece}", ${where}, column ${column}: ${detail}`);
    this.name = "ArtParseError";
  }
}

const BYTE_ORDER_MARK = "\uFEFF";
const HEADER_LINE = /^([a-z]+):[ \t]*(.*)$/;
const TOKEN = /\S+/g;
const TRANSPARENT = ".";
const LEGEND_SEPARATOR = "=";
const HEADER_KEYS = ["name", "legend"] as const;

function isRole(value: string): value is ArtRole {
  return ART_ROLES.some((role) => role === value);
}

const isBlank = (line: string): boolean => line.trim() === "";

/** The one-based column of a code unit index, counting characters outside the basic plane once. */
function columnAt(line: string, index: number): number {
  return Array.from(line.slice(0, index)).length + 1;
}

type Refuse = (code: ArtParseErrorCode, line: number, row: number | null, column: number, detail: string) => ArtParseError;

interface Header {
  readonly value: string;
  readonly line: number;
}

/**
 * Reads one art file: header lines (`name`, `legend`), then the pixel grid, one character per pixel. The legend maps
 * each grid character to a role or to `.` for a pixel left clear. The header ends at the first blank line. Blank
 * lines before the first row and after the last are ignored, a blank line between rows is refused, and a byte
 * order mark at the start is dropped. A refused file throws an ArtParseError that names the piece, the line, the
 * pixel row and the column. The size is checked first, then every row, and only a valid piece allocates its pixels.
 * Within a row, its length is checked before its characters.
 */
export function parseArtPiece(text: string, source: string): ArtPiece {
  const content = text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text;
  const lines = content.replaceAll("\r\n", "\n").split("\n");
  while (lines.length > 0 && isBlank(lines.at(-1) ?? "")) lines.pop();
  const headerEnd = lines.findIndex(isBlank);
  const headerLines = headerEnd === -1 ? lines : lines.slice(0, headerEnd);
  let piece = source;
  const refuse: Refuse = (code, line, row, column, detail) => new ArtParseError(code, piece, line, row, column, detail);

  const headers = new Map<string, Header>();
  for (const [index, line] of headerLines.entries()) {
    const match = HEADER_LINE.exec(line);
    if (match === null) throw refuse("bad-header", index + 1, null, 1, "expected a key, a colon and a value");
    const key = match[1] ?? "";
    if (!(HEADER_KEYS as readonly string[]).includes(key)) throw refuse("unknown-header", index + 1, null, 1, `"${key}" is not a header of an art piece`);
    if (headers.has(key)) throw refuse("duplicate-header", index + 1, null, 1, `"${key}" is given twice`);
    headers.set(key, { value: match[2] ?? "", line: index + 1 });
  }

  const nameHeader = headers.get("name");
  const name = nameHeader?.value.trim() ?? "";
  if (name === "") throw refuse("missing-name", nameHeader?.line ?? 1, null, 1, "the piece has no name");
  piece = name;

  const legend = parseLegend(headers.get("legend"), headerLines, refuse);
  const firstRow = headerEnd === -1 ? -1 : lines.findIndex((line, index) => index > headerEnd && !isBlank(line));
  if (firstRow === -1) throw refuse("empty-grid", headerLines.length + 1, null, 1, "the piece has no pixel rows");
  const rows = lines.slice(firstRow);
  const characters = (row: string): string[] => Array.from(row);
  const width = characters(rows[0] ?? "").length;
  if (width > MAX_PIECE_WIDTH) {
    throw refuse("too-large", firstRow + 1, 1, MAX_PIECE_WIDTH + 1, `the piece is ${width} pixels wide and ${rows.length} pixel rows tall; the widest allowed is ${MAX_PIECE_WIDTH}`);
  }
  if (rows.length > MAX_PIECE_HEIGHT) {
    throw refuse("too-large", firstRow + MAX_PIECE_HEIGHT + 1, MAX_PIECE_HEIGHT + 1, 1, `the piece is ${width} pixels wide and ${rows.length} pixel rows tall; the tallest allowed is ${MAX_PIECE_HEIGHT}`);
  }
  for (const [index, row] of rows.entries()) {
    const line = firstRow + index + 1;
    if (isBlank(row)) throw refuse("blank-row", line, index + 1, 1, "a blank line cannot sit between rows");
    const pixelsOfRow = characters(row);
    if (pixelsOfRow.length !== width) throw refuse("ragged-row", line, index + 1, Math.min(pixelsOfRow.length, width) + 1, `the row has ${pixelsOfRow.length} pixels, the first row has ${width}`);
    const unknown = pixelsOfRow.findIndex((character) => !legend.has(character));
    if (unknown !== -1) throw refuse("unknown-character", line, index + 1, unknown + 1, `"${pixelsOfRow[unknown]}" is not in the legend`);
  }
  if (rows.length % 2 !== 0) {
    throw refuse("odd-height", firstRow + rows.length, rows.length, 1, `${rows.length} pixel rows cannot fill whole text rows, which take two`);
  }
  const pixels = new Uint8Array(width * rows.length);
  for (const [index, row] of rows.entries()) {
    for (const [column, character] of characters(row).entries()) pixels[index * width + column] = legend.get(character) ?? CLEAR_PIXEL;
  }
  return { name, width, height: rows.length, pixels };
}

/** Maps each grid character to its pixel byte. */
function parseLegend(header: Header | undefined, headerLines: readonly string[], refuse: Refuse): Map<string, number> {
  if (header === undefined || header.value.trim() === "") throw refuse("missing-legend", header?.line ?? 1, null, 1, "the piece has no legend");
  const lineText = headerLines[header.line - 1] ?? "";
  const valueStart = lineText.length - header.value.length;
  const legend = new Map<string, number>();
  for (const token of header.value.matchAll(TOKEN)) {
    const column = columnAt(lineText, valueStart + token.index);
    const [character, separator, ...rest] = Array.from(token[0]);
    const role = rest.join("");
    if (character === undefined || separator !== LEGEND_SEPARATOR || role === "") {
      throw refuse("bad-legend-entry", header.line, null, column, `"${token[0]}" is not a character, an equals sign and a role`);
    }
    if (legend.has(character)) throw refuse("duplicate-legend-char", header.line, null, column, `"${character}" is defined twice`);
    if (role === TRANSPARENT) legend.set(character, CLEAR_PIXEL);
    else if (isRole(role)) legend.set(character, ART_ROLES.indexOf(role) + 1);
    else throw refuse("unknown-role", header.line, null, column + 2, `"${role}" is not an art role`);
  }
  return legend;
}
