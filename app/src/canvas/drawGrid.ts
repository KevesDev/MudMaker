import type { GridLines, GridStyle, Size } from "./gridLines";

/** The only drawing the canvas context is asked for, so a test can show nothing but straight strokes is ever drawn. */
export type GridContext = Pick<CanvasRenderingContext2D, "clearRect" | "beginPath" | "moveTo" | "lineTo" | "stroke" | "lineWidth" | "strokeStyle">;

function strokeLines(ctx: GridContext, color: string, xs: readonly number[], ys: readonly number[], size: Size): void {
  if (xs.length === 0 && ys.length === 0) return;
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (const x of xs) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size.height);
  }
  for (const y of ys) {
    ctx.moveTo(0, y);
    ctx.lineTo(size.width, y);
  }
  ctx.stroke();
}

/** Clears the canvas and strokes continuous lines. `size` is in device pixels, the same space as the line positions. */
export function drawGrid(ctx: GridContext, lines: GridLines | null, style: GridStyle, size: Size): void {
  ctx.clearRect(0, 0, size.width, size.height);
  if (lines === null) return;
  ctx.lineWidth = lines.lineWidth;
  strokeLines(ctx, style.minorColor, lines.minorX, lines.minorY, size);
  strokeLines(ctx, style.majorColor, lines.majorX, lines.majorY, size);
}
