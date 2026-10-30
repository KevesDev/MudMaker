/** See testSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionOutcome, ActionRequest, HandlerRequest } from "../actions/ActionBus";
import type { PassiveDescriptor } from "../actions/types";
import { AUTOSAVE, CONNECTION, EDITOR, GO_HELP, GO_SETTINGS, GO_TO, LAYOUT, NAME, SAVE, UNDO, createTestUi, renderWithUi, type TestUi } from "../testSupport";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Dropdown } from "./Dropdown";
import { IconButton } from "./IconButton";
import { Menu, openMenuHandler } from "./Menu";
import { Progress } from "./Progress";
import { StatusIndicator } from "./StatusIndicator";
import { Switch } from "./Switch";
import { TextField } from "./TextField";
import { Toast } from "./Toast";
import { Toolbar } from "./Toolbar";
import { UiProvider } from "../UiProvider";

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));
/** Activates a menu opener and waits for the owner's answer, which is what opens the menu. */
async function press(opener: HTMLElement): Promise<void> {
  fireEvent.click(opener);
  await settle();
}
const passive = (id: string, label: string, help: string): PassiveDescriptor => ({ passive: true, id, label, help });

let ui: TestUi;
let requests: ActionRequest[];
let outcome: ActionOutcome;
let hold: Promise<void> | null;
let onHandled: (() => void) | null;
let afterHandled: (() => void) | null;
/** Opens the dialog of the component under test from code, with no user input, as a timer or a message would. */
let openOutside: (() => void) | null;

beforeEach(() => {
  ui = createTestUi();
  requests = [];
  outcome = { status: "success" };
  hold = null;
  onHandled = null;
  afterHandled = null;
  openOutside = null;
  const handle = async ({ signal: _signal, ...request }: HandlerRequest): Promise<ActionOutcome> => {
    requests.push(request);
    onHandled?.();
    if (hold) await hold;
    afterHandled?.();
    return outcome;
  };
  for (const id of ["ui.test.save", "ui.test.undo", "ui.test.rename", "ui.test.autosave", "ui.test.layout"]) {
    ui.runtime.bus.registerHandler(EDITOR, id, handle);
  }
  ui.runtime.bus.registerHandler("WorkspaceNavigator", "ui.nav.settings", handle);
  ui.runtime.bus.registerHandler("WorkspaceNavigator", "ui.nav.help", handle);
  ui.runtime.bus.registerHandler("WorkspaceNavigator", "ui.nav.openMenu", openMenuHandler);
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-input-modality");
});

describe("roles and accessible names", () => {
  it("gives each primitive a role and a name taken from its descriptor", () => {
    renderWithUi(
      ui,
      <>
        <Button control={ui.control(SAVE)} />
        <IconButton control={ui.control(UNDO)} icon="<" />
        <Toolbar described={passive("tools", "Editing tools", "Tools for the open project")}>
          <Button control={ui.control(SAVE)} />
        </Toolbar>
        <Dropdown control={ui.control(LAYOUT)} options={[{ value: "a", label: "Side by side" }]} value="a" />
        <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_SETTINGS)]} />
        <Toast id="saved" title="Saved" message="Your project was saved" tone="success" onDismiss={() => undefined} />
        <Progress described={passive("import", "Importing", "Reading the project package")} fraction={0.5} />
        <StatusIndicator described={ui.control(CONNECTION)} tone="success" text="Connected" />
        <TextField control={ui.control(NAME)} value="Moonhaven" onValueChange={() => undefined} />
        <Switch control={ui.control(AUTOSAVE)} checked={false} />
        <Dialog open title="Rename project" onClose={() => undefined}>
          <p>Body</p>
        </Dialog>
      </>,
    );
    expect(screen.getByRole("dialog", { name: "Rename project" })).toBeTruthy();
    expect(screen.getAllByRole("tooltip", { hidden: true }).map((tip) => tip.textContent)).toEqual(["Undo"]);
    expect(screen.getAllByRole("button", { name: "Save Project" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByRole("toolbar", { name: "Editing tools" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Layout" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go To" }).getAttribute("aria-haspopup")).toBe("menu");
    expect(screen.getByRole("status", { name: "Connection" }).textContent).toContain("Connected");
    expect(screen.getByRole("progressbar", { name: "Importing" }).getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getByRole("textbox", { name: "Project Name" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Autosave" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Done: Saved")).toBeTruthy();
  });

  it("gives a control its catalog test id and its label as the accessible name, with no description", () => {
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const button = screen.getByTestId("UI-editor-toolbar-01");
    expect(button.getAttribute("data-control-id")).toBe(SAVE);
    expect(screen.getByRole("button", { name: "Save Project", description: "" })).toBe(button);
  });

  it("refuses an icon-only control with a blank name, a display-only control, the wrong kind or an unlisted control", () => {
    const quiet = console.error;
    console.error = () => undefined;
    try {
      const blank = { ...ui.control(UNDO), label: "   " };
      expect(() => renderWithUi(ui, <IconButton control={blank} icon="<" />)).toThrowError(expect.objectContaining({ code: "control-name-missing" }));
      expect(() => renderWithUi(ui, <Button control={ui.control(CONNECTION)} />)).toThrowError(expect.objectContaining({ code: "control-passive" }));
      expect(() => renderWithUi(ui, <Button control={ui.control(AUTOSAVE)} />)).toThrowError(expect.objectContaining({ code: "control-kind-mismatch" }));
      const forged = { ...ui.control(SAVE), id: "editor.toolbar.99" };
      expect(() => renderWithUi(ui, <Button control={forged} />)).toThrowError(expect.objectContaining({ code: "control-unregistered" }));
      expect(() => renderWithUi(ui, <Progress described={passive("p", " ", "No name here")} fraction={0} />)).toThrowError(
        expect.objectContaining({ code: "name-missing" }),
      );
    } finally {
      console.error = quiet;
    }
  });

  it("rejects, at compile time, a passive descriptor with no label", () => {
    // @ts-expect-error A passive descriptor must carry a label.
    const unnamed: PassiveDescriptor = { passive: true, id: "x", help: "Only help text" };
    expect(unnamed.id).toBe("x");
  });

  it("must be rendered inside a provider", () => {
    const quiet = console.error;
    console.error = () => undefined;
    try {
      expect(() => render(<Button control={ui.control(SAVE)} />)).toThrowError(expect.objectContaining({ code: "provider-missing" }));
    } finally {
      console.error = quiet;
    }
  });
});

