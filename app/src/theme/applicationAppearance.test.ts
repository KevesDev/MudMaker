import { describe, expect, it } from "vitest";
import defaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager, SCOPE_IDS, USER_THEME_SCHEMA } from "./index";

describe("atomic application appearance", () => {
  it("validates every affected scope before any committed input, snapshot or notification changes", () => {
    const data = structuredClone(defaults);
    const first = Object.values(data.presets)[0];
    expect(first).toBeDefined();
    Object.assign(first?.scopes.editor.tokens ?? {}, { "color.graph.edge.legacy": "#123456" });
    const manager = new ThemeManager(data);
    expect(manager.setOverrides("client", { "color.text.muted": "{color.graph.edge.legacy}" }).ok).toBe(true);
    const before = SCOPE_IDS.map((scope) => ({ inputs: manager.getInputs(scope), snapshot: manager.getSnapshot(scope) }));
    let notifications = 0;
    SCOPE_IDS.forEach((scope) => manager.subscribe(scope, () => { notifications += 1; }));
    const second = manager.listPresets()[1];
    expect(second).toBeDefined();
    const result = manager.selectApplicationPreset(second?.id ?? "", false);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContainEqual(expect.objectContaining({ code: "alias-target-missing", token: "color.text.muted" }));
    expect(SCOPE_IDS.map((scope) => ({ inputs: manager.getInputs(scope), snapshot: manager.getSnapshot(scope) }))).toEqual(before);
    expect(notifications).toBe(0);
    expect(manager.selectApplicationPreset(second?.id ?? "").ok).toBe(true);
    expect(SCOPE_IDS.map((scope) => manager.getInputs(scope).presetId)).toEqual(SCOPE_IDS.map(() => second?.id));
  });
  it("publishes all committed scopes before the first listener and previews/cancels shared tokens without changing scope-only values", () => {
    const manager = new ThemeManager(defaults);
    const target = manager.listPresets()[1];
    expect(target).toBeDefined();
    manager.subscribe("editor", () => { expect(SCOPE_IDS.every((scope) => manager.getInputs(scope).presetId === target?.id)).toBe(true); });
    expect(manager.selectApplicationPreset(target?.id ?? "").ok).toBe(true);
    const inputs = SCOPE_IDS.map((scope) => manager.getInputs(scope));
    const snapshots = SCOPE_IDS.map((scope) => manager.getSnapshot(scope));
    const client = manager.getEditableTokens("client");
    const document = { schema: USER_THEME_SCHEMA, id: "custom-app", tokens: { ...client, "color.surface.app": "#123456", "text.timestamps": true } };
    expect(manager.previewCustomTheme("client", document).ok).toBe(true);
    for (const scope of SCOPE_IDS) {
      expect(manager.getSnapshot(scope).tokens["color.surface.app"]).toBe("#123456");
      if (scope !== "client") expect(manager.getSnapshot(scope).tokens["text.timestamps"]).toBeUndefined();
    }
    expect(SCOPE_IDS.map((scope) => manager.getInputs(scope))).toEqual(inputs);
    manager.cancelPreview("client");
    expect(SCOPE_IDS.map((scope) => manager.getSnapshot(scope))).toEqual(snapshots);
    expect(manager.saveCustomTheme("client", document).ok).toBe(true);
    expect(SCOPE_IDS.map((scope) => manager.getSnapshot(scope).tokens["color.surface.app"])).toEqual(SCOPE_IDS.map(() => "#123456"));
    expect(manager.getSnapshot("client").tokens["text.timestamps"]).toBe(true);
  });
});
