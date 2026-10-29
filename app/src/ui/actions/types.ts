/** The enums below mirror ui-control.schema.json for the TypeScript types; a drift test fails if the schema changes them. */
export const WORKSPACES = ["home", "editor", "client", "host"] as const;
export type WorkspaceId = (typeof WORKSPACES)[number];

export const CONTROL_KINDS = [
  "button",
  "view",
  "status",
  "text",
  "input",
  "textarea",
  "dropdown",
  "toggle",
  "slider",
  "panel",
  "tab",
  "tree",
  "list",
] as const;
export type ControlKind = (typeof CONTROL_KINDS)[number];

/** Kinds that only present information; every other kind must be bound to an action. */
export const PASSIVE_KINDS: ReadonlySet<ControlKind> = new Set<ControlKind>(["view", "status", "text", "panel"]);

export const STATE_OWNERS = ["HomeState", "EditorState", "ClientState", "HostAdminState"] as const;
export type StateOwner = (typeof STATE_OWNERS)[number];

export type ActionId = string;
export type ControlId = string;

/** One entry of a scoped control catalog. A null actionId is the explicit passive marker. */
export interface ControlDescriptor {
  readonly id: ControlId;
  readonly workspace: WorkspaceId;
  readonly surface: string;
  readonly kind: ControlKind;
  readonly label: string;
  readonly tooltip: string;
  readonly actionId: ActionId | null;
  readonly stateOwner: StateOwner;
  readonly permission: string;
  readonly visibleWhen: string;
  readonly enabledWhen: string;
  readonly stateVariants: readonly string[];
  readonly keyboard: string;
  readonly testId: string;
}

export type ActionControl = ControlDescriptor & { readonly actionId: ActionId };

/** A visible element that is not in the registry: text the user reads but cannot act on. */
export interface PassiveDescriptor {
  readonly passive: true;
  readonly id: string;
  readonly label: string;
  readonly help: string;
}

export type Described = ControlDescriptor | PassiveDescriptor;

export interface ActionDescriptor {
  readonly id: ActionId;
  readonly owner: string;
  readonly mutationDomain: string;
  readonly origin: string;
  readonly auth: string;
  readonly input: string;
  readonly outcome: string;
  readonly remoteDefinitionAllowed: false;
}

export function isPassive(described: Described): described is PassiveDescriptor {
  return "passive" in described;
}

export function isActionControl(control: ControlDescriptor): control is ActionControl {
  return control.actionId !== null;
}

export function helpOf(described: Described): string {
  return isPassive(described) ? described.help : described.tooltip;
}

/** Runtime misuse of the UI library: a wiring mistake that must fail loudly with a stable code. */
export class UiContractError extends Error {
  readonly code: string;
  readonly subject: string;

  constructor(code: string, subject: string, message: string) {
    super(message);
    this.name = "UiContractError";
    this.code = code;
    this.subject = subject;
  }
}
