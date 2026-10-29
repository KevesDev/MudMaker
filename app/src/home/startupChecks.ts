import type { AppInfo, EngineStatus } from "../appInfo";
import type { ScopeId, ThemeManager } from "../theme";
import type { ActionRegistry, Correlation, UiDiagnostic } from "../ui";
import { homeCopy } from "./homeCopy";

const CHECK_IDS = ["shell", "catalogs", "theme", "engine"] as const;
export type CheckId = (typeof CHECK_IDS)[number];

/** `attention` means the check ran and found something the user should know, such as an engine that is not installed. */
export type CheckStatus = "passed" | "attention" | "failed";

/** `detail` is always a sentence for the user; raw technical text goes only to the diagnostic. */
export interface CheckResult {
  readonly id: CheckId;
  readonly status: CheckStatus;
  readonly detail: string;
}

/** The record a failed check leaves for the operator log; `attempt` counts starts and retries from 1. */
export interface StartupDiagnostic extends UiDiagnostic {
  readonly check: CheckId;
  readonly attempt: number;
  /** The raw technical text of the failure, kept out of every screen. */
  readonly detail: string;
}

export type HomeDiagnostic = StartupDiagnostic | UiDiagnostic;

export interface StartupDependencies {
  readonly getAppInfo: () => Promise<AppInfo>;
  readonly getEngineStatus: () => Promise<EngineStatus>;
  readonly loadRegistry: () => ActionRegistry;
  readonly theme: ThemeManager;
  readonly report: (record: HomeDiagnostic) => void;
}

export interface StartupReady {
  readonly ok: true;
  readonly results: readonly CheckResult[];
  readonly info: AppInfo;
  readonly registry: ActionRegistry;
}

interface StartupFailedBase {
  readonly ok: false;
  readonly results: readonly CheckResult[];
  readonly failures: readonly CheckResult[];
  /** Null when the shell never answered. */
  readonly info: AppInfo | null;
}

/** A failure that running the checks again can fix; the screen definitions loaded, so the interface can show a Retry control. */
export interface StartupRetryable extends StartupFailedBase {
  readonly registry: ActionRegistry;
}

/** The screen definitions failed. They are bundled with the program, so trying again cannot help and nothing can be shown but a message. */
export interface StartupDamaged extends StartupFailedBase {
  readonly registry: null;
}

export type StartupFailed = StartupRetryable | StartupDamaged;

export type StartupReport = StartupReady | StartupFailed;

const HOME_SCOPE: ScopeId = "home";

type Checked<T> =
  | { readonly ok: true; readonly result: CheckResult; readonly value: T }
  | { readonly ok: false; readonly result: CheckResult };

interface CheckSpec<T> {
  readonly id: CheckId;
  readonly code: string;
  readonly work: () => T | Promise<T>;
  readonly passed: (value: T) => { readonly status: "passed" | "attention"; readonly detail: string };
  /** The sentence for the user when the work throws. */
  readonly sentence: string;
}

function describeFailure(failure: unknown): string {
  if (failure instanceof Error) return failure.message;
  if (typeof failure === "string") return failure;
  if (typeof failure === "object" && failure !== null && "message" in failure && typeof failure.message === "string") return failure.message;
  return String(failure);
}

async function perform<T>(
  spec: CheckSpec<T>,
  dependencies: StartupDependencies,
  attempt: number,
  correlation: Correlation,
): Promise<Checked<T>> {
  try {
    const value = await spec.work();
    return { ok: true, value, result: { id: spec.id, ...spec.passed(value) } };
  } catch (failure) {
    dependencies.report({
      severity: "error",
      code: spec.code,
      actionId: null,
      controlId: null,
      message: `The ${spec.id} startup check failed.`,
      correlation,
      check: spec.id,
      attempt,
      detail: describeFailure(failure),
    });
    return { ok: false, result: { id: spec.id, status: "failed", detail: spec.sentence } };
  }
}

function activePreset(theme: ThemeManager): string {
  const themeId = theme.getSnapshot(HOME_SCOPE).themeId;
  const preset = theme.listPresets().find((candidate) => candidate.id === themeId);
  if (preset === undefined) throw new Error(`The active appearance "${themeId}" is not a built-in preset.`);
  return preset.label;
}

/** Runs the four checks in order, each against its real owner, and reports every one that fails. */
export async function runStartupChecks(dependencies: StartupDependencies, attempt: number): Promise<StartupReport> {
  const shell = await perform<AppInfo>(
    {
      id: "shell",
      code: "startup-shell-failed",
      work: dependencies.getAppInfo,
      passed: () => ({ status: "passed", detail: homeCopy.details.shellPassed }),
      sentence: homeCopy.details.shellFailed,
    },
    dependencies,
    attempt,
    {},
  );
  // The shell stamps its own launch id on a record that arrives without one, so a shell that never answered still correlates.
  const correlation: Correlation = shell.ok ? { launchId: shell.value.launchId } : {};
  const catalogs = await perform<ActionRegistry>(
    {
      id: "catalogs",
      code: "startup-catalogs-invalid",
      work: dependencies.loadRegistry,
      passed: () => ({ status: "passed", detail: homeCopy.details.catalogsPassed }),
      sentence: homeCopy.details.catalogsFailed,
    },
    dependencies,
    attempt,
    correlation,
  );
  const theme = await perform<string>(
    {
      id: "theme",
      code: "startup-theme-missing",
      work: () => activePreset(dependencies.theme),
      passed: (label) => ({ status: "passed", detail: homeCopy.details.themeActive(label) }),
      sentence: homeCopy.details.themeFailed,
    },
    dependencies,
    attempt,
    correlation,
  );
  const engine = await perform<EngineStatus>(
    {
      id: "engine",
      code: "startup-engine-failed",
      work: dependencies.getEngineStatus,
      passed: (status) => ({ status: status.installed ? "passed" : "attention", detail: status.reason }),
      sentence: homeCopy.details.engineFailed,
    },
    dependencies,
    attempt,
    correlation,
  );
  const results = [shell.result, catalogs.result, theme.result, engine.result];
  if (shell.ok && catalogs.ok && theme.ok && engine.ok) {
    return { ok: true, results, info: shell.value, registry: catalogs.value };
  }
  const base = { ok: false, results, failures: results.filter((result) => result.status === "failed"), info: shell.ok ? shell.value : null } as const;
  return catalogs.ok ? { ...base, registry: catalogs.value } : { ...base, registry: null };
}
