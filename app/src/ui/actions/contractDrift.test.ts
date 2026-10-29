import { describe, expect, it } from "vitest";
import interactionDocument from "../../../../docs/03-contracts/ui-ux/02-interaction-state-and-accessibility.md?raw";
import actionsJson from "../../../../contracts/ui/v1/actions.v1.json";
import clientJson from "../../../../contracts/ui/v1/client-controls.v1.json";
import editorJson from "../../../../contracts/ui/v1/editor-controls.v1.json";
import homeJson from "../../../../contracts/ui/v1/home-controls.v1.json";
import hostJson from "../../../../contracts/ui/v1/host-controls.v1.json";
import catalogIndex from "../../../../contracts/ui/v1/INDEX.md?raw";
import { CATALOG_STATE_WORDS } from "./stateVariants";
import { ACTIONS_SCHEMA, ACTION_FIELDS, NAVIGATION_OWNER, NAVIGATION_PREFIX } from "./validate";

/** Values the code copies from contract prose or from files without a schema; each must still match its source. */

const catalogs = [homeJson, editorJson, clientJson, hostJson];

describe("action table constants", () => {
  it("names the schema the real action table declares", () => {
    expect(actionsJson.schema).toBe(ACTIONS_SCHEMA);
  });

  it("validates exactly the fields every real action entry has", () => {
    expect(actionsJson.actions.length).toBeGreaterThan(0);
    for (const entry of actionsJson.actions) expect(Object.keys(entry).sort(), entry.id).toEqual([...ACTION_FIELDS].sort());
  });

  it("applies the navigation ownership rule the catalog index states, and every real navigation action obeys it", () => {
    expect(catalogIndex).toContain(`\`${NAVIGATION_PREFIX}*\``);
    expect(catalogIndex).toContain(NAVIGATION_OWNER);
    const navigation = actionsJson.actions.filter((entry) => entry.id.startsWith(NAVIGATION_PREFIX));
    expect(navigation.length).toBeGreaterThan(0);
    expect(navigation.filter((entry) => entry.owner !== NAVIGATION_OWNER).map((entry) => entry.id)).toEqual([]);
  });
});

describe("catalog index counts", () => {
  const perWorkspace = Object.fromEntries(catalogs.map((catalog) => [catalog.workspace, catalog.controls.length]));
  const total = Object.values(perWorkspace).reduce((sum, count) => sum + count, 0);

  it("states the visible element total and action total the files hold", () => {
    expect(catalogIndex).toContain(`**${total} visible elements**`);
    expect(catalogIndex).toContain(`**${actionsJson.actions.length} distinct semantic actions**`);
  });

  it("repeats the total in the guidance sentence that tells implementers how many controls not to render at once", () => {
    const stated = /not all (\d+)/.exec(catalogIndex)?.[1];
    expect(stated).toBe(String(total));
  });

  it("states the item count of every workspace catalog", () => {
    expect(Object.keys(perWorkspace)).toHaveLength(catalogs.length);
    for (const [workspace, count] of Object.entries(perWorkspace)) {
      expect(catalogIndex, workspace).toMatch(new RegExp(`\\|\\s*${workspace}\\s*\\|\\s*${count}\\s*\\|`));
    }
  });
});

describe("state vocabulary", () => {
  const section = /## Catalog state vocabulary\r?\n([^#]*)/.exec(interactionDocument)?.[1] ?? "";
  const documented = (word: string): boolean => new RegExp(`(^|[^A-Za-z-])${word}([^A-Za-z-]|$)`).test(interactionDocument);

  it("reads the vocabulary section it checks against", () => {
    expect(section).toContain("`error` means `recoverable-error`");
  });

  it("contains only words the interaction contract uses", () => {
    expect([...CATALOG_STATE_WORDS].filter((word) => !documented(word))).toEqual([]);
  });

  it("contains every state word the vocabulary section names", () => {
    const named = [...section.matchAll(/`([a-z-]+)`/g)].map((match) => match[1] ?? "").filter((word) => word !== "stateVariants");
    expect(named.length).toBeGreaterThan(3);
    expect(named.filter((word) => !CATALOG_STATE_WORDS.has(word))).toEqual([]);
  });

  it("contains every state word the real catalogs list", () => {
    const used = new Set(catalogs.flatMap((catalog) => catalog.controls.flatMap((control) => control.stateVariants)));
    expect(used.size).toBeGreaterThan(3);
    expect([...used].filter((word) => !CATALOG_STATE_WORDS.has(word))).toEqual([]);
  });
});
