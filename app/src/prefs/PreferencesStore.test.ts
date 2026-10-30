/** The bridge is a fake with the shell's shape; the file itself is proven by the Rust tests. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { SCOPE_IDS, ThemeManager, USER_THEME_SCHEMA } from "../theme";
import type { UiDiagnostic } from "../ui";
import { PreferencesStore, type PreferencesBridge, type PreferencesDocument } from "./PreferencesStore";
import { PREFERENCES_VERSION, SAVE_DEBOUNCE_MS, SCOPE_NAMESPACE, SHELL_CALL_TIMEOUT_MS } from "./prefsConfig";

interface Harness {
  readonly manager: ThemeManager;
  readonly store: PreferencesStore;
  readonly reports: UiDiagnostic[];
  readonly writes: PreferencesDocument[];
  readonly bridge: { read: ReturnType<typeof vi.fn<PreferencesBridge["read"]>>; write: ReturnType<typeof vi.fn<PreferencesBridge["write"]>> };
}

function harness(saved: unknown = null): Harness {
  const writes: PreferencesDocument[] = [];
  const bridge = {
    read: vi.fn<PreferencesBridge["read"]>(() => Promise.resolve(saved)),
    write: vi.fn<PreferencesBridge["write"]>((document) => {
      writes.push(document);
      return Promise.resolve();
    }),
  };
  const reports: UiDiagnostic[] = [];
  return { manager: new ThemeManager(themeDefaults), store: new PreferencesStore({ bridge, report: (record) => reports.push(record) }), reports, writes, bridge };
}

const reference = new ThemeManager(themeDefaults);
const presetIds = reference.listPresets().map((preset) => preset.id);
/** A preset other than the one a scope starts with, so a restore that did nothing cannot pass. */
const otherPreset = (scope: (typeof SCOPE_IDS)[number]): string => {
  const found = presetIds.find((id) => id !== reference.getSnapshot(scope).themeId);
  if (found === undefined) throw new Error("The defaults need two presets.");
  return found;
};
const doc = (themes: Partial<Record<(typeof SCOPE_IDS)[number], unknown>>, extra: Record<string, unknown> = {}): unknown => ({
  version: PREFERENCES_VERSION,
  ...extra,
  ...Object.fromEntries(Object.entries(themes).map(([scope, theme]) => [SCOPE_NAMESPACE[scope as keyof typeof SCOPE_NAMESPACE], { theme }])),
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("restoring the saved appearance", () => {
  it("applies each scope's own preset, overrides, user theme and text scale, and leaves the other scopes alone", async () => {
    const userTheme = { schema: USER_THEME_SCHEMA, id: "mine", tokens: { "color.text.muted": "#334455" } };
    const { manager, store, reports } = harness(doc({ editor: { presetId: otherPreset("editor"), overrides: { "font.size.body": 16 }, textScale: 1.25 }, client: { presetId: otherPreset("client"), userTheme } }));
    await store.restore(manager);
    expect(manager.getSnapshot("editor").themeId).toBe(otherPreset("editor"));
    expect(manager.getSnapshot("editor").tokens["font.size.body"]).toBe(16 * 1.25);
    expect(manager.getSnapshot("editor").accessibility.textScale).toBe(1.25);
    expect(manager.getSnapshot("client").themeId).toBe("mine");
    expect(manager.getSnapshot("client").tokens["color.text.muted"]).toBe("#334455");
    for (const scope of ["host", "home"] as const) expect(manager.getSnapshot(scope).themeId).toBe(reference.getSnapshot(scope).themeId);
    expect(reports).toEqual([]);
  });

  it("refuses an invalid saved value token by token, keeps the valid ones and the default for the rest, and logs each refusal", async () => {
    const saved = doc({
      home: {
        presetId: "no-such-preset",
        overrides: { "color.text.muted": "#334455", "color.surface.app": "not a colour", "no.such.token": 1, "font.size.body": 16 },
        textScale: 99,
      },
    });
    const { manager, store, reports } = harness(saved);
    await store.restore(manager);
    const home = manager.getSnapshot("home");
    expect(home.themeId).toBe(reference.getSnapshot("home").themeId);
    expect(home.tokens["color.text.muted"]).toBe("#334455");
    expect(home.tokens["font.size.body"]).toBe(16);
    expect(home.tokens["color.surface.app"]).toBe(reference.getSnapshot("home").tokens["color.surface.app"]);
    expect(home.accessibility.textScale).toBe(1);
    const details = reports.map((record) => record.detail ?? "");
    expect(reports).toHaveLength(4);
    expect(reports.every((record) => record.code === "preferences-value-rejected" && record.severity === "warning")).toBe(true);
    for (const field of ["presetId", "overrides.color.surface.app", "overrides.no.such.token", "textScale"]) {
      expect(details.some((detail) => detail.includes(field)), field).toBe(true);
    }
  });

  it("refuses a user theme with a wrong schema as a whole", async () => {
    const { manager, store, reports } = harness(doc({ host: { userTheme: { schema: "other", id: "x", tokens: { "color.text.muted": "#334455" } } } }));
    await store.restore(manager);
    expect(manager.getSnapshot("host").themeId).toBe(reference.getSnapshot("host").themeId);
    expect(manager.getSnapshot("host").tokens["color.text.muted"]).toBe(reference.getSnapshot("host").tokens["color.text.muted"]);
    expect(reports.map((record) => record.code)).toEqual(["preferences-value-rejected"]);
  });

  it.each([
    ["no saved file", null, 0],
    ["a document of another version", { version: PREFERENCES_VERSION + 1 }, 1],
    ["something that is not a document", "text", 1],
  ])("starts from the defaults for %s", async (_name, saved, reported) => {
    const { manager, store, reports } = harness(saved);
    await store.restore(manager);
    for (const scope of SCOPE_IDS) expect(manager.getSnapshot(scope).themeId).toBe(reference.getSnapshot(scope).themeId);
    expect(reports).toHaveLength(reported);
  });

  it("starts from the defaults and logs when the shell fails or never answers", async () => {
    const failing = harness();
    failing.bridge.read.mockRejectedValueOnce({ code: "preferences_unreadable", message: "The settings folder could not be found." });
    await failing.store.restore(failing.manager);
    expect(failing.reports).toEqual([expect.objectContaining({ code: "preferences-read-failed", detail: expect.stringContaining("preferences_unreadable") as unknown })]);

    const hung = harness();
    hung.bridge.read.mockReturnValueOnce(new Promise(() => undefined));
    const restoring = hung.store.restore(hung.manager);
    await vi.advanceTimersByTimeAsync(SHELL_CALL_TIMEOUT_MS);
    await restoring;
    expect(hung.reports.map((record) => record.code)).toEqual(["preferences-read-failed"]);
  });

  it("does not write while restoring", async () => {
    const { manager, store, writes } = harness(doc({ home: { presetId: otherPreset("home") } }));
    store.bind(manager);
    await store.restore(manager);
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 2);
    expect(writes).toEqual([]);
  });
});

describe("saving appearance changes", () => {
  async function bound(saved: unknown = null): Promise<Harness> {
    const parts = harness(saved);
    await parts.store.restore(parts.manager);
    parts.store.bind(parts.manager);
    return parts;
  }

  it("writes once, after the quiet time, with the last choice, every namespace and the keys this build does not own", async () => {
    const { manager, writes } = await bound(doc({}, { "app.global": { language: "en" }, other: { kept: true } }));
    manager.selectPreset("home", presetIds[0] ?? "");
    manager.selectPreset("home", otherPreset("home"));
    manager.setAccessibility("home", { ...manager.getInputs("home").accessibility, textScale: 1.5 });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 1);
    expect(writes).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(writes).toHaveLength(1);
    const saved = writes[0] as Record<string, Record<string, Record<string, unknown>>>;
    expect(saved["version"]).toBe(PREFERENCES_VERSION);
    expect(saved["app.global"]?.["theme"]).toMatchObject({ presetId: otherPreset("home"), textScale: 1.5 });
    expect(saved["app.global"]?.["language"]).toBe("en");
    expect(saved["other"]).toEqual({ kept: true });
    for (const scope of SCOPE_IDS) expect(saved[SCOPE_NAMESPACE[scope]]?.["theme"], scope).toBeDefined();
  });

  it("keeps one write in flight and writes the latest value once that write ends", async () => {
    const { manager, writes, bridge } = await bound();
    let release: () => void = () => undefined;
    bridge.write.mockImplementationOnce((document) => {
      writes.push(document);
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    manager.selectPreset("editor", otherPreset("editor"));
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    manager.selectPreset("editor", reference.getSnapshot("editor").themeId);
    manager.selectPreset("editor", otherPreset("editor"));
    manager.setAccessibility("editor", { ...manager.getInputs("editor").accessibility, textScale: 1.25 });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 3);
    expect(bridge.write).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(bridge.write).toHaveBeenCalledTimes(2);
    expect(writes[1]?.["editor.user"]).toMatchObject({ theme: { presetId: otherPreset("editor"), textScale: 1.25 } });
  });

  it("logs a failed write without blocking, and the next change saves again", async () => {
    const { manager, reports, bridge, writes } = await bound();
    bridge.write.mockRejectedValueOnce({ code: "preferences_unwritable", message: "Settings could not be saved." });
    manager.selectPreset("home", otherPreset("home"));
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(reports).toEqual([expect.objectContaining({ code: "preferences-write-failed", severity: "warning", detail: expect.stringContaining("preferences_unwritable") as unknown })]);
    manager.setAccessibility("home", { ...manager.getInputs("home").accessibility, textScale: 1.5 });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.["app.global"]).toMatchObject({ theme: { presetId: otherPreset("home"), textScale: 1.5 } });
  });

  it("gives up on a write the shell never answers, logs it and can save again", async () => {
    const { manager, reports, bridge } = await bound();
    bridge.write.mockReturnValueOnce(new Promise(() => undefined));
    manager.selectPreset("home", otherPreset("home"));
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS + SHELL_CALL_TIMEOUT_MS);
    expect(reports.map((record) => record.code)).toEqual(["preferences-write-failed"]);
    manager.setAccessibility("home", { ...manager.getInputs("home").accessibility, textScale: 1.5 });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(bridge.write).toHaveBeenCalledTimes(2);
  });

  it("writes nothing for a notification that changed no saved choice", async () => {
    const { manager, bridge } = await bound();
    manager.setAccessibility("home", { ...manager.getInputs("home").accessibility, reducedMotion: !manager.getInputs("home").accessibility.reducedMotion });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 2);
    expect(bridge.write).not.toHaveBeenCalled();
  });

  it("stops saving once unbound", async () => {
    const { manager, store, bridge } = harness();
    await store.restore(manager);
    const stop = store.bind(manager);
    manager.selectPreset("home", otherPreset("home"));
    stop();
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 2);
    expect(bridge.write).not.toHaveBeenCalled();
  });
});
