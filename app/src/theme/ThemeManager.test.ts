import { describe, expect, it, vi } from "vitest";
import {
  fixtureDefaultPresetId,
  fixtureDocument,
  fixturePresetIds,
  fixturePresetLabel,
  fixtureTokens,
  numberToken,
  stringToken,
} from "./fixtures";
import { ThemeManager } from "./ThemeManager";
import { SCOPE_IDS, ThemeDefaultsError, USER_THEME_SCHEMA, type ScopeId } from "./types";
import { FONT_STACK_MAX_LENGTH } from "./validate";

function newManager(): ThemeManager {
  return new ThemeManager(fixtureDocument());
}

function userTheme(id: string, tokens: Record<string, string | number | boolean>): unknown {
  return { schema: USER_THEME_SCHEMA, id, tokens };
}

describe("defaults (AC-01)", () => {
  it("resolves every scope from the pinned file, with home and host inheriting editor", () => {
    const manager = newManager();
    const editor = fixtureTokens("editor");
    expect(manager.getSnapshot("editor").tokens).toEqual(editor);
    expect(manager.getSnapshot("home").tokens).toEqual(editor);
    expect(manager.getSnapshot("host").tokens).toEqual(editor);
    expect(manager.getSnapshot("client").tokens).toEqual(fixtureTokens("client"));
    for (const scope of SCOPE_IDS) {
      const snapshot = manager.getSnapshot(scope);
      expect(snapshot.scope).toBe(scope);
      expect(snapshot.themeId).toBe(fixtureDefaultPresetId(scope === "client" ? "client" : "editor"));
      expect(snapshot.revision).toBe(1);
      expect(snapshot.accessibility).toEqual({ textScale: 1, contrast: "normal", reducedMotion: false });
    }
  });

  it("hands out deeply frozen snapshots whose state survives mutation attempts", () => {
    const snapshot = newManager().getSnapshot("editor");
    const original = stringToken(snapshot.tokens, "color.surface.app");
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.tokens)).toBe(true);
    expect(Object.isFrozen(snapshot.accessibility)).toBe(true);
    expect(() => {
      (snapshot.tokens as Record<string, string>)["color.surface.app"] = "#000000";
    }).toThrow(TypeError);
    expect(() => {
      (snapshot as { revision: number }).revision = 99;
    }).toThrow(TypeError);
    expect(snapshot.tokens["color.surface.app"]).toBe(original);
    expect(snapshot.revision).toBe(1);
  });
});

describe("layering (AC-02)", () => {
  it("applies default, then user theme, then overrides, then accessibility", () => {
    const manager = newManager();
    const base = fixtureTokens("editor");
    const caption = numberToken(base, "font.size.caption");

    manager.setUserTheme(
      "editor",
      userTheme("calm", { "font.size.body": 20, "color.text.secondary": "#778899" }),
    );
    let tokens = manager.getSnapshot("editor").tokens;
    expect(tokens["font.size.body"]).toBe(20);
    expect(tokens["color.text.secondary"]).toBe("#778899");
    expect(tokens["font.size.caption"]).toBe(caption);
    expect(manager.getSnapshot("editor").themeId).toBe("calm");

    manager.setOverrides("editor", { "font.size.body": 16 });
    tokens = manager.getSnapshot("editor").tokens;
    expect(tokens["font.size.body"]).toBe(16);
    expect(tokens["color.text.secondary"]).toBe("#778899");

    manager.setAccessibility("editor", { textScale: 2, contrast: "normal", reducedMotion: false });
    tokens = manager.getSnapshot("editor").tokens;
    expect(tokens["font.size.body"]).toBe(32);
    expect(tokens["font.size.caption"]).toBe(caption * 2);
    expect(tokens["spacing.panel"]).toBe(numberToken(base, "spacing.panel"));
  });

  it("clears a user theme and overrides back to the defaults", () => {
    const manager = newManager();
    manager.setUserTheme("editor", userTheme("calm", { "color.text.secondary": "#778899" }));
    manager.setOverrides("editor", { "color.text.muted": "#334455" });
    manager.setUserTheme("editor", null);
    manager.setOverrides("editor", {});
    expect(manager.getSnapshot("editor").tokens).toEqual(fixtureTokens("editor"));
    expect(manager.getSnapshot("editor").themeId).toBe(fixtureDefaultPresetId());
  });

  it("resolves an alias to the value of the token it names", () => {
    const manager = newManager();
    const result = manager.setOverrides("editor", { "color.text.secondary": "{color.text.primary}" });
    expect(result.ok).toBe(true);
    expect(manager.getSnapshot("editor").tokens["color.text.secondary"]).toBe(
      fixtureTokens("editor")["color.text.primary"],
    );
  });
});

