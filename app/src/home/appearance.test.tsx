/** See homeTestSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureBaseTokens, fixturePresetTokens, stringToken } from "../theme/fixtures";
import { SCOPE_IDS } from "../theme";
import { SPLASH } from "./homeLayout";
import { healthyHome, renderApp, type TestHome } from "./homeTestSupport";

const SURFACE = "--color-surface-app";
const FOCUS = "--color-interaction-focus";

let unbind: (() => void) | null = null;

async function openSplash(home: TestHome = healthyHome()): Promise<TestHome> {
  unbind = renderApp(home).unbind;
  await screen.findByRole("heading", { level: 1 });
  // Input listeners attach in an effect that React may still be holding when the heading first appears.
  await act(async () => undefined);
  return home;
}

afterEach(() => {
  cleanup();
  unbind?.();
  unbind = null;
  document.documentElement.removeAttribute("style");
});

const select = (): HTMLSelectElement => {
  const found = document.querySelector<HTMLSelectElement>(`select[data-control-id="${SPLASH.appearance}"]`);
  if (!found) throw new Error("The appearance control is not on screen.");
  return found;
};
const rootVariable = (name: string): string => document.documentElement.style.getPropertyValue(name);

/** The editor tokens a preset gives, which the home scope inherits; read from the pinned defaults file. */
function expectedToken(presetId: string, token: string): string {
  return stringToken({ ...fixtureBaseTokens("editor"), ...fixturePresetTokens(presetId, "editor") }, token);
}

function otherPreset(home: TestHome): { id: string; label: string } {
  const other = home.manager.listPresets().find((preset) => preset.id !== home.manager.getSnapshot("home").themeId);
  if (!other) throw new Error("The defaults must ship at least two presets.");
  return other;
}

describe("the appearance control", () => {
  it("lists every preset the theme manager offers and shows the one in use", async () => {
    const home = await openSplash();
    expect([...select().options].map((option) => [option.value, option.textContent])).toEqual(
      home.manager.listPresets().map((preset) => [preset.id, preset.label]),
    );
    expect(select().value).toBe(home.manager.getSnapshot("home").themeId);
  });

  it("switches every scope, the document variables and the shown value together, without rebuilding the screen", async () => {
    const home = await openSplash();
    const target = otherPreset(home);
    const heading = screen.getByRole("heading", { level: 1 });
    const selectBefore = select();
    const surfaceBefore = rootVariable(SURFACE);
    const focusBefore = rootVariable(FOCUS);
    expect(surfaceBefore).toBe(expectedToken(home.manager.getSnapshot("home").themeId, "color.surface.app"));

    fireEvent.change(select(), { target: { value: target.id } });
    await waitFor(() => expect(select().value).toBe(target.id));

    expect(rootVariable(SURFACE)).toBe(expectedToken(target.id, "color.surface.app"));
    expect(rootVariable(FOCUS)).toBe(expectedToken(target.id, "color.interaction.focus"));
    expect(rootVariable(SURFACE)).not.toBe(surfaceBefore);
    expect(rootVariable(FOCUS)).not.toBe(focusBefore);
    expect(SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope).themeId)).toEqual(SCOPE_IDS.map(() => target.id));
    expect(select()).toBe(selectBefore);
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading);
    const announced = screen.getAllByRole("status").find((region) => region.closest(".ui-visually-hidden") !== null);
    expect(announced?.textContent).toBe(`Appearance is now ${target.label}.`);
  });

  it("keeps the old value and the old colors, and says so, when the theme manager does not confirm", async () => {
    const home = await openSplash();
    const target = otherPreset(home);
    const before = home.manager.getSnapshot("home").themeId;
    const surfaceBefore = rootVariable(SURFACE);
    vi.spyOn(home.manager, "selectPreset").mockReturnValue({
      ok: false,
      errors: [{ code: "out-of-range", token: "color.text.primary", message: "Refused for the test." }],
    });

    fireEvent.change(select(), { target: { value: target.id } });
    await waitFor(() => expect(select().getAttribute("data-state")).toBe("recoverable-error"));

    expect(select().value).toBe(before);
    expect(rootVariable(SURFACE)).toBe(surfaceBefore);
    expect(document.querySelector(".ui-state-text")?.textContent).toBe(`Appearance could not be changed to ${target.label}. Your current look is unchanged.`);
  });

  it("tells the user the choice is not kept after closing the app", async () => {
    await openSplash();
    const section = select().closest("section");
    expect(section?.textContent).toContain("Your choice is not saved after you close MudMaker yet.");
  });
});
