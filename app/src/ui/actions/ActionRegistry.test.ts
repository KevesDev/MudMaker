import { describe, expect, it } from "vitest";
import actionsJson from "../../../../contracts/ui/v1/actions.v1.json";
import clientJson from "../../../../contracts/ui/v1/client-controls.v1.json";
import editorJson from "../../../../contracts/ui/v1/editor-controls.v1.json";
import homeJson from "../../../../contracts/ui/v1/home-controls.v1.json";
import hostJson from "../../../../contracts/ui/v1/host-controls.v1.json";
import schemaJson from "../../../../contracts/ui/v1/ui-control.schema.json";
import { action, catalog, control, fixtureSources, NAVIGATOR, EDITOR } from "../testSupport";
import { ActionRegistry, CatalogLoadError } from "./ActionRegistry";
import { loadShippedRegistry, validateShippedCatalogs } from "./shipped";
import { CONTROL_KINDS, PASSIVE_KINDS, STATE_OWNERS, WORKSPACES } from "./types";
import { readActionIdPattern } from "./schemaPatterns";
import { unsupportedKeywords } from "./schemaRules";
import { parseActions, parseCatalog, type RegistryIssue } from "./validate";

type Sources = ReturnType<typeof fixtureSources>;

function withEditor(controls: readonly Record<string, unknown>[], extraActions: readonly Record<string, unknown>[] = []): Sources {
  const sources = fixtureSources();
  const table = sources.actions as { actions: Record<string, unknown>[] } & Record<string, unknown>;
  return {
    schema: sources.schema,
    actions: { ...table, actions: [...table.actions, ...extraActions] },
    catalogs: { ...sources.catalogs, editor: catalog("editor", controls) },
  };
}

/** Issues for one editor toolbar control built with the given fields; empty when the registry accepts it. */
function issuesFor(fields: Record<string, unknown>): readonly RegistryIssue[] {
  const result = ActionRegistry.create(withEditor([control("editor", "toolbar", 1, fields)]));
  return result.ok ? [] : result.issues;
}

function issuesOf(sources: Sources): readonly RegistryIssue[] {
  const result = ActionRegistry.create(sources);
  if (result.ok) throw new Error("The catalogs were expected to be rejected.");
  return result.issues;
}

