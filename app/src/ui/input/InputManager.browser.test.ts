/** jsdom shows that default actions are cancelled; it cannot show that the browser then shows no menu or tool. */
import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import styles from "../../styles.css?raw";
import { normalizeChord } from "./chords";
import { BLOCKED_OUTSIDE_TEXT_ENTRY, BROWSER_SHORTCUTS, DEVELOPMENT_SHORTCUT_GROUPS } from "./inputConfig";
import { createTestUi, elementBy as element, mountHtml as mount, type TestUi } from "../testSupport";

let detach: (() => void) | null = null;

function start(developmentShortcuts = false): TestUi {
  const ui = createTestUi({ developmentShortcuts });
  detach = ui.runtime.input.attach();
  return ui;
}

afterEach(() => {
  detach?.();
  detach = null;
  document.body.innerHTML = "";
});

/** The event a keyboard press of the chord produces. */
function pressOf(chord: string): KeyboardEventInit {
  const parts = chord.split("+");
  const key = chord.endsWith("++") ? "+" : (parts[parts.length - 1] ?? "");
  const modifiers = chord.endsWith("++") ? parts.slice(0, -2) : parts.slice(0, -1);
  return { key, ctrlKey: modifiers.includes("Ctrl"), altKey: modifiers.includes("Alt"), shiftKey: modifiers.includes("Shift") };
}

const allBlocked = Object.values(BROWSER_SHORTCUTS).flat();

describe("native context menu", () => {
  const markup = `<div id="frame" class="app-frame"><div id="bg">background</div><img id="img" alt=""><canvas id="canvas"></canvas><a id="link" href="#x">link</a></div>
    <input id="input"><textarea id="area"></textarea><select id="select"><option>a</option></select><div id="edit" contenteditable="true">x</div>`;

  it("is cancelled on the background, an image, a canvas, a link and the frame", () => {
    start();
    mount(markup);
    for (const id of ["#bg", "#img", "#canvas", "#link", "#frame"]) {
      expect(fireEvent.contextMenu(element(id)), id).toBe(false);
    }
    expect(fireEvent.contextMenu(document.body)).toBe(false);
  });

  it("stays native in an input, a textarea, a select and editable content", () => {
    start();
    mount(markup);
    for (const id of ["#input", "#area", "#select", "#edit"]) {
      expect(fireEvent.contextMenu(element(id)), id).toBe(true);
    }
  });
});

