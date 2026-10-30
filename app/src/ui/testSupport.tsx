/**
 * What these tests cannot prove: jsdom never turns key presses into clicks, never moves focus on Tab,
 * and draws nothing, so browser-synthesized clicks, native Tab movement, pixels, touch feel and screen
 * reader output are not covered here. They are covered by the stakeholder hands-on. A title claims only
 * what its assertions show, such as "default prevented" or "text in the live region", never the browser or
 * assistive technology behavior that follows. Stylesheet tests read the stylesheet text only: they show what is
 * declared, not what is drawn.
 */
import schema from "../../../contracts/ui/v1/ui-control.schema.json";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { ActionRegistry } from "./actions/ActionRegistry";
import type { UiDiagnostic } from "./actions/ActionBus";
import type { ControlDescriptor, WorkspaceId } from "./actions/types";
import type { ShortcutRequest } from "./input/ShortcutRegistry";
import { createUiRuntime, type UiRuntime, type UiRuntimeOptions } from "./runtime";
import { UiProvider } from "./UiProvider";

/** Builds a control entry in the shape the catalog schema requires. */
export function control(
  workspace: WorkspaceId,
  surface: string,
  number: number,
  fields: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const serial = String(number).padStart(2, "0");
  const state = { home: "HomeState", editor: "EditorState", client: "ClientState", host: "HostAdminState" }[workspace];
  return {
    id: `${workspace}.${surface}.${serial}`,
    workspace,
    surface: `${workspace}.${surface}`,
    kind: "button",
    label: "Label",
    tooltip: "Explains what this control does",
    actionId: null,
    stateOwner: state,
    permission: "localUser",
    visibleWhen: "surfaceActive",
    enabledWhen: "authorizedAndReady",
    stateVariants: ["ready", "disabled", "pending", "error"],
    keyboard: "focusAndActivate",
    testId: `UI-${workspace}-${surface}-${serial}`,
    ...fields,
  };
}

export function action(id: string, owner: string): Record<string, unknown> {
  return {
    id,
    owner,
    mutationDomain: "projectDraft",
    origin: "localUserGesture",
    auth: "owningServiceMustRevalidate",
    input: "typedByControlSchema",
    outcome: "confirmedOrStructuredError",
    remoteDefinitionAllowed: false,
  };
}

export function catalog(workspace: WorkspaceId, controls: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { schema: "mudmaker.ui-controls.v1", workspace, status: "DESIGN_NOT_IMPLEMENTED", controls };
}

export function actionTable(actions: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { schema: "mudmaker.ui-actions.v1", status: "DESIGN_NOT_IMPLEMENTED", actions };
}

export const EDITOR = "EditorIntentRouter";
export const HOME = "HomeIntentRouter";
export const NAVIGATOR = "WorkspaceNavigator";

export const SAVE = "editor.toolbar.01";
export const UNDO = "editor.toolbar.02";
export const NAME = "editor.fields.01";
export const AUTOSAVE = "editor.fields.02";
export const LAYOUT = "editor.fields.03";
export const CONNECTION = "editor.status.01";
export const ORPHAN = "editor.toolbar.03";
export const GO_SETTINGS = "home.menu.01";
export const GO_HELP = "home.menu.02";
export const GO_TO = "home.menu.03";
export const CLIENT_SETTINGS = "client.chat.02";

/** A control that can show every failure and success state on its own. */
const FULL_VARIANTS = ["ready", "disabled", "pending", "success", "validation-error", "denied", "unavailable", "error"];

/** A small catalog set that exercises every kind a primitive renders. */
export function fixtureSources(): { schema: unknown; actions: unknown; catalogs: Record<WorkspaceId, unknown> } {
  return {
    schema,
    actions: actionTable([
      action("ui.test.save", EDITOR),
      action("ui.test.undo", EDITOR),
      action("ui.test.rename", EDITOR),
      action("ui.test.autosave", EDITOR),
      action("ui.test.layout", EDITOR),
      action("ui.test.orphan", EDITOR),
      action("ui.nav.settings", NAVIGATOR),
      action("ui.nav.help", NAVIGATOR),
      action("ui.nav.openMenu", NAVIGATOR),
      action("ui.test.send", "ClientIntentRouter"),
      action("ui.test.stop", "HostAdminIntentRouter"),
    ]),
    catalogs: {
      home: catalog("home", [
        control("home", "menu", 1, { label: "Settings", actionId: "ui.nav.settings", tooltip: "Open the settings screen" }),
        control("home", "menu", 2, { label: "Help", actionId: "ui.nav.help", tooltip: "Open the help pages" }),
        control("home", "menu", 3, { kind: "dropdown", label: "Go To", actionId: "ui.nav.openMenu", tooltip: "Jump to another screen" }),
      ]),
      editor: catalog("editor", [
        control("editor", "toolbar", 1, { label: "Save Project", actionId: "ui.test.save", stateVariants: FULL_VARIANTS, tooltip: "Save the project draft" }),
        control("editor", "toolbar", 2, { label: "Undo", actionId: "ui.test.undo", tooltip: "Undo the last edit" }),
        control("editor", "toolbar", 3, { label: "Unowned Tool", actionId: "ui.test.orphan", tooltip: "A tool nobody handles" }),
        control("editor", "fields", 1, { kind: "input", label: "Project Name", actionId: "ui.test.rename", stateVariants: FULL_VARIANTS, tooltip: "Name shown in the project list" }),
        control("editor", "fields", 2, { kind: "toggle", label: "Autosave", actionId: "ui.test.autosave", tooltip: "Save changes as you work" }),
        control("editor", "fields", 3, { kind: "dropdown", label: "Layout", actionId: "ui.test.layout", tooltip: "Choose how panels are arranged" }),
        control("editor", "status", 1, { kind: "status", label: "Connection", tooltip: "Shows whether the engine is reachable" }),
      ]),
      client: catalog("client", [
        control("client", "chat", 1, { label: "Send", actionId: "ui.test.send", tooltip: "Send the message to the room" }),
        control("client", "chat", 2, { label: "Client Settings", actionId: "ui.nav.settings", tooltip: "Open the settings screen from here" }),
      ]),
      host: catalog("host", [
        control("host", "admin", 1, { label: "Stop Hosting", actionId: "ui.test.stop", tooltip: "Stop the running game server" }),
      ]),
    },
  };
}

