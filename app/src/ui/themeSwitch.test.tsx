/** See testSupport.tsx for what these tests cannot prove. */
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager, bindThemeToElement } from "../theme";
import { AUTOSAVE, NAME, SAVE, createTestUi, renderWithUi } from "./testSupport";
import { Button } from "./primitives/Button";
import { Dialog } from "./primitives/Dialog";
import { Switch } from "./primitives/Switch";
import { Progress } from "./primitives/Progress";
import { TextField } from "./primitives/TextField";
import { Toast } from "./primitives/Toast";

const FOCUS = "--color-interaction-focus";
const FAST = "--motion-duration-fastMs";

let manager: ThemeManager;
let unbind: () => void;

beforeEach(() => {
  manager = new ThemeManager(themeDefaults);
  unbind = bindThemeToElement(manager, "editor", document.documentElement);
});

afterEach(() => {
  cleanup();
  unbind();
  document.documentElement.removeAttribute("style");
});

describe("theme changes while the shared parts are mounted", () => {
  it("updates the variables they read, keeps the same elements and focus, and raises no errors", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ui = createTestUi();
    renderWithUi(
      ui,
      <>
        <Button control={ui.control(SAVE)} />
        <TextField control={ui.control(NAME)} value="Moonhaven" onValueChange={() => undefined} />
        <Switch control={ui.control(AUTOSAVE)} checked />
        <Progress described={{ passive: true, id: "scan", label: "Scanning", help: "Looking for project files" }} fraction={null} />
        <Toast id="saved" title="Saved" message="Your project was saved" tone="success" onDismiss={() => undefined} />
        <Dialog open title="Settings" onClose={() => undefined}>
          <Button control={ui.control("editor.toolbar.02")} />
        </Dialog>
      </>,
    );
    const nodes = [
      screen.getByRole("button", { name: "Save Project" }),
      screen.getByRole("textbox", { name: "Project Name" }),
      screen.getByRole("switch", { name: "Autosave" }),
      screen.getByRole("dialog", { name: "Settings" }),
      screen.getByRole("progressbar", { name: "Scanning" }),
    ];
    const focused = document.activeElement;
    const before = document.documentElement.style.getPropertyValue(FOCUS);
    expect(before).not.toBe("");

    const other = manager.listPresets().find((preset) => preset.id !== manager.getSnapshot("editor").themeId);
    if (!other) throw new Error("The defaults must ship at least two presets.");
    expect(manager.selectPreset("editor", other.id).ok).toBe(true);

    const after = document.documentElement.style.getPropertyValue(FOCUS);
    expect(after).not.toBe(before);
    expect(after).toBe(String(manager.getSnapshot("editor").tokens["color.interaction.focus"]));
    const current = [
      screen.getByRole("button", { name: "Save Project" }),
      screen.getByRole("textbox", { name: "Project Name" }),
      screen.getByRole("switch", { name: "Autosave" }),
      screen.getByRole("dialog", { name: "Settings" }),
      screen.getByRole("progressbar", { name: "Scanning" }),
    ];
    current.forEach((node, index) => expect(node).toBe(nodes[index]));
    expect(document.activeElement).toBe(focused);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("shortens the motion durations the parts use when reduced motion is switched on", () => {
    const ui = createTestUi();
    renderWithUi(ui, <Button control={ui.control(SAVE)} />);
    expect(document.documentElement.style.getPropertyValue(FAST)).toBe("90ms");
    const result = manager.setAccessibility("editor", { textScale: 1, contrast: "normal", reducedMotion: true });
    expect(result.ok).toBe(true);
    expect(document.documentElement.style.getPropertyValue(FAST)).toBe("0ms");
  });
});
