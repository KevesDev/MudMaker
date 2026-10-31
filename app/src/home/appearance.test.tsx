/** See homeTestSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import { fixtureBaseTokens, fixturePresetTokens, stringToken } from "../theme/fixtures";
import { SCOPE_IDS } from "../theme";
import { uiCopy } from "../ui";
import { APPEARANCE, SPLASH } from "./homeLayout";
import { healthyHome, liveAnnouncements, renderApp, type TestHome } from "./homeTestSupport";

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
  document.documentElement.removeAttribute("data-input-modality");
});

const catalogEntry = (id: string): { readonly label: string; readonly testId: string } => {
  const found = homeCatalog.controls.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No home control ${id}`);
  return found;
};
const settingsLabel = catalogEntry(SPLASH.settings).label;
const appearanceLabel = catalogEntry(APPEARANCE).label;
const opener = (): HTMLElement => screen.getByRole("button", { name: settingsLabel });
/** Activating Settings asks the home router, and the menu opens once it answers. */
const openMenu = async (): Promise<HTMLElement> => {
  fireEvent.click(opener());
  return screen.findByRole("menu", { name: settingsLabel });
};
const choices = (): HTMLElement[] => within(screen.getByRole("group", { name: appearanceLabel })).getAllByRole("menuitemradio");
const choiceFor = (label: string): HTMLElement => within(screen.getByRole("group", { name: appearanceLabel })).getByRole("menuitemradio", { name: label });
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

const marked = (): string[] => choices().filter((item) => item.getAttribute("aria-checked") === "true").map((item) => item.getAttribute("data-value") ?? "");

