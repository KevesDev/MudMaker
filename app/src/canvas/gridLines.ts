import { numberToken, type TokenMap } from "../theme";
import { toDevicePixel, type Viewport } from "./viewport";

/** The grid as the theme describes it. Steps are world units; the visibility threshold and line width are screen pixels. */
export interface GridStyle {
  readonly baseStep: number;
  readonly majorEvery: number;
  readonly minorVisibilityMinScreenStep: number;
  readonly lineWidth: number;
  readonly minorColor: string;
  readonly majorColor: string;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Line centers in device pixels, ready to stroke at `lineWidth` device pixels with no further rounding. */
export interface GridLines {
  readonly minorX: readonly number[];
  readonly minorY: readonly number[];
  readonly majorX: readonly number[];
  readonly majorY: readonly number[];
  readonly lineWidth: number;
}

function colorToken(tokens: TokenMap, name: string): string {
  const value = tokens[name];
  if (typeof value !== "string") throw new Error(`Theme token "${name}" is not a color.`);
  return value;
}

export function readGridStyle(tokens: TokenMap): GridStyle {
  return {
    baseStep: numberToken(tokens, "grid.baseStep"),
    majorEvery: numberToken(tokens, "grid.majorEvery"),
    minorVisibilityMinScreenStep: numberToken(tokens, "grid.minorVisibilityMinScreenStep"),
    lineWidth: numberToken(tokens, "grid.lineWidth"),
    minorColor: colorToken(tokens, "color.graph.grid.minor"),
    majorColor: colorToken(tokens, "color.graph.grid.major"),
  };
}

/** The most lines one axis can hold: the number of multiples of the screen step inside an extent. */
export function maxLinesOnAxis(extent: number, screenStep: number): number {
  return Math.floor(extent / screenStep) + 1;
}

const positiveModulo = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor;

interface AxisLines {
  readonly minor: number[];
  readonly major: number[];
}

/**
 * The lines of one axis inside the view. Only indexes between the view's edges are visited, so the work follows
 * what is on screen and never the size of the world. A level whose lines would sit closer than the visibility
 * threshold is left out, so zooming out thins the grid instead of filling it in.
 */
function axisLines(origin: number, extent: number, deviceScale: number, centerShift: number, style: GridStyle, zoom: number): AxisLines {
  const minor: number[] = [];
  const major: number[] = [];
  const minorShown = style.baseStep * zoom >= style.minorVisibilityMinScreenStep;
  const majorShown = style.baseStep * style.majorEvery * zoom >= style.minorVisibilityMinScreenStep;
  const first = Math.ceil(origin / style.baseStep);
  const last = Math.floor((origin + extent / zoom) / style.baseStep);
  for (let index = first; index <= last; index += 1) {
    const isMajor = positiveModulo(index, style.majorEvery) === 0;
    if (isMajor ? !majorShown : !minorShown) continue;
    const position = toDevicePixel((index * style.baseStep - origin) * zoom, deviceScale) + centerShift;
    (isMajor ? major : minor).push(position);
  }
  return { minor, major };
}

/** `size` is in screen pixels and `deviceScale` is device pixels per screen pixel. */
export function computeGridLines(viewport: Viewport, size: Size, deviceScale: number, style: GridStyle): GridLines {
  const lineWidth = Math.max(1, Math.round(style.lineWidth * deviceScale));
  // A line of odd width covers whole pixels only when centered on a pixel's middle.
  const centerShift = lineWidth % 2 === 1 ? 0.5 : 0;
  const x = axisLines(viewport.originX, size.width, deviceScale, centerShift, style, viewport.zoom);
  const y = axisLines(viewport.originY, size.height, deviceScale, centerShift, style, viewport.zoom);
  return { minorX: x.minor, minorY: y.minor, majorX: x.major, majorY: y.major, lineWidth };
}
