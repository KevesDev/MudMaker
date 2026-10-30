/** Synthetic pointer sequences only: finger feel, the browser's own touch handling and real timing are checked by hand. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GestureRecognizer, type GestureHandlers } from "./GestureRecognizer";
import { GESTURE_LIMITS } from "./inputConfig";

const { panSlop, longPressMs } = GESTURE_LIMITS;
const element = document.createElement("div");
const capture = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  element.setPointerCapture = capture;
});

afterEach(() => {
  vi.useRealTimers();
  capture.mockReset();
});

function setup(overrides: GestureHandlers = {}) {
  const log: string[] = [];
  const pans: { x: number; y: number }[] = [];
  const pinches: { factor: number; center: { x: number; y: number }; delta: { x: number; y: number } }[] = [];
  const recognizer = new GestureRecognizer(element, {
    pan: (delta) => pans.push(delta),
    pinch: (change) => pinches.push(change),
    tap: (at) => log.push(`tap ${at.x},${at.y}`),
    hold: () => {
      log.push("hold");
      return true;
    },
    holdMove: (at) => log.push(`holdMove ${at.x},${at.y}`),
    holdEnd: (committed) => log.push(`holdEnd ${String(committed)}`),
    ...overrides,
  });
  const send = (type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel", id: number, x: number, y = 0): void =>
    recognizer.handle(new PointerEvent(type, { pointerId: id, pointerType: "touch", clientX: x, clientY: y }));
  return { recognizer, log, pans, pinches, send };
}

describe("one finger", () => {
  it("pans by the whole distance once it leaves the slop, then by each step, and captures the contact", () => {
    const { pans, log, send } = setup();
    send("pointerdown", 1, 100, 100);
    expect(capture).toHaveBeenCalledWith(1);
    send("pointermove", 1, 100 + panSlop, 100);
    expect(pans).toEqual([]);
    send("pointermove", 1, 100 + panSlop + 1, 104);
    send("pointermove", 1, 150, 104);
    send("pointerup", 1, 150, 104);
    expect(pans).toEqual([
      { x: panSlop + 1, y: 4 },
      { x: 150 - (100 + panSlop + 1), y: 0 },
    ]);
    vi.advanceTimersByTime(longPressMs * 2);
    expect(log).toEqual([]);
  });

  it("taps when released inside the slop before the long press time, and a slip within the slop is still a tap", () => {
    const { log, pans, send } = setup();
    send("pointerdown", 1, 40, 40);
    send("pointermove", 1, 40 + panSlop, 40);
    vi.advanceTimersByTime(longPressMs - 1);
    send("pointerup", 1, 40 + panSlop, 40);
    expect(log).toEqual([`tap ${40 + panSlop},40`]);
    expect(pans).toEqual([]);
    vi.advanceTimersByTime(longPressMs);
    expect(log).toHaveLength(1);
  });

  it("holds after the long press time, follows the held finger without panning, and commits on release without a tap", () => {
    const { log, pans, send } = setup();
    send("pointerdown", 1, 10, 10);
    vi.advanceTimersByTime(longPressMs);
    send("pointermove", 1, 200, 10);
    send("pointerup", 1, 200, 10);
    expect(log).toEqual(["hold", "holdMove 200,10", "holdEnd true"]);
    expect(pans).toEqual([]);
  });

  it("is free to pan after a long press that nothing took, and a move before the time prevents the hold", () => {
    const refused = setup({ hold: () => false });
    refused.send("pointerdown", 1, 10, 10);
    vi.advanceTimersByTime(longPressMs);
    refused.send("pointermove", 1, 60, 10);
    expect(refused.pans).toEqual([{ x: 50, y: 0 }]);
    const moved = setup();
    moved.send("pointerdown", 1, 10, 10);
    moved.send("pointermove", 1, 60, 10);
    vi.advanceTimersByTime(longPressMs);
    moved.send("pointerup", 1, 60, 10);
    expect(moved.log).toEqual([]);
  });

  it("arms no long press when the surface has no hold handler", () => {
    const { send, pans } = setup({ hold: undefined });
    send("pointerdown", 1, 10, 10);
    expect(vi.getTimerCount()).toBe(0);
    send("pointermove", 1, 40, 10);
    expect(pans).toHaveLength(1);
  });
});

describe("two fingers", () => {
  it("pinches by the ratio of finger distances about their midpoint", () => {
    const { pinches, pans, send } = setup();
    send("pointerdown", 1, 100, 100);
    send("pointerdown", 2, 200, 100);
    send("pointermove", 2, 300, 100);
    expect(pinches).toEqual([{ factor: 2, center: { x: 200, y: 100 }, delta: { x: 50, y: 0 } }]);
    expect(pans).toEqual([]);
  });

  it("reports the midpoint travel with the scale, so pinching while pulling is one gesture", () => {
    const { pinches, send } = setup();
    send("pointerdown", 1, 100, 100);
    send("pointerdown", 2, 200, 100);
    send("pointermove", 1, 100, 140);
    send("pointermove", 2, 200, 140);
    expect(pinches.map((change) => change.delta)).toEqual([
      { x: 0, y: 20 },
      { x: 0, y: 20 },
    ]);
    expect(pinches.at(-1)?.center).toEqual({ x: 150, y: 140 });
  });

  it("ends a held drag when a second finger arrives, and carries on as a pan with the finger that stays", () => {
    const { log, pans, send } = setup();
    send("pointerdown", 1, 10, 10);
    vi.advanceTimersByTime(longPressMs);
    send("pointerdown", 2, 90, 10);
    send("pointerup", 2, 90, 10);
    send("pointermove", 1, 30, 10);
    expect(log).toEqual(["hold", "holdEnd false"]);
    expect(pans).toEqual([{ x: 20, y: 0 }]);
  });

  it("continues as a pan from where the remaining finger is when the other lifts", () => {
    const { pinches, pans, send } = setup();
    send("pointerdown", 1, 100, 100);
    send("pointerdown", 2, 200, 100);
    send("pointerup", 1, 100, 100);
    send("pointermove", 2, 210, 100);
    expect(pinches).toEqual([]);
    expect(pans).toEqual([{ x: 10, y: 0 }]);
  });

  it("ignores a third finger entirely, down, moving and up", () => {
    const { pinches, pans, log, send } = setup();
    send("pointerdown", 1, 100, 100);
    send("pointerdown", 2, 200, 100);
    send("pointerdown", 3, 0, 0);
    send("pointermove", 3, 500, 500);
    send("pointerup", 3, 500, 500);
    expect(pinches).toEqual([]);
    send("pointermove", 2, 300, 100);
    expect(pinches).toHaveLength(1);
    expect(pans).toEqual([]);
    expect(log).toEqual([]);
  });

  it("keeps a cancelled third finger from cancelling the gesture of the two others", () => {
    const { pinches, send } = setup();
    send("pointerdown", 1, 100, 100);
    send("pointerdown", 2, 200, 100);
    send("pointerdown", 3, 0, 0);
    send("pointercancel", 3, 0, 0);
    send("pointermove", 2, 300, 100);
    expect(pinches).toHaveLength(1);
  });
});

describe("ending a gesture", () => {
  it("drops a pan on pointercancel and treats the next contact as a new gesture", () => {
    const { pans, send } = setup();
    send("pointerdown", 1, 0, 0);
    send("pointermove", 1, 50, 0);
    send("pointercancel", 1, 50, 0);
    send("pointermove", 1, 90, 0);
    expect(pans).toHaveLength(1);
    send("pointerdown", 4, 300, 0);
    send("pointermove", 4, 320, 0);
    expect(pans.at(-1)).toEqual({ x: 20, y: 0 });
  });

  it("ends a held drag uncommitted on pointercancel", () => {
    const { log, send } = setup();
    send("pointerdown", 1, 0, 0);
    vi.advanceTimersByTime(longPressMs);
    send("pointercancel", 1, 0, 0);
    send("pointermove", 1, 80, 0);
    expect(log).toEqual(["hold", "holdEnd false"]);
  });

  it("on cancel, as when the window loses focus, clears the timer and ends a held drag uncommitted", () => {
    const pending = setup();
    pending.send("pointerdown", 1, 0, 0);
    expect(vi.getTimerCount()).toBe(1);
    pending.recognizer.cancel();
    expect(vi.getTimerCount()).toBe(0);
    pending.send("pointerup", 1, 0, 0);
    expect(pending.log).toEqual([]);

    const held = setup();
    held.send("pointerdown", 1, 0, 0);
    vi.advanceTimersByTime(longPressMs);
    held.recognizer.cancel();
    held.send("pointermove", 1, 60, 0);
    expect(held.log).toEqual(["hold", "holdEnd false"]);
  });
});
