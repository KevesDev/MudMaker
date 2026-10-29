import { describe, expect, it } from "vitest";
import { fixtureDocument, fixturePresetIds } from "./fixtures";
import { ThemeSchema } from "./schema";
import { ThemeManager } from "./ThemeManager";

/** Expands `a.{b,c}.d` into `a.b.d` and `a.c.d`; a trailing `.*` is kept as a prefix marker. */
function expand(pattern: string): string[] {
  const open = pattern.indexOf("{");
  if (open === -1) return [pattern];
  const close = pattern.indexOf("}", open);
  const head = pattern.slice(0, open);
  const tail = pattern.slice(close + 1);
  return pattern
    .slice(open + 1, close)
    .split(",")
    .flatMap((part) => expand(`${head}${part}${tail}`));
}

const ansi = Array.from({ length: 16 }, (_, index) => `ansi${index}`).join(",");

/** Namespaces copied from editor-theme-manager.md, "Required semantic token namespaces". */
const EDITOR_NAMESPACES = [
  "color.surface.{app,panel,toolbar,inspector,canvas,overlay,scrim}",
  "color.text.{primary,secondary,muted,disabled}",
  "color.border.{normal,subtle,focused,invalid}",
  "color.graph.grid.{minor,major}",
  "color.graph.{edge,port,node}.*",
  "color.status.{success,warning,error,information}",
  "color.interaction.{focus,selection,hover,pressed}",
  "font.family.{interface,code,numeric}",
  "font.size.{body,caption,nodeTitle,heading,code}",
  "font.weight.*",
  "spacing.*",
  "shape.*",
  "motion.*",
  "layout.*",
  "layer.{popup,tooltip,dialog}",
  "opacity.scrim",
  "font.lineHeight.*",
  "interaction.{pointerHitSize,touchHitSize}",
  "grid.{baseStep,majorEvery,snapStep,minorVisibilityMinScreenStep,lineWidth}",
];

/** Namespaces copied from ui-ux/03-theme-and-preferences.md, "Client-specific semantic tokens". */
const CLIENT_NAMESPACES = [
  `color.terminal.{background,foreground,${ansi},link,prompt,system,chat,tell,emote,combat,warning}`,
  "font.terminal.{family,size,lineHeight,weight}",
  "text.{wrapWidth,spacing,ligatures,ansiColorPolicy,timestamps}",
  "color.map.{room,visited,current,unknown,exit,locked,uncertain,note}",
  "color.status.{connected,reconnecting,offline}",
  "color.client.{inputBackground,historyHighlight,matchHighlight,channelAccent}",
  "interaction.client.{scrollbackPause,autofollow,focusMode}",
];

function missingFrom(tokens: Readonly<Record<string, unknown>>, namespaces: readonly string[]): string[] {
  const names = Object.keys(tokens);
  return namespaces.flatMap(expand).filter((entry) =>
    entry.endsWith(".*")
      ? !names.some((name) => name.startsWith(entry.slice(0, -1)))
      : !Object.hasOwn(tokens, entry),
  );
}

describe.each(fixturePresetIds())("token namespaces in preset %s", (presetId) => {
  const manager = new ThemeManager(fixtureDocument());
  manager.selectPreset("editor", presetId);
  manager.selectPreset("client", presetId);
  manager.selectPreset("home", presetId);
  manager.selectPreset("host", presetId);

  it("resolves every namespace of the ThemeManager contract in the editor scope", () => {
    expect(missingFrom(manager.getSnapshot("editor").tokens, EDITOR_NAMESPACES)).toEqual([]);
  });

  it("resolves every client namespace of the preferences contract in the client scope", () => {
    expect(missingFrom(manager.getSnapshot("client").tokens, CLIENT_NAMESPACES)).toEqual([]);
  });

  it("gives home and host the full editor namespace set", () => {
    expect(missingFrom(manager.getSnapshot("home").tokens, EDITOR_NAMESPACES)).toEqual([]);
    expect(missingFrom(manager.getSnapshot("host").tokens, EDITOR_NAMESPACES)).toEqual([]);
  });

  it("provides every token family the schema declares in the editor or client scope", () => {
    const provided = new Set([
      ...Object.keys(manager.getSnapshot("editor").tokens),
      ...Object.keys(manager.getSnapshot("client").tokens),
    ]);
    const missing = ThemeSchema.families.flatMap((family) => {
      if (family.members === "open") {
        return [...provided].some((name) => name.startsWith(`${family.prefix}.`)) ? [] : [`${family.prefix}.*`];
      }
      return family.members.map((member) => `${family.prefix}.${member}`).filter((name) => !provided.has(name));
    });
    expect(missing).toEqual([]);
  });
});

describe("retired token names", () => {
  it("rejects the old scroll back name and the old ANSI policy value", () => {
    const manager = new ThemeManager(fixtureDocument());
    const oldName = manager.setOverrides("client", { "text.scrollbackPause": true });
    const oldValue = manager.setOverrides("client", { "text.ansiColorPolicy": "mapped" });
    expect(oldName.ok).toBe(false);
    if (!oldName.ok) expect(oldName.errors[0]).toMatchObject({ code: "unknown-token", token: "text.scrollbackPause" });
    expect(oldValue.ok).toBe(false);
    if (!oldValue.ok) expect(oldValue.errors[0]).toMatchObject({ code: "invalid-enum", token: "text.ansiColorPolicy" });
  });
});
