/** See testSupport.tsx for what these tests cannot prove. */
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionOutcome, ActionRequest, HandlerRequest } from "../actions/ActionBus";
import { UiContractError } from "../actions/types";
import { EDITOR, NAME, SAVE, UNDO, createTestUi, elementBy as element, mountHtml as mount, settle, type TestUi } from "../testSupport";

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

describe("activation", () => {
  it("resolves the control id to its action on click, including from a nested element", async () => {
    mount(`<button data-control-id="${SAVE}"><span id="inner">Save</span></button><p id="plain">text</p>`);
    fireEvent.click(element("#inner"));
    fireEvent.click(element("#plain"));
    await settle();
    expect(saves).toEqual([{ actionId: "ui.test.save", controlId: SAVE, correlation: {} }]);
  });

  it("activates a non-native control with Enter and Space exactly once each", async () => {
    mount(`<div role="button" tabindex="0" id="custom" data-control-id="${SAVE}">Save</div>`);
    const custom = element("#custom");
    expect(fireEvent.keyDown(custom, { key: "Enter" })).toBe(false);
    await settle();
    fireEvent.keyDown(custom, { key: " " });
    await settle();
    fireEvent.keyDown(custom, { key: " ", repeat: true });
    await settle();
    expect(saves).toHaveLength(2);
  });

  it("does not activate on Enter or Space key presses on a native button, and activates once on its click", async () => {
    mount(`<button id="native" data-control-id="${SAVE}">Save</button>`);
    const native = element("#native");
    fireEvent.keyDown(native, { key: "Enter" });
    fireEvent.keyDown(native, { key: " " });
    await settle();
    expect(saves).toHaveLength(0);
    native.click();
    await settle();
    expect(saves).toHaveLength(1);
  });

  it("reports a control on screen that is not in the catalogs instead of ignoring it", () => {
    mount(`<button id="stray" data-control-id="editor.nothing.99">Stray</button>`);
    fireEvent.click(element("#stray"));
    expect(ui.diagnostics).toEqual([expect.objectContaining({ code: "control-unknown", controlId: "editor.nothing.99" })]);
  });

  it("reports an interface command nobody registered", () => {
    mount(`<button id="orphan" data-ui-command="menu.toggle.none">Orphan</button>`);
    fireEvent.click(element("#orphan"));
    expect(ui.diagnostics).toEqual([expect.objectContaining({ code: "command-unknown" })]);
  });

  it("runs a registered interface command once and respects aria-disabled", () => {
    mount(`<button id="cmd" data-ui-command="demo.run">Run</button><button id="off" aria-disabled="true" data-ui-command="demo.run">Off</button>`);
    const command = vi.fn();
    ui.runtime.input.registerCommand("demo.run", command);
    fireEvent.click(element("#off"));
    fireEvent.click(element("#cmd"));
    expect(command).toHaveBeenCalledTimes(1);
    expect(() => ui.runtime.input.registerCommand("demo.run", command)).toThrowError(expect.objectContaining({ code: "command-duplicate" }));
  });

  it("hands keys pressed inside a keyed element to its handler, cancels only the keys it used, and leaves text entry alone", () => {
    mount(`<div data-ui-keys="demo.keys"><button id="inside">Inside</button><input id="typing" /></div><button id="outside">Outside</button>`);
    const handler = vi.fn((event: KeyboardEvent) => event.key === "ArrowLeft");
    ui.runtime.input.registerKeys("demo.keys", handler);
    expect(fireEvent.keyDown(element("#inside"), { key: "ArrowLeft" })).toBe(false);
    expect(fireEvent.keyDown(element("#inside"), { key: "ArrowRight" })).toBe(true);
    fireEvent.keyDown(element("#typing"), { key: "ArrowLeft" });
    fireEvent.keyDown(element("#outside"), { key: "ArrowLeft" });
    expect(handler.mock.calls.map(([event]) => event.key)).toEqual(["ArrowLeft", "ArrowRight"]);
    expect(() => ui.runtime.input.registerKeys("demo.keys", handler)).toThrowError(expect.objectContaining({ code: "keys-duplicate" }));
  });

  it("reports a keyed element whose handler is not registered", () => {
    mount(`<button id="orphan" data-ui-keys="demo.missing">Orphan</button>`);
    fireEvent.keyDown(element("#orphan"), { key: "ArrowLeft" });
    expect(ui.diagnostics.map((record) => record.code)).toEqual(["keys-unknown"]);
  });

  it("explains a disabled control when it is pressed, without running its action", async () => {
    mount(`<button id="save" data-control-id="${SAVE}" aria-disabled="true">Save</button>`);
    ui.registerHelp(SAVE);
    ui.runtime.bus.setDisabled(SAVE, "Open a project first.");
    fireEvent.click(element("#save"));
    await settle();
    expect(saves).toHaveLength(0);
    expect(ui.runtime.input.help.current()).toBe(SAVE);
    expect(ui.runtime.announcer.getLast()?.text).toBe("Save Project is not available. Open a project first.");
  });

  it("sends a chosen option with its value to the owning action", async () => {
    mount(`<select id="pick" data-control-id="editor.fields.03"><option value="a">A</option><option value="b">B</option></select>`);
    const picks: ActionRequest[] = [];
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.layout", ({ signal: _signal, ...request }) => {
      picks.push(request);
      return Promise.resolve({ status: "success" });
    });
    const pick = element<HTMLSelectElement>("#pick");
    fireEvent.click(pick);
    pick.value = "b";
    fireEvent.change(pick);
    await settle();
    expect(picks).toEqual([{ actionId: "ui.test.layout", controlId: "editor.fields.03", correlation: {}, value: "b" }]);
  });

  it("sends the value an item of a choice list stands for, from the item that was activated and not its neighbours", async () => {
    mount(
      `<div role="menu"><button id="a" role="menuitemradio" data-control-id="editor.fields.03" data-value="a">A</button><button id="b" role="menuitemradio" data-control-id="editor.fields.03" data-value="b">B</button></div>`,
    );
    const picks: ActionRequest[] = [];
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.layout", ({ signal: _signal, ...request }) => {
      picks.push(request);
      return Promise.resolve({ status: "success" });
    });
    fireEvent.click(element("#b"));
    await settle();
    fireEvent.click(element("#a"));
    await settle();
    expect(picks.map((request) => request.value)).toEqual(["b", "a"]);
  });

  it("sends no value for a plain button, so only choice items carry one", async () => {
    mount(`<button id="save" data-control-id="${SAVE}">Save</button>`);
    fireEvent.click(element("#save"));
    await settle();
    expect(saves).toHaveLength(1);
    expect("value" in (saves[0] ?? {})).toBe(false);
  });
});

