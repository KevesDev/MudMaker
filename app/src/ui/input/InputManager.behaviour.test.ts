/** See testSupport.tsx for what these tests cannot prove. */
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionOutcome, ActionRequest, HandlerRequest } from "../actions/ActionBus";
import { EDITOR, SAVE, UNDO, createTestUi, deferred, elementBy as element, mountHtml as mount, settle, type TestUi } from "../testSupport";

let ui: TestUi;
let detach: () => void;
let saves: ActionRequest[];
let renames: ActionRequest[];

beforeEach(() => {
  ui = createTestUi();
  detach = ui.runtime.input.attach();
  saves = [];
  renames = [];
  const record = (into: ActionRequest[]) => ({ signal: _signal, ...request }: HandlerRequest): Promise<ActionOutcome> => {
    into.push(request);
    return Promise.resolve({ status: "success" });
  };
  ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", record(saves));
  ui.runtime.bus.registerHandler(EDITOR, "ui.test.rename", record(renames));
});

afterEach(() => {
  detach();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-input-modality");
});

describe("which elements count as typing", () => {
  const SHORTCUT = { key: "s", ctrlKey: true } as const;

  beforeEach(() => {
    expect(ui.runtime.shortcuts.register({ scope: "app", chord: "Ctrl+S", actionId: "ui.test.save", owner: "test" }).ok).toBe(true);
  });

  async function pressInside(markup: string, expectedSaves: number): Promise<void> {
    mount(markup);
    const field = element("#field");
    field.focus();
    expect(document.activeElement, "the element must be able to take focus").toBe(field);
    fireEvent.keyDown(field, SHORTCUT);
    await settle();
    expect(saves).toHaveLength(expectedSaves);
    expect(ui.runtime.focus.isTextEditing()).toBe(expectedSaves === 0);
  }

  it.each([
    ["a text input", `<input id="field" type="text">`],
    ["a search input", `<input id="field" type="search">`],
    ["a number input", `<input id="field" type="number">`],
    ["a textarea", `<textarea id="field"></textarea>`],
    ["a select", `<select id="field"><option>a</option></select>`],
    ["contenteditable true", `<div id="field" contenteditable="true" tabindex="0"></div>`],
    ["contenteditable with no value", `<div id="field" contenteditable tabindex="0"></div>`],
    ["contenteditable plaintext-only", `<div id="field" contenteditable="plaintext-only" tabindex="0"></div>`],
    ["a child of an editable region", `<div contenteditable="true"><p id="field" tabindex="0">text</p></div>`],
    ["an invalid value inside an editable region", `<div contenteditable="true"><p id="field" contenteditable="maybe" tabindex="0">text</p></div>`],
  ])("keeps shortcuts out of %s", async (_name, markup) => {
    await pressInside(markup, 0);
  });

  it.each([
    ["a button", `<button id="field">x</button>`],
    ["a checkbox", `<input id="field" type="checkbox">`],
    ["a range slider", `<input id="field" type="range">`],
    ["contenteditable false", `<div id="field" contenteditable="false" tabindex="0"></div>`],
    ["a region switched off inside an editable one", `<div contenteditable="true"><p id="field" contenteditable="false" tabindex="0">text</p></div>`],
    ["plain content", `<div id="field" tabindex="0">text</div>`],
  ])("still runs shortcuts from %s", async (_name, markup) => {
    await pressInside(markup, 1);
  });

  it("holds shortcuts back for the whole composition even when focus is on a non-text element", async () => {
    mount(`<button id="field">x</button>`);
    const field = element("#field");
    field.focus();
    fireEvent.compositionStart(field);
    fireEvent.keyDown(field, SHORTCUT);
    await settle();
    expect(saves).toHaveLength(0);
    fireEvent.compositionEnd(field);
    fireEvent.keyDown(field, SHORTCUT);
    await settle();
    expect(saves).toHaveLength(1);
  });

  it("treats a key reported as composing by the browser as composition even without composition events", async () => {
    mount(`<input id="field" type="text" data-control-id="editor.fields.01">`);
    const field = element<HTMLInputElement>("#field");
    field.focus();
    fireEvent.keyDown(field, { key: "Process", keyCode: 229 });
    fireEvent.keyDown(field, { key: "Enter", keyCode: 229 });
    await settle();
    expect(renames).toHaveLength(0);
    fireEvent.keyDown(field, { key: "Enter" });
    await settle();
    expect(renames).toHaveLength(1);
  });
});