describe("the Settings menu", () => {
  it("opens from the Settings button with Appearance, lists every preset the theme manager offers and marks the one in use", async () => {
    const home = await openSplash();
    expect(screen.queryByRole("menu")).toBeNull();
    await openMenu();
    expect(opener().getAttribute("aria-expanded")).toBe("true");
    expect(choices().map((item) => [item.getAttribute("data-value"), item.textContent?.replace(uiCopy.chosenMark, "")])).toEqual(
      home.manager.listPresets().map((preset) => [preset.id, preset.label]),
    );
    expect(marked()).toEqual([home.manager.getSnapshot("home").themeId]);
    expect(choices().filter((item) => item.textContent?.includes(uiCopy.chosenMark))).toHaveLength(1);
    expect(screen.getByRole("group", { name: appearanceLabel }).getAttribute("data-testid")).toBe(catalogEntry(APPEARANCE).testId);
    expect(document.activeElement).toBe(choiceFor(home.manager.listPresets().find((preset) => preset.id === marked()[0])?.label ?? ""));
  });

  it("closes on Escape without changing anything and returns focus to the Settings button", async () => {
    const home = await openSplash();
    const before = SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope).themeId);
    await openMenu();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(opener());
    expect(SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope).themeId)).toEqual(before);
  });

  describe("arrow keys", () => {
    /** The two built-in presets in the order the theme manager lists them. */
    const first = 0;
    const second = 1;

    it.each([
      ["ArrowDown", first, second],
      ["ArrowUp", second, first],
      ["Home", second, first],
    ])("%s from preset %i moves focus to preset %i", async (key, from, to) => {
      const home = healthyHome();
      const presets = home.manager.listPresets();
      expect(presets).toHaveLength(2);
      for (const scope of SCOPE_IDS) expect(home.manager.selectPreset(scope, presets[from]?.id ?? "").ok).toBe(true);
      await openSplash(home);
      await openMenu();
      expect(document.activeElement).toBe(choiceFor(presets[from]?.label ?? ""));
      fireEvent.keyDown(document.activeElement ?? document.body, { key });
      expect(document.activeElement).toBe(choiceFor(presets[to]?.label ?? ""));
    });
  });

  it("lists the other Settings entries after the presets, so End leaves the presets", async () => {
    await openSplash();
    await openMenu();
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "End" });
    expect(menu.contains(document.activeElement)).toBe(true);
    expect(document.activeElement?.getAttribute("role")).toBe("menuitem");
  });

  it("opens through the home router: the Settings control returns to ready and nothing is announced or logged", async () => {
    const home = await openSplash();
    const logged = home.records.length;
    await openMenu();
    expect(opener().getAttribute("data-state")).toBe("ready");
    expect(liveAnnouncements("Done")).toEqual([]);
    expect(home.records).toHaveLength(logged);
  });

  it("closes again when Settings is activated a second time", async () => {
    await openSplash();
    await openMenu();
    fireEvent.click(opener());
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("switches every scope, the document variables and the mark together, closes, returns focus and announces once", async () => {
    const home = await openSplash();
    const target = otherPreset(home);
    const heading = screen.getByRole("heading", { level: 1 });
    const surfaceBefore = rootVariable(SURFACE);
    const focusBefore = rootVariable(FOCUS);
    expect(surfaceBefore).toBe(expectedToken(home.manager.getSnapshot("home").themeId, "color.surface.app"));

    await openMenu();
    fireEvent.click(choiceFor(target.label));
    await waitFor(() => expect(home.manager.getSnapshot("home").themeId).toBe(target.id));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    expect(rootVariable(SURFACE)).toBe(expectedToken(target.id, "color.surface.app"));
    expect(rootVariable(FOCUS)).toBe(expectedToken(target.id, "color.interaction.focus"));
    expect(rootVariable(SURFACE)).not.toBe(surfaceBefore);
    expect(rootVariable(FOCUS)).not.toBe(focusBefore);
    expect(SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope).themeId)).toEqual(SCOPE_IDS.map(() => target.id));
    expect(document.activeElement).toBe(opener());
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading);
    expect(liveAnnouncements(`Appearance is now ${target.label}.`)).toHaveLength(0);

    await openMenu();
    expect(marked()).toEqual([target.id]);
  });

  it("marks only a confirmed choice: a refusal leaves the old mark and colors, puts every scope back and says so once", async () => {
    const home = await openSplash();
    const target = otherPreset(home);
    const before = SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope).themeId);
    const surfaceBefore = rootVariable(SURFACE);
    const select = home.manager.selectPreset.bind(home.manager);
    const refused = SCOPE_IDS[2];
    vi.spyOn(home.manager, "selectPreset").mockImplementation((scope, presetId) =>
      scope === refused && presetId === target.id
        ? { ok: false, errors: [{ code: "out-of-range", token: "color.text.primary", message: "Refused for the test." }] }
        : select(scope, presetId),
    );

    await openMenu();
    fireEvent.click(choiceFor(target.label));
    const message = `Appearance could not be changed to ${target.label}. Your current look is unchanged.`;
    await waitFor(() => expect(document.querySelector(".ui-toast")?.textContent).toContain(message));

    expect(SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope).themeId)).toEqual(before);
    expect(rootVariable(SURFACE)).toBe(surfaceBefore);
    expect(document.querySelectorAll(".ui-toast")).toHaveLength(1);
    expect(document.querySelector(".ui-toast-code")?.textContent).toBe("Reference: appearance-not-applied");
    expect(liveAnnouncements(message)).toHaveLength(1);
    await openMenu();
    expect(marked()).toEqual([before[0]]);
  });

  it("clears the failure message when it is dismissed and keeps focus on the Settings button", async () => {
    const home = await openSplash();
    const target = otherPreset(home);
    vi.spyOn(home.manager, "selectPreset").mockReturnValue({
      ok: false,
      errors: [{ code: "out-of-range", token: "color.text.primary", message: "Refused for the test." }],
    });
    await openMenu();
    fireEvent.click(choiceFor(target.label));
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(1));
    fireEvent.click(within(document.querySelector<HTMLElement>(".ui-toast") as HTMLElement).getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(0));
    expect(document.activeElement).toBe(opener());
  });
});
