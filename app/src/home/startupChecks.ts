import type { AppInfo, EngineStatus } from "../appInfo";
import type { ScopeId, ThemeManager } from "../theme";
import type { ActionRegistry, Correlation, DiagnosticSeverity, UiDiagnostic } from "../ui";

const CHECK_IDS = ["shell", "catalogs", "theme", "engine"] as const;
export type CheckId = (typeof CHECK_IDS)[number];

/** `attention` means the check ran and found something worth logging that does not stop the launch, such as an engine that is not installed. */
export type CheckStatus = "passed" | "attention" | "failed";

/** What the check found, by name; the words a person reads about a failure come from the home copy. */
export interface CheckResult {
  readonly id: CheckId;
  readonly status: CheckStatus;
}

/** The record each check leaves for the operator log; `attempt` counts starts and retries from 1. */
export interface StartupDiagnostic extends UiDiagnostic {
  readonly check: CheckId;
  readonly attempt: number;
  /** What the check saw, in technical words, kept out of every screen. */
  readonly detail: string;
}

export type HomeDiagnostic = StartupDiagnostic | UiDiagnostic;

export interface StartupDependencies {
  readonly getAppInfo: () => Promise<AppInfo>;
  readonly getEngineStatus: () => Promise<EngineStatus>;
  readonly loadRegistry: () => ActionRegistry;
  readonly theme: ThemeManager;
  /** Whether a missing game engine fails the launch; see STARTUP_REQUIRES_ENGINE. */
  readonly requireEngine: boolean;
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

/** What a check that ran to the end concluded. `detail` is for the log. */
interface Judgement {
  readonly status: CheckStatus;
  readonly code: string;
  readonly detail: string;
}

interface CheckSpec<T> {
  readonly id: CheckId;
  /** The code logged when the work itself throws. */
  readonly failureCode: string;
  readonly work: () => T | Promise<T>;
  readonly judge: (value: T) => Judgement;
  /** The correlation for the record of a check that ran to the end; defaults to the one passed to `perform`. */
  readonly correlate?: (value: T) => Correlation;
}

const SEVERITY: Readonly<Record<CheckStatus, DiagnosticSeverity>> = { passed: "info", attention: "warning", failed: "error" };
const OUTCOME_WORDS: Readonly<Record<CheckStatus, string>> = { passed: "passed", attention: "needs attention", failed: "failed" };

function startupRecord(
  id: CheckId,
  status: CheckStatus,
  code: string,
  detail: string,
  attempt: number,
  correlation: Correlation,
): StartupDiagnostic {
  return {
    severity: SEVERITY[status],
    code,
    actionId: null,
    controlId: null,
    message: `The ${id} startup check ${OUTCOME_WORDS[status]}.`,
    correlation,
    check: id,
    attempt,
    detail,
  };
}

function describeFailure(failure: unknown): string {
  if (failure instanceof Error) return failure.message;
  if (typeof failure === "string") return failure;
  if (typeof failure === "object" && failure !== null && "message" in failure && typeof failure.message === "string") return failure.message;
  return String(failure);
}

/** Runs one check against its real owner and writes one log record for the outcome, whatever it is. */
async function perform<T>(spec: CheckSpec<T>, dependencies: StartupDependencies, attempt: number, correlation: Correlation): Promise<Checked<T>> {
  let value: T;
  try {
    value = await spec.work();
  } catch (failure) {
    dependencies.report(startupRecord(spec.id, "failed", spec.failureCode, describeFailure(failure), attempt, correlation));
    return { ok: false, result: { id: spec.id, status: "failed" } };
  }
  const { status, code, detail } = spec.judge(value);
  dependencies.report(startupRecord(spec.id, status, code, detail, attempt, spec.correlate?.(value) ?? correlation));
  const result: CheckResult = { id: spec.id, status };
  return status === "failed" ? { ok: false, result } : { ok: true, value, result };
}

function activePreset(theme: ThemeManager): string {
  const themeId = theme.getSnapshot(HOME_SCOPE).themeId;
  const preset = theme.listPresets().find((candidate) => candidate.id === themeId);
  if (preset === undefined) throw new Error(`The active appearance "${themeId}" is not a built-in preset.`);
  return preset.label;
}

/** Runs the four checks in order, each against its real owner, and logs every outcome. */
export async function runStartupChecks(dependencies: StartupDependencies, attempt: number): Promise<StartupReport> {
  const shell = await perform<AppInfo>(
    {
      id: "shell",
      failureCode: "startup-shell-failed",
      work: dependencies.getAppInfo,
      judge: (info) => ({
        status: "passed",
        code: "startup-shell-passed",
        detail: `${info.name} ${info.version} build ${info.buildId} on ${info.platform} ${info.arch} (${info.profile}).`,
      }),
      // The shell stamps its own launch id on a record that arrives without one, so a shell that never answered still correlates.
      correlate: (info) => ({ launchId: info.launchId }),
    },
    dependencies,
    attempt,
    {},
  );
  const correlation: Correlation = shell.ok ? { launchId: shell.value.launchId } : {};
  const catalogs = await perform<ActionRegistry>(
    {
      id: "catalogs",
      failureCode: "startup-catalogs-invalid",
      work: dependencies.loadRegistry,
      judge: () => ({ status: "passed", code: "startup-catalogs-passed", detail: "Every screen definition loaded and validated." }),
    },
    dependencies,
    attempt,
    correlation,
  );
  const theme = await perform<string>(
    {
      id: "theme",
      failureCode: "startup-theme-missing",
      work: () => activePreset(dependencies.theme),
      judge: (label) => ({ status: "passed", code: "startup-theme-passed", detail: `${label} is the active appearance.` }),
    },
    dependencies,
    attempt,
    correlation,
  );
  const engine = await perform<EngineStatus>(
    {
      id: "engine",
      failureCode: "startup-engine-failed",
      work: dependencies.getEngineStatus,
      judge: (status) => {
        if (status.installed) return { status: "passed", code: "startup-engine-installed", detail: status.reason };
        return { status: dependencies.requireEngine ? "failed" : "attention", code: "startup-engine-missing", detail: status.reason };
      },
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
