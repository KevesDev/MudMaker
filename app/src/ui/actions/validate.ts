import { readShowHelpDefault } from "./schemaDefaults";
import { isRecord, validateAgainst, type SchemaProblem } from "./schemaRules";
import { CATALOG_STATE_WORDS } from "./stateVariants";
import type { ActionDescriptor, ControlDescriptor, ControlKind, StateOwner, WorkspaceId } from "./types";

export type IssueCode =
  | "catalog-malformed"
  | "control-malformed"
  | "schema-malformed"
  | "control-id-pattern"
  | "control-state-variant-unknown"
  | "control-id-duplicate"
  | "control-workspace-mismatch"
  | "control-action-missing"
  | "control-action-required"
  | "control-test-id-duplicate"
  | "action-malformed"
  | "action-id-pattern"
  | "action-id-duplicate"
  | "action-remote-definition"
  | "action-navigation-owner";

/** Every issue names the offending id so a failed catalog can be fixed without a search. */
export interface RegistryIssue {
  readonly code: IssueCode;
  readonly id: string;
  readonly message: string;
}

/** Copied from the catalog index and the action table, which have no schema file; contractDrift.test.ts compares them. */
export const NAVIGATION_PREFIX = "ui.nav.";
export const NAVIGATION_OWNER = "WorkspaceNavigator";
export const ACTIONS_SCHEMA = "mudmaker.ui-actions.v1";

function nonEmptyString(value: unknown, minLength = 1): value is string {
  return typeof value === "string" && value.length >= minLength;
}

const ACTION_STRING_FIELDS = ["id", "owner", "mutationDomain", "origin", "auth", "input", "outcome"] as const;
export const ACTION_FIELDS: readonly string[] = [...ACTION_STRING_FIELDS, "remoteDefinitionAllowed"];

export interface ParsedActions {
  readonly actions: readonly ActionDescriptor[];
  readonly issues: readonly RegistryIssue[];
}

