import { invoke } from "@tauri-apps/api/core";

export interface AppInfo {
  name: string;
  version: string;
  buildId: string;
  platform: string;
  arch: string;
  profile: string;
}

export function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("app_info");
}

export function quitApp(): Promise<void> {
  return invoke<void>("quit_app");
}
