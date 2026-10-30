import { CLEAR_PIXEL, pixelRole, type ArtPiece, type ArtRole } from "./parsePiece";

/** A stretch of neighbouring cells in one row that show the same character in the same colors. */
export interface ArtRun {
  readonly text: string;
  readonly fg: ArtRole | null;
  readonly bg: ArtRole | null;
}

/** The characters of a cell: the upper half block, the lower half block, the full block and a space. */
export const GLYPHS = { upper: "\u2580", lower: "\u2584", full: "\u2588", empty: " " } as const;

/** One cell shows two pixels. When they differ the upper half block takes the upper color as foreground and the lower as background. */
function characterOf(upper: number, lower: number): string {
  if (upper === CLEAR_PIXEL && lower === CLEAR_PIXEL) return GLYPHS.empty;
  if (upper === lower) return GLYPHS.full;
  return upper === CLEAR_PIXEL ? GLYPHS.lower : GLYPHS.upper;
}

const foregroundOf = (upper: number, lower: number): number => (upper === CLEAR_PIXEL ? lower : upper);

const backgroundOf = (upper: number, lower: number): number => (upper !== CLEAR_PIXEL && lower !== CLEAR_PIXEL && upper !== lower ? lower : CLEAR_PIXEL);

/** A run while it grows: the character is repeated into text once the row is complete. */
interface OpenRun {
  readonly character: string;
  readonly fg: number;
  readonly bg: number;
  count: number;
}

function rowRuns(piece: ArtPiece, top: number): ArtRun[] {
  const open: OpenRun[] = [];
  const upperStart = top * piece.width;
  const lowerStart = upperStart + piece.width;
  for (let column = 0; column < piece.width; column += 1) {
    const upper = piece.pixels[upperStart + column] ?? CLEAR_PIXEL;
    const lower = piece.pixels[lowerStart + column] ?? CLEAR_PIXEL;
    const character = characterOf(upper, lower);
    const fg = foregroundOf(upper, lower);
    const bg = backgroundOf(upper, lower);
    const last = open.at(-1);
    if (last !== undefined && last.character === character && last.fg === fg && last.bg === bg) last.count += 1;
    else open.push({ character, fg, bg, count: 1 });
  }
  return open.map((run) => ({ text: run.character.repeat(run.count), fg: pixelRole(run.fg), bg: pixelRole(run.bg) }));
}

const cache = new WeakMap<ArtPiece, readonly (readonly ArtRun[])[]>();

/**
 * The runs of every text row of a piece, top to bottom, computed once per piece in one pass over its pixels. What
 * is drawn depends on the piece alone; the theme only recolors it.
 */
export function cellRuns(piece: ArtPiece): readonly (readonly ArtRun[])[] {
  const known = cache.get(piece);
  if (known !== undefined) return known;
  const rows = Array.from({ length: piece.height / 2 }, (_, index) => rowRuns(piece, index * 2));
  cache.set(piece, rows);
  return rows;
}