describe("typing and composition", () => {
  function typingField(): HTMLInputElement {
    mount(`<input id="name" data-control-id="${NAME}" value="Moonhaven"><button id="other">Other</button>`);
    const input = element<HTMLInputElement>("#name");
    input.focus();
    return input;
  }

  beforeEach(() => {
    const result = ui.runtime.shortcuts.register({ scope: "app", chord: "ctrl+s", actionId: "ui.test.save", owner: "test" });
    expect(result.ok).toBe(true);
    ui.shortcut({ scope: "app", chord: "S", actionId: "ui.test.save", owner: "plain-letter" });
  });

  it("does not fire shortcuts while a text field has focus, and commits on Enter with the typed value", async () => {
    const input = typingField();
    fireEvent.keyDown(input, { key: "s", ctrlKey: true });
    fireEvent.keyDown(input, { key: "s" });
    fireEvent.click(input);
    await settle();
    expect(saves).toHaveLength(0);
    expect(renames).toHaveLength(0);
    fireEvent.keyDown(input, { key: "Enter" });
    await settle();
    expect(renames).toEqual([{ actionId: "ui.test.rename", controlId: NAME, correlation: {}, value: "Moonhaven" }]);
  });

  it("ignores Enter and shortcuts during input method composition, then commits afterwards", async () => {
    const input = typingField();
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.keyDown(input, { key: "s", ctrlKey: true });
    await settle();
    expect(renames).toHaveLength(0);
    expect(saves).toHaveLength(0);
    expect(ui.runtime.focus.isTextEditing()).toBe(true);
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    await settle();
    expect(renames).toHaveLength(1);
  });

  it("clears a stuck composition when focus leaves the field", () => {
    const input = typingField();
    fireEvent.compositionStart(input);
    expect(ui.runtime.focus.isComposing()).toBe(true);
    element<HTMLButtonElement>("#other").focus();
    expect(ui.runtime.focus.isComposing()).toBe(false);
    expect(ui.runtime.focus.isTextEditing()).toBe(false);
  });

  it("fires the shortcut once focus is on a plain button, and consumes the key", async () => {
    typingField();
    const other = element<HTMLButtonElement>("#other");
    other.focus();
    expect(fireEvent.keyDown(other, { key: "s", ctrlKey: true })).toBe(false);
    await settle();
    expect(saves).toEqual([{ actionId: "ui.test.save", controlId: null, correlation: {} }]);
  });
});

