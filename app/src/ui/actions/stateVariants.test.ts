import { describe, expect, it } from "vitest";
import { CONTROL_STATES, type ControlState } from "./ActionBus";
import { shownState } from "./stateVariants";
import type { ControlDescriptor } from "./types";

function withVariants(...stateVariants: string[]): ControlDescriptor {
  return {
    id: "editor.test.01",
    workspace: "editor",
    surface: "editor.test",
    kind: "button",
    label: "Label",
    tooltip: "Explains what this does",
    showHelp: false,
    actionId: "ui.test.save",
    stateOwner: "EditorState",
    permission: "localUser",
    visibleWhen: "surfaceActive",
    enabledWhen: "authorizedAndReady",
    stateVariants,
    keyboard: "focusAndActivate",
    testId: "UI-editor-test-01",
  };
}

describe("shownState", () => {
  const catalogStyle = withVariants("ready", "disabled", "pending", "error");

  it("shows listed states as they are and reads the catalog word error as recoverable-error", () => {
    const shown = (state: ControlState): ControlState => shownState(catalogStyle, state);
    expect(shown("ready")).toBe("ready");
    expect(shown("pending")).toBe("pending");
    expect(shown("disabled")).toBe("disabled");
    expect(shown("recoverable-error")).toBe("recoverable-error");
  });

  it("shows a failure it cannot name as its error variant, and unlisted success or other states as ready", () => {
    expect(shownState(catalogStyle, "denied")).toBe("recoverable-error");
    expect(shownState(catalogStyle, "validation-error")).toBe("recoverable-error");
    expect(shownState(catalogStyle, "unavailable")).toBe("recoverable-error");
    expect(shownState(catalogStyle, "success")).toBe("ready");
    expect(shownState(withVariants("visible", "empty", "loading", "error"), "pending")).toBe("ready");
  });

  it("shows a state the control lists by its own name", () => {
    const named = withVariants("ready", "success", "denied");
    expect(shownState(named, "success")).toBe("success");
    expect(shownState(named, "denied")).toBe("denied");
    expect(shownState(named, "unavailable")).toBe("ready");
  });

  it("returns only states from the machine", () => {
    for (const state of CONTROL_STATES) expect(CONTROL_STATES).toContain(shownState(catalogStyle, state));
  });
});
