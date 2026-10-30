/** The shell is replaced by a fake and the named startup setting is set to true; everything else is the production wiring. */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const shell = vi.hoisted(() => ({
  writeDiagnostic: vi.fn((_record: unknown) => Promise.resolve()),
}));

vi.mock("../appInfo", () => ({
  getAppInfo: () =>
    Promise.resolve({ name: "MudMaker", version: "9.8.7", buildId: "abc1234", platform: "windows", arch: "x86_64", profile: "debug", launchId: "launch-wiring-test" }),
  getEngineStatus: () => Promise.resolve({ installed: false, reason: "The game engine is not installed in this build." }),
  quitApp: () => Promise.resolve(),
  writeDiagnostic: shell.writeDiagnostic,
}));

vi.mock("../frame/windowShell", () => ({
  tauriWindowShell: {
    minimize: () => Promise.resolve(),
    toggleMaximize: () => Promise.resolve(),
    isMaximized: () => Promise.resolve(false),
    onStateChange: () => Promise.resolve(() => undefined),
  },
}));

vi.mock("./startupConfig", () => ({ STARTUP_REQUIRES_ENGINE: true }));

import { App } from "../App";
import { productionDependencies } from "./homeDependencies";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("passes the named setting to the startup checks, so a required engine that is missing shows the failure screen with Retry", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  expect(productionDependencies.requireEngine).toBe(true);
  render(<App />);
  const alert = await waitFor(() => {
    const found = screen.getAllByRole("alert").find((region) => region.closest(".ui-visually-hidden") === null);
    if (!found) throw new Error("No visible alert yet.");
    return found;
  });
  expect(alert.textContent).toBe("MudMaker could not start: Game engine.");
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "MudMaker", level: 1 })).toBeNull();
  await waitFor(() => expect(shell.writeDiagnostic).toHaveBeenCalledTimes(4));
  expect(shell.writeDiagnostic.mock.calls.map((call) => call[0])).toContainEqual(
    expect.objectContaining({ severity: "error", code: "startup-engine-missing", check: "engine" }),
  );
});