export function parseActions(source: unknown, actionIdPattern: RegExp): ParsedActions {
  const issues: RegistryIssue[] = [];
  const actions: ActionDescriptor[] = [];
  if (!isRecord(source) || source["schema"] !== ACTIONS_SCHEMA || !Array.isArray(source["actions"])) {
    issues.push({
      code: "catalog-malformed",
      id: "actions",
      message: `The action table must be an object with schema "${ACTIONS_SCHEMA}" and an actions list.`,
    });
    return { actions, issues };
  }
  const seen = new Set<string>();
  source["actions"].forEach((entry: unknown, index) => {
    const id = isRecord(entry) && typeof entry["id"] === "string" ? entry["id"] : `actions[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ code: "action-malformed", id, message: `Action entry ${id} is not an object.` });
      return;
    }
    const missing = ACTION_STRING_FIELDS.filter((field) => !nonEmptyString(entry[field]));
    const unknown = Object.keys(entry).filter((field) => !ACTION_FIELDS.includes(field));
    if (missing.length > 0 || unknown.length > 0) {
      const reasons = [
        ...(missing.length > 0 ? [`is missing text fields: ${missing.join(", ")}`] : []),
        ...(unknown.length > 0 ? [`has fields the action table does not define: ${unknown.join(", ")}`] : []),
      ];
      issues.push({ code: "action-malformed", id, message: `Action ${id} ${reasons.join(" and ")}.` });
      return;
    }
    const descriptor = {
      id: String(entry["id"]),
      owner: String(entry["owner"]),
      mutationDomain: String(entry["mutationDomain"]),
      origin: String(entry["origin"]),
      auth: String(entry["auth"]),
      input: String(entry["input"]),
      outcome: String(entry["outcome"]),
    };
    if (!actionIdPattern.test(descriptor.id)) {
      issues.push({ code: "action-id-pattern", id, message: `Action id ${id} does not match ${actionIdPattern.source}.` });
    }
    if (seen.has(descriptor.id)) {
      issues.push({ code: "action-id-duplicate", id, message: `Action id ${id} is defined more than once.` });
      return;
    }
    seen.add(descriptor.id);
    if (entry["remoteDefinitionAllowed"] !== false) {
      issues.push({ code: "action-remote-definition", id, message: `Action ${id} must not allow remote definition.` });
      return;
    }
    if (descriptor.id.startsWith(NAVIGATION_PREFIX) && descriptor.owner !== NAVIGATION_OWNER) {
      issues.push({
        code: "action-navigation-owner",
        id,
        message: `Navigation action ${id} must be owned by ${NAVIGATION_OWNER}, not ${descriptor.owner}.`,
      });
    }
    actions.push(Object.freeze({ ...descriptor, remoteDefinitionAllowed: false as const }));
  });
  return { actions, issues };
}

export interface ParsedCatalog {
  readonly controls: readonly ControlDescriptor[];
  readonly issues: readonly RegistryIssue[];
}

function fieldName(problem: SchemaProblem): string {
  return problem.path.slice(2).join(".");
}

function describeControl(entry: Readonly<Record<string, unknown>>, showHelpDefault: boolean): ControlDescriptor {
  const actionId = entry["actionId"];
  return Object.freeze({
    id: String(entry["id"]),
    workspace: entry["workspace"] as WorkspaceId,
    surface: String(entry["surface"]),
    kind: entry["kind"] as ControlKind,
    label: String(entry["label"]),
    tooltip: String(entry["tooltip"]),
    showHelp: entry["showHelp"] === undefined ? showHelpDefault : entry["showHelp"] === true,
    actionId: actionId === null ? null : String(actionId),
    stateOwner: entry["stateOwner"] as StateOwner,
    permission: String(entry["permission"]),
    visibleWhen: String(entry["visibleWhen"]),
    enabledWhen: String(entry["enabledWhen"]),
    stateVariants: Object.freeze((entry["stateVariants"] as readonly string[]).slice()),
    keyboard: String(entry["keyboard"]),
    testId: String(entry["testId"]),
  });
}

/**
 * Checks one workspace catalog against the published schema, so every rule the schema declares
 * is enforced, then against the rules the schema cannot express: the workspace it is filed under
 * and the state vocabulary.
 */
export function parseCatalog(source: unknown, workspace: WorkspaceId, schema: Readonly<Record<string, unknown>>): ParsedCatalog {
  const issues: RegistryIssue[] = [];
  const controls: ControlDescriptor[] = [];
  const showHelpDefault = readShowHelpDefault(schema);
  if (!showHelpDefault.ok) {
    issues.push({ code: "schema-malformed", id: "ui-control.schema", message: showHelpDefault.message });
    return { controls, issues };
  }
  const problems = validateAgainst(source, schema);
  const catalogProblems = problems.filter((problem) => problem.path[0] !== "controls" || typeof problem.path[1] !== "number");
  const mismatch = isRecord(source) && source["workspace"] !== workspace;
  if (catalogProblems.length > 0 || mismatch) {
    const reasons = catalogProblems.map((problem) => problem.message);
    if (mismatch) reasons.push(`its workspace is ${String(isRecord(source) ? source["workspace"] : "")}, not ${workspace}`);
    issues.push({
      code: "catalog-malformed",
      id: workspace,
      message: `The ${workspace} catalog does not satisfy the control schema: ${reasons.join("; ")}.`,
    });
    return { controls, issues };
  }
  const entries = isRecord(source) && Array.isArray(source["controls"]) ? (source["controls"] as readonly unknown[]) : [];
  entries.forEach((entry: unknown, index) => {
    const id = isRecord(entry) && typeof entry["id"] === "string" ? entry["id"] : `${workspace}.controls[${index}]`;
    const own = problems.filter((problem) => problem.path[1] === index);
    const idProblem = own.find((problem) => problem.path[2] === "id" && problem.keyword === "pattern");
    if (idProblem) {
      issues.push({ code: "control-id-pattern", id, message: `Control id ${id} is not allowed: ${idProblem.message}.` });
    }
    const others = own.filter((problem) => problem !== idProblem);
    if (others.length > 0) {
      issues.push({
        code: "control-malformed",
        id,
        message: `Control ${id} has missing or invalid fields: ${others.map((problem) => `${fieldName(problem)} (${problem.message})`).join("; ")}.`,
      });
    }
    if (own.length > 0 || !isRecord(entry)) return;
    if (entry["workspace"] !== workspace) {
      issues.push({
        code: "control-workspace-mismatch",
        id,
        message: `Control ${id} says workspace ${String(entry["workspace"])} but is listed in the ${workspace} catalog.`,
      });
      return;
    }
    const control = describeControl(entry, showHelpDefault.value);
    const unknownVariants = control.stateVariants.filter((word) => !CATALOG_STATE_WORDS.has(word));
    if (unknownVariants.length > 0) {
      issues.push({
        code: "control-state-variant-unknown",
        id,
        message: `Control ${id} lists state variants outside the state vocabulary: ${unknownVariants.join(", ")}.`,
      });
      return;
    }
    controls.push(control);
  });
  return { controls, issues };
}

/** Cross-checks that need every catalog and the action table together. */
export function crossCheck(
  controls: readonly ControlDescriptor[],
  actions: readonly ActionDescriptor[],
  isPassiveKind: (kind: ControlKind) => boolean,
): RegistryIssue[] {
  const issues: RegistryIssue[] = [];
  const actionIds = new Set(actions.map((action) => action.id));
  const ids = new Set<string>();
  const testIds = new Map<string, string>();
  for (const control of controls) {
    if (ids.has(control.id)) {
      issues.push({ code: "control-id-duplicate", id: control.id, message: `Control id ${control.id} is defined more than once.` });
    }
    ids.add(control.id);
    const firstOwner = testIds.get(control.testId);
    if (firstOwner !== undefined) {
      issues.push({
        code: "control-test-id-duplicate",
        id: control.id,
        message: `Test id ${control.testId} on ${control.id} is already used by ${firstOwner}.`,
      });
    } else {
      testIds.set(control.testId, control.id);
    }
    if (control.actionId === null) {
      if (!isPassiveKind(control.kind)) {
        issues.push({
          code: "control-action-required",
          id: control.id,
          message: `Control ${control.id} is a ${control.kind} and needs an action; only display-only kinds may omit one.`,
        });
      }
    } else if (!actionIds.has(control.actionId)) {
      issues.push({
        code: "control-action-missing",
        id: control.id,
        message: `Control ${control.id} refers to action ${control.actionId}, which is not in the action table.`,
      });
    }
  }
  return issues;
}
