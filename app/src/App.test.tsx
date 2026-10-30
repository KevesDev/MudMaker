/** The shell is replaced by a fake that answers like the real commands; everything else is the production wiring. */
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const shell = vi.hoisted(() => ({
  quitApp: vi.fn(() => Promise.resolve()),
  writeDiagnostic: vi.fn((_record: unknown) => Promise.resolve()),
  getAppInfo: vi.fn(),
}));

vi.mock("./appInfo", () => ({
  getAppInfo: shell.getAppInfo,
  getEngineStatus: () => Promise.resolve({ installed: false, reason: "The game engine is not installed in this build." }),
  quitApp: shell.quitApp,
  writeDiagnostic: shell.writeDiagnostic,
}));

import { App } from "./App";

const INFO = {
  name: "MudMaker",
  version: "9.8.7",
  buildId: "abc1234",
  platform: "windows",
  arch: "x86_64",
  profile: "debug",
  launchId: "launch-app-test",
};

/** One record for each of the four startup checks. */
const STARTUP_RECORDS = 4;

beforeEach(() => {
  shell.getAppInfo.mockResolvedValue(INFO);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("starts with the production wiring and shows the version and build, with the missing engine only in the log", async () => {
  render(<App />);
  expect(await screen.findByText("Version 9.8.7, build abc1234")).toBeTruthy();
  expect(screen.queryByText(/engine/i)).toBeNull();
  expect(screen.getByRole("button", { name: "Quit" })).toBeTruthy();
  await waitFor(() => expect(shell.writeDiagnostic).toHaveBeenCalledTimes(STARTUP_RECORDS));
  expect(shell.writeDiagnostic.mock.calls.map((call) => (call[0] as { severity: string; code: string }).code)).toEqual([
    "startup-shell-passed",
    "startup-catalogs-passed",
    "startup-theme-passed",
    "startup-engine-missing",
  ]);
  expect(shell.writeDiagnostic.mock.calls.map((call) => (call[0] as { severity: string }).severity)).toEqual(["info", "info", "info", "warning"]);
});

test("clicking Quit requests application exit once", async () => {
  render(<App />);
  await screen.findByText("Version 9.8.7, build abc1234");
  // Input listeners attach in an effect that React may still be holding when the text first appears.
  await act(async () => undefined);
  fireEvent.click(screen.getByRole("button", { name: "Quit" }));
  await waitFor(() => expect(shell.quitApp).toHaveBeenCalledTimes(1));
});

test("sends a refused action to the shell log as information, tagged with the launch id from the shell", async () => {
  render(<App />);
  await screen.findByText("Version 9.8.7, build abc1234");
  // Input listeners attach in an effect that React may still be holding when the text first appears.
  await act(async () => undefined);
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => expect(shell.writeDiagnostic).toHaveBeenCalledTimes(STARTUP_RECORDS + 1));
  expect(shell.writeDiagnostic.mock.calls[STARTUP_RECORDS]?.[0]).toMatchObject({
    severity: "info",
    code: "no-action-owner",
    actionId: "ui.nav.create",
    controlId: "home.splash.04",
    correlation: { launchId: INFO.launchId },
  });
});

test("sends a failed startup check to the shell log with the raw text only in the detail field, and tells the user in plain words", async () => {
  shell.getAppInfo.mockRejectedValue(new Error("pipe closed"));
  render(<App />);
  const alert = await waitFor(() => {
    const found = screen.getAllByRole("alert").find((region) => region.closest(".ui-visually-hidden") === null);
    if (!found) throw new Error("No visible alert yet.");
    return found;
  });
  expect(alert.textContent).not.toContain("pipe closed");
  await waitFor(() => expect(shell.writeDiagnostic).toHaveBeenCalledTimes(STARTUP_RECORDS));
  const record = shell.writeDiagnostic.mock.calls[0]?.[0] as Record<string, unknown>;
  expect(record).toMatchObject({ severity: "error", code: "startup-shell-failed", detail: "pipe closed" });
  expect(String(record["message"])).not.toContain("pipe closed");
});

test("keeps working and reports to the console when the shell log cannot be written", async () => {
  shell.writeDiagnostic.mockRejectedValue(new Error("disk full"));
  render(<App />);
  await screen.findByText("Version 9.8.7, build abc1234");
  // Input listeners attach in an effect that React may still be holding when the text first appears.
  await act(async () => undefined);
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  await waitFor(() => expect(console.error).toHaveBeenCalledWith("MudMaker could not write its diagnostic log", expect.any(Error)));
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
});
