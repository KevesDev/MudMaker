import { GESTURE_LIMITS, type GestureLimits } from "./inputConfig";

export interface GesturePoint {
  readonly x: number;
  readonly y: number;
}

export interface PinchChange {
  /** Ratio of the new distance between the two fingers to the previous one. */
  readonly factor: number;
  /** The midpoint of the two fingers, in client coordinates. */
  readonly center: GesturePoint;
  /** How far the midpoint moved since the previous change. */
  readonly delta: GesturePoint;
}

export interface GestureHandlers {
  /** One finger dragging; reports the distance moved since the last report, the whole distance from the press at the first. */
  readonly pan?: (delta: GesturePoint) => void;
  /** Two fingers moving together or apart. */
  readonly pinch?: (change: PinchChange) => void;
  /** A press and release that stayed within the slop and was shorter than a long press. */
  readonly tap?: (at: GesturePoint, target: EventTarget | null) => void;
  /** A long press. Return true to take the contact as a held drag; false leaves it free to pan. */
  readonly hold?: (at: GesturePoint, target: EventTarget | null) => boolean;
  readonly holdMove?: (at: GesturePoint) => void;
  /** The held drag ended: `committed` is false when it was cancelled, interrupted or lost. */
  readonly holdEnd?: (committed: boolean) => void;
}

type Phase = "idle" | "pending" | "panning" | "pinching" | "held";

interface Contact {
  x: number;
  y: number;
  readonly startX: number;
  readonly startY: number;
}

interface PinchMetrics {
  readonly distance: number;
  readonly center: GesturePoint;
}

/**
 * The one state machine for touch contacts on a surface: pan, pinch with simultaneous pan, tap and
 * long press with a held drag. A third finger is ignored for as long as it is down, and a cancel, a
 * lost window focus or disposal ends whatever is in progress so no gesture is left running.
 */
export class GestureRecognizer {
  private readonly contacts = new Map<number, Contact>();
  private readonly ignored = new Set<number>();
  private phase: Phase = "idle";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private target: EventTarget | null = null;
  private pinchBase: PinchMetrics | null = null;

  constructor(
    private readonly element: HTMLElement,
    private readonly handlers: GestureHandlers,
    private readonly limits: GestureLimits = GESTURE_LIMITS,
  ) {}

  /** Takes the touch stream of a surface. */
  readonly handle = (event: PointerEvent): void => {
    if (event.type === "pointerdown") this.press(event);
    else if (event.type === "pointermove") this.move(event);
    else if (event.type === "pointerup") this.release(event);
    else if (event.type === "pointercancel") this.interrupt(event);
  };

  /** Ends any gesture in progress; safe to call at any time. */
  readonly cancel = (): void => {
    this.clearTimer();
    if (this.phase === "held") this.handlers.holdEnd?.(false);
    this.contacts.clear();
    this.ignored.clear();
    this.pinchBase = null;
    this.phase = "idle";
  };

  private press(event: PointerEvent): void {
    if (this.contacts.size >= 2) {
      this.ignored.add(event.pointerId);
      return;
    }
    this.contacts.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
    this.element.setPointerCapture(event.pointerId);
    if (this.contacts.size === 1) {
      this.phase = "pending";
      this.target = event.target;
      if (this.handlers.hold) this.timer = setTimeout(() => this.longPress(), this.limits.longPressMs);
      return;
    }
    this.clearTimer();
    if (this.phase === "held") this.handlers.holdEnd?.(false);
    this.phase = "pinching";
    this.pinchBase = this.metrics();
  }

  private move(event: PointerEvent): void {
    const contact = this.contacts.get(event.pointerId);
    if (contact === undefined) return;
    const previous = { x: contact.x, y: contact.y };
    contact.x = event.clientX;
    contact.y = event.clientY;
    if (this.phase === "pending") {
      if (Math.hypot(contact.x - contact.startX, contact.y - contact.startY) <= this.limits.panSlop) return;
      this.clearTimer();
      this.phase = "panning";
      this.handlers.pan?.({ x: contact.x - contact.startX, y: contact.y - contact.startY });
    } else if (this.phase === "panning") {
      this.handlers.pan?.({ x: contact.x - previous.x, y: contact.y - previous.y });
    } else if (this.phase === "pinching") {
      this.pinchStep();
    } else if (this.phase === "held") {
      this.handlers.holdMove?.({ x: contact.x, y: contact.y });
    }
  }

  private release(event: PointerEvent): void {
    if (this.ignored.delete(event.pointerId)) return;
    const contact = this.contacts.get(event.pointerId);
    if (contact === undefined) return;
    this.contacts.delete(event.pointerId);
    const phase = this.phase;
    if (phase === "pinching") {
      this.pinchBase = null;
      this.phase = "panning";
      return;
    }
    this.clearTimer();
    this.phase = "idle";
    if (phase === "pending") this.handlers.tap?.({ x: contact.x, y: contact.y }, this.target);
    else if (phase === "held") this.handlers.holdEnd?.(true);
  }

  private interrupt(event: PointerEvent): void {
    if (this.ignored.delete(event.pointerId)) return;
    if (this.contacts.has(event.pointerId)) this.cancel();
  }

  private longPress(): void {
    this.timer = null;
    const contact = [...this.contacts.values()][0];
    if (this.phase !== "pending" || contact === undefined) return;
    if (this.handlers.hold?.({ x: contact.x, y: contact.y }, this.target) === true) this.phase = "held";
  }

  private pinchStep(): void {
    const base = this.pinchBase;
    if (base === null) return;
    const now = this.metrics();
    this.pinchBase = now;
    this.handlers.pinch?.({
      factor: base.distance > 0 ? now.distance / base.distance : 1,
      center: now.center,
      delta: { x: now.center.x - base.center.x, y: now.center.y - base.center.y },
    });
  }

  private metrics(): PinchMetrics {
    const [first, second] = [...this.contacts.values()];
    if (first === undefined || second === undefined) return { distance: 0, center: { x: 0, y: 0 } };
    return { distance: Math.hypot(second.x - first.x, second.y - first.y), center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 } };
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}