describe("ActionRegistry validation", () => {
  it("accepts a valid set and resolves controls, test ids and actions", () => {
    const result = ActionRegistry.create(fixtureSources());
    if (!result.ok) throw new Error(result.issues.map((issue) => issue.message).join(" "));
    const { registry } = result;
    expect(registry.requireControl("editor.toolbar.01").label).toBe("Save Project");
    expect(registry.requireControl("editor.toolbar.01").testId).toBe("UI-editor-toolbar-01");
    expect(registry.controlsForAction("ui.test.save").map((c) => c.id)).toEqual(["editor.toolbar.01"]);
    expect(registry.action("ui.nav.help")?.owner).toBe(NAVIGATOR);
    expect(registry.requireControl("host.admin.01").workspace).toBe("host");
    expect(() => registry.requireControl("host.admin.99")).toThrowError(expect.objectContaining({ code: "control-unknown" }));
    expect(registry.controlsForAction("ui.nav.settings").map((c) => c.id)).toEqual(["home.menu.01", "client.chat.02"]);
    expect(registry.controlsForAction("ui.test.ghost")).toEqual([]);
    expect(registry.control("editor.status.01")?.actionId).toBeNull();
  });

  it("rejects a duplicate control id and names it", () => {
    const first = control("editor", "toolbar", 1, { actionId: "ui.test.save" });
    const second = { ...control("editor", "toolbar", 2, { actionId: "ui.test.save" }), id: first["id"] };
    const issues = issuesOf(withEditor([first, second]));
    const duplicate = issues.find((issue) => issue.code === "control-id-duplicate");
    expect(duplicate?.id).toBe("editor.toolbar.01");
    expect(duplicate?.message).toContain("editor.toolbar.01");
  });

  it("rejects a control that refers to a missing action and names both", () => {
    const issues = issuesOf(withEditor([control("editor", "toolbar", 1, { actionId: "ui.test.ghost" })]));
    const missing = issues.find((issue) => issue.code === "control-action-missing");
    expect(missing?.id).toBe("editor.toolbar.01");
    expect(missing?.message).toContain("ui.test.ghost");
  });

  it("rejects a control without a test id", () => {
    const broken = control("editor", "toolbar", 1, { actionId: "ui.test.save" });
    delete broken["testId"];
    const issues = issuesOf(withEditor([broken]));
    const malformed = issues.find((issue) => issue.code === "control-malformed");
    expect(malformed?.id).toBe("editor.toolbar.01");
    expect(malformed?.message).toContain("testId");
  });

  it("rejects two controls that share a test id", () => {
    const issues = issuesOf(
      withEditor([
        control("editor", "toolbar", 1, { actionId: "ui.test.save", testId: "UI-shared" }),
        control("editor", "toolbar", 2, { actionId: "ui.test.undo", testId: "UI-shared" }),
      ]),
    );
    const clash = issues.find((issue) => issue.code === "control-test-id-duplicate");
    expect(clash?.id).toBe("editor.toolbar.02");
    expect(clash?.message).toContain("editor.toolbar.01");
  });

  it("rejects a malformed catalog and names the workspace", () => {
    const sources = fixtureSources();
    const issues = issuesOf({ ...sources, catalogs: { ...sources.catalogs, host: { schema: "wrong", controls: [] } } });
    expect(issues).toEqual([expect.objectContaining({ code: "catalog-malformed", id: "host" })]);
    expect(issuesOf({ ...sources, actions: "not a table" })[0]).toMatchObject({ code: "catalog-malformed", id: "actions" });
  });

  it("requires an action for interactive kinds and allows the passive marker for display kinds", () => {
    const issues = issuesOf(withEditor([control("editor", "toolbar", 1, { kind: "button", actionId: null })]));
    expect(issues).toEqual([expect.objectContaining({ code: "control-action-required", id: "editor.toolbar.01" })]);
    const passive = ActionRegistry.create(withEditor([control("editor", "status", 1, { kind: "status", actionId: null })]));
    expect(passive.ok).toBe(true);
  });

  it("rejects a control id that breaks the schema pattern and accepts camelCase surface names", () => {
    const issues = issuesOf(withEditor([control("editor", "bad_name", 1, { kind: "text" })]));
    expect(issues).toEqual([expect.objectContaining({ code: "control-id-pattern", id: "editor.bad_name.01" })]);
    expect(ActionRegistry.create(withEditor([control("editor", "navigationGuard", 1, { kind: "text" })])).ok).toBe(true);
  });

  it("takes the id rules from the schema it is given, not from a copy", () => {
    const strict = JSON.parse(JSON.stringify(schemaJson)) as { properties: { controls: { items: { properties: { id: { pattern: string } } } } } };
    strict.properties.controls.items.properties.id.pattern = String.raw`^(home|editor|client|host)\.[a-z]+\.[0-9]{2}$`;
    const issues = issuesOf({ ...withEditor([control("editor", "navigationGuard", 1, { kind: "text" })]), schema: strict });
    expect(issues).toEqual([expect.objectContaining({ code: "control-id-pattern", id: "editor.navigationGuard.01" })]);
    expect(ActionRegistry.create({ ...withEditor([control("editor", "navigation", 1, { kind: "text" })]), schema: strict }).ok).toBe(true);
    const wrongSeparators = control("editor", "navigation", 1, { kind: "text", id: "editorXnavigationX01" });
    expect(issuesOf({ ...withEditor([wrongSeparators]), schema: strict })).toEqual([
      expect.objectContaining({ code: "control-id-pattern", id: "editorXnavigationX01" }),
    ]);
    expect(issuesOf({ ...fixtureSources(), schema: { properties: {} } })).toEqual([expect.objectContaining({ code: "schema-malformed" })]);
  });

  it("enforces every length and count the schema declares, using the values the schema holds", () => {
    const rules = schemaJson.properties.controls.items.properties;
    const text = (length: number): string => "t".repeat(length);
    const one = (fields: Record<string, unknown>): readonly RegistryIssue[] => issuesFor({ actionId: "ui.test.save", ...fields });
    const tooShort = (field: string, minimum: number): readonly RegistryIssue[] => one({ [field]: text(minimum - 1) });
    const longEnough = (field: string, minimum: number): readonly RegistryIssue[] => one({ [field]: text(minimum) });
    for (const field of ["surface", "label", "tooltip", "permission", "visibleWhen", "enabledWhen", "keyboard"] as const) {
      const minimum = rules[field].minLength;
      expect(longEnough(field, minimum)).toEqual([]);
      expect(tooShort(field, minimum)).toEqual([expect.objectContaining({ code: "control-malformed", id: "editor.toolbar.01" })]);
      expect(tooShort(field, minimum)[0]?.message).toContain(field);
    }
    const minimumVariants = rules.stateVariants.minItems;
    expect(one({ stateVariants: Array.from({ length: minimumVariants }, () => "ready") })).toEqual([]);
    expect(one({ stateVariants: Array.from({ length: minimumVariants - 1 }, () => "ready") })[0]?.message).toContain("stateVariants");
  });

  it("rejects a property the schema does not allow, and a wrong kind of value, naming both", () => {
    const extra = issuesFor({ actionId: "ui.test.save", colour: "red" });
    expect(extra).toEqual([expect.objectContaining({ code: "control-malformed", id: "editor.toolbar.01" })]);
    expect(extra[0]?.message).toContain("colour");
    const wrong = issuesFor({ actionId: 7 });
    expect(wrong[0]?.message).toContain("actionId");
    const unknownKind = issuesFor({ actionId: "ui.test.save", kind: "gizmo" });
    expect(unknownKind[0]?.message).toContain("kind");
  });

  it("rejects a schema that uses a rule the registry cannot enforce, instead of skipping it", () => {
    const odd = JSON.parse(JSON.stringify(schemaJson)) as { properties: { controls: { items: { properties: { label: Record<string, unknown> } } } } };
    odd.properties.controls.items.properties.label["maxLength"] = 5;
    const issues = issuesOf({ ...fixtureSources(), schema: odd });
    expect(issues).toEqual([expect.objectContaining({ code: "schema-malformed" })]);
    expect(issues[0]?.message).toContain("maxLength");
  });

  it("rejects a state variant outside the contract vocabulary and names the control", () => {
    const issues = issuesOf(withEditor([control("editor", "toolbar", 1, { actionId: "ui.test.save", stateVariants: ["ready", "busy"] })]));
    expect(issues).toEqual([expect.objectContaining({ code: "control-state-variant-unknown", id: "editor.toolbar.01" })]);
  });

  it("rejects a control whose own workspace is not the catalog it is filed in", () => {
    const stray = control("home", "toolbar", 1, { actionId: "ui.test.save" });
    const issues = issuesOf(withEditor([stray]));
    expect(issues).toEqual([expect.objectContaining({ code: "control-workspace-mismatch", id: "home.toolbar.01" })]);
    expect(issues[0]?.message).toContain("editor");
  });

  it("rejects an action entry with a field the action table does not define, naming the action and the field", () => {
    const issues = issuesOf(withEditor([control("editor", "toolbar", 1, { actionId: "ui.test.save" })], [{ ...action("ui.test.extra", EDITOR), colour: "red" }]));
    expect(issues).toEqual([expect.objectContaining({ code: "action-malformed", id: "ui.test.extra" })]);
    expect(issues[0]?.message).toContain("colour");
  });

  it("rejects navigation actions owned by anything but the navigator and remote-definable actions", () => {
    const sources = withEditor(
      [control("editor", "toolbar", 1, { actionId: "ui.nav.elsewhere" })],
      [action("ui.nav.elsewhere", EDITOR), { ...action("ui.test.remote", EDITOR), remoteDefinitionAllowed: true }],
    );
    const codes = issuesOf(sources).map((issue) => `${issue.code}:${issue.id}`);
    expect(codes).toContain("action-navigation-owner:ui.nav.elsewhere");
    expect(codes).toContain("action-remote-definition:ui.test.remote");
  });

  it("reports a duplicate action id", () => {
    const sources = withEditor([control("editor", "toolbar", 1, { actionId: "ui.test.save" })], [action("ui.test.save", EDITOR)]);
    expect(issuesOf(sources)).toEqual([expect.objectContaining({ code: "action-id-duplicate", id: "ui.test.save" })]);
  });

  it("describes failures in a load error that names the first ids", () => {
    const issues = issuesOf(withEditor([control("editor", "toolbar", 1, { actionId: "ui.test.ghost" })]));
    const error = new CatalogLoadError(issues);
    expect(error.message).toContain("editor.toolbar.01");
    expect(error.issues).toBe(issues);
  });
});