describe("help across pointer-over and pointer-out events", () => {
  function markup(): { trigger: HTMLElement; tip: HTMLElement } {
    mount(
      `<button id="a" data-control-id="${SAVE}">A</button><span id="tip" role="tooltip" data-help-for="${SAVE}">Help text</span><p id="away">away</p>`,
    );
    return { trigger: element("#a"), tip: element("#tip") };
  }

  it("stays across pointer-out and pointer-over events between the control and its help text, and goes after pointer-out events away from both", () => {
    const { trigger, tip } = markup();
    fireEvent.pointerOver(trigger, { pointerType: "mouse" });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
    fireEvent.pointerOut(trigger, { pointerType: "mouse", relatedTarget: tip });
    fireEvent.pointerOver(tip, { pointerType: "mouse" });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
    fireEvent.pointerOut(tip, { pointerType: "mouse", relatedTarget: trigger });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
    fireEvent.pointerOut(trigger, { pointerType: "mouse", relatedTarget: element("#away") });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(false);
  });

  it("can be dismissed with Escape after a pointer-over event, and returns after pointer-out and pointer-over events on the control", () => {
    const { trigger, tip } = markup();
    fireEvent.pointerOver(tip, { pointerType: "mouse" });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(false);
    fireEvent.pointerOut(tip, { pointerType: "mouse", relatedTarget: element("#away") });
    fireEvent.pointerOver(trigger, { pointerType: "mouse" });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
  });

  it("does not turn a click on the help text into an activation", async () => {
    const { tip } = markup();
    fireEvent.click(tip);
    await settle();
    expect(saves).toHaveLength(0);
  });
});

describe("refused activations", () => {
  it("do not tell the enclosing scope, while accepted ones do", async () => {
    mount(`<div id="layer"><button id="a" data-control-id="${SAVE}">A</button></div>`);
    const onActivated = vi.fn();
    const leave = ui.runtime.focus.pushScope({ key: "popup:test", kind: "popup", container: element("#layer"), onActivated });
    ui.runtime.bus.setDisabled(SAVE, "Open a project first.");
    fireEvent.click(element("#a"));
    await settle();
    expect(onActivated).not.toHaveBeenCalled();
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
    ui.runtime.bus.reset(SAVE);
    fireEvent.click(element("#a"));
    await settle();
    expect(onActivated).toHaveBeenCalledTimes(1);
    leave();
  });

  it("also leave the scope alone while the same action is still running", async () => {
    mount(`<div id="layer"><button id="u" data-control-id="${UNDO}">U</button></div>`);
    const gate = deferred<ActionOutcome>();
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.undo", () => gate.promise);
    const onActivated = vi.fn();
    const leave = ui.runtime.focus.pushScope({ key: "popup:test", kind: "popup", container: element("#layer"), onActivated });
    fireEvent.click(element("#u"));
    fireEvent.click(element("#u"));
    expect(onActivated).toHaveBeenCalledTimes(1);
    gate.resolve({ status: "success" });
    await settle();
    leave();
  });
});

describe("correlation of interface intents", () => {
  it("adds the identifiers the owner supplies to activations, shortcuts and interface diagnostics", async () => {
    detach();
    let count = 0;
    ui = createTestUi({
      correlation: () => {
        count += 1;
        return { worldId: "world-1", sessionId: "session-1", requestId: `request-${count}` };
      },
    });
    detach = ui.runtime.input.attach();
    const seen: ActionRequest[] = [];
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", (request) => {
      seen.push(request);
      return Promise.resolve({ status: "success" });
    });
    ui.shortcut({ scope: "app", chord: "Ctrl+S", actionId: "ui.test.save", owner: "test" });
    mount(`<button id="a" data-control-id="${SAVE}">A</button><button id="x" data-control-id="editor.nothing.99">X</button>`);
    fireEvent.click(element("#a"));
    await settle();
    fireEvent.keyDown(document.body, { key: "s", ctrlKey: true });
    await settle();
    fireEvent.click(element("#x"));
    expect(seen.map((request) => request.correlation)).toEqual([
      { worldId: "world-1", sessionId: "session-1", requestId: "request-1" },
      { worldId: "world-1", sessionId: "session-1", requestId: "request-2" },
    ]);
    expect(ui.diagnostics).toEqual([
      expect.objectContaining({ code: "control-unknown", correlation: { worldId: "world-1", sessionId: "session-1", requestId: "request-3" } }),
    ]);
  });
});

