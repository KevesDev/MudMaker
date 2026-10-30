import { getCurrentWindow } from "@tauri-apps/api/window";

/** What the interface may ask of the window it lives in; the shell owns the window and answers every call. */
export interface WindowShell {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  isMaximized(): Promise<boolean>;
  /** Calls the listener after every change of the window's size or state; resolves to the function that stops it. */
  onStateChange(listener: () => void): Promise<() => void>;
}

/**
 * The real window. It is looked up on each call, and every method is async, so a missing shell
 * is a rejected promise the caller can log instead of an exception thrown while rendering.
 */
export const tauriWindowShell: WindowShell = {
  minimize: async () => getCurrentWindow().minimize(),
  toggleMaximize: async () => getCurrentWindow().toggleMaximize(),
  isMaximized: async () => getCurrentWindow().isMaximized(),
  onStateChange: async (listener) => getCurrentWindow().onResized(() => listener()),
};
