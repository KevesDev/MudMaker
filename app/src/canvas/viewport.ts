/**
 * The view onto the world. `originX` and `originY` are the world coordinates at the top left of the view and
 * `zoom` is screen pixels per world unit. Keeping the world point under the view's corner, not an accumulated
 * screen offset, is what makes long pan and zoom sequences free of drift.
 */
export interface Viewport {
  readonly originX: number;
  readonly originY: number;
  readonly zoom: number;
}

export interface ZoomRange {
  readonly min: number;
  readonly max: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const HOME_VIEWPORT: Viewport = Object.freeze({ originX: 0, originY: 0, zoom: 1 });

function requireFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be a finite number, not ${String(value)}.`);
}

export function clampZoom(zoom: number, range: ZoomRange): number {
  requireFinite("zoom", zoom);
  return Math.min(range.max, Math.max(range.min, zoom));
}

export function worldToScreen(viewport: Viewport, world: Point): Point {
  return { x: (world.x - viewport.originX) * viewport.zoom, y: (world.y - viewport.originY) * viewport.zoom };
}

export function screenToWorld(viewport: Viewport, screen: Point): Point {
  return { x: viewport.originX + screen.x / viewport.zoom, y: viewport.originY + screen.y / viewport.zoom };
}

/** Moves the content by a screen distance, as a drag does: dragging right shows what lies further left. */
export function panBy(viewport: Viewport, screenDx: number, screenDy: number): Viewport {
  requireFinite("screenDx", screenDx);
  requireFinite("screenDy", screenDy);
  return { ...viewport, originX: viewport.originX - screenDx / viewport.zoom, originY: viewport.originY - screenDy / viewport.zoom };
}

/** Scales by a factor while the world point under the screen point stays under it, unless the range stops the change. */
export function zoomAbout(viewport: Viewport, factor: number, anchor: Point, range: ZoomRange): Viewport {
  if (!(factor > 0)) throw new RangeError(`The zoom factor must be positive, not ${String(factor)}.`);
  const zoom = clampZoom(viewport.zoom * factor, range);
  if (zoom === viewport.zoom) return viewport;
  const world = screenToWorld(viewport, anchor);
  return { originX: world.x - anchor.x / zoom, originY: world.y - anchor.y / zoom, zoom };
}

/** The whole device pixel nearest a screen position, so a line centered there is never blurred across two. */
export function toDevicePixel(screen: number, deviceScale: number): number {
  if (!(deviceScale > 0)) throw new RangeError(`The device scale must be positive, not ${String(deviceScale)}.`);
  return Math.round(screen * deviceScale);
}

/** Rounds a world point to the nearest multiple of the step, in world units. */
export function snapToStep(world: Point, step: number): Point {
  if (!(step > 0)) throw new RangeError(`The snap step must be positive, not ${String(step)}.`);
  // Adding zero turns a negative zero into zero.
  return { x: Math.round(world.x / step) * step + 0, y: Math.round(world.y / step) * step + 0 };
}