describe("browser chrome shortcuts", () => {
  it("every configured chord spells itself the way the key press does, so none can silently miss", () => {
    for (const chord of allBlocked) {
      const normalized = normalizeChord(chord);
      expect(normalized.ok && normalized.chord, chord).toBe(chord);
    }
  });

  it("cancels every configured chord, in text entry too", () => {
    start();
    mount(`<div id="plain"></div><input id="input">`);
    for (const chord of allBlocked) {
      for (const id of ["#plain", "#input"]) {
        expect(fireEvent.keyDown(element(id), pressOf(chord)), `${chord} in ${id}`).toBe(false);
      }
    }
  });

  it("cancels Backspace and select all outside text entry only, unless the text opted in", () => {
    start();
    mount(`<div id="plain"></div><div id="opt" data-selectable><span id="inner">t</span></div><input id="input"><textarea id="area"></textarea>`);
    expect(BLOCKED_OUTSIDE_TEXT_ENTRY).toEqual(["Backspace", "Ctrl+A"]);
    expect(fireEvent.keyDown(element("#plain"), { key: "Backspace" })).toBe(false);
    expect(fireEvent.keyDown(element("#plain"), { key: "a", ctrlKey: true })).toBe(false);
    expect(fireEvent.keyDown(element("#inner"), { key: "a", ctrlKey: true })).toBe(true);
    for (const id of ["#input", "#area"]) {
      expect(fireEvent.keyDown(element(id), { key: "Backspace" }), id).toBe(true);
      expect(fireEvent.keyDown(element(id), { key: "a", ctrlKey: true }), id).toBe(true);
    }
  });

  it("leaves copy, cut, paste and undo alone in text entry", () => {
    start();
    mount(`<input id="input">`);
    for (const key of ["c", "x", "v", "z", "y"]) {
      expect(fireEvent.keyDown(element("#input"), { key, ctrlKey: true }), key).toBe(true);
    }
  });

  it("keeps only reload and developer tools in a development build", () => {
    start(true);
    mount(`<div id="plain"></div>`);
    const kept = DEVELOPMENT_SHORTCUT_GROUPS.flatMap((group) => BROWSER_SHORTCUTS[group]);
    expect(kept.length).toBeGreaterThan(0);
    for (const chord of allBlocked) {
      const prevented = !fireEvent.keyDown(element("#plain"), pressOf(chord));
      expect(prevented, chord).toBe(!kept.includes(chord as never));
    }
  });

  it("still runs a shortcut the application registered on a blocked chord", async () => {
    const ui = start();
    const ran: string[] = [];
    mount(`<div id="plain"></div>`);
    ui.runtime.bus.registerHandler("EditorIntentRouter", "ui.test.save", () => {
      ran.push("save");
      return Promise.resolve({ status: "success" });
    });
    ui.shortcut({ scope: "app", chord: "Ctrl+S", actionId: "ui.test.save", owner: "test" });
    expect(fireEvent.keyDown(element("#plain"), { key: "s", ctrlKey: true })).toBe(false);
    await new Promise((resolve) => setTimeout(resolve));
    expect(ran).toEqual(["save"]);
  });
});

describe("page zoom, drops and the middle button", () => {
  it("does not let Ctrl and the wheel zoom the page, over a canvas surface or anywhere", () => {
    const ui = start();
    mount(`<canvas id="canvas"></canvas><div id="plain"></div>`);
    const seen: boolean[] = [];
    ui.runtime.input.registerSurface({ id: "c", element: element("#canvas"), handlers: { wheel: (event) => seen.push(event.defaultPrevented) } });
    expect(fireEvent.wheel(element("#canvas"), { ctrlKey: true, deltaY: 100 })).toBe(false);
    expect(seen).toEqual([true]);
    expect(fireEvent.wheel(element("#plain"), { ctrlKey: true, deltaY: 100 })).toBe(false);
    expect(fireEvent.wheel(element("#plain"), { deltaY: 100 })).toBe(true);
  });

  it("cancels a file drop and drag-over, and an image drag, unless a surface took the drag", () => {
    const ui = start();
    mount(`<div id="plain"></div><img id="img" alt=""><div id="target"></div>`);
    for (const type of ["dragOver", "drop"] as const) {
      expect(fireEvent[type](element("#plain")), type).toBe(false);
    }
    expect(fireEvent.dragStart(element("#img"))).toBe(false);
    ui.runtime.input.registerSurface({ id: "t", element: element("#target"), handlers: { drag: () => undefined } });
    expect(fireEvent.drop(element("#target"))).toBe(true);
  });

  it("cancels middle-button presses so the browser does not autoscroll", () => {
    start();
    mount(`<div id="plain"></div>`);
    expect(fireEvent.mouseDown(element("#plain"), { button: 1 })).toBe(false);
    expect(fireEvent.mouseDown(element("#plain"), { button: 0 })).toBe(true);
  });
});

describe("stylesheet", () => {
  it("makes chrome unselectable and images undraggable, with text entry and opt-in text selectable", () => {
    expect(styles).toMatch(/body\s*\{[^}]*user-select:\s*none/);
    expect(styles).toMatch(/img,[^{]*\{[^}]*-webkit-user-drag:\s*none/);
    expect(styles).toMatch(/\[data-selectable\]\s*\{[^}]*user-select:\s*text/);
    expect(styles).toMatch(/input,[^{]*textarea,[^{]*\{[^}]*user-select:\s*text/);
  });
});
