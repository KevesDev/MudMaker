import {
  PASSIVE_KINDS,
  UiContractError,
  WORKSPACES,
  type ActionDescriptor,
  type ActionId,
  type ControlDescriptor,
  type ControlId,
  type WorkspaceId,
} from "./types";
import { readActionIdPattern } from "./schemaPatterns";
import { isRecord, unsupportedKeywords } from "./schemaRules";
import { crossCheck, parseActions, parseCatalog, type RegistryIssue } from "./validate";

export interface CatalogSources {
  /** The published control schema; it owns the id patterns. */
  readonly schema: unknown;
  readonly actions: unknown;
  readonly catalogs: Readonly<Record<WorkspaceId, unknown>>;
}

export type RegistryResult =
  | { readonly ok: true; readonly registry: ActionRegistry }
  | { readonly ok: false; readonly issues: readonly RegistryIssue[] };

/**
 * Typed, validated lookup over the control catalogs and the action table. Built once from
 * the shipped contract files; nothing in the UI retypes a label, action id or test id.
 */
export class ActionRegistry {
  private readonly controlsById: ReadonlyMap<ControlId, ControlDescriptor>;
  private readonly controlsByAction: ReadonlyMap<ActionId, readonly ControlDescriptor[]>;
  private readonly actionsById: ReadonlyMap<ActionId, ActionDescriptor>;

  private constructor(controls: readonly ControlDescriptor[], actions: readonly ActionDescriptor[]) {
    this.controlsById = new Map(controls.map((control) => [control.id, control]));
    this.actionsById = new Map(actions.map((action) => [action.id, action]));
    const byAction = new Map<ActionId, ControlDescriptor[]>();
    for (const control of controls) {
      if (control.actionId === null) continue;
      const list = byAction.get(control.actionId) ?? [];
      list.push(control);
      byAction.set(control.actionId, list);
    }
    this.controlsByAction = byAction;
  }

  /** Validates every catalog and the action table; reports all issues, each naming its id. */
  static create(sources: CatalogSources): RegistryResult {
    const schemaIssue = (message: string): RegistryResult => ({
      ok: false,
      issues: [{ code: "schema-malformed", id: "ui-control.schema", message }],
    });
    const schema = sources.schema;
    if (!isRecord(schema)) return schemaIssue("The control schema must be an object.");
    const unsupported = unsupportedKeywords(schema);
    if (unsupported.length > 0) {
      return schemaIssue(`The control schema uses rules this registry cannot enforce: ${unsupported.join("; ")}.`);
    }
    const actionIdPattern = readActionIdPattern(schema);
    if (!actionIdPattern.ok) return schemaIssue(actionIdPattern.message);
    const parsedActions = parseActions(sources.actions, actionIdPattern.pattern);
    const issues: RegistryIssue[] = [...parsedActions.issues];
    const controls: ControlDescriptor[] = [];
    for (const workspace of WORKSPACES) {
      const parsed = parseCatalog(sources.catalogs[workspace], workspace, schema);
      issues.push(...parsed.issues);
      controls.push(...parsed.controls);
    }
    issues.push(...crossCheck(controls, parsedActions.actions, (kind) => PASSIVE_KINDS.has(kind)));
    if (issues.length > 0) return { ok: false, issues };
    return { ok: true, registry: new ActionRegistry(controls, parsedActions.actions) };
  }

  control(id: ControlId): ControlDescriptor | undefined {
    return this.controlsById.get(id);
  }

  requireControl(id: ControlId): ControlDescriptor {
    const control = this.controlsById.get(id);
    if (!control) throw new UiContractError("control-unknown", id, `There is no control "${id}" in the catalogs.`);
    return control;
  }

  controlsForAction(actionId: ActionId): readonly ControlDescriptor[] {
    return this.controlsByAction.get(actionId) ?? [];
  }

  action(id: ActionId): ActionDescriptor | undefined {
    return this.actionsById.get(id);
  }
}

export class CatalogLoadError extends Error {
  readonly issues: readonly RegistryIssue[];

  constructor(issues: readonly RegistryIssue[]) {
    const shown = issues.slice(0, 5).map((issue) => issue.message);
    const rest = issues.length > shown.length ? ` (${issues.length - shown.length} more)` : "";
    super(`The control catalogs are not valid: ${shown.join(" ")}${rest}`);
    this.name = "CatalogLoadError";
    this.issues = issues;
  }
}
