import { getAppInfo, getEngineStatus, quitApp, writeDiagnostic, type DiagnosticRecord } from "../appInfo";
import { themeManager } from "../theme";
import { loadShippedRegistry } from "../ui";
import { createDiagnosticSink } from "./diagnosticSink";
import { STARTUP_REQUIRES_ENGINE } from "./startupConfig";
import type { StartupDependencies } from "./startupChecks";

export interface HomeDependencies extends StartupDependencies {
  readonly quit: () => Promise<void>;
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
  report: createDiagnosticSink({
    write: writeDiagnostic,
    logFailed: reportLogFailure,
    ...(import.meta.env.DEV ? { echo: echoToConsole } : {}),
  }),
};
