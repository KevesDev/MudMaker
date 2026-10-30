/** A drawing context that records what it is asked to do. jsdom draws nothing, so pixels are checked by hand. */
import { vi } from "vitest";
import type { GridContext } from "./drawGrid";

export interface Stroke {
  readonly color: string;
  readonly width: number;
  readonly points: readonly (readonly [string, number, number])[];
}

export function fakeContext() {
  const calls: string[] = [];
  const strokes: Stroke[] = [];
  let points: [string, number, number][] = [];
  const ctx = {
    lineWidth: 0,
    strokeStyle: "",
    clearRect: vi.fn((x: number, y: number, w: number, h: number) => calls.push(`clearRect ${x} ${y} ${w} ${h}`)),
    beginPath: vi.fn(() => {
      calls.push("beginPath");
      points = [];
    }),
    moveTo: vi.fn((x: number, y: number) => {
      calls.push("moveTo");
      points.push(["moveTo", x, y]);
    }),
    lineTo: vi.fn((x: number, y: number) => {
      calls.push("lineTo");
      points.push(["lineTo", x, y]);
    }),
    stroke: vi.fn(() => {
      calls.push("stroke");
      strokes.push({ color: ctx.strokeStyle, width: ctx.lineWidth, points });
    }),
  };
  return { ctx: ctx as unknown as GridContext, calls, strokes };
}