describe("invalid input (AC-03)", () => {
  type Attempt = (manager: ThemeManager) => ReturnType<ThemeManager["setOverrides"]>;
  const overrides =
    (tokens: Record<string, string | number | boolean>): Attempt =>
    (manager) =>
      manager.setOverrides("editor", tokens);

  const cases: readonly { name: string; attempt: Attempt; code: string; token: string }[] = [
    { name: "bad color", attempt: overrides({ "color.surface.app": "red" }), code: "invalid-color", token: "color.surface.app" },
    { name: "short hex color", attempt: overrides({ "color.surface.app": "#FFF" }), code: "invalid-color", token: "color.surface.app" },
    { name: "negative dimension", attempt: overrides({ "spacing.panel": -1 }), code: "invalid-dimension", token: "spacing.panel" },
    { name: "wrong type", attempt: overrides({ "font.size.body": "big" }), code: "invalid-type", token: "font.size.body" },
    { name: "unknown token", attempt: overrides({ "color.surface.nope": "#000000" }), code: "unknown-token", token: "color.surface.nope" },
    { name: "alias to unknown token", attempt: overrides({ "color.text.muted": "{color.text.nope}" }), code: "unknown-token", token: "color.text.nope" },
    { name: "fractional integer", attempt: overrides({ "grid.majorEvery": 2.5 }), code: "invalid-integer", token: "grid.majorEvery" },
    { name: "zero positive integer", attempt: overrides({ "grid.majorEvery": 0 }), code: "out-of-range", token: "grid.majorEvery" },
    { name: "font list without a generic family", attempt: overrides({ "font.family.interface": "Papyrus" }), code: "invalid-font-stack", token: "font.family.interface" },
    { name: "font list carrying a declaration", attempt: overrides({ "font.family.code": "monospace; color: red" }), code: "invalid-font-stack", token: "font.family.code" },
    { name: "font list that loads a resource", attempt: overrides({ "font.family.code": "Foo, url(x), serif" }), code: "invalid-font-stack", token: "font.family.code" },
    { name: "font list with a backslash", attempt: overrides({ "font.family.code": "Foo\\bar, serif" }), code: "invalid-font-stack", token: "font.family.code" },
    { name: "font list with braces", attempt: overrides({ "font.family.code": "Foo {}, serif" }), code: "invalid-font-stack", token: "font.family.code" },
    { name: "font list with an at sign", attempt: overrides({ "font.family.code": "Foo@bar, serif" }), code: "invalid-font-stack", token: "font.family.code" },
    { name: "font list over the length limit", attempt: overrides({ "font.family.code": `${"a".repeat(FONT_STACK_MAX_LENGTH)}, serif` }), code: "invalid-font-stack", token: "font.family.code" },
    {
      name: "alias cycle",
      attempt: overrides({ "color.text.muted": "{color.text.disabled}", "color.text.disabled": "{color.text.muted}" }),
      code: "alias-cycle",
      token: "color.text.muted",
    },
    { name: "alias to itself", attempt: overrides({ "color.text.muted": "{color.text.muted}" }), code: "alias-cycle", token: "color.text.muted" },
    { name: "alias between different kinds", attempt: overrides({ "color.text.muted": "{spacing.panel}" }), code: "alias-type-mismatch", token: "color.text.muted" },
    {
      name: "unsupported theme schema version",
      attempt: (manager) =>
        manager.setUserTheme("editor", { schema: "mudmaker.theme.v2", id: "future", tokens: {} }),
      code: "unsupported-schema-version",
      token: "schema",
    },
    {
      name: "bad value inside a user theme",
      attempt: (manager) => manager.setUserTheme("editor", userTheme("broken", { "color.border.normal": "blue" })),
      code: "invalid-color",
      token: "color.border.normal",
    },
    {
      name: "text scale out of range",
      attempt: (manager) => manager.setAccessibility("editor", { textScale: 10, contrast: "normal", reducedMotion: false }),
      code: "out-of-range",
      token: "accessibility.textScale",
    },
    {
      name: "unknown scope",
      attempt: (manager) => manager.setOverrides("nowhere" as ScopeId, {}),
      code: "unknown-scope",
      token: "scope",
    },
  ];

  it.each(cases)("rejects $name and keeps the last valid snapshot", ({ attempt, code, token }) => {
    const manager = newManager();
    manager.setOverrides("editor", { "color.text.muted": "#334455" });
    const before = manager.getSnapshot("editor");

    const result = attempt(manager);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.code === code && error.token === token)).toBe(true);
    for (const error of result.errors) expect(error.message.length).toBeGreaterThan(0);
    expect(manager.getSnapshot("editor")).toBe(before);
  });

  it("applies nothing when one entry of a layer is valid and another is not", () => {
    const manager = newManager();
    const before = manager.getSnapshot("editor");
    const result = manager.setOverrides("editor", {
      "color.surface.app": "#000000",
      "spacing.panel": -5,
    });
    expect(result.ok).toBe(false);
    expect(manager.getSnapshot("editor")).toBe(before);
    expect(manager.getSnapshot("editor").tokens["color.surface.app"]).toBe(
      fixtureTokens("editor")["color.surface.app"],
    );
  });

  it("rejects malformed documents with a field name", () => {
    const manager = newManager();
    const notAnObject = manager.setUserTheme("editor", "just text");
    const badTokens = manager.setOverrides("editor", ["a"]);
    expect(notAnObject.ok).toBe(false);
    expect(badTokens.ok).toBe(false);
    if (!notAnObject.ok) expect(notAnObject.errors[0]?.token).toBe("theme");
    if (!badTokens.ok) expect(badTokens.errors[0]?.token).toBe("overrides");
  });
});

