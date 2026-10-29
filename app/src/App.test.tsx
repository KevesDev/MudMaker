import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { quitApp } = vi.hoisted(() => ({
  quitApp: vi.fn(() => Promise.resolve()),
}));

vi.mock("./appInfo", () => ({
  getAppInfo: () =>
    Promise.resolve({
      name: "MudMaker",
      version: "9.8.7",
      buildId: "abc1234",
      platform: "windows",
      arch: "x86_64",
      profile: "debug",
    }),
  quitApp: quitApp,
}));

import { App } from "./App";

afterEach(cleanup);

test("renders build facts from app_info and the engine status line", async () => {
  render(<App />);
  expect(await screen.findByText("9.8.7")).toBeTruthy();
  expect(screen.getByText("abc1234")).toBeTruthy();
  expect(screen.getByText("windows")).toBeTruthy();
  expect(screen.getByText("x86_64")).toBeTruthy();
  expect(screen.getByText("Game engine: not installed in this build")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Quit" })).toBeTruthy();
});

test("clicking Quit requests application exit once", async () => {
  render(<App />);
  await screen.findByText("9.8.7");
  fireEvent.click(screen.getByRole("button", { name: "Quit" }));
  expect(quitApp).toHaveBeenCalledTimes(1);
});
