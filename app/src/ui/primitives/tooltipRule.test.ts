import { describe, expect, it } from "vitest";
import type { ControlRuntime } from "../actions/ActionBus";
import { fixtureRegistry, SAVE } from "../testSupport";
import { addsDescription, tooltipContent } from "./tooltipRule";

const ready: ControlRuntime = { state: "ready", message: null, code: null, reason: null };
const disabled: ControlRuntime = { state: "disabled", message: null, code: null, reason: "Open a project first." };
const unavailable: ControlRuntime = { state: "unavailable", message: "Save has no registered owner.", code: "E-NONE", reason: null };
const control = fixtureRegistry().requireControl(SAVE);
const facts = { control, runtime: ready, shortcut: null, iconOnly: false };

describe("tooltip rule", () => {
  it("gives an ordinary labelled control no tooltip, whatever its catalog help text says", () => {
    expect(control.tooltip.length).toBeGreaterThan(0);
    expect(control.showHelp).toBe(false);
    expect(tooltipContent(facts)).toBeNull();
    for (const state of ["pending", "success", "validation-error", "denied", "recoverable-error"] as const) {
      expect(tooltipContent({ ...facts, runtime: { ...ready, state, message: "Something happened." } }), state).toBeNull();
    }
  });

  it("states the specific reason for a disabled control but never repeats a refusal", () => {
    expect(tooltipContent({ ...facts, runtime: disabled })).toEqual({ explanation: null, reason: "Open a project first.", shortcut: null });
    expect(tooltipContent({ ...facts, runtime: unavailable })).toBeNull();
  });

  it("names an icon-only control without describing it a second time", () => {
    const content = tooltipContent({ ...facts, iconOnly: true });
    expect(content).toEqual({ explanation: null, reason: null, shortcut: null });
    expect(content !== null && addsDescription(content)).toBe(false);
  });

  it("shows the assigned shortcut", () => {
    const content = tooltipContent({ ...facts, shortcut: "Ctrl+S" });
    expect(content).toEqual({ explanation: null, reason: null, shortcut: "Ctrl+S" });
    expect(content !== null && addsDescription(content)).toBe(true);
  });

  it("shows the catalog help text only when the entry sets showHelp", () => {
    expect(tooltipContent({ ...facts, control: { ...control, showHelp: true } })).toEqual({ explanation: control.tooltip, reason: null, shortcut: null });
  });

  it("keeps the catalog help text out of a tooltip shown for another reason", () => {
    expect(tooltipContent({ ...facts, runtime: disabled, shortcut: "Ctrl+S" })?.explanation).toBeNull();
  });
});