describe("scopes and shortcuts", () => {
  it("fires a workspace shortcut only while that workspace scope is active", async () => {
    ui.shortcut({ scope: "workspace:editor", chord: "Ctrl+Shift+S", actionId: "ui.test.save", owner: "editor" });
    fireEvent.keyDown(document.body, { key: "S", ctrlKey: true, shiftKey: true });
    await settle();
    expect(saves).toHaveLength(0);
    const leave = ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace" });
    fireEvent.keyDown(document.body, { key: "S", ctrlKey: true, shiftKey: true });
    await settle();
    expect(saves).toHaveLength(1);
    leave();
  });

  it("hides shortcuts beneath a modal dialog but keeps the emergency one reachable, even while typing", async () => {
    mount(`<div id="dialog" tabindex="-1"><input id="field" value="x"></div>`);
    ui.shortcut({ scope: "workspace:editor", chord: "Ctrl+S", actionId: "ui.test.save", owner: "editor" });
    ui.shortcut({ scope: "app", chord: "Ctrl+Alt+D", actionId: "ui.test.undo", owner: "shell", emergency: true });
    const undos: ActionRequest[] = [];
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.undo", (request) => {
      undos.push(request);
      return Promise.resolve({ status: "success" });
    });
    const leaveWorkspace = ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace" });
    const leaveDialog = ui.runtime.focus.pushScope({ key: "dialog:one", kind: "dialog", container: element("#dialog") });
    const field = element<HTMLInputElement>("#field");
    field.focus();
    fireEvent.keyDown(field, { key: "s", ctrlKey: true });
    fireEvent.keyDown(field, { key: "d", ctrlKey: true, altKey: true });
    await settle();
    expect(saves).toHaveLength(0);
    expect(undos).toHaveLength(1);
    leaveDialog();
    leaveWorkspace();
  });

  it("rejects pushing the same scope twice, a second workspace and a dialog without a container", () => {
    const leave = ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace" });
    const code = (attempt: () => void): string => {
      try {
        attempt();
      } catch (failure) {
        if (failure instanceof UiContractError) return failure.code;
      }
      return "none";
    };
    expect(code(() => ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "popup", container: document.body }))).toBe("scope-duplicate");
    expect(code(() => ui.runtime.focus.pushScope({ key: "workspace:host", kind: "workspace" }))).toBe("scope-workspace-duplicate");
    expect(code(() => ui.runtime.focus.pushScope({ key: "dialog:x", kind: "dialog" }))).toBe("scope-container-missing");
    leave();
  });
});

describe("shortcut registration", () => {
  it("reports a collision in one scope naming both owners, and allows the chord in another scope", () => {
    const { shortcuts } = ui.runtime;
    expect(shortcuts.register({ scope: "workspace:editor", chord: "Delete", actionId: "ui.test.save", owner: "Editor router" }).ok).toBe(true);
    const clash = shortcuts.register({ scope: "workspace:editor", chord: "delete", actionId: "ui.test.undo", owner: "Imported profile" });
    expect(clash.ok).toBe(false);
    if (clash.ok) return;
    expect(clash.error.code).toBe("shortcut-collision");
    expect(clash.error.message).toContain("Editor router");
    expect(clash.error.message).toContain("Imported profile");
    expect(clash.error.existing?.actionId).toBe("ui.test.save");
    expect(shortcuts.register({ scope: "workspace:client", chord: "Delete", actionId: "ui.test.undo", owner: "Client profile" }).ok).toBe(true);
  });

  it("frees a chord when its owner unregisters", () => {
    const first = ui.runtime.shortcuts.register({ scope: "app", chord: "F5", actionId: "ui.test.save", owner: "a" });
    if (!first.ok) throw new Error("expected success");
    first.unregister();
    expect(ui.runtime.shortcuts.register({ scope: "app", chord: "F5", actionId: "ui.test.undo", owner: "b" }).ok).toBe(true);
  });

  it("rejects unknown actions, unreadable chords and emergency shortcuts outside the app scope", () => {
    const { shortcuts } = ui.runtime;
    const code = (request: Parameters<typeof shortcuts.register>[0]): string => {
      const result = shortcuts.register(request);
      return result.ok ? "ok" : result.error.code;
    };
    expect(code({ scope: "app", chord: "F6", actionId: "ui.test.ghost", owner: "x" })).toBe("shortcut-action-unknown");
    expect(code({ scope: "app", chord: "Ctrl+Banana", actionId: "ui.test.save", owner: "x" })).toBe("shortcut-chord-invalid");
    expect(code({ scope: "workspace:editor", chord: "F7", actionId: "ui.test.save", owner: "x", emergency: true })).toBe("shortcut-emergency-scope");
  });

  it("reports the assigned chord for an action", () => {
    ui.shortcut({ scope: "app", chord: "ctrl+shift+z", actionId: "ui.test.undo", owner: "x" });
    expect(ui.runtime.shortcuts.labelFor("ui.test.undo")).toBe("Ctrl+Shift+Z");
    expect(ui.runtime.shortcuts.labelFor("ui.test.save")).toBeNull();
  });
});

