import { getAppInfo, getEngineStatus, quitApp, writeDiagnostic, type DiagnosticRecord } from "../appInfo";
import { loadFrameRegistry } from "../frame/frameRegistry";
import { tauriWindowShell, type WindowShell } from "../frame/windowShell";
import { themeManager } from "../theme";
import { loadShippedRegistry, type ActionRegistry } from "../ui";
import { createDiagnosticSink } from "./diagnosticSink";
import { STARTUP_REQUIRES_ENGINE } from "./startupConfig";
import type { StartupDependencies } from "./startupChecks";

export interface HomeDependencies extends StartupDependencies {
  readonly quit: () => Promise<void>;
  readonly windowShell: WindowShell;
  /** The frame's own registry, so the window controls exist before and without the full catalogs. */
  readonly loadFrameRegistry: () => ActionRegistry;
}

const CONSOLE_METHOD = { error: "error", warning: "warn", info: "info" } as const;

function echoToConsole(record: DiagnosticRecord): void {
  console[CONSOLE_METHOD[record.severity]]("MudMaker", record);
}

function reportLogFailure(failure: unknown): void {
  console.error("MudMaker could not write its diagnostic log", failure);
}

/** The real shell, catalogs and theme manager for this window. */
export const productionDependencies: HomeDependencies = {
  getAppInfo,
  getEngineStatus,
  loadRegistry: loadShippedRegistry,
  theme: themeManager,
  requireEngine: STARTUP_REQUIRES_ENGINE,
  quit: quitApp,
  windowShell: tauriWindowShell,
  loadFrameRegistry,
  report: createDiagnosticSink({
    write: writeDiagnostic,
    logFailed: reportLogFailure,
    ...(import.meta.env.DEV ? { echo: echoToConsole } : {}),
  }),
};