describe("scope isolation (AC-04)", () => {
  it("leaves the other scopes untouched when one scope changes", () => {
    const manager = newManager();
    const editor = manager.getSnapshot("editor");
    const home = manager.getSnapshot("home");
    const host = manager.getSnapshot("host");

    const result = manager.setOverrides("client", { "color.surface.app": "#202020" });

    expect(result.ok).toBe(true);
    expect(manager.getSnapshot("client").tokens["color.surface.app"]).toBe("#202020");
    expect(manager.getSnapshot("editor")).toBe(editor);
    expect(manager.getSnapshot("home")).toBe(home);
    expect(manager.getSnapshot("host")).toBe(host);
    expect(manager.getSnapshot("editor").tokens["color.surface.app"]).toBe(
      fixtureTokens("editor")["color.surface.app"],
    );
  });

  it("does not let editor user choices reach home or host", () => {
    const manager = newManager();
    manager.setUserTheme("editor", userTheme("mine", { "color.surface.app": "#050505" }));
    expect(manager.getSnapshot("home").tokens["color.surface.app"]).toBe(
      fixtureTokens("editor")["color.surface.app"],
    );
  });
});

describe("notifications (AC-05)", () => {
  it("notifies once per accepted change and never for rejected input", () => {
    const manager = newManager();
    const client = vi.fn();
    const editor = vi.fn();
    manager.subscribe("client", client);
    manager.subscribe("editor", editor);

    manager.setOverrides("client", { "color.text.primary": "#FFFFFF" });
    expect(client).toHaveBeenCalledTimes(1);
    expect(editor).not.toHaveBeenCalled();

    manager.setOverrides("client", { "color.text.primary": "white" });
    manager.setUserTheme("client", { schema: "old", id: "x", tokens: {} });
    manager.setAccessibility("client", { textScale: 0, contrast: "normal", reducedMotion: false });
    expect(client).toHaveBeenCalledTimes(1);

    manager.setAccessibility("client", { textScale: 1.5, contrast: "normal", reducedMotion: true });
    expect(client).toHaveBeenCalledTimes(2);
  });

  it("stops notifying after unsubscribe and gives each accepted change a new revision", () => {
    const manager = newManager();
    const listener = vi.fn();
    const unsubscribe = manager.subscribe("editor", listener);
    manager.setOverrides("editor", { "spacing.row": 9 });
    unsubscribe();
    manager.setOverrides("editor", { "spacing.row": 10 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(manager.getSnapshot("editor").revision).toBe(3);
  });

  it("runs every listener even when one throws, then reports the failure", () => {
    const manager = newManager();
    const survivor = vi.fn();
    manager.subscribe("editor", () => {
      throw new Error("listener failed");
    });
    manager.subscribe("editor", survivor);
    expect(() => manager.setOverrides("editor", { "spacing.row": 9 })).toThrow("listener failed");
    expect(survivor).toHaveBeenCalledTimes(1);
    expect(manager.getSnapshot("editor").tokens["spacing.row"]).toBe(9);
  });
});

describe("font lists", () => {
  it.each([
    "system-ui, sans-serif",
    "Segoe UI, Roboto, sans-serif",
    '"Source Sans 3", Arial, sans-serif',
    "'Fira Code', ui-monospace, monospace",
  ])("accepts %s", (stack) => {
    const manager = newManager();
    expect(manager.setOverrides("editor", { "font.family.interface": stack }).ok).toBe(true);
    expect(manager.getSnapshot("editor").tokens["font.family.interface"]).toBe(stack);
  });
});

describe("presets", () => {
  const ids = fixturePresetIds();
  const alternate = ids.find((id) => id !== fixtureDefaultPresetId()) ?? "";

  it("lists the built-in presets from the pinned file", () => {
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(newManager().listPresets()).toEqual(ids.map((id) => ({ id, label: fixturePresetLabel(id) })));
  });

  it.each(ids)("resolves preset %s for the editor and client scopes exactly as the file defines it", (id) => {
    const manager = newManager();
    expect(manager.selectPreset("editor", id).ok).toBe(true);
    expect(manager.selectPreset("client", id).ok).toBe(true);
    expect(manager.getSnapshot("editor").tokens).toEqual(fixtureTokens("editor", id));
    expect(manager.getSnapshot("client").tokens).toEqual(fixtureTokens("client", id));
    expect(manager.getSnapshot("editor").themeId).toBe(id);
  });

  it("changes only the scope it was chosen for, and home follows editor defaults only", () => {
    const manager = newManager();
    const home = manager.getSnapshot("home");
    const client = manager.getSnapshot("client");
    manager.selectPreset("editor", alternate);
    expect(manager.getSnapshot("home")).toBe(home);
    expect(manager.getSnapshot("client")).toBe(client);
    manager.selectPreset("home", alternate);
    expect(manager.getSnapshot("home").tokens).toEqual(fixtureTokens("editor", alternate));
  });

  it("sits between the application defaults and the user theme", () => {
    const manager = newManager();
    const surface = "color.surface.app";
    const first = stringToken(fixtureTokens("editor", fixtureDefaultPresetId()), surface);
    const second = stringToken(fixtureTokens("editor", alternate), surface);
    expect(second).not.toBe(first);

    manager.selectPreset("editor", alternate);
    expect(manager.getSnapshot("editor").tokens[surface]).toBe(second);
    manager.setUserTheme("editor", userTheme("mine", { [surface]: "#0A0B0C" }));
    expect(manager.getSnapshot("editor").tokens[surface]).toBe("#0A0B0C");
    manager.selectPreset("editor", fixtureDefaultPresetId());
    expect(manager.getSnapshot("editor").tokens[surface]).toBe("#0A0B0C");
    manager.setUserTheme("editor", null);
    expect(manager.getSnapshot("editor").tokens[surface]).toBe(first);
  });

  it("rejects an unknown preset without notifying and keeps the snapshot", () => {
    const manager = newManager();
    const listener = vi.fn();
    manager.subscribe("editor", listener);
    const before = manager.getSnapshot("editor");
    const result = manager.selectPreset("editor", "no-such-preset");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ code: "unknown-preset", token: "no-such-preset" });
    expect(manager.getSnapshot("editor")).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies once when a preset is chosen", () => {
    const manager = newManager();
    const listener = vi.fn();
    manager.subscribe("editor", listener);
    manager.selectPreset("editor", alternate);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("defaults document validation", () => {
  function defaultsDocument(
    schema: string,
    editorTokens: Record<string, string | number | boolean>,
    presetTokens: Record<string, string | number | boolean> = {},
    editorPreset = "test-preset",
  ): unknown {
    return {
      schema,
      scopes: {
        editor: { preset: editorPreset, tokens: editorTokens },
        home: { inherits: "editor" },
        host: { inherits: "editor" },
        client: { preset: "test-preset", tokens: {} },
      },
      presets: {
        "test-preset": {
          label: "Test",
          scopes: { editor: { tokens: presetTokens }, client: { tokens: {} } },
        },
      },
    };
  }

  it("builds from a minimal valid document and lets presets override the defaults", () => {
    const manager = new ThemeManager(
      defaultsDocument("mudmaker.theme-defaults.v1", { "spacing.row": 3, "spacing.panel": 4 }, { "spacing.row": 6 }),
    );
    expect(manager.getSnapshot("home").tokens["spacing.row"]).toBe(6);
    expect(manager.getSnapshot("home").tokens["spacing.panel"]).toBe(4);
    expect(manager.getSnapshot("host").themeId).toBe("test-preset");
    expect(manager.listPresets()).toEqual([{ id: "test-preset", label: "Test" }]);
  });

  it("refuses an invalid value and names the token", () => {
    const build = (): ThemeManager =>
      new ThemeManager(defaultsDocument("mudmaker.theme-defaults.v1", { "color.surface.app": "#12" }));
    expect(build).toThrow(ThemeDefaultsError);
    try {
      build();
    } catch (failure) {
      expect(failure).toBeInstanceOf(ThemeDefaultsError);
      if (failure instanceof ThemeDefaultsError) {
        expect(failure.errors).toEqual([
          expect.objectContaining({ code: "invalid-color", token: "color.surface.app" }),
        ]);
      }
    }
  });

  it("refuses a preset whose value is invalid, naming the token", () => {
    const build = (): ThemeManager =>
      new ThemeManager(defaultsDocument("mudmaker.theme-defaults.v1", {}, { "spacing.row": -2 }));
    expect(build).toThrow(ThemeDefaultsError);
    try {
      build();
    } catch (failure) {
      if (failure instanceof ThemeDefaultsError) {
        expect(failure.errors.some((e) => e.token === "spacing.row" && e.code === "invalid-dimension")).toBe(true);
      }
    }
  });

  it("refuses a scope that names a preset the file does not define", () => {
    expect(
      () => new ThemeManager(defaultsDocument("mudmaker.theme-defaults.v1", {}, {}, "missing-preset")),
    ).toThrow(/missing-preset/);
  });

  it("refuses an unsupported defaults schema", () => {
    expect(() => new ThemeManager(defaultsDocument("mudmaker.theme-defaults.v9", {}))).toThrow(
      ThemeDefaultsError,
    );
  });

  it("refuses scopes that inherit from each other", () => {
    const loop = {
      schema: "mudmaker.theme-defaults.v1",
      scopes: {
        editor: { preset: "a", inherits: "home", tokens: {} },
        home: { inherits: "editor" },
        host: { inherits: "editor" },
        client: { preset: "b", tokens: {} },
      },
      presets: {},
    };
    expect(() => new ThemeManager(loop)).toThrow(/loop/);
  });
});
