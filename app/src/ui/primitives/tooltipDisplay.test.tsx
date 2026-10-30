/** See testSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionOutcome, HandlerRequest } from "../actions/ActionBus";
import { AUTOSAVE, CONNECTION, EDITOR, GO_SETTINGS, GO_TO, LAYOUT, NAME, ORPHAN, SAVE, UNDO, createTestUi, renderWithUi, settle, type TestUi } from "../testSupport";
import { Button } from "./Button";
import { Dropdown } from "./Dropdown";
import { IconButton } from "./IconButton";
import { Menu, openMenuHandler } from "./Menu";
import { Progress } from "./Progress";
import { StatusIndicator } from "./StatusIndicator";
import { Switch } from "./Switch";
import { TextField } from "./TextField";
import { Toast } from "./Toast";
import { Toolbar } from "./Toolbar";

let ui: TestUi;

beforeEach(() => {
  ui = createTestUi();
  const succeed = ({ signal: _signal }: HandlerRequest): Promise<ActionOutcome> => Promise.resolve({ status: "success" });
  for (const id of ["ui.test.save", "ui.test.undo", "ui.test.rename", "ui.test.autosave", "ui.test.layout"]) {
    ui.runtime.bus.registerHandler(EDITOR, id, succeed);
  }
  ui.runtime.bus.registerHandler("WorkspaceNavigator", "ui.nav.settings", succeed);
  ui.runtime.bus.registerHandler("WorkspaceNavigator", "ui.nav.openMenu", openMenuHandler);
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-input-modality");
});

const tips = (): HTMLElement[] => screen.queryAllByRole("tooltip", { hidden: true });
const save = (): HTMLElement => screen.getByRole("button", { name: "Save Project" });
const hover = (element: HTMLElement): boolean => fireEvent.pointerOver(element, { pointerType: "mouse" });
const longPress = (element: HTMLElement): void => {
  fireEvent.pointerDown(element, { pointerType: "touch" });
  fireEvent.contextMenu(element);
};
const bindSaveShortcut = (): (() => void) => {
  const result = ui.runtime.shortcuts.register({ scope: "app", chord: "ctrl+s", actionId: "ui.test.save", owner: "test" });
  if (!result.ok) throw new Error(result.error.message);
  return result.unregister;
};

describe("a control with a clear label and no other reason for help", () => {
  it("renders no tooltip, title, extra label or description for a button, switch, field, list or menu opener and its items", async () => {
    renderWithUi(
      ui,
      <>
        <Button control={ui.control(SAVE)} />
        <Switch control={ui.control(AUTOSAVE)} checked={false} />
        <TextField control={ui.control(NAME)} value="Moonhaven" onValueChange={() => undefined} />
        <Dropdown control={ui.control(LAYOUT)} options={[{ value: "a", label: "Side by side" }]} value="a" />
        <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_SETTINGS)]} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go To" }));
    await settle();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeTruthy();
    const expected = [
      ["button", "Save Project"],
      ["switch", "Autosave"],
      ["textbox", "Project Name"],
      ["combobox", "Layout"],
      ["button", "Go To"],
      ["menuitem", "Settings"],
    ] as const;
    expect(document.querySelectorAll("[data-control-id]")).toHaveLength(expected.length);
    expect(tips()).toEqual([]);
    for (const [role, name] of expected) {
      const element = screen.getByRole(role, { name, description: "" });
      for (const attribute of ["aria-describedby", "aria-description", "aria-labelledby", "title"]) {
        expect(element.hasAttribute(attribute), `${name} ${attribute}`).toBe(false);
      }
    }
  });

  it("shows nothing on hover, keyboard focus, the help key or a long press, while the application still takes the help key and long press", () => {
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const button = save();
    hover(button);
    act(() => button.focus());
    expect(fireEvent.keyDown(button, { key: "F1" })).toBe(false);
    fireEvent.pointerDown(button, { pointerType: "touch" });
    expect(fireEvent.contextMenu(button)).toBe(false);
    expect(ui.runtime.input.help.current()).toBeNull();
    expect(tips()).toEqual([]);
    expect(screen.getByRole("button", { name: "Save Project", description: "" })).toBe(button);
  });

  it("gets a tooltip once the same interactions are made on a control that has a reason, proving the checks above can fail", () => {
    bindSaveShortcut();
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const [tip] = tips();
    expect(tip?.hidden).toBe(true);
    hover(save());
    expect(tip?.hidden).toBe(false);
  });
});

describe("a disabled or unavailable control", () => {
  it("shows its reason at once when it becomes disabled while it holds focus or the pointer, without a new gesture", () => {
    renderWithUi(
      ui,
      <>
        <IconButton control={ui.control(UNDO)} icon="<" />
        <Button control={ui.control(SAVE)} />
      </>,
    );
    act(() => save().focus());
    act(() => ui.runtime.bus.setDisabled(SAVE, "Open a project first."));
    const reason = tips().find((tip) => tip.getAttribute("data-help-for") === SAVE);
    expect(reason?.hidden).toBe(false);
    expect(reason?.textContent).toContain("Open a project first.");
    act(() => ui.runtime.bus.reset(SAVE));
    expect(tips().map((tip) => tip.getAttribute("data-help-for"))).toEqual([UNDO]);
  });

  it("is not hidden by an ordinary control that is hovered, pinned by the help key or long pressed", () => {
    renderWithUi(
      ui,
      <>
        <Button control={ui.control(SAVE)} />
        <Switch control={ui.control(AUTOSAVE)} checked={false} />
      </>,
    );
    act(() => ui.runtime.bus.setDisabled(AUTOSAVE, "Autosave is locked."));
    const reason = tips()[0];
    act(() => screen.getByRole("switch", { name: "Autosave" }).focus());
    expect(reason?.hidden).toBe(false);
    hover(save());
    fireEvent.keyDown(save(), { key: "F1" });
    longPress(save());
    expect(reason?.hidden).toBe(false);
  });

  it("shows the specific reason when it becomes disabled, and drops the tooltip when it is ready again", () => {
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    expect(tips()).toEqual([]);
    act(() => ui.runtime.bus.setDisabled(SAVE, "Open a project first."));
    const [tip, ...others] = tips();
    expect(others).toEqual([]);
    expect(tip?.textContent).toContain("Unavailable: Open a project first.");
    expect(tip?.textContent).not.toContain("Save the project draft");
    expect(screen.getByRole("button", { name: "Save Project", description: /Unavailable: Open a project first\./ })).toBe(save());
    expect(tip?.hidden).toBe(true);
    hover(save());
    expect(tip?.hidden).toBe(false);
    act(() => ui.runtime.bus.reset(SAVE));
    expect(tips()).toEqual([]);
    expect(save().hasAttribute("aria-describedby")).toBe(false);
  });

  it("shows the reason when a disabled control is pressed, by mouse or by touch", () => {
    ui.runtime.bus.setDisabled(SAVE, "Open a project first.");
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const tip = tips()[0];
    fireEvent.click(save());
    expect(tip?.hidden).toBe(false);
    fireEvent.keyDown(save(), { key: "Escape" });
    expect(tip?.hidden).toBe(true);
    longPress(save());
    expect(tip?.hidden).toBe(false);
  });

  it("gives a refused activation no tooltip, while a control disabled beforehand still has one", async () => {
    ui.runtime.bus.setDisabled(AUTOSAVE, "Autosave is locked.");
    renderWithUi(
      ui,
      <>
        <Button control={ui.control(ORPHAN)} />
        <Switch control={ui.control(AUTOSAVE)} checked={false} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Unowned Tool" }));
    await settle();
    expect(ui.runtime.bus.getRuntime(ORPHAN).state).toBe("unavailable");
    expect(tips().map((tip) => tip.getAttribute("data-help-for"))).toEqual([AUTOSAVE]);
  });
});

describe("a disabled switch, field or list", () => {
  it("keeps its reason as the description and as a tooltip", () => {
    for (const id of [AUTOSAVE, NAME, LAYOUT]) ui.runtime.bus.setDisabled(id, `${id} is locked.`);
    renderWithUi(
      ui,
      <>
        <Switch control={ui.control(AUTOSAVE)} checked={false} />
        <TextField control={ui.control(NAME)} value="Moonhaven" onValueChange={() => undefined} />
        <Dropdown control={ui.control(LAYOUT)} options={[{ value: "a", label: "Side by side" }]} value="a" />
      </>,
    );
    screen.getByRole("switch", { name: "Autosave", description: new RegExp(String.raw`Unavailable: ${AUTOSAVE} is locked\.`) });
    screen.getByRole("textbox", { name: "Project Name", description: new RegExp(String.raw`Unavailable: ${NAME} is locked\.`) });
    screen.getByRole("combobox", { name: "Layout", description: new RegExp(String.raw`Unavailable: ${LAYOUT} is locked\.`) });
    expect(tips().map((tip) => tip.getAttribute("data-help-for"))).toEqual([AUTOSAVE, NAME, LAYOUT]);
  });
});

describe("a text field", () => {
  it("keeps the native context menu on a long press and still takes the help key", () => {
    renderWithUi(ui, <TextField control={ui.control(NAME)} value="Moonhaven" onValueChange={() => undefined} />);
    const field = screen.getByRole("textbox", { name: "Project Name" });
    fireEvent.pointerDown(field, { pointerType: "touch" });
    expect(fireEvent.contextMenu(field)).toBe(true);
    expect(fireEvent.keyDown(field, { key: "F1" })).toBe(false);
    expect(tips()).toEqual([]);
  });
});

describe("an icon-only control", () => {
  it("shows its name in a tooltip on hover and focus, and adds no second description for assistive technology", () => {
    renderWithUi(ui, <IconButton control={ui.control(UNDO)} icon="<" />);
    const [tip] = tips();
    expect(tip?.textContent).toBe("Undo");
    expect(tip?.hidden).toBe(true);
    const button = screen.getByRole("button", { name: "Undo", description: "" });
    expect(button.hasAttribute("aria-describedby")).toBe(false);
    hover(button);
    expect(tip?.hidden).toBe(false);
    fireEvent.pointerOut(button, { pointerType: "mouse", relatedTarget: document.body });
    expect(tip?.hidden).toBe(true);
    act(() => button.focus());
    expect(tip?.hidden).toBe(false);
  });
});

describe("a control with an assigned shortcut", () => {
  it("shows the shortcut on hover, keyboard focus, the help key and a long press, and Escape dismisses it", () => {
    bindSaveShortcut();
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const tip = tips()[0];
    expect(tip?.textContent).toContain("Shortcut: Ctrl+S");
    const button = save();
    hover(button);
    expect(tip?.hidden).toBe(false);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(tip?.hidden).toBe(true);
    fireEvent.pointerOut(button, { pointerType: "mouse", relatedTarget: document.body });
    fireEvent.keyDown(button, { key: "F1" });
    expect(tip?.hidden).toBe(false);
    fireEvent.pointerDown(document.body, { pointerType: "mouse" });
    expect(tip?.hidden).toBe(true);
    act(() => button.focus());
    expect(tip?.hidden).toBe(false);
    act(() => button.blur());
    expect(tip?.hidden).toBe(true);
    longPress(button);
    expect(tip?.hidden).toBe(false);
  });

  it("appears when the shortcut is assigned and goes when it is removed", () => {
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    expect(tips()).toEqual([]);
    let unbind = (): void => undefined;
    act(() => {
      unbind = bindSaveShortcut();
    });
    expect(tips()).toHaveLength(1);
    act(() => unbind());
    expect(tips()).toEqual([]);
  });
});

describe("a catalog entry that sets showHelp", () => {
  it("shows its help text in the tooltip and the description, and shows nothing else for an ordinary entry beside it", () => {
    const helped = { ...ui.control(SAVE), showHelp: true };
    renderWithUi(
      ui,
      <>
        <Button control={helped} />
        <IconButton control={ui.control(UNDO)} icon="<" />
      </>,
    );
    const tip = tips().find((candidate) => candidate.getAttribute("data-help-for") === SAVE);
    expect(tip?.textContent).toContain("Save the project draft");
    expect(screen.getByRole("button", { name: "Save Project", description: /Save the project draft/ })).toBeTruthy();
    expect(tips().map((candidate) => candidate.getAttribute("data-help-for"))).toEqual([SAVE, UNDO]);
    act(() => save().focus());
    expect(tip?.hidden).toBe(false);
  });
});

describe("blocks that only present information", () => {
  const helped = { passive: true, id: "tools", label: "Editing tools", help: "Tools for the open project", showHelp: true } as const;
  const unhelped = { passive: true, id: "tools", label: "Editing tools", help: "Tools for the open project" } as const;
  const catalog = (): ReturnType<TestUi["control"]> => ui.control(CONNECTION);

  it("describes a toolbar only when its descriptor or catalog entry sets showHelp", () => {
    renderWithUi(
      ui,
      <>
        <Toolbar described={unhelped}>
          <span />
        </Toolbar>
        <Toolbar described={catalog()}>
          <span />
        </Toolbar>
      </>,
    );
    expect(screen.getAllByRole("toolbar").map((toolbar) => toolbar.getAttribute("aria-description"))).toEqual([null, null]);
    cleanup();
    renderWithUi(
      ui,
      <>
        <Toolbar described={helped}>
          <span />
        </Toolbar>
        <Toolbar described={{ ...catalog(), showHelp: true }}>
          <span />
        </Toolbar>
      </>,
    );
    expect(screen.getAllByRole("toolbar").map((toolbar) => toolbar.getAttribute("aria-description"))).toEqual([helped.help, catalog().tooltip]);
  });

  it("describes a progress bar only when its descriptor or catalog entry sets showHelp", () => {
    renderWithUi(
      ui,
      <>
        <Progress described={unhelped} fraction={0.5} />
        <Progress described={catalog()} fraction={0.5} />
      </>,
    );
    for (const bar of screen.getAllByRole("progressbar")) expect(bar.hasAttribute("aria-describedby")).toBe(false);
    expect(screen.queryByText(unhelped.help)).toBeNull();
    expect(screen.queryByText(catalog().tooltip)).toBeNull();
    cleanup();
    renderWithUi(ui, <Progress described={{ ...catalog(), showHelp: true }} fraction={0.5} />);
    screen.getByRole("progressbar", { name: "Connection", description: catalog().tooltip });
  });

  it("describes a status only when its descriptor or catalog entry sets showHelp", () => {
    renderWithUi(ui, <StatusIndicator described={unhelped} tone="success" text="Ready" />);
    expect(screen.getByRole("status", { name: "Editing tools", description: "" }).hasAttribute("aria-describedby")).toBe(false);
    expect(screen.queryByText(unhelped.help)).toBeNull();
    cleanup();
    renderWithUi(ui, <StatusIndicator described={helped} tone="success" text="Ready" />);
    screen.getByRole("status", { name: "Editing tools", description: helped.help });
  });
});

describe("a notice titled from a catalog control", () => {
  it("shows the control's label and the owner's message, never the catalog help text", () => {
    const control = ui.control(SAVE);
    renderWithUi(ui, <Toast id="notice" title={control.label} message="Saving is paused." tone="information" onDismiss={() => undefined} />);
    const toast = document.querySelector(".ui-toast");
    expect(toast?.textContent).toContain(`Note: ${control.label}`);
    expect(toast?.textContent).toContain("Saving is paused.");
    expect(toast?.textContent).not.toContain(control.tooltip);
  });

  it("refuses a blank message or a blank title instead of showing an empty notice, and takes no descriptor", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(() => renderWithUi(ui, <Toast id="n" title="Save Project" message="  " tone="information" onDismiss={() => undefined} />)).toThrowError(
        expect.objectContaining({ code: "message-missing" }),
      );
      expect(() => renderWithUi(ui, <Toast id="n" title=" " message="Saving is paused." tone="information" onDismiss={() => undefined} />)).toThrowError(
        expect.objectContaining({ code: "name-missing" }),
      );
      // @ts-expect-error A toast takes its own title and message, not a descriptor whose help text may be withheld.
      expect(() => renderWithUi(ui, <Toast id="n" described={ui.control(SAVE)} tone="information" onDismiss={() => undefined} />)).toThrow();
    } finally {
      quiet.mockRestore();
    }
  });
});
