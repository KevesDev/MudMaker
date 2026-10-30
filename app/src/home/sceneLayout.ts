import { starField, lake, type LakeSpec, type StarFieldSpec } from "../art/generated";
import { MAX_PIECE_HEIGHT, MAX_PIECE_WIDTH, type ArtPiece } from "../art/parsePiece";

/** The window measured in whole text cells: columns across and text rows down, two pixel rows to a text row. */
export interface SceneGrid {
  readonly cols: number;
  readonly rows: number;
}

/**
 * The grid used until the window can be measured: a 1920 by 1040 area at about 7.8 by 13 pixels a cell. It only
 * decides what is drawn before the first measurement and in a document that cannot be measured.
 */
export const FALLBACK_GRID: SceneGrid = { cols: 240, rows: 80 };

/**
 * The generated layers grow in steps of this many cells, so dragging a window edge builds a new layer once per step
 * and not once per pixel. A step is about a fifth of a 1280 pixel window.
 */
const GRID_STEP: SceneGrid = { cols: 32, rows: 8 };

/** The stars fill this share of the window height, from the top; below it the hills and the lake take over. */
const SKY_SHARE = 0.6;

/** Fixed, so the same window always draws the same sky and the same lake. */
const SEED = 0x4d75644d;

const STARS = {
  /** About twenty stars and four sparkles in the sky of a 1920 by 1040 window, the sparseness of the reference. */
  starDensity: 0.0016,
  sparkleDensity: 0.0003,
} as const satisfies Partial<StarFieldSpec>;

const LAKE = {
  /** The water is as deep as the traced pieces at the sides show it: their shore lies 16 pixel rows, 8 text rows, above the window's foot. */
  ridgeRows: 10,
  waterRows: 8,
  ridgeSpan: 14,
  ridgeDetailSpan: 5,
  rippleRun: { min: 4, max: 12 },
} as const satisfies Partial<LakeSpec>;

const roundUp = (value: number, step: number): number => Math.ceil(value / step) * step;

/**
 * The grid that covers an area of the given size drawn in cells of the given size, rounded up to whole steps and never
 * larger than a piece may be. Null when either size is zero, which means nothing is laid out.
 */
export function gridFor(area: { readonly width: number; readonly height: number }, cell: { readonly width: number; readonly height: number }): SceneGrid | null {
  if (area.width <= 0 || area.height <= 0 || cell.width <= 0 || cell.height <= 0) return null;
  return {
    cols: Math.min(roundUp(area.width / cell.width, GRID_STEP.cols), Math.floor(MAX_PIECE_WIDTH / GRID_STEP.cols) * GRID_STEP.cols),
    rows: Math.min(roundUp(area.height / cell.height, GRID_STEP.rows), Math.floor(MAX_PIECE_HEIGHT / 2 / GRID_STEP.rows) * GRID_STEP.rows),
  };
}

/** The layers generated to the window: stars across the sky, and the hills and lake along the foot. */
export function generatedLayers(grid: SceneGrid): { readonly stars: ArtPiece; readonly lake: ArtPiece } {
  return {
    stars: starField({ ...STARS, seed: SEED, cols: grid.cols, rows: Math.ceil(grid.rows * SKY_SHARE) }),
    lake: lake({ ...LAKE, seed: SEED, cols: grid.cols }),
  };
}
