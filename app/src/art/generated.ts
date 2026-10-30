import { CLEAR_PIXEL, MAX_PIECE_HEIGHT, MAX_PIECE_WIDTH, rolePixel, type ArtPiece, type ArtRole } from "./parsePiece";

/**
 * A fraction in [0, 1) that depends only on the seed and the two coordinates. A generated piece is built from it
 * pixel by pixel, so the same seed gives the same pixels on every machine and a wider or taller piece only adds
 * pixels at its far edges: the ones already there never move when a window is resized.
 */
function unit(seed: number, x: number, y: number): number {
  let mixed = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b) ^ Math.imul(seed, 0xc2b2ae35);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  mixed ^= mixed >>> 16;
  return (mixed >>> 0) / 0x1_0000_0000;
}

function blankPiece(name: string, cols: number, textRows: number): { readonly piece: ArtPiece; readonly set: (x: number, y: number, role: ArtRole) => void } {
  const height = textRows * 2;
  if (!Number.isInteger(cols) || !Number.isInteger(textRows) || cols < 1 || textRows < 1 || cols > MAX_PIECE_WIDTH || height > MAX_PIECE_HEIGHT) {
    throw new RangeError(`Generated art piece "${name}" cannot be ${cols} cells wide and ${textRows} text rows tall.`);
  }
  const pixels = new Uint8Array(cols * height).fill(CLEAR_PIXEL);
  return {
    piece: { name, width: cols, height, pixels },
    set: (x, y, role) => {
      if (x >= 0 && x < cols && y >= 0 && y < height) pixels[y * cols + x] = rolePixel(role);
    },
  };
}

export interface StarFieldSpec {
  readonly seed: number;
  readonly cols: number;
  readonly rows: number;
  /** The share of pixels at the top edge that hold a star; it thins to none at the bottom edge. */
  readonly starDensity: number;
  /** The share of pixels at the top edge that centre a four-point sparkle; it thins the same way. */
  readonly sparkleDensity: number;
}

/** Single-pixel stars and a few plus-shaped sparkles over a clear sky, thinning toward the horizon. */
export function starField({ seed, cols, rows, starDensity, sparkleDensity }: StarFieldSpec): ArtPiece {
  const { piece, set } = blankPiece("sky-stars", cols, rows);
  for (let y = 0; y < piece.height; y += 1) {
    const thinning = 1 - y / piece.height;
    for (let x = 0; x < cols; x += 1) {
      if (unit(seed, x, y) < starDensity * thinning) set(x, y, "star");
    }
  }
  for (let y = 1; y < piece.height - 1; y += 1) {
    const thinning = 1 - y / piece.height;
    for (let x = 1; x < cols - 1; x += 1) {
      if (unit(seed + 1, x, y) >= sparkleDensity * thinning) continue;
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as const) set(x + dx, y + dy, "accent");
    }
  }
  return piece;
}

export interface LakeSpec {
  readonly seed: number;
  readonly cols: number;
  /** Text rows of distant hills above the horizon. */
  readonly ridgeRows: number;
  /** Text rows of water below it. */
  readonly waterRows: number;
  /** Columns between the points the coarse shape of the hills is interpolated from. */
  readonly ridgeSpan: number;
  /** Columns between the points of the fine shape added on top of it. */
  readonly ridgeDetailSpan: number;
  /** The shortest and the longest a ripple or a gap between ripples runs, in columns. */
  readonly rippleRun: { readonly min: number; readonly max: number };
}

/** A smooth value between the unit values at the two lattice points around x, along one line of the seed's noise. */
function noise(seed: number, line: number, x: number, span: number): number {
  const cell = Math.floor(x / span);
  const along = (x - cell * span) / span;
  const eased = along * along * (3 - 2 * along);
  return unit(seed, cell, line) * (1 - eased) + unit(seed, cell + 1, line) * eased;
}

/** Share of the hills' height taken by the coarse shape; the fine shape takes the rest. */
const COARSE_SHARE = 0.7;
/** The water's upper third is lit by the horizon, so its ripples take the lighter role. */
const NEAR_HORIZON_SHARE = 1 / 3;

/** Distant hills along the horizon over still water with sparse ripples. The hills take whole text rows so their edge stays coarse. */
export function lake(spec: LakeSpec): ArtPiece {
  const { seed, cols, ridgeRows, waterRows, ridgeSpan, ridgeDetailSpan, rippleRun } = spec;
  const { piece, set } = blankPiece("lake", cols, ridgeRows + waterRows);
  const horizon = ridgeRows * 2;
  for (let x = 0; x < cols; x += 1) {
    const shape = COARSE_SHARE * noise(seed, 0, x, ridgeSpan) + (1 - COARSE_SHARE) * noise(seed, 1, x, ridgeDetailSpan);
    const hillRows = Math.round(shape * ridgeRows);
    for (let y = horizon - hillRows * 2; y < horizon; y += 1) set(x, y, "near");
    if (hillRows > 0) set(x, horizon - hillRows * 2, "far");
    set(x, horizon, "sky");
  }
  const runLength = (x: number, y: number, salt: number): number => rippleRun.min + Math.floor(unit(seed + salt, x, y) * (rippleRun.max - rippleRun.min + 1));
  const waterDepth = waterRows * 2;
  for (let depth = 1; depth < waterDepth; depth += 2) {
    const y = horizon + depth;
    const role = depth < waterDepth * NEAR_HORIZON_SHARE ? "sky" : "far";
    let x = runLength(0, y, 2) - rippleRun.min;
    while (x < cols) {
      const length = runLength(x, y, 3);
      for (let end = x + length; x < end; x += 1) set(x, y, role);
      x += runLength(x, y, 4);
    }
  }
  return piece;
}
