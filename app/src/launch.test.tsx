/** See home/homeTestSupport.tsx for what jsdom cannot prove: this checks order, not what the eye sees on the first frame. */
import { afterEach, describe, expect, it, vi } from "vitest";
import themeDefaults from "../../contracts/ui/v1/theme-defaults.v1.json";
import { launch } from "./launch";
import { PreferencesStore, type PreferencesBridge } from "./prefs";
import { PREFERENCES_VERSION, SCOPE_NAMESPACE } from "./prefs/prefsConfig";
import { ThemeManager, cssVariableName } from "./theme";

afterEach(() => document.documentElement.removeAttribute("style"));

describe("launching with a saved appearance", () => {
  it("draws nothing until the saved choice has been read, then the first screen already uses it", async () => {
    const reference = new ThemeManager(themeDefaults);
    const saved = reference.listPresets().find((preset) => preset.id !== reference.getSnapshot("home").themeId)?.id ?? "";
    expect(saved).not.toBe("");
    const expected = new ThemeManager(themeDefaults);
    expect(expected.selectPreset("home", saved).ok).toBe(true);
    const probe = Object.keys(expected.getSnapshot("home").tokens).find((token) => expected.getSnapshot("home").tokens[token] !== reference.getSnapshot("home").tokens[token]) ?? "";
    expect(probe, "the two presets must differ in some token").not.toBe("");

    let deliver: (document: unknown) => void = () => undefined;
    const bridge: PreferencesBridge = { read: () => new Promise((resolve) => (deliver = resolve)), write: () => Promise.resolve() };
    const manager = new ThemeManager(themeDefaults);
    const seenAtFirstDraw: { themeId: string; value: string }[] = [];
    const mount = vi.fn(() => {
      seenAtFirstDraw.push({ themeId: manager.getSnapshot("home").themeId, value: document.documentElement.style.getPropertyValue(cssVariableName(probe)) });
    });
    const launching = launch({ preferences: new PreferencesStore({ bridge, report: () => undefined }), manager, window, mount });

    await Promise.resolve();
    expect(mount).not.toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue(cssVariableName(probe))).toBe("");

    deliver({ version: PREFERENCES_VERSION, [SCOPE_NAMESPACE.home]: { theme: { presetId: saved } } });
    await launching;
    expect(mount).toHaveBeenCalledTimes(1);
    expect(seenAtFirstDraw[0]?.themeId).toBe(saved);
    expect(seenAtFirstDraw[0]?.value).not.toBe("");
    expect(seenAtFirstDraw[0]?.value).not.toBe(String(reference.getSnapshot("home").tokens[probe]));
  });

  it("still draws the first screen with the defaults when the saved settings cannot be read", async () => {
    const bridge: PreferencesBridge = { read: () => Promise.reject({ code: "preferences_unreadable", message: "No folder." }), write: () => Promise.resolve() };
    const manager = new ThemeManager(themeDefaults);
    const mount = vi.fn();
    await launch({ preferences: new PreferencesStore({ bridge, report: () => undefined }), manager, window, mount });
    expect(mount).toHaveBeenCalledTimes(1);
    expect(manager.getSnapshot("home").themeId).toBe(new ThemeManager(themeDefaults).getSnapshot("home").themeId);
  });
});
