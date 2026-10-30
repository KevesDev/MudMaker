import { CANVAS_LIMITS } from "./canvasConfig";
import type { Size } from "./gridLines";
import type { CanvasState } from "./CanvasState";

const PIXEL_MODE = 0;
const LINE_MODE = 1;

/** The zoom factor for one wheel event. Lines and pages are turned into pixels first, so every device zooms alike. */
export function wheelZoomFactor(deltaY: number, deltaMode: number, pageHeight: number): number {
  const pixels = deltaMode === PIXEL_MODE ? deltaY : deltaMode === LINE_MODE ? deltaY * CANVAS_LIMITS.wheelLinePixels : deltaY * pageHeight;
  return Math.exp(-pixels * CANVAS_LIMITS.wheelZoomPerPixel);
}

/**
 * Applies a key to the canvas and says whether it was one of the canvas's keys. Zoom keys act about the center
 * of the view, which is where the keyboard has no pointer to anchor to.
 */
export function applyCanvasKey(state: CanvasState, event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "metaKey">, size: Size): boolean {
  if (event.ctrlKey || event.altKey || event.metaKey) return false;
  const step = CANVAS_LIMITS.keyPanStep;
  const center = { x: size.width / 2, y: size.height / 2 };
  switch (event.key) {
    case "ArrowLeft":
      state.panBy(step, 0);
      return true;
    case "ArrowRight":
      state.panBy(-step, 0);
      return true;
    case "ArrowUp":
      state.panBy(0, step);
      return true;
    case "ArrowDown":
      state.panBy(0, -step);
      return true;
    case "+":
    case "=":
      state.zoomAbout(CANVAS_LIMITS.keyZoomFactor, center);
      return true;
    case "-":
    case "_":
      state.zoomAbout(1 / CANVAS_LIMITS.keyZoomFactor, center);
      return true;
    case "Home":
      state.resetView();
      return true;
    default:
      return false;
  }
}
