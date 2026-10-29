import { invoke } from "@tauri-apps/api/core";
import type { UiDiagnostic } from "./ui";

export interface AppInfo {
  name: string;
  version: string;
  buildId: string;
  platform: string;
  arch: string;
  profile: string;
  /** Names this run of the application in every log line it writes. */
  launchId: string;
}

/** Whether the game engine sidecar exists on disk where the shell expects it, with a plain sentence saying so. */
export interface EngineStatus {
  installed: boolean;
  reason: string;
}

/** One interface diagnostic as the shell log stores it: the bus record plus the startup check it belongs to, if any. */
export type DiagnosticRecord = UiDiagnostic & { readonly check?: string; readonly attempt?: number };

export function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("app_info");
}

export function getEngineStatus(): Promise<EngineStatus> {
  return invoke<EngineStatus>("engine_status");
}

export function writeDiagnostic(record: DiagnosticRecord): Promise<void> {
  return invoke<void>("write_diagnostic", { record });
}

export function quitApp(): Promise<void> {
  return invoke<void>("quit_app");
}
