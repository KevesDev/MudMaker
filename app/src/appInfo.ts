import { invoke } from "@tauri-apps/api/core";
import type { PreferencesDocument } from "./prefs";
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

export { getEngineStatus, startEngine } from "./engine/bridge";
export type { EngineStatus } from "./engine/bridge";

/** One interface diagnostic as the shell log stores it: the bus record plus the startup check it belongs to, if any. */
export type DiagnosticRecord = UiDiagnostic & { readonly check?: string; readonly attempt?: number };

export function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("app_info");
}

export function writeDiagnostic(record: DiagnosticRecord): Promise<void> {
  return invoke<void>("write_diagnostic", { record });
}

/** The saved settings document, or null when there is none or it could not be used. */
export function readPreferences(): Promise<unknown> {
  return invoke<unknown>("read_preferences");
}

export function writePreferences(document: PreferencesDocument): Promise<void> {
  return invoke<void>("write_preferences", { document });
}

export function quitApp(): Promise<void> {
  return invoke<void>("quit_app");
}