describe("root listeners", () => {
  it("installs one set once, however many controls exist, and removes exactly that set", () => {
    detach();
    const added = vi.spyOn(document, "addEventListener");
    const removed = vi.spyOn(document, "removeEventListener");
    detach = ui.runtime.input.attach();
    const installed = added.mock.calls.length;
    expect(installed).toBeGreaterThan(0);
    mount(Array.from({ length: 50 }, () => `<button data-control-id="${SAVE}">Save</button>`).join(""));
    expect(added.mock.calls).toHaveLength(installed);
    expect(() => ui.runtime.input.attach()).toThrowError(expect.objectContaining({ code: "input-attached" }));
    detach();
    expect(removed.mock.calls.map((call) => call[0]).sort()).toEqual(added.mock.calls.map((call) => call[0]).sort());
    added.mockRestore();
    removed.mockRestore();
    detach = ui.runtime.input.attach();
  });

  it("records the last input device on the document root", () => {
    mount(`<button id="b" data-control-id="${SAVE}">Save</button>`);
    fireEvent.pointerDown(element("#b"), { pointerType: "touch" });
    expect(document.documentElement.dataset["inputModality"]).toBe("touch");
    fireEvent.keyDown(element("#b"), { key: "x" });
    expect(document.documentElement.dataset["inputModality"]).toBe("keyboard");
  });
});

describe("surfaces", () => {
  function surfaceMarkup(): void {
    mount(`<div id="map"><span id="inside">in</span></div><div id="elsewhere">out</div>`);
  }

  it("routes touch, pen and mouse pointers that start inside a surface to their own stream only", () => {
    surfaceMarkup();
    const touch = vi.fn();
    const pen = vi.fn();
    const mouse = vi.fn();
    ui.runtime.input.registerSurface({ id: "map", element: element("#map"), handlers: { touch, pen, mouse } });
    fireEvent.pointerDown(element("#inside"), { pointerType: "touch" });
    fireEvent.pointerMove(element("#inside"), { pointerType: "pen" });
    fireEvent.pointerUp(element("#inside"), { pointerType: "mouse" });
    fireEvent.pointerDown(element("#elsewhere"), { pointerType: "touch" });
    expect(touch).toHaveBeenCalledTimes(1);
    expect(pen).toHaveBeenCalledTimes(1);
    expect(mouse).toHaveBeenCalledTimes(1);
  });

  it("adds a non-passive wheel listener only while a surface wants wheel input", () => {
    surfaceMarkup();
    const added = vi.spyOn(document, "addEventListener");
    const removed = vi.spyOn(document, "removeEventListener");
    const wheel = vi.fn();
    const release = ui.runtime.input.registerSurface({ id: "map", element: element("#map"), handlers: { wheel } });
    const wheelAdds = added.mock.calls.filter((call) => call[0] === "wheel");
    expect(wheelAdds).toHaveLength(1);
    expect(wheelAdds[0]?.[2]).toEqual({ passive: false });
    fireEvent.wheel(element("#inside"), { deltaY: 10 });
    fireEvent.wheel(element("#elsewhere"), { deltaY: 10 });
    expect(wheel).toHaveBeenCalledTimes(1);
    release();
    expect(removed.mock.calls.filter((call) => call[0] === "wheel")).toHaveLength(1);
    fireEvent.wheel(element("#inside"), { deltaY: 10 });
    expect(wheel).toHaveBeenCalledTimes(1);
    added.mockRestore();
    removed.mockRestore();
  });

  it("routes drag events and rejects a duplicate surface id or element", () => {
    surfaceMarkup();
    const drag = vi.fn();
    ui.runtime.input.registerSurface({ id: "map", element: element("#map"), handlers: { drag } });
    fireEvent.dragStart(element("#inside"));
    fireEvent.dragOver(element("#elsewhere"));
    expect(drag).toHaveBeenCalledTimes(1);
    expect(() => ui.runtime.input.registerSurface({ id: "map", element: element("#elsewhere"), handlers: {} })).toThrowError(
      expect.objectContaining({ code: "surface-duplicate" }),
    );
    expect(() => ui.runtime.input.registerSurface({ id: "other", element: element("#map"), handlers: {} })).toThrowError(
      expect.objectContaining({ code: "surface-element-taken" }),
    );
  });
});