export function fixtureRegistry(): ActionRegistry {
  const result = ActionRegistry.create(fixtureSources());
  if (!result.ok) throw new Error(`Fixture catalogs are invalid: ${result.issues.map((issue) => issue.message).join(" ")}`);
  return result.registry;
}

export interface TestUi {
  readonly runtime: UiRuntime;
  /** Registers a shortcut and fails the test at once if the registry refuses it. */
  shortcut(request: ShortcutRequest): void;
  readonly diagnostics: UiDiagnostic[];
  control(id: string): ControlDescriptor;
}

export function createTestUi(options: Pick<UiRuntimeOptions, "maxPendingMs" | "correlation"> = {}): TestUi {
  const registry = fixtureRegistry();
  const diagnostics: UiDiagnostic[] = [];
  const runtime = createUiRuntime({ registry, document, diagnostics: (record) => diagnostics.push(record), ...options });
  return {
    runtime,
    diagnostics,
    control: (id) => registry.requireControl(id),
    shortcut: (request) => {
      const result = runtime.shortcuts.register(request);
      if (!result.ok) throw new Error(result.error.message);
    },
  };
}

/** `strict` runs effects twice on mount, as development builds do; `container` renders into an element that already exists. */
export function renderWithUi(
  ui: TestUi,
  element: ReactElement,
  options: { readonly strict?: boolean; readonly container?: HTMLElement } = {},
): RenderResult {
  return render(<UiProvider runtime={ui.runtime}>{element}</UiProvider>, {
    reactStrictMode: options.strict === true,
    ...(options.container ? { container: options.container } : {}),
  });
}

export function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: Error) => void } {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

/** Lets queued promise work and zero-delay timers finish. */
export const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

export function mountHtml(markup: string): void {
  document.body.innerHTML = markup;
}

export function elementBy<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}

/** Each pattern comes with text it must catch, so a pattern that stopped matching cannot pass silently. */
export const FORBIDDEN_STYLE_PATTERNS: readonly (readonly [string, RegExp, string])[] = [
  ["hex colors", /#[0-9a-fA-F]{3,8}\b/, "color: #1a2b3c;"],
  ["color functions", /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/, "background: rgba(0, 0, 0, 0.5);"],
  ["pixel literals", /\b\d+(?:\.\d+)?px\b/, "width: 12px;"],
  ["millisecond or second literals", /\b\d+(?:\.\d+)?m?s\b/, "transition: color 150ms;"],
  ["timers with literal delays", /\b(?:setTimeout|setInterval)\([^;]*,\s*\d/, "setTimeout(() => done(), 500);"],
  ["frame timers", /\brequestAnimationFrame\b/, "requestAnimationFrame(draw);"],
  ["z-index numbers", /z-index\s*:\s*-?\d/, "z-index: 10;"],
  ["radius that is not a token or a calculation from one", /border-radius\s*:\s*(?!var\(|calc\(|inherit)\S/, "border-radius: 50%;"],
  ["implicit alpha", /\btransparent\b|color-mix\(/, "background: color-mix(in srgb, red, transparent);"],
  ["font stacks", /\b(?:sans-serif|monospace|system-ui|serif|Helvetica|Arial|Segoe)\b/, "font: 1em system-ui;"],
  ["font-family without a token", /font-family\s*:\s*(?!var\()\S/, "font-family: Arial;"],
  ["em dashes", /\u2014/, "a \u2014 b"],
  ["emoji", /\p{Extended_Pictographic}/u, "ok \u{1F600}"],
];
