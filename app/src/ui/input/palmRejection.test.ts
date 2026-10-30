/** Synthetic pointer sequences on a registered surface; the clock is controlled by the test. */
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestUi, elementBy as element, mountHtml as mount, type TestUi } from "../testSupport";
import { GESTURE_LIMITS } from "./inputConfig";

let ui: TestUi;
let detach: () => void;
let clock: number;
let touches: string[];
let pens: string[];
let cancelled: number;

beforeEach(() => {
  clock = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  ui = createTestUi();
  detach = ui.runtime.input.attach();
  mount(`<div id="paper"></div>`);
  touches = [];
  pens = [];
  cancelled = 0;
  ui.runtime.input.registerSurface({
    id: "paper",
    element: element("#paper"),
    handlers: {
      touch: (event) => touches.push(`${event.type}:${event.pointerId}`),
      pen: (event) => pens.push(`${event.type}:${event.pointerId}`),
      cancel: () => {
        cancelled += 1;
      },
    },
  });
});

afterEach(() => {
  detach();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const paper = (): HTMLElement => element("#paper");
const touch = (type: "pointerDown" | "pointerMove" | "pointerUp", id: number): void => {
  fireEvent[type](paper(), { pointerId: id, pointerType: "touch" });
};
const pen = (type: "pointerDown" | "pointerMove" | "pointerUp", id = 9): void => {
  fireEvent[type](paper(), { pointerId: id, pointerType: "pen" });
};

describe("palm rejection", () => {
  it("drops a whole touch contact that begins while the pen is down, and accepts one that began before the pen", () => {
    touch("pointerDown", 1);
    pen("pointerDown");
    touch("pointerDown", 2);
    touch("pointerMove", 2);
    touch("pointerUp", 2);
    touch("pointerMove", 1);
    expect(touches).toEqual(["pointerdown:1", "pointermove:1"]);
    expect(pens).toEqual(["pointerdown:9"]);
  });

  it("keeps ignoring new touches for the grace interval after the pen lifts, and takes them once it has passed", () => {
    pen("pointerDown");
    pen("pointerUp");
    clock += GESTURE_LIMITS.palmGraceMs - 1;
    touch("pointerDown", 1);
    touch("pointerUp", 1);
    expect(touches).toEqual([]);
    clock += 1;
    touch("pointerDown", 2);
    touch("pointerUp", 2);
    expect(touches).toEqual(["pointerdown:2", "pointerup:2"]);
  });

  it("counts a hovering pen as in range, and restarts the interval with every pen event", () => {
    pen("pointerMove");
    clock += GESTURE_LIMITS.palmGraceMs - 1;
    pen("pointerMove");
    clock += GESTURE_LIMITS.palmGraceMs - 1;
    touch("pointerDown", 1);
    expect(touches).toEqual([]);
    clock += 1;
    touch("pointerDown", 2);
    expect(touches).toEqual(["pointerdown:2"]);
  });

  it("accepts touch when no pen has been seen, and forgets rejected contacts so a reused pointer id works", () => {
    touch("pointerDown", 1);
    touch("pointerUp", 1);
    pen("pointerDown");
    touch("pointerDown", 1);
    touch("pointerUp", 1);
    pen("pointerUp");
    clock += GESTURE_LIMITS.palmGraceMs;
    touch("pointerDown", 1);
    expect(touches).toEqual(["pointerdown:1", "pointerup:1", "pointerdown:1"]);
  });

  it("tells every surface to end its gesture when the window loses focus, and forgets a pen that was down", () => {
    pen("pointerDown");
    clock += GESTURE_LIMITS.palmGraceMs;
    fireEvent.blur(window);
    expect(cancelled).toBe(1);
    touch("pointerDown", 1);
    expect(touches).toEqual(["pointerdown:1"]);
  });
});
