import { afterEach, describe, expect, it, vi } from "vitest";
import defaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager, SCOPE_IDS, USER_THEME_SCHEMA } from "../theme";
import { PreferencesStore, type PreferencesDocument } from "./PreferencesStore";
import { ClientProfileBook } from "./ClientProfileBook";
import { APPEARANCE_KEY, APPEARANCE_VERSION, LEGACY_THEMES_KEY, PREFERENCES_VERSION, SAVE_DEBOUNCE_MS, SCOPE_NAMESPACE } from "./prefsConfig";

afterEach(() => vi.useRealTimers());
describe("application appearance persistence", () => {
  it("reconciles legacy choices in priority order, retains exactly one untouched backup and restores the new global selection", async () => {
    vi.useFakeTimers();
    const manager = new ThemeManager(defaults);
    const first = manager.listPresets()[0]?.id;
    const second = manager.listPresets()[1]?.id;
    const legacy = {
      home: { presetId: first, userTheme: null, overrides: {} },
      editor: { presetId: second, userTheme: { schema: USER_THEME_SCHEMA, id: "authored", tokens: { "color.text.muted": "#123456" } }, overrides: { "font.size.body": 19 }, future: { exact: "kept" } },
      client: { presetId: second },
    };
    const serializedLegacy = JSON.stringify(legacy);
    const saved = { version: PREFERENCES_VERSION, ...Object.fromEntries(Object.entries(legacy).map(([scope, theme]) => [SCOPE_NAMESPACE[scope as keyof typeof SCOPE_NAMESPACE], { theme }])) };
    const original = JSON.stringify(saved);
    let written: PreferencesDocument | undefined;
    const reports: string[] = [];
    const makeStore = (read: unknown) => new PreferencesStore({ bridge: { read: async () => read, write: async (document) => { written = document; } }, profiles: new ClientProfileBook([]), report: (record) => reports.push(record.code) });
    const store = makeStore(saved);
    await store.restore(manager);
    expect(SCOPE_IDS.map((scope) => manager.getInputs(scope).presetId)).toEqual(SCOPE_IDS.map(() => first));
    expect(reports).toContain("preferences-appearance-reconciled");
    expect(JSON.stringify(saved)).toBe(original);
    const unbind = store.bind(manager);
    expect(manager.selectApplicationPreset(second ?? "").ok).toBe(true);
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    const global = written?.[SCOPE_NAMESPACE.home] as Record<string, unknown>;
    expect(global[APPEARANCE_KEY]).toEqual({ version: APPEARANCE_VERSION, presetId: second });
    expect(JSON.stringify((global[LEGACY_THEMES_KEY] as { themes: unknown }).themes)).toBe(serializedLegacy);
    unbind();
    const fresh = new ThemeManager(defaults);
    const restored = makeStore(written);
    await restored.restore(fresh);
    expect(SCOPE_IDS.map((scope) => fresh.getInputs(scope).presetId)).toEqual(SCOPE_IDS.map(() => second));
    const stop = restored.bind(fresh);
    expect(fresh.selectApplicationPreset(first ?? "").ok).toBe(true);
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect((written?.[SCOPE_NAMESPACE.home] as Record<string, unknown>)[LEGACY_THEMES_KEY]).toEqual(global[LEGACY_THEMES_KEY]);
    stop();
  });
});