describe("pointer-over state that outlives its element", () => {
  it("is cleared by an accepted activation, because a removed element never reports the pointer leaving", async () => {
    mount(`<button id="a" data-control-id="${SAVE}">A</button>`);
    fireEvent.pointerOver(element("#a"), { pointerType: "mouse" });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
    fireEvent.click(element("#a"));
    await settle();
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(false);
  });
});

describe("losing the window", () => {
  it("ends a composition and hides help, so no state is left from before the user left", () => {
    mount(`<input id="field" type="text" data-control-id="editor.fields.01">`);
    const field = element<HTMLInputElement>("#field");
    field.focus();
    fireEvent.compositionStart(field);
    ui.runtime.input.help.pin(SAVE);
    expect(ui.runtime.focus.isComposing()).toBe(true);
    fireEvent.blur(window);
    expect(ui.runtime.focus.isComposing()).toBe(false);
    expect(ui.runtime.input.help.current()).toBeNull();
  });
});

describe("one runtime per window", () => {
  it("lets two windows bind the same chord, and still reports a clash inside one window", () => {
    const other = createTestUi();
    const request = { scope: "app", chord: "Ctrl+K", actionId: "ui.test.save", owner: "window one" } as const;
    ui.shortcut(request);
    other.shortcut({ ...request, owner: "window two" });
    const clash = ui.runtime.shortcuts.register({ ...request, owner: "window one again" });
    expect(clash.ok).toBe(false);
    expect(other.runtime.shortcuts.labelFor("ui.test.save")).toBe("Ctrl+K");
  });
});

describe("held keys", () => {
  it("run a shortcut once however long the key is held", async () => {
    ui.shortcut({ scope: "app", chord: "Ctrl+S", actionId: "ui.test.save", owner: "test" });
    fireEvent.keyDown(document.body, { key: "s", ctrlKey: true });
    await settle();
    fireEvent.keyDown(document.body, { key: "s", ctrlKey: true, repeat: true });
    fireEvent.keyDown(document.body, { key: "s", ctrlKey: true, repeat: true });
    await settle();
    expect(saves).toHaveLength(1);
  });
});

describe("held Enter and Space", () => {
  it("commit a text field once however long Enter is held, and still let Space type", async () => {
    mount(`<input id="field" type="text" data-control-id="editor.fields.01" value="Moonhaven">`);
    const field = element<HTMLInputElement>("#field");
    field.focus();
    fireEvent.keyDown(field, { key: "Enter" });
    await settle();
    expect(fireEvent.keyDown(field, { key: "Enter", repeat: true })).toBe(false);
    expect(fireEvent.keyDown(field, { key: "Enter", repeat: true })).toBe(false);
    await settle();
    expect(renames).toHaveLength(1);
    expect(fireEvent.keyDown(field, { key: " ", repeat: true })).toBe(true);
  });

  it("activate a custom control once, and swallow the repeats instead of passing them on", async () => {
    mount(`<div id="custom" role="button" tabindex="0" data-control-id="${SAVE}">Save</div>`);
    const custom = element("#custom");
    fireEvent.keyDown(custom, { key: " " });
    await settle();
    expect(fireEvent.keyDown(custom, { key: " ", repeat: true })).toBe(false);
    expect(fireEvent.keyDown(custom, { key: "Enter", repeat: true })).toBe(false);
    await settle();
    expect(saves).toHaveLength(1);
  });

  it("cancel each repeated key press on a native button (the default action that would click it), and leave the first press uncancelled", async () => {
    mount(`<button id="native" data-control-id="${SAVE}">Save</button>`);
    const native = element("#native");
    expect(fireEvent.keyDown(native, { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(native, { key: "Enter", repeat: true })).toBe(false);
    expect(fireEvent.keyDown(native, { key: " ", repeat: true })).toBe(false);
    await settle();
    expect(saves).toHaveLength(0);
  });
});
