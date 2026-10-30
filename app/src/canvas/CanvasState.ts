import { CANVAS_DEFAULTS } from "./canvasConfig";
import { HOME_VIEWPORT, panBy, zoomAbout, type Point, type Viewport, type ZoomRange } from "./viewport";

export interface CanvasSnapshot {
  readonly viewport: Viewport;
  readonly gridVisible: boolean;
  readonly snapEnabled: boolean;
}

type Listener = () => void;

/**
 * The one owner of what the canvas shows: where the view is, whether the grid is drawn and whether placement
 * snaps. Wheel, drag, keys and the toggles all change it through these methods, so every route gives the same view.
 */
export class CanvasState {
  private snapshot: CanvasSnapshot = {
    viewport: HOME_VIEWPORT,
    gridVisible: CANVAS_DEFAULTS.gridVisible,
    snapEnabled: CANVAS_DEFAULTS.snapEnabled,
  };
  private readonly listeners = new Set<Listener>();

  constructor(private readonly zoomRange: ZoomRange) {}

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): CanvasSnapshot => this.snapshot;

  panBy(screenDx: number, screenDy: number): void {
    this.setViewport(panBy(this.snapshot.viewport, screenDx, screenDy));
  }

  zoomAbout(factor: number, anchor: Point): void {
    this.setViewport(zoomAbout(this.snapshot.viewport, factor, anchor, this.zoomRange));
  }

  resetView(): void {
    this.setViewport(HOME_VIEWPORT);
  }

  setGridVisible(gridVisible: boolean): void {
    this.update({ ...this.snapshot, gridVisible });
  }

  setSnapEnabled(snapEnabled: boolean): void {
    this.update({ ...this.snapshot, snapEnabled });
  }

  private setViewport(viewport: Viewport): void {
    this.update({ ...this.snapshot, viewport });
  }

  private update(next: CanvasSnapshot): void {
    const current = this.snapshot;
    if (next.viewport === current.viewport && next.gridVisible === current.gridVisible && next.snapEnabled === current.snapEnabled) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}