describe("arrow key groups", () => {
  it("moves focus along a horizontal group, wrapping at both ends, and leaves text fields alone", () => {
    mount(
      `<div data-roving-group="horizontal"><button id="a" data-control-id="${SAVE}">A</button><button id="b" data-control-id="${UNDO}">B</button><input id="t" data-control-id="${NAME}"></div>`,
    );
    const a = element<HTMLButtonElement>("#a");
    const b = element<HTMLButtonElement>("#b");
    const t = element<HTMLInputElement>("#t");
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(document.activeElement).toBe(b);
    fireEvent.keyDown(b, { key: "ArrowRight" });
    expect(document.activeElement).toBe(t);
    fireEvent.keyDown(t, { key: "ArrowRight" });
    expect(document.activeElement).toBe(t);
    b.focus();
    fireEvent.keyDown(b, { key: "Home" });
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(t);
    fireEvent.keyDown(a, { key: "ArrowDown" });
    expect(document.activeElement).toBe(t);
  });
});

describe("help", () => {
  it("tracks help for focus and pointer-over events, and Escape hides it as well as leaving the open dialog", () => {
    mount(`<button id="a" data-control-id="${SAVE}">A</button><div id="dialog" tabindex="-1"></div>`);
    ui.registerHelp(SAVE);
    const onEscape = vi.fn();
    const a = element<HTMLButtonElement>("#a");
    a.focus();
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
    expect(fireEvent.keyDown(a, { key: "Escape" })).toBe(false);
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(false);
    const leave = ui.runtime.focus.pushScope({ key: "dialog:d", kind: "dialog", container: element("#dialog"), onEscape });
    fireEvent.keyDown(a, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
    leave();
    a.blur();
    fireEvent.pointerOver(a, { pointerType: "mouse" });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
    fireEvent.pointerOut(a, { pointerType: "mouse" });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(false);
  });

  it("opens on F1 for the focused control", () => {
    mount(`<button id="a" data-control-id="${SAVE}">A</button>`);
    ui.registerHelp(SAVE);
    const a = element<HTMLButtonElement>("#a");
    fireEvent.keyDown(a, { key: "F1" });
    expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
  });

  describe("for a control that has no help yet", () => {
    const markup = (): void => {
      mount(
        `<button id="a" data-control-id="${UNDO}">A</button><button id="b" data-control-id="${SAVE}" aria-disabled="true">B</button>` +
          `<input id="field" type="text" data-control-id="${NAME}"><textarea id="area" data-ui-command="demo.area"></textarea>`,
      );
      ui.registerHelp(SAVE);
    };

    it("takes the help key and the long-press menu for the application, shows nothing and pins nothing", () => {
      markup();
      const a = element<HTMLButtonElement>("#a");
      expect(fireEvent.keyDown(a, { key: "F1" })).toBe(false);
      fireEvent.pointerDown(a, { pointerType: "touch" });
      expect(fireEvent.contextMenu(a)).toBe(false);
      expect(ui.runtime.input.help.current()).toBeNull();
    });

    it("keeps the native context menu in text fields but still owns the help key there", () => {
      markup();
      for (const id of ["#field", "#area"]) {
        const field = element(id);
        fireEvent.pointerDown(field, { pointerType: "touch" });
        expect(fireEvent.contextMenu(field), id).toBe(true);
        expect(fireEvent.keyDown(field, { key: "F1" }), id).toBe(false);
      }
      expect(ui.runtime.input.help.current()).toBeNull();
    });

    it("cannot hide the reason of another control that is hovered, focused or asked about", () => {
      markup();
      const [a, b] = [element<HTMLButtonElement>("#a"), element<HTMLButtonElement>("#b")];
      fireEvent.keyDown(a, { key: "F1" });
      fireEvent.pointerOver(a, { pointerType: "mouse" });
      b.focus();
      expect(ui.runtime.input.help.current()).toBe(SAVE);
      b.blur();
      a.focus();
      fireEvent.pointerDown(a, { pointerType: "touch" });
      fireEvent.contextMenu(a);
      fireEvent.pointerOver(b, { pointerType: "mouse" });
      expect(ui.runtime.input.help.current()).toBe(SAVE);
    });

    it("shows its reason at once when it becomes disabled while hovered or focused, and not before", () => {
      markup();
      const a = element<HTMLButtonElement>("#a");
      fireEvent.pointerOver(a, { pointerType: "mouse" });
      a.focus();
      expect(ui.runtime.input.help.current()).toBeNull();
      ui.registerHelp(UNDO);
      expect(ui.runtime.input.help.current()).toBe(UNDO);
    });

    it("falls back to the hovered or focused control when a pinned one loses its help, and does not return to the pin when help comes back", () => {
      markup();
      const [a, b] = [element<HTMLButtonElement>("#a"), element<HTMLButtonElement>("#b")];
      const give = ui.runtime.input.help.register(UNDO);
      fireEvent.keyDown(a, { key: "F1" });
      expect(ui.runtime.input.help.current()).toBe(UNDO);
      fireEvent.pointerOver(b, { pointerType: "mouse" });
      expect(ui.runtime.input.help.current()).toBe(UNDO);
      give();
      expect(ui.runtime.input.help.current()).toBe(SAVE);
      ui.registerHelp(UNDO);
      expect(ui.runtime.input.help.current()).toBe(SAVE);
    });
  });

  describe("context menu", () => {
    it.each(["mouse", "touch", "pen"])("is taken for help on a control with help after a %s press, and help hides on the next press elsewhere", (pointerType) => {
      mount(`<button id="a" data-control-id="${SAVE}">A</button>`);
      ui.registerHelp(SAVE);
      const a = element<HTMLButtonElement>("#a");
      fireEvent.pointerDown(a, { pointerType });
      expect(fireEvent.contextMenu(a)).toBe(false);
      expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
      fireEvent.pointerDown(document.body, { pointerType });
      expect(ui.runtime.input.help.isShown(SAVE)).toBe(false);
    });

    it("is taken for help when the keyboard context key is used on a focused control, with no pointer press before it", () => {
      mount(`<button id="a" data-control-id="${SAVE}">A</button>`);
      ui.registerHelp(SAVE);
      const a = element<HTMLButtonElement>("#a");
      a.focus();
      fireEvent.keyDown(a, { key: "ContextMenu" });
      expect(fireEvent.contextMenu(a)).toBe(false);
      expect(ui.runtime.input.help.isShown(SAVE)).toBe(true);
    });

    it("is taken even by a control with no help, which shows nothing, and by a mouse right click after touch use", () => {
      mount(`<button id="a" data-control-id="${UNDO}">A</button>`);
      const a = element<HTMLButtonElement>("#a");
      fireEvent.pointerDown(a, { pointerType: "touch" });
      fireEvent.pointerDown(a, { pointerType: "mouse" });
      expect(fireEvent.contextMenu(a)).toBe(false);
      expect(ui.runtime.input.help.current()).toBeNull();
    });

    it("stays native in a text field for every pointer kind and the keyboard, and over elements that are not controls", () => {
      mount(`<input id="field" type="text" data-control-id="${NAME}"><p id="plain">text</p>`);
      ui.registerHelp(NAME);
      const field = element<HTMLInputElement>("#field");
      for (const pointerType of ["mouse", "touch", "pen"]) {
        fireEvent.pointerDown(field, { pointerType });
        expect(fireEvent.contextMenu(field), pointerType).toBe(true);
        expect(ui.runtime.input.help.current(), pointerType).toBeNull();
      }
      expect(fireEvent.contextMenu(element("#plain"))).toBe(true);
      field.focus();
      expect(fireEvent.contextMenu(field)).toBe(true);
    });
  });
});