describe("activation and states", () => {
  it("runs the action when the button is clicked and renders the confirmed outcome as text", async () => {
    outcome = { status: "success", message: "Project saved" };
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const button = screen.getByRole("button", { name: "Save Project" });
    expect(button.getAttribute("data-state")).toBe("ready");
    fireEvent.click(button);
    expect(button.getAttribute("data-state")).toBe("pending");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(await screen.findByText("Project saved", { selector: ".ui-state-text" })).toBeTruthy();
    expect(button.getAttribute("data-state")).toBe("success");
    expect(requests).toEqual([{ actionId: "ui.test.save", controlId: SAVE, correlation: {} }]);
  });

  it("ignores rapid double activation while pending and puts the notice in the live region", async () => {
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const button = screen.getByRole("button", { name: "Save Project" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(ui.runtime.announcer.getLast()?.text).toBe("Save Project is already running.");
    expect(screen.getByText("Save Project is already running.")).toBeTruthy();
    await settle();
    expect(requests).toHaveLength(1);
  });

  it("exposes why a control is unavailable in its accessible description and tooltip text, and never runs it", async () => {
    ui.runtime.bus.setDisabled(SAVE, "Open a project first.");
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const button = screen.getByRole("button", { name: "Save Project", description: /Unavailable: Open a project first\./ });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);
    await settle();
    expect(requests).toHaveLength(0);
    const tip = screen.getByRole("tooltip");
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toContain("Unavailable: Open a project first.");
  });

  it("shows the assigned shortcut in the tooltip and leaves the catalog help text out of it", () => {
    ui.shortcut({ scope: "app", chord: "ctrl+s", actionId: "ui.test.save", owner: "test" });
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const tip = screen.getByRole("tooltip", { hidden: true });
    expect(tip.textContent).toContain("Shortcut: Ctrl+S");
    expect(tip.textContent).not.toContain("Save the project draft");
    expect(screen.getByRole("button", { name: "Save Project", description: /Shortcut: Ctrl\+S/ })).toBeTruthy();
  });

  it("unhides the tooltip element on keyboard focus and hides it again on Escape", () => {
    ui.shortcut({ scope: "app", chord: "ctrl+s", actionId: "ui.test.save", owner: "test" });
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const tip = screen.getByRole("tooltip", { hidden: true });
    expect(tip.hidden).toBe(true);
    act(() => screen.getByRole("button", { name: "Save Project" }).focus());
    expect(tip.hidden).toBe(false);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(tip.hidden).toBe(true);
  });

  it.each(["validation-error", "denied", "unavailable", "recoverable-error"] as const)(
    "carries a %s outcome beside a control that lists that state, in words and as its state",
    async (status) => {
      outcome = { status, code: "E-1", message: `Words for ${status}.` };
      renderWithUi(ui, <Button control={ui.control(SAVE)} />);
      const button = screen.getByRole("button", { name: "Save Project" });
      fireEvent.click(button);
      const message = await screen.findByText(`Words for ${status}.`, { selector: ".ui-state-text" });
      expect(message.getAttribute("data-state")).toBe(status);
      expect(button.getAttribute("data-state")).toBe(status);
      expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({ state: status, code: "E-1" });
    },
  );

  it("shows the success message beside a control that lists success, and the pending state while it works", async () => {
    outcome = { status: "success", message: "Project saved" };
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const button = screen.getByRole("button", { name: "Save Project" });
    fireEvent.click(button);
    expect(screen.getByText("Working", { selector: ".ui-state-text" }).getAttribute("data-state")).toBe("pending");
    expect((await screen.findByText("Project saved", { selector: ".ui-state-text" })).getAttribute("data-state")).toBe("success");
  });

  it("reports an action that has no owner as unavailable on the control", async () => {
    const orphan = ui.control("editor.toolbar.03");
    renderWithUi(ui, <Button control={orphan} />);
    fireEvent.click(screen.getByRole("button", { name: "Unowned Tool" }));
    expect(await screen.findByText("Unowned Tool is not available yet.", { selector: ".ui-state-text" })).toBeTruthy();
    expect(ui.runtime.bus.getRuntime("editor.toolbar.03").state).toBe("unavailable");
    expect(screen.getByRole("button", { name: "Unowned Tool" }).getAttribute("data-state")).toBe("recoverable-error");
  });

  it("never shows a state the catalog does not list for the control", async () => {
    renderWithUi(ui, <Button control={ui.control(UNDO)} />);
    const undo = screen.getByRole("button", { name: "Undo" });
    fireEvent.click(undo);
    expect(undo.getAttribute("data-state")).toBe("pending");
    await settle();
    expect(ui.runtime.bus.getRuntime(UNDO).state).toBe("success");
    expect(undo.getAttribute("data-state")).toBe("ready");
    expect(ui.runtime.announcer.getLast()?.text).toBe("Undo: Done");
    outcome = { status: "denied", code: "E-DENIED", message: "You cannot undo here." };
    fireEvent.click(undo);
    expect(await screen.findByText("You cannot undo here.", { selector: ".ui-state-text" })).toBeTruthy();
    expect(undo.getAttribute("data-state")).toBe("recoverable-error");
  });
});

describe("fields and switches", () => {
  function Host({ initial }: { readonly initial: string }) {
    const [value, setValue] = useState(initial);
    return <TextField control={ui.control(NAME)} value={value} onValueChange={setValue} constraints="Use up to 40 characters." />;
  }

  it("keeps what the user typed when the entry is rejected, and renders the reason next to the field", async () => {
    outcome = { status: "validation-error", code: "E-NAME", message: "That name is already used." };
    renderWithUi(ui, <Host initial="Moonhaven" />);
    const field = screen.getByRole("textbox", { name: "Project Name" }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "Moonhaven Two" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(await screen.findByText("That name is already used.", { selector: ".ui-state-text" })).toBeTruthy();
    expect(field.value).toBe("Moonhaven Two");
    expect(requests).toEqual([{ actionId: "ui.test.rename", controlId: NAME, correlation: {}, value: "Moonhaven Two" }]);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("textbox", { name: "Project Name", description: /Use up to 40 characters\.\s*That name is already used\./ })).toBe(field);
  });

  it("does not take typing while the field is unavailable", () => {
    ui.runtime.bus.setDisabled(NAME, "Project is read only.");
    const onChange = vi.fn();
    renderWithUi(ui, <TextField control={ui.control(NAME)} value="Moonhaven" onValueChange={onChange} />);
    const field = screen.getByRole("textbox", { name: "Project Name" }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "x" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(field.readOnly).toBe(true);
  });

  it("sends the opposite value on activation and does not flip until the owner confirms", async () => {
    function Owner() {
      const [on, setOn] = useState(false);
      return (
        <>
          <Switch control={ui.control(AUTOSAVE)} checked={on} />
          <button type="button" onClick={() => setOn(true)}>
            Owner confirms
          </button>
        </>
      );
    }
    renderWithUi(ui, <Owner />);
    const toggle = screen.getByRole("switch", { name: "Autosave" });
    fireEvent.click(toggle);
    await settle();
    expect(requests).toEqual([{ actionId: "ui.test.autosave", controlId: AUTOSAVE, correlation: {}, value: true }]);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Owner confirms" }));
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    await settle();
    expect(requests[1]?.value).toBe(false);
  });

  it("sends a dropdown pick once, through the input manager only, and shows it only after the owner confirms", async () => {
    function Owner() {
      const [layout, setLayout] = useState("side");
      return (
        <>
          <Dropdown
            control={ui.control(LAYOUT)}
            options={[
              { value: "side", label: "Side by side" },
              { value: "stack", label: "Stacked" },
            ]}
            value={layout}
          />
          <button type="button" onClick={() => setLayout("stack")}>
            Owner confirms
          </button>
        </>
      );
    }
    renderWithUi(ui, <Owner />);
    const list = screen.getByRole("combobox", { name: "Layout" }) as HTMLSelectElement;
    fireEvent.change(list, { target: { value: "stack" } });
    await settle();
    expect(requests).toEqual([{ actionId: "ui.test.layout", controlId: LAYOUT, correlation: {}, value: "stack" }]);
    expect(list.value).toBe("side");
    fireEvent.click(screen.getByRole("button", { name: "Owner confirms" }));
    expect(list.value).toBe("stack");
    expect(requests).toHaveLength(1);
  });
});

describe("toolbar and menu", () => {
  it("moves between toolbar buttons with the arrow keys", () => {
    renderWithUi(
      ui,
      <Toolbar described={passive("tools", "Editing tools", "Tools for the open project")}>
        <Button control={ui.control(SAVE)} />
        <IconButton control={ui.control(UNDO)} icon="<" />
      </Toolbar>,
    );
    const save = screen.getByRole("button", { name: "Save Project" });
    save.focus();
    fireEvent.keyDown(save, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Undo" }));
  });

  it("includes a menu opener, a switch and a field among the toolbar stops, and skips the items of an open menu", async () => {
    renderWithUi(
      ui,
      <Toolbar described={passive("tools", "Editing tools", "Tools for the open project")}>
        <Button control={ui.control(SAVE)} />
        <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_SETTINGS), ui.control(GO_HELP)]} />
        <Switch control={ui.control(AUTOSAVE)} checked={false} />
        <IconButton control={ui.control(UNDO)} icon="<" />
      </Toolbar>,
    );
    const stops = ["Save Project", "Go To", "Autosave", "Undo"].map((name) => screen.getByRole(name === "Autosave" ? "switch" : "button", { name }));
    stops[0]?.focus();
    for (const stop of stops.slice(1)) {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "ArrowRight" });
      expect(document.activeElement).toBe(stop);
    }
    fireEvent.keyDown(stops[3] as HTMLElement, { key: "ArrowRight" });
    expect(document.activeElement).toBe(stops[0]);
    fireEvent.keyDown(stops[0] as HTMLElement, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(stops[3]);
    await press(stops[1] as HTMLElement);
    expect(screen.queryByRole("menu")).not.toBeNull();
    stops[0]?.focus();
    fireEvent.keyDown(stops[0] as HTMLElement, { key: "ArrowRight" });
    expect(document.activeElement).toBe(stops[1]);
    fireEvent.keyDown(stops[1] as HTMLElement, { key: "ArrowRight" });
    expect(document.activeElement).toBe(stops[2]);
  });

  it("keeps the menu open and exposes why when a disabled item is chosen", async () => {
    ui.runtime.bus.setDisabled(GO_HELP, "Help is not installed.");
    renderWithUi(ui, <MenuScreen />);
    await press(screen.getByRole("button", { name: "Go To" }));
    const help = screen.getByRole("menuitem", { name: "Help", description: /Unavailable: Help is not installed\./ });
    fireEvent.click(help);
    await settle();
    expect(requests).toHaveLength(0);
    expect(screen.queryByRole("menu")).not.toBeNull();
    const tips = screen.getAllByRole("tooltip");
    expect(tips.filter((tip) => !tip.hidden).map((tip) => tip.textContent)).toEqual([expect.stringContaining("Unavailable: Help is not installed.")]);
    expect(ui.runtime.announcer.getLast()?.text).toBe("Help is not available. Help is not installed.");
  });

  it("keeps the menu open when the chosen item's action is already running", async () => {
    let release: () => void = () => undefined;
    hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    renderWithUi(ui, <MenuScreen />);
    await press(screen.getByRole("button", { name: "Go To" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Help" }));
    expect(screen.queryByRole("menu")).toBeNull();
    await press(screen.getByRole("button", { name: "Go To" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Help" }));
    expect(screen.queryByRole("menu")).not.toBeNull();
    expect(ui.runtime.announcer.getLast()?.text).toBe("Help is already running.");
    release();
    await settle();
    expect(requests).toHaveLength(1);
  });

  it("keeps help showing across the pointer-over and pointer-out events that move from a control onto its help text", () => {
    ui.shortcut({ scope: "app", chord: "ctrl+s", actionId: "ui.test.save", owner: "test" });
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    const button = screen.getByRole("button", { name: "Save Project" });
    const tip = screen.getByRole("tooltip", { hidden: true });
    expect(tip.getAttribute("data-help-for")).toBe(SAVE);
    fireEvent.pointerOver(button, { pointerType: "mouse" });
    expect(tip.hidden).toBe(false);
    fireEvent.pointerOut(button, { pointerType: "mouse", relatedTarget: tip });
    fireEvent.pointerOver(tip, { pointerType: "mouse" });
    expect(tip.hidden).toBe(false);
    fireEvent.pointerOut(tip, { pointerType: "mouse", relatedTarget: document.body });
    expect(tip.hidden).toBe(true);
  });

  function MenuScreen() {
    return (
      <>
        <button type="button">Before</button>
        <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_SETTINGS), ui.control(GO_HELP)]} />
      </>
    );
  }

  it("opens from its button, focuses the first item, moves with arrows and returns focus on Escape", async () => {
    renderWithUi(ui, <MenuScreen />);
    const opener = screen.getByRole("button", { name: "Go To" });
    expect(screen.queryByRole("menu")).toBeNull();
    await press(opener);
    expect(opener.getAttribute("aria-expanded")).toBe("true");
    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["Settings", "Help"]);
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0] as HTMLElement, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1] as HTMLElement, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("runs the chosen item's action, closes, and returns focus to the opener", async () => {
    renderWithUi(ui, <MenuScreen />);
    const opener = screen.getByRole("button", { name: "Go To" });
    await press(opener);
    fireEvent.click(screen.getByRole("menuitem", { name: "Help" }));
    await settle();
    expect(requests).toEqual([{ actionId: "ui.nav.help", controlId: GO_HELP, correlation: {} }]);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes on a press outside without stealing focus, and toggles closed from the opener", async () => {
    renderWithUi(ui, <MenuScreen />);
    const opener = screen.getByRole("button", { name: "Go To" });
    await press(opener);
    fireEvent.pointerDown(opener);
    expect(screen.queryByRole("menu")).not.toBeNull();
    await press(opener);
    expect(screen.queryByRole("menu")).toBeNull();
    await press(opener);
    const before = screen.getByRole("button", { name: "Before" });
    act(() => before.focus());
    fireEvent.pointerDown(before);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(before);
  });
});

describe("dialog", () => {
  function DialogScreen({ destructive = false }: { readonly destructive?: boolean }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open dialog
        </button>
        <Dialog open={open} title="Rename project" description="Pick a new name." destructive={destructive} onClose={() => setOpen(false)}>
          <Button control={ui.control(SAVE)} />
          <Button control={ui.control(UNDO)} />
        </Dialog>
      </>
    );
  }

  it("moves focus into the dialog, traps Tab in both directions, and is named by its title", () => {
    renderWithUi(ui, <DialogScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = screen.getByRole("dialog", { name: "Rename project", description: "Pick a new name." });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const save = within(dialog).getByRole("button", { name: "Save Project" });
    const close = within(dialog).getByRole("button", { name: "Close" });
    expect(document.activeElement).toBe(save);
    close.focus();
    expect(fireEvent.keyDown(close, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(save);
    expect(fireEvent.keyDown(save, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(close);
    close.blur();
    fireEvent.keyDown(document.body, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and returns focus to the opener", async () => {
    renderWithUi(ui, <DialogScreen />);
    const opener = screen.getByRole("button", { name: "Open dialog" });
    opener.focus();
    fireEvent.click(opener);
    await settle();
    expect(screen.queryByRole("dialog")).not.toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes from its Close button through the input manager and restores focus", async () => {
    renderWithUi(ui, <DialogScreen />);
    const opener = screen.getByRole("button", { name: "Open dialog" });
    opener.focus();
    fireEvent.click(opener);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("keeps a destructive dialog open on Escape, offers no Close button, and tells the user to choose", () => {
    renderWithUi(ui, <DialogScreen destructive />);
    const opener = screen.getByRole("button", { name: "Open dialog" });
    fireEvent.click(opener);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(ui.runtime.announcer.getLast()?.text).toBe("Choose one of the options to continue.");
  });

  it("stops global shortcuts reaching the workspace beneath it", async () => {
    ui.shortcut({ scope: "workspace:editor", chord: "Ctrl+S", actionId: "ui.test.save", owner: "editor" });
    const leave = ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace" });
    renderWithUi(ui, <DialogScreen />);
    fireEvent.keyDown(document.body, { key: "s", ctrlKey: true });
    await settle();
    expect(requests).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "s", ctrlKey: true });
    await settle();
    expect(requests).toHaveLength(1);
    leave();
  });
});

describe("toast, progress and status", () => {
  it("gives problems an alert role, spells out the tone, renders the code and dismisses through the input manager", () => {
    const onDismiss = vi.fn();
    renderWithUi(ui, <Toast id="failed" title="Could not save" message="The project folder is read only." tone="error" code="E-SAVE-12" onDismiss={onDismiss} />);
    const toast = screen.getByText("Problem: Could not save").closest<HTMLElement>(".ui-toast");
    if (toast === null) throw new Error("Toast did not render");
    expect(toast.getAttribute("role")).toBe("alert");
    expect(toast.textContent).toContain("Problem: Could not save");
    expect(toast.textContent).toContain("Reference: E-SAVE-12");
    fireEvent.click(within(toast).getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("describes unknown progress in words and rejects a fraction outside 0 to 1", () => {
    renderWithUi(ui, <Progress described={{ ...passive("scan", "Scanning", "Looking for project files"), showHelp: true }} fraction={null} />);
    const bar = screen.getByRole("progressbar", { name: "Scanning", description: "Looking for project files" });
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.getAttribute("aria-valuetext")).toBe("Working");
    cleanup();
    const quiet = console.error;
    console.error = () => undefined;
    try {
      expect(() => renderWithUi(ui, <Progress described={passive("scan", "Scanning", "Looking for project files")} fraction={1.5} />)).toThrowError(
        expect.objectContaining({ code: "progress-range" }),
      );
    } finally {
      console.error = quiet;
    }
  });

  it("shows no hidden help for a status whose catalog entry does not ask for help", () => {
    renderWithUi(ui, <StatusIndicator described={ui.control(CONNECTION)} tone="warning" text="Reconnecting" />);
    const status = screen.getByRole("status", { name: "Connection", description: "" });
    expect(status.hasAttribute("aria-describedby")).toBe(false);
    expect(screen.queryByText("Shows whether the engine is reachable")).toBeNull();
  });

  it("keeps the help text outside the live status element, and still describes the status with it", () => {
    renderWithUi(ui, <StatusIndicator described={{ ...ui.control(CONNECTION), showHelp: true }} tone="warning" text="Reconnecting" />);
    const status = screen.getByRole("status", { name: "Connection", description: "Shows whether the engine is reachable" });
    expect(status.textContent).not.toContain("Shows whether the engine is reachable");
    expect(status.querySelector(".ui-visually-hidden")).toBeNull();
    const help = document.getElementById(status.getAttribute("aria-describedby") ?? "");
    expect(help?.textContent).toBe("Shows whether the engine is reachable");
    expect(help?.closest("[role=status]")).toBeNull();
  });

  it("names the state in words, not only by color", () => {
    renderWithUi(ui, <StatusIndicator described={ui.control(CONNECTION)} tone="warning" text="Reconnecting" />);
    const status = screen.getByRole("status", { name: "Connection" });
    expect(status.textContent).toContain("Connection:");
    expect(status.textContent).toContain("Reconnecting");
    expect(status.getAttribute("data-tone")).toBe("warning");
  });
});

describe("lifecycle and races", () => {
  function Panel({ shown }: { readonly shown: boolean }) {
    return shown ? <Button control={ui.control(SAVE)} /> : null;
  }

  it("lets a running action finish after the control that started it is gone, with no errors and the result shown on return", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let release: () => void = () => undefined;
    hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    outcome = { status: "success", message: "Project saved" };
    const view = renderWithUi(ui, <Panel shown />);
    fireEvent.click(screen.getByRole("button", { name: "Save Project" }));
    expect(ui.runtime.bus.getRuntime(SAVE).state).toBe("pending");
    view.rerender(
      <UiProvider runtime={ui.runtime}>
        <Panel shown={false} />
      </UiProvider>,
    );
    release();
    await settle();
    expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({ state: "success", message: "Project saved" });
    view.rerender(
      <UiProvider runtime={ui.runtime}>
        <Panel shown />
      </UiProvider>,
    );
    expect(screen.getByRole("button", { name: "Save Project" }).getAttribute("data-state")).toBe("success");
    expect(requests).toHaveLength(1);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  function DialogOwner() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open dialog
        </button>
        <Dialog open={open} title="Save options" onClose={() => setOpen(false)}>
          <Button control={ui.control(SAVE)} />
        </Dialog>
      </>
    );
  }

  it("keeps working when the dialog is closed while its action is pending, and gives focus back to the opener", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let release: () => void = () => undefined;
    hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    renderWithUi(ui, <DialogOwner />);
    const opener = screen.getByRole("button", { name: "Open dialog" });
    opener.focus();
    fireEvent.click(opener);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Save Project" }));
    await settle();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(ui.runtime.focus.scopes()).toHaveLength(1);
    release();
    await settle();
    expect(ui.runtime.bus.getRuntime(SAVE).state).toBe("success");
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("explains a permission withdrawn while a dialog is open, keeps the dialog open and never runs the action", async () => {
    renderWithUi(ui, <DialogOwner />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const save = screen.getByRole("button", { name: "Save Project" });
    act(() => ui.runtime.bus.setDisabled(SAVE, "Permission was withdrawn."));
    expect(save.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(save);
    await settle();
    expect(requests).toHaveLength(0);
    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Save Project", description: /Unavailable: Permission was withdrawn\./ })).toBe(save);
    expect(screen.getAllByRole("tooltip").map((tip) => tip.textContent)).toEqual([expect.stringContaining("Permission was withdrawn.")]);
    fireEvent.keyDown(save, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("runs the action once when it is activated again after the screen re-rendered in between", async () => {
    function Counter() {
      const [count, setCount] = useState(0);
      return (
        <>
          <Button control={ui.control(SAVE)} />
          <button type="button" onClick={() => setCount(count + 1)}>
            Redraw {count}
          </button>
        </>
      );
    }
    hold = new Promise<void>((resolve) => setTimeout(resolve));
    renderWithUi(ui, <Counter />);
    const save = screen.getByRole("button", { name: "Save Project" });
    fireEvent.click(save);
    fireEvent.click(screen.getByRole("button", { name: /Redraw/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save Project" }));
    await settle();
    expect(requests).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Save Project" })).toBe(save);
  });

  it("releases its scope when an open menu or dialog is removed", async () => {
    const view = renderWithUi(
      ui,
      <>
        <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_SETTINGS)]} />
        <Dialog open title="Rename project" onClose={() => undefined}>
          <p>Body</p>
        </Dialog>
      </>,
    );
    await press(screen.getByRole("button", { name: "Go To" }));
    expect(ui.runtime.focus.scopes().map((scope) => scope.kind)).toEqual(["app", "dialog", "popup"]);
    view.unmount();
    expect(ui.runtime.focus.scopes().map((scope) => scope.kind)).toEqual(["app"]);
  });
});

describe("Tab inside a menu", () => {
  type Layout = "first" | "middle" | "last";

  /** A destructive dialog has no Close button, so the layout alone decides where the menu opener sits among the stops. */
  function MenuInDialog({ layout }: { readonly layout: Layout }) {
    const [open, setOpen] = useState(false);
    const menu = <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_SETTINGS), ui.control(GO_HELP)]} />;
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open dialog
        </button>
        <Dialog open={open} title="Options" destructive onClose={() => setOpen(false)}>
          {layout === "first" ? menu : null}
          <Button control={ui.control(SAVE)} />
          {layout === "middle" ? menu : null}
          <Button control={ui.control(UNDO)} />
          {layout === "last" ? menu : null}
        </Dialog>
      </>
    );
  }

  async function openMenu(layout: Layout): Promise<{ opener: HTMLElement; item: HTMLElement }> {
    renderWithUi(ui, <MenuInDialog layout={layout} />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const opener = screen.getByRole("button", { name: "Go To" });
    await press(opener);
    expect(ui.runtime.focus.scopes().map((scope) => scope.kind)).toEqual(["app", "dialog", "popup"]);
    const item = screen.getAllByRole("menuitem")[0] as HTMLElement;
    expect(document.activeElement).toBe(item);
    return { opener, item };
  }

  const stop = (name: string): HTMLElement => screen.getByRole("button", { name });
  const afterClose = (): void => {
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(ui.runtime.focus.scopes().map((scope) => scope.kind)).toEqual(["app", "dialog"]);
  };

  it("keeps Shift+Tab inside the dialog when the menu opener is its first stop, wrapping to the last", async () => {
    const { item } = await openMenu("first");
    expect(fireEvent.keyDown(item, { key: "Tab", shiftKey: true })).toBe(false);
    afterClose();
    expect(document.activeElement).toBe(stop("Undo"));
  });

  it("keeps Tab inside the dialog when the menu opener is its last stop, wrapping to the first", async () => {
    const { item } = await openMenu("last");
    expect(fireEvent.keyDown(item, { key: "Tab" })).toBe(false);
    afterClose();
    expect(document.activeElement).toBe(stop("Save Project"));
  });

  it.each([
    ["Tab", false],
    ["Shift+Tab", true],
  ])("leaves %s unprevented, with focus on the opener, when the opener is in the middle of the dialog", async (_name, shiftKey) => {
    const { opener, item } = await openMenu("middle");
    expect(fireEvent.keyDown(item, { key: "Tab", shiftKey })).toBe(true);
    afterClose();
    expect(document.activeElement).toBe(opener);
  });

  it("closes a menu on Tab when there is no dialog, with focus on the opener", async () => {
    renderWithUi(ui, <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_SETTINGS)]} />);
    const opener = screen.getByRole("button", { name: "Go To" });
    await press(opener);
    fireEvent.keyDown(screen.getByRole("menuitem"), { key: "Tab" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

describe("dialogs that open other dialogs and lose their openers", () => {
  function Nested() {
    const [outer, setOuter] = useState(false);
    const [inner, setInner] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOuter(true)}>
          Open outer
        </button>
        <button type="button" onClick={() => setOuter(false)}>
          Force close outer
        </button>
        <Dialog
          open={outer}
          title="Outer"
          onClose={() => {
            setInner(false);
            setOuter(false);
          }}
        >
          <button type="button" onClick={() => setInner(true)}>
            Open inner
          </button>
          <Dialog open={inner} title="Inner" onClose={() => setInner(false)}>
            <Button control={ui.control(SAVE)} />
          </Dialog>
        </Dialog>
      </>
    );
  }

  function openBoth(): { outerOpener: HTMLElement; innerOpener: HTMLElement } {
    const outerOpener = screen.getByRole("button", { name: "Open outer" });
    outerOpener.focus();
    fireEvent.click(outerOpener);
    const innerOpener = screen.getByRole("button", { name: "Open inner" });
    act(() => innerOpener.focus());
    fireEvent.click(innerOpener);
    return { outerOpener, innerOpener };
  }

  const kinds = (): string[] => ui.runtime.focus.scopes().map((scope) => scope.kind);

  it("closes the inner dialog first on Escape and gives focus back one level at a time", async () => {
    renderWithUi(ui, <Nested />);
    const { outerOpener, innerOpener } = openBoth();
    expect(kinds()).toEqual(["app", "dialog", "dialog"]);
    expect(within(screen.getByRole("dialog", { name: "Inner" })).getByRole("button", { name: "Save Project" })).toBe(document.activeElement);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog", { name: "Inner" })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Outer" })).not.toBeNull();
    expect(document.activeElement).toBe(innerOpener);
    expect(kinds()).toEqual(["app", "dialog"]);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(outerOpener);
    expect(kinds()).toEqual(["app"]);
  });

  it.each([
    ["without a workspace region", false],
    ["with a workspace region that could take focus", true],
  ])("returns focus to the outer opener and releases both scopes when the outer dialog closes under the inner one, %s", async (_name, withWorkspace) => {
    renderWithUi(
      ui,
      <div id="workspace" tabIndex={-1}>
        <Nested />
      </div>,
    );
    const leave = withWorkspace
      ? ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace", container: document.getElementById("workspace") as HTMLElement })
      : () => undefined;
    const { outerOpener } = openBoth();
    fireEvent.click(screen.getByRole("button", { name: "Force close outer" }));
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(outerOpener);
    expect(kinds()).toEqual(withWorkspace ? ["app", "workspace"] : ["app"]);
    leave();
  });

  function Region({ container }: { readonly container: "region" | "toolbar" }) {
    const [open, setOpen] = useState(false);
    const [openerShown, setOpenerShown] = useState(true);
    const [toolbarShown, setToolbarShown] = useState(true);
    const opener = openerShown ? (
      <button type="button" onClick={() => setOpen(true)}>
        Open region dialog
      </button>
    ) : null;
    return (
      <>
        <div id="workspace" tabIndex={-1}>
          <button type="button" onClick={() => setOpenerShown(false)}>
            Remove opener
          </button>
          <button type="button" onClick={() => setToolbarShown(false)}>
            Remove toolbar
          </button>
          {container === "region" ? (
            <div id="region" tabIndex={-1}>
              {opener}
            </div>
          ) : null}
          <Dialog open={open} title="Region dialog" onClose={() => setOpen(false)}>
            <p>Body</p>
          </Dialog>
        </div>
        {container === "toolbar" && toolbarShown ? <div id="toolbar">{opener}</div> : null}
      </>
    );
  }

  it("falls back to the nearest ancestor of the opener that can still take focus when the opener is gone", async () => {
    renderWithUi(ui, <Region container="region" />);
    const opener = screen.getByRole("button", { name: "Open region dialog" });
    opener.focus();
    fireEvent.click(opener);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Remove opener" }));
    await settle();
    expect(screen.queryByRole("button", { name: "Open region dialog" })).toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(document.getElementById("region"));
  });

  it("falls back to the workspace region when the opener and everything around it are gone", async () => {
    renderWithUi(ui, <Region container="toolbar" />);
    const workspace = document.getElementById("workspace") as HTMLElement;
    const leave = ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace", container: workspace });
    const opener = screen.getByRole("button", { name: "Open region dialog" });
    opener.focus();
    fireEvent.click(opener);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Remove toolbar" }));
    await settle();
    expect(document.getElementById("toolbar")).toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(workspace);
    leave();
  });

  it("leaves focus alone when it has already moved to somewhere else by the time the dialog closes", async () => {
    renderWithUi(ui, <Region container="region" />);
    const opener = screen.getByRole("button", { name: "Open region dialog" });
    opener.focus();
    fireEvent.click(opener);
    await settle();
    const elsewhere = screen.getByRole("button", { name: "Remove toolbar" });
    act(() => elsewhere.focus());
    await settle();
    fireEvent.keyDown(elsewhere, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(elsewhere);
  });
});

describe("dialogs opened from elsewhere and closed in other orders", () => {
  const kinds = (): string[] => ui.runtime.focus.scopes().map((scope) => scope.kind);

  function Siblings() {
    const [a, setA] = useState(false);
    const [b, setB] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setA(true)}>
          Open A
        </button>
        <button
          type="button"
          onClick={() => {
            setA(false);
            setB(false);
          }}
        >
          Close both
        </button>
        <button type="button" onClick={() => setA(false)}>
          Close only A
        </button>
        <Dialog open={a} title="A" onClose={() => setA(false)}>
          <button type="button" onClick={() => setB(true)}>
            Open B
          </button>
        </Dialog>
        <Dialog open={b} title="B" onClose={() => setB(false)}>
          <Button control={ui.control(SAVE)} />
        </Dialog>
      </>
    );
  }

  function openAThenB(withWorkspace: boolean): { openA: HTMLElement; openB: HTMLElement; leave: () => void } {
    renderWithUi(
      ui,
      <div id="workspace" tabIndex={-1}>
        <Siblings />
      </div>,
    );
    const leave = withWorkspace
      ? ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace", container: document.getElementById("workspace") as HTMLElement })
      : () => undefined;
    const openA = screen.getByRole("button", { name: "Open A" });
    openA.focus();
    fireEvent.click(openA);
    const openB = screen.getByRole("button", { name: "Open B" });
    act(() => openB.focus());
    fireEvent.click(openB);
    expect(kinds()).toEqual(withWorkspace ? ["app", "workspace", "dialog", "dialog"] : ["app", "dialog", "dialog"]);
    return { openA, openB, leave };
  }

  it.each([
    ["without a workspace region", false],
    ["with a workspace region that could take focus", true],
  ])("puts focus on A's opener when sibling dialogs A and B close in one commit, %s", async (_name, withWorkspace) => {
    const { openA, leave } = openAThenB(withWorkspace);
    fireEvent.click(screen.getByRole("button", { name: "Close both" }));
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(openA);
    expect(kinds()).toEqual(withWorkspace ? ["app", "workspace"] : ["app"]);
    leave();
  });

  it.each([
    ["without a workspace region", false],
    ["with a workspace region that could take focus", true],
  ])("restores one level at a time when B closes first and A closes in a later commit, %s", async (_name, withWorkspace) => {
    const { openA, openB, leave } = openAThenB(withWorkspace);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog", { name: "B" })).toBeNull();
    expect(document.activeElement).toBe(openB);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(openA);
    leave();
  });

  it.each([
    ["without a workspace region", false],
    ["with a workspace region that could take focus", true],
  ])("leaves focus inside B when A closes alone, then uses only what is around B's opener when B closes, %s", async (_name, withWorkspace) => {
    const { leave } = openAThenB(withWorkspace);
    const save = within(screen.getByRole("dialog", { name: "B" })).getByRole("button", { name: "Save Project" });
    act(() => save.focus());
    fireEvent.click(screen.getByRole("button", { name: "Close only A" }));
    await settle();
    expect(screen.queryByRole("dialog", { name: "A" })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "B" })).not.toBeNull();
    expect(document.activeElement).toBe(save);
    expect(kinds()).toEqual(withWorkspace ? ["app", "workspace", "dialog"] : ["app", "dialog"]);
    fireEvent.keyDown(save, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    // Nothing is remembered between commits: B's opener is gone with A, so the nearest element around it takes focus.
    expect(document.activeElement).toBe(document.getElementById("workspace"));
    leave();
  });

  it("returns focus to the menu opener when a dialog was opened from one of the menu's items", async () => {
    function FromMenu() {
      const [open, setOpen] = useState(false);
      onHandled = () => setOpen(true);
      return (
        <>
          <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_SETTINGS), ui.control(GO_HELP)]} />
          <Dialog open={open} title="Help pages" onClose={() => setOpen(false)}>
            <p>Body</p>
          </Dialog>
        </>
      );
    }
    renderWithUi(ui, <FromMenu />);
    const trigger = screen.getByRole("button", { name: "Go To" });
    await press(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Help" }));
    await settle();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Help pages" })).not.toBeNull();
    expect(kinds()).toEqual(["app", "dialog"]);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("layers that close in one commit, whatever their order in the tree", () => {
  const kinds = (): string[] => ui.runtime.focus.scopes().map((scope) => scope.kind);
  const WORKSPACE_CASES = [
    ["without a workspace region", false],
    ["with a workspace region that could take focus", true],
  ] as const;

  /** Dialogs A, B and C; each opens the next from inside itself, and the tree lists them in the given order. */
  function Chain({ order, startOpen = [] }: { readonly order: string; readonly startOpen?: readonly string[] }) {
    const [open, setOpen] = useState<Record<string, boolean>>(Object.fromEntries(startOpen.map((name) => [name, true])));
    const set = (name: string, value: boolean): void => setOpen((current) => ({ ...current, [name]: value }));
    const next: Record<string, string | undefined> = { A: "B", B: "C" };
    const dialogs = Object.fromEntries(
      ["A", "B", "C"].map((name) => [
        name,
        <Dialog key={name} open={open[name] === true} title={name} onClose={() => set(name, false)}>
          {next[name] ? (
            <button type="button" onClick={() => set(next[name] ?? "", true)}>
              {`Open ${next[name]}`}
            </button>
          ) : (
            <Button control={ui.control(SAVE)} />
          )}
        </Dialog>,
      ]),
    );
    return (
      <>
        <button type="button" onClick={() => set("A", true)}>
          Open A
        </button>
        <button type="button" onClick={() => setOpen({})}>
          Close all
        </button>
        {[...order].map((name) => dialogs[name])}
      </>
    );
  }

  function openChain(order: string, depth: number, withWorkspace: boolean): { openA: HTMLElement; leave: () => void } {
    renderWithUi(
      ui,
      <div id="workspace" tabIndex={-1}>
        <Chain order={order} />
      </div>,
    );
    const leave = withWorkspace
      ? ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace", container: document.getElementById("workspace") as HTMLElement })
      : () => undefined;
    const openA = screen.getByRole("button", { name: "Open A" });
    openA.focus();
    fireEvent.click(openA);
    for (const name of ["B", "C"].slice(0, depth - 1)) {
      const opener = screen.getByRole("button", { name: `Open ${name}` });
      act(() => opener.focus());
      fireEvent.click(opener);
    }
    expect(screen.getAllByRole("dialog")).toHaveLength(depth);
    return { openA, leave };
  }

  it.each(WORKSPACE_CASES.flatMap(([name, withWorkspace]) => ["AB", "BA"].map((order) => [order, name, withWorkspace] as const)))(
    "puts focus on A's opener when A and B close together, tree order %s, %s",
    async (order, _name, withWorkspace) => {
      const { openA, leave } = openChain(order, 2, withWorkspace);
      fireEvent.click(screen.getByRole("button", { name: "Close all" }));
      await settle();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(openA);
      expect(kinds()).toEqual(withWorkspace ? ["app", "workspace"] : ["app"]);
      leave();
    },
  );

  it.each(WORKSPACE_CASES.flatMap(([name, withWorkspace]) => ["ABC", "CBA", "BAC", "ACB"].map((order) => [order, name, withWorkspace] as const)))(
    "puts focus on A's opener when three chained dialogs close together, tree order %s, %s",
    async (order, _name, withWorkspace) => {
      const { openA, leave } = openChain(order, 3, withWorkspace);
      expect(kinds()).toEqual(withWorkspace ? ["app", "workspace", "dialog", "dialog", "dialog"] : ["app", "dialog", "dialog", "dialog"]);
      fireEvent.click(screen.getByRole("button", { name: "Close all" }));
      await settle();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(openA);
      expect(kinds()).toEqual(withWorkspace ? ["app", "workspace"] : ["app"]);
      leave();
    },
  );

  it.each(WORKSPACE_CASES)("keeps the layers' targets only until the commit has settled, over repeated cycles, %s", async (_name, withWorkspace) => {
    const { openA, leave } = openChain("CBA", 3, withWorkspace);
    for (let cycle = 0; cycle < 4; cycle += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Close all" }));
      expect(ui.runtime.focus.pendingLayers()).toBe(3);
      await settle();
      expect(ui.runtime.focus.pendingLayers()).toBe(0);
      expect(document.activeElement).toBe(openA);
      fireEvent.click(openA);
      for (const name of ["B", "C"]) {
        const opener = screen.getByRole("button", { name: `Open ${name}` });
        act(() => opener.focus());
        fireEvent.click(opener);
      }
    }
    leave();
  });

  it.each(WORKSPACE_CASES)("handles a chain whose first dialog mounts open when effects run twice, then closes it level by level, %s", async (_name, withWorkspace) => {
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();
    // The workspace region exists before the dialogs, so its scope sits beneath theirs as it would in a real shell.
    const workspace = document.createElement("div");
    workspace.id = "workspace";
    workspace.tabIndex = -1;
    document.body.appendChild(workspace);
    const leave = withWorkspace
      ? ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace", container: workspace })
      : () => undefined;
    const pushed = vi.spyOn(ui.runtime.focus, "pushScope");
    renderWithUi(ui, <Chain order="BA" startOpen={["A"]} />, { strict: true, container: workspace });
    await settle();
    // Two pushes for one dialog prove the open path really ran twice.
    expect(pushed.mock.calls.filter(([scope]) => scope.kind === "dialog")).toHaveLength(2);
    const dialogs = (): number => kinds().filter((kind) => kind === "dialog").length;
    expect(ui.runtime.focus.pendingLayers()).toBe(0);
    expect(dialogs()).toBe(1);
    const openB = screen.getByRole("button", { name: "Open B" });
    act(() => openB.focus());
    fireEvent.click(openB);
    await settle();
    expect(dialogs()).toBe(2);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(document.activeElement).toBe(openB);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(document.activeElement).toBe(outside);
    expect(kinds()).toEqual(withWorkspace ? ["app", "workspace"] : ["app"]);
    expect(ui.runtime.focus.pendingLayers()).toBe(0);
    leave();
    outside.remove();
    workspace.remove();
  });

  it("runs the open path once for a dialog that mounts open when effects do not run twice", async () => {
    const pushed = vi.spyOn(ui.runtime.focus, "pushScope");
    renderWithUi(ui, <Chain order="AB" startOpen={["A"]} />);
    await settle();
    expect(pushed.mock.calls.filter(([scope]) => scope.kind === "dialog")).toHaveLength(1);
  });

  it("returns focus to what was focused before a dialog that mounted already open, when effects run twice", async () => {
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();
    function Booted() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} title="Boot" onClose={() => setOpen(false)}>
          <p>Body</p>
        </Dialog>
      );
    }
    renderWithUi(ui, <Booted />, { strict: true });
    await settle();
    expect(ui.runtime.focus.pendingLayers()).toBe(0);
    expect(kinds()).toEqual(["app", "dialog"]);
    expect(screen.getByRole("dialog", { name: "Boot" }).contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});

describe("where focus returns after a dialog whose child takes focus itself", () => {
  function Owner({ children }: { readonly children?: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [first, setFirst] = useState(true);
    return (
      <>
        {first ? (
          <button type="button" onClick={() => setOpen(true)}>
            Open from first
          </button>
        ) : null}
        <button type="button" onClick={() => setOpen(true)}>
          Open from second
        </button>
        <button type="button" onClick={() => setFirst(false)}>
          Remove first
        </button>
        <Dialog open={open} title="Self focusing" onClose={() => setOpen(false)}>
          {children}
        </Dialog>
      </>
    );
  }

  const releases = (): readonly (readonly HTMLElement[])[] => releaseSpy.mock.calls.map((call) => call[1] as readonly HTMLElement[]);
  let releaseSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    releaseSpy = vi.spyOn(Object.getPrototypeOf(ui.runtime.focus) as { releaseLayer: () => void }, "releaseLayer");
  });

  afterEach(() => {
    releaseSpy.mockRestore();
  });

  async function closeWithEscape(): Promise<void> {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
  }

  it("returns focus to the opener when a child focuses itself as the dialog mounts, on the first open", async () => {
    renderWithUi(
      ui,
      <Owner>
        <input aria-label="Name" autoFocus />
      </Owner>,
    );
    const opener = screen.getByRole("button", { name: "Open from first" });
    opener.focus();
    fireEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
    await closeWithEscape();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("uses the opener of each open, not the one from an earlier open", async () => {
    renderWithUi(
      ui,
      <Owner>
        <input aria-label="Name" autoFocus />
      </Owner>,
    );
    const first = screen.getByRole("button", { name: "Open from first" });
    const second = screen.getByRole("button", { name: "Open from second" });
    first.focus();
    fireEvent.click(first);
    await closeWithEscape();
    expect(document.activeElement).toBe(first);
    second.focus();
    fireEvent.click(second);
    await closeWithEscape();
    expect(document.activeElement).toBe(second);
    first.focus();
    fireEvent.click(first);
    await closeWithEscape();
    expect(document.activeElement).toBe(first);
  });

  it("leaves focus on the body when the opener is gone and nothing around it can take focus", async () => {
    renderWithUi(ui, <Owner />);
    const first = screen.getByRole("button", { name: "Open from first" });
    first.focus();
    fireEvent.click(first);
    fireEvent.click(screen.getByRole("button", { name: "Remove first" }));
    expect(first.isConnected).toBe(false);
    await closeWithEscape();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it("sends focus to the workspace region when the opener is gone and nothing around it can take focus", async () => {
    const workspace = document.createElement("div");
    workspace.tabIndex = -1;
    document.body.appendChild(workspace);
    const leave = ui.runtime.focus.pushScope({ key: "workspace:editor", kind: "workspace", container: workspace });
    renderWithUi(ui, <Owner />);
    const first = screen.getByRole("button", { name: "Open from first" });
    first.focus();
    fireEvent.click(first);
    fireEvent.click(screen.getByRole("button", { name: "Remove first" }));
    await closeWithEscape();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(workspace);
    leave();
    workspace.remove();
  });

  it("gives the focus mediator only the chain of the current open, and nothing for a dialog that has closed", async () => {
    renderWithUi(
      ui,
      <Owner>
        <input aria-label="Name" autoFocus />
      </Owner>,
    );
    const first = screen.getByRole("button", { name: "Open from first" });
    const second = screen.getByRole("button", { name: "Open from second" });
    first.focus();
    fireEvent.click(first);
    await closeWithEscape();
    second.focus();
    fireEvent.click(second);
    await closeWithEscape();
    expect(releases().map((chain) => chain[0])).toEqual([first, second]);
    expect(releases().every((chain) => chain.every((node) => node !== document.body))).toBe(true);
    expect(ui.runtime.focus.pendingLayers()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Remove first" }));
    await settle();
    expect(releaseSpy).toHaveBeenCalledTimes(2);
  });

  it("returns focus to the opener when the dialog mounts open with a self-focusing child and effects run twice", async () => {
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();
    function Booted() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} title="Boot" onClose={() => setOpen(false)}>
          <input aria-label="Name" autoFocus />
        </Dialog>
      );
    }
    renderWithUi(ui, <Booted />, { strict: true });
    await settle();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
    await closeWithEscape();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});

/**
 * Imitation only: fireEvent.click never focuses anything, which is how WebKit treats a clicked button. These
 * tests do not show that real WebKit behaves this way; that is a prerequisite for the macOS hands-on check.
 * A dialog opened with no user input in between returns focus to the last activated control.
 */
describe("dialogs opened after a click on a control that takes no focus on click, as WebKit buttons do not", () => {
  /** A catalog control whose action opens a dialog, plus a code hook (openOutside) that opens it with no user input. */
  function FromControl({ hideOnOpen = false, when = "during" }: { readonly hideOnOpen?: boolean; readonly when?: "during" | "after" }) {
    const [open, setOpen] = useState(false);
    const [shown, setShown] = useState(true);
    const openIt = (): void => {
      setOpen(true);
      if (hideOnOpen) setShown(false);
    };
    onHandled = when === "during" ? openIt : null;
    openOutside = openIt;
    // "after" opens from a later task than the handler, as an update made once awaited work has finished is rendered.
    afterHandled = when === "after" ? () => void setTimeout(openIt) : null;
    return (
      <>
        <div id="region" tabIndex={-1}>
          {shown ? <Button control={ui.control(SAVE)} /> : null}
        </div>
        <Dialog open={open} title="Opened" onClose={() => setOpen(false)}>
          <p>Body</p>
        </Dialog>
      </>
    );
  }

  async function closeDialog(): Promise<void> {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await settle();
  }

  const save = (): HTMLElement => screen.getByRole("button", { name: "Save Project" });

  it("returns focus to the activated control, although the click never focused it", async () => {
    renderWithUi(ui, <FromControl />);
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(save());
    await settle();
    expect(screen.queryByRole("dialog", { name: "Opened" })).not.toBeNull();
    await closeDialog();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(save());
  });

  it("still uses the focused control when the key press or click did focus it", async () => {
    renderWithUi(ui, <FromControl />);
    save().focus();
    fireEvent.click(save());
    await settle();
    await closeDialog();
    expect(document.activeElement).toBe(save());
  });

  it("falls back to the nearest element around the control when it was removed as the dialog opened", async () => {
    renderWithUi(ui, <FromControl hideOnOpen />);
    const control = save();
    fireEvent.click(control);
    await settle();
    expect(control.isConnected).toBe(false);
    await closeDialog();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(document.getElementById("region"));
  });

  it("returns a dialog opened later, with no user input in between, to the last activated control", async () => {
    renderWithUi(ui, <FromControl />);
    onHandled = null;
    fireEvent.click(save());
    await settle();
    expect(ui.runtime.bus.getRuntime(SAVE).state).toBe("success");
    act(() => openOutside?.());
    await settle();
    expect(screen.queryByRole("dialog", { name: "Opened" })).not.toBeNull();
    await closeDialog();
    expect(document.activeElement).toBe(save());
  });

  it("does not return a dialog to an earlier activation once a key press has started another interaction", async () => {
    renderWithUi(ui, <FromControl />);
    onHandled = null;
    fireEvent.click(save());
    await settle();
    fireEvent.keyDown(document.body, { key: "a" });
    act(() => openOutside?.());
    await closeDialog();
    expect(document.activeElement).toBe(document.body);
  });

  it("returns focus to the activated control when the handler waits on a resolved promise and then opens the dialog", async () => {
    hold = Promise.resolve();
    renderWithUi(ui, <FromControl when="after" />);
    await act(async () => {
      fireEvent.click(save());
      await settle();
      await settle();
    });
    expect(ui.runtime.bus.getRuntime(SAVE).state).toBe("success");
    expect(screen.queryByRole("dialog", { name: "Opened" })).not.toBeNull();
    await closeDialog();
    expect(document.activeElement).toBe(save());
  });

  it("returns focus to the activated control when the handler waits on a timer and then opens the dialog", async () => {
    vi.useFakeTimers();
    try {
      hold = new Promise<void>((resolve) => setTimeout(resolve, 5000));
      renderWithUi(ui, <FromControl when="after" />);
      fireEvent.click(save());
      expect(screen.queryByRole("dialog")).toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(ui.runtime.bus.getRuntime(SAVE).state).toBe("success");
      expect(screen.queryByRole("dialog", { name: "Opened" })).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
    await closeDialog();
    expect(document.activeElement).toBe(save());
  });

  it("returns focus to the control of a local command that opens a dialog", async () => {
    function FromCommand() {
      const [open, setOpen] = useState(false);
      useEffect(() => ui.runtime.input.registerCommand("test.open.dialog", () => setOpen(true)), []);
      return (
        <>
          <button type="button" data-ui-command="test.open.dialog">
            Open by command
          </button>
          <Dialog open={open} title="Opened" onClose={() => setOpen(false)}>
            <p>Body</p>
          </Dialog>
        </>
      );
    }
    renderWithUi(ui, <FromCommand />);
    const opener = screen.getByRole("button", { name: "Open by command" });
    fireEvent.click(opener);
    await settle();
    expect(screen.queryByRole("dialog", { name: "Opened" })).not.toBeNull();
    await closeDialog();
    expect(document.activeElement).toBe(opener);
  });

  it("does not make an activation the opener once a new press or key has started another interaction", async () => {
    let release: () => void = () => undefined;
    hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    renderWithUi(ui, <FromControl />);
    onHandled = null;
    fireEvent.click(save());
    expect(ui.runtime.bus.getRuntime(SAVE).state).toBe("pending");
    fireEvent.pointerDown(document.body);
    act(() => openOutside?.());
    await closeDialog();
    expect(document.activeElement).toBe(document.body);
    release();
    await settle();
  });

  it("keeps the activated control as the opener for a key press that only changes a modifier", async () => {
    renderWithUi(ui, <FromControl />);
    fireEvent.click(save());
    fireEvent.keyDown(document.body, { key: "Shift", shiftKey: true });
    await settle();
    await closeDialog();
    expect(document.activeElement).toBe(save());
  });
});