describe("shipped catalogs", () => {
  const workspaces = { home: homeJson, editor: editorJson, client: clientJson, host: hostJson } as const;

  const actionIdPattern = readActionIdPattern(schemaJson);

  it("give every control the test id its own id spells, so no control can claim another's", () => {
    const wrong = Object.values(workspaces).flatMap((json) =>
      (json.controls as readonly { readonly id: string; readonly testId: string }[]).filter((entry) => entry.testId !== `UI-${entry.id.replaceAll(".", "-")}`).map((entry) => entry.id),
    );
    expect(wrong).toEqual([]);
  });

  it("hold the control and action counts the UI catalog index states", () => {
    if (!actionIdPattern.ok) throw new Error(actionIdPattern.message);
    const counts = Object.fromEntries(
      Object.entries(workspaces).map(([workspace, json]) => [workspace, parseCatalog(json, workspace as keyof typeof workspaces, schemaJson).controls.length]),
    );
    expect(counts).toEqual({ home: 43, editor: 146, client: 115, host: 63 });
    expect(parseActions(actionsJson, actionIdPattern.pattern).actions).toHaveLength(286);
  });

  it("all validate against the published schema rules and the action table", () => {
    const result = validateShippedCatalogs();
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it("load once as a registry that resolves a real control and its action", () => {
    const registry = loadShippedRegistry();
    expect(loadShippedRegistry()).toBe(registry);
    const first = registry.requireControl("home.launcher.01");
    expect(first).toMatchObject({ label: "Create World", actionId: "ui.project.create", testId: "UI-home-launcher-01" });
    expect(registry.action("ui.project.create")?.owner).toBe("HomeIntentRouter");
    expect(registry.controlsForAction("ui.project.create").map((c) => c.id)).toContain("home.launcher.01");
  });
});

describe("the code that mirrors the control schema", () => {
  const control = schemaJson.properties.controls.items.properties;
  const catalog = schemaJson.properties;

  it("lists exactly the workspaces, kinds and state owners the schema allows", () => {
    expect([...WORKSPACES]).toEqual(catalog.workspace.enum);
    expect([...WORKSPACES]).toEqual(control.workspace.enum);
    expect([...CONTROL_KINDS]).toEqual(control.kind.enum);
    expect([...STATE_OWNERS]).toEqual(control.stateOwner.enum);
    for (const kind of PASSIVE_KINDS) expect(control.kind.enum).toContain(kind);
  });

  it("uses only rules the registry enforces", () => {
    expect(unsupportedKeywords(schemaJson)).toEqual([]);
  });

  it("declares the property set the registry builds descriptors from", () => {
    expect(Object.keys(control).sort()).toEqual(
      [
        "actionId", "enabledWhen", "id", "keyboard", "kind", "label", "permission", "stateOwner", "stateVariants", "surface", "testId", "tooltip", "visibleWhen", "workspace",
      ].sort(),
    );
    expect(schemaJson.properties.controls.items.additionalProperties).toBe(false);
  });
});
