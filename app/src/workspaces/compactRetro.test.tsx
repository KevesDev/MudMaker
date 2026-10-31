import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { healthyHome, renderApp } from "../home/homeTestSupport";
import { CreateShell } from "../editor/CreateShell";
import { PlayWorkspace } from "../play/PlayWorkspace";
import { HostWorkspace } from "../host/HostWorkspace";
import { clientDisplay } from "../prefs";
import { SCOPE_IDS } from "../theme";

let stop: (() => void) | undefined;
afterEach(() => { cleanup(); stop?.(); document.documentElement.removeAttribute("style"); });
async function start(workspace: "Create" | "Play") {
  const home = healthyHome({ surfaces: { create: CreateShell, play: PlayWorkspace, host: HostWorkspace } });
  stop = renderApp(home).unbind;
  await screen.findByRole("heading", { level: 1 });
  await act(async () => undefined);
  fireEvent.click(screen.getByRole("button", { name: workspace }));
  await screen.findByRole("main", { name: workspace });
  return home;
}
describe("compact retro interactions", () => {
  it("keeps truthful local tool selection and Output choice feedback while commands stay momentary", async () => {
    await start("Create");
    expect(screen.getByRole("button", { name: "Select Tool" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Paint" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Paint" }).getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByRole("button", { name: "Select Tool" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Save" }).getAttribute("aria-pressed")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Output" }));
    const output = await screen.findByRole("region", { name: "Problems and output" });
    fireEvent.click(within(output).getByRole("tab", { name: "Build Logs" }));
    await waitFor(() => expect(within(output).getByRole("tab", { name: "Build Logs" }).getAttribute("aria-selected")).toBe("true"));
    expect(within(output).getByRole("tab", { name: "Problems" }).getAttribute("aria-selected")).toBe("false");
  });
  it("separates app-wide Theme from local Timestamps across three actual popup levels", async () => {
    const home = await start("Play");
    const before = clientDisplay.getSnapshot().timestamps;
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Appearance" }));
    const appearance = await screen.findByRole("menu", { name: "Appearance" });
    expect(within(appearance).queryAllByRole("menuitemradio")).toEqual([]);
    expect(within(appearance).getByRole("menuitemcheckbox", { name: "Timestamps" })).toBeTruthy();
    fireEvent.click(within(appearance).getByRole("menuitem", { name: "Theme" }));
    const themes = await screen.findByRole("menu", { name: "Theme" });
    expect(screen.getAllByRole("menu")).toHaveLength(3);
    expect(within(themes).queryByRole("menuitemcheckbox", { name: "Timestamps" })).toBeNull();
    const target = home.manager.listPresets()[1];
    fireEvent.click(within(themes).getByRole("menuitemradio", { name: target?.label }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(SCOPE_IDS.map((scope) => home.manager.getInputs(scope).presetId)).toEqual(SCOPE_IDS.map(() => target?.id));
    expect(clientDisplay.getSnapshot().timestamps).toBe(before);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Appearance" }));
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Timestamps" }));
    await waitFor(() => expect(clientDisplay.getSnapshot().timestamps).toBe(!before));
    expect(SCOPE_IDS.map((scope) => home.manager.getInputs(scope).presetId)).toEqual(SCOPE_IDS.map(() => target?.id));
    act(() => { clientDisplay.setTimestamps(before); });
  });
});
