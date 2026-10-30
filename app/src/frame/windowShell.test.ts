/** The Tauri window API is replaced by a recorder: these tests show which window call each shell method makes, not what Windows does with it. */
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  window: {
    minimize: vi.fn(() => Promise.resolve()),
    toggleMaximize: vi.fn(() => Promise.resolve()),
    isMaximized: vi.fn(() => Promise.resolve(true)),
    onResized: vi.fn((_handler: (event: unknown) => void) => Promise.resolve(() => undefined)),
  },
  getCurrentWindow: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: api.getCurrentWindow }));

import { tauriWindowShell } from "./windowShell";

afterEach(() => {
  vi.clearAllMocks();
});

describe("the Tauri window shell", () => {
  it("looks the window up on each call, never on import", () => {
    expect(api.getCurrentWindow).not.toHaveBeenCalled();
  });

  it("sends minimize, toggle and the maximized question to the current window, one call each", async () => {
    api.getCurrentWindow.mockReturnValue(api.window);
    await tauriWindowShell.minimize();
    await tauriWindowShell.toggleMaximize();
    expect(await tauriWindowShell.isMaximized()).toBe(true);
    expect(api.window.minimize).toHaveBeenCalledTimes(1);
    expect(api.window.toggleMaximize).toHaveBeenCalledTimes(1);
    expect(api.window.isMaximized).toHaveBeenCalledTimes(1);
  });

  it("calls the listener, with no event, on every resize and returns the function that stops listening", async () => {
    api.getCurrentWindow.mockReturnValue(api.window);
    const stopListening = vi.fn();
    api.window.onResized.mockResolvedValueOnce(stopListening);
    const listener = vi.fn();
    const stop = await tauriWindowShell.onStateChange(listener);
    const handler = api.window.onResized.mock.calls[0]?.[0];
    expect(handler).toBeDefined();
    handler?.({ payload: { width: 1, height: 1 } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith();
    stop();
    expect(stopListening).toHaveBeenCalledTimes(1);
  });

  it("rejects instead of throwing when there is no window, so the caller can log it", async () => {
    api.getCurrentWindow.mockImplementation(() => {
      throw new Error("no shell");
    });
    const calls = [
      () => tauriWindowShell.minimize(),
      () => tauriWindowShell.toggleMaximize(),
      () => tauriWindowShell.isMaximized(),
      () => tauriWindowShell.onStateChange(() => undefined),
    ];
    for (const call of calls) {
      let returned: Promise<unknown> | null = null;
      expect(() => {
        returned = call();
      }).not.toThrow();
      await expect(returned).rejects.toThrow("no shell");
    }
  });
});
