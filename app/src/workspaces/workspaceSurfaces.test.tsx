/** Mounts each workspace through the real application. jsdom draws nothing, so layout, focus rings and touch feel are checked by hand. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CreateShell } from "../editor/CreateShell";
import { HostWorkspace } from "../host/HostWorkspace";
import { healthyHome, renderApp } from "../home/homeTestSupport";
import { SPLASH } from "../home/homeLayout";
import { NAVIGATION, type WorkspaceDestination } from "../nav/destinations";
import { ClientSessions } from "../play/ClientSessions";
import { PlayWorkspace } from "../play/PlayWorkspace";
import { loadShippedRegistry } from "../ui";

const registry = loadShippedRegistry();
const label = (id: string): string => registry.requireControl(id).label;
const button = (id: string): HTMLElement => screen.getByRole("button", { name: label(id) });
const testId = (id: string): string => registry.requireControl(id).testId;
let unbind: (() => void) | null = null;
const sessions = new ClientSessions();

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
  for (const session of sessions.getSnapshot().sessions) sessions.close(session.id);
});

afterEach(() => {
  cleanup();
  unbind?.();
  unbind = null;
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-input-modality");
});

async function open(workspace: WorkspaceDestination): Promise<HTMLElement> {
  const Play = () => <PlayWorkspace sessions={sessions} />;
  unbind = renderApp(healthyHome({ surfaces: { create: CreateShell, play: Play, host: HostWorkspace } })).unbind;
  await screen.findByRole("heading", { level: 1 });
  await act(async () => undefined);
  fireEvent.click(screen.getByRole("button", { name: label(SPLASH[workspace]) }));
  return screen.findByRole("main", { name: label(NAVIGATION[workspace].entries[workspace]) });
}

/** A control whose action nobody handles stays an ordinary button with no state text and no notice. */
async function expectNothingShown(id: string): Promise<void> {
  await act(async () => undefined);
  const control = document.querySelector(`[data-control-id="${id}"]`);
  expect(control?.closest(".ui-anchor")?.querySelector(".ui-state-text")).toBeNull();
  expect(document.querySelector(".ui-toast")).toBeNull();
  expect(control?.getAttribute("data-state")).toBe("ready");
}

/** Every catalog control on screen carries its catalog test id and is known to the registry. */
function expectCatalogControls(surface: ParentNode, expected: readonly string[]): void {
  const found = [...surface.querySelectorAll<HTMLElement>("[data-control-id]")].map((element) => element.getAttribute("data-control-id") ?? "");
  for (const id of found) expect(registry.control(id)?.testId, id).toBe(surface.querySelector(`[data-control-id="${id}"]`)?.closest("[data-testid]")?.getAttribute("data-testid"));
  for (const id of expected) expect(found, id).toContain(id);
}


const frameRow = (): HTMLElement => screen.getByRole("region", { name: "Window bar" });
const byTestId = (id: string): Element | null => document.querySelector(`[data-testid="${testId(id)}"]`);

describe("Create", () => {
  it("puts its actions in the one frame row and shows nothing for an unbuilt action", async () => {
    await open("create");
    expectCatalogControls(document.body, ["editor.shell.01", "editor.shell.02", "editor.shell.03", "editor.shell.04", "editor.shell.14", "editor.shell.09", "editor.shell.08", "editor.map.02", "editor.map.10", "editor.map.11", "editor.map.14"]);
    for (const id of ["editor.shell.01", "editor.shell.14", "editor.shell.09"]) expect(frameRow().contains(byTestId(id)), id).toBe(true);
    expect(screen.queryByRole("button", { name: label("editor.shell.05") })).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.queryByRole("region", { name: "Problems and output" })).toBeNull();
    fireEvent.click(button("editor.shell.01"));
    await expectNothingShown("editor.shell.01");
  });

  it("opens Build and View as menus, and View opens the Assets drawer and then the output strip on demand", async () => {
    await open("create");
    fireEvent.click(button("editor.shell.14"));
    const build = await screen.findByRole("menu", { name: label("editor.shell.14") });
    expect(within(build).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["editor.shell.05", "editor.shell.06", "editor.shell.07"].map((id) => expect.stringContaining(label(id))));
    fireEvent.keyDown(build, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    fireEvent.click(button("editor.shell.09"));
    fireEvent.click(await screen.findByRole("menuitem", { name: label("editor.shell.15") }));
    const assets = await screen.findByRole("complementary", { name: label("editor.assets.01") });
    expect(within(assets).queryAllByRole("treeitem")).toHaveLength(0);
    expect(within(assets).getByLabelText(label("editor.assets.02"))).toBeTruthy();
    fireEvent.click(button("editor.shell.09"));
    fireEvent.click(await screen.findByRole("menuitem", { name: label("editor.diagnostics.02") }));
    const drawer = await screen.findByRole("region", { name: "Problems and output" });
    expect(within(drawer).getByRole("tab", { name: label("editor.diagnostics.02") }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("region", { name: label("editor.inspector.01") })).toBeNull();
  });
});

describe("Play", () => {
  it("shows the library, opens the profile form, warns only when TLS is off and flags a bad port", async () => {
    const surface = await open("play");
    expectCatalogControls(surface, ["client.worlds.02", "client.worlds.03", "client.worlds.04", "client.worlds.05", "client.worlds.07"]);
    expect(screen.getByText("No saved worlds.")).toBeTruthy();
    expect(screen.queryByText("Select a world from the list first.")).toBeNull();
    fireEvent.click(button("client.worlds.05"));
    await expectNothingShown("client.worlds.05");
    fireEvent.click(button("client.worlds.02"));
    const host = await screen.findByLabelText(label("client.worlds.09"));
    fireEvent.change(host, { target: { value: "mud.example.test" } });
    expect((host as HTMLInputElement).value).toBe("mud.example.test");
    fireEvent.change(screen.getByLabelText(label("client.worlds.10")), { target: { value: "70000" } });
    expect(screen.getByText("Enter a port from 1 to 65535.").getAttribute("role")).toBe("alert");
    fireEvent.change(screen.getByLabelText(label("client.worlds.10")), { target: { value: "7000" } });
    expect(screen.queryByText("Enter a port from 1 to 65535.")).toBeNull();
    expect(byTestId("client.worlds.12")).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: label("client.worlds.11") }));
    await waitFor(() => expect(byTestId("client.worlds.12")?.textContent).toBe("Not encrypted"));
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("No saved worlds.")).toBeTruthy();
  });

  it("shows the open game with its actions in the frame row, picks one side panel from the View menu, and returns to the library on Disconnect", async () => {
    sessions.open({ id: "one", worldName: "Ashenvale", connected: true });
    await open("play");
    expectCatalogControls(document.body, ["client.game.03", "client.game.09", "client.transcript.02", "client.composer.02", "client.composer.03"]);
    for (const id of ["client.game.01", "client.game.02", "client.game.03", "client.game.09", "client.transcript.02"]) expect(frameRow().contains(byTestId(id)), id).toBe(true);
    expect(byTestId("client.game.01")?.textContent).toBe("Ashenvale");
    expect(byTestId("client.game.02")?.textContent).toBe("Connected");
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    fireEvent.change(screen.getByLabelText(label("client.composer.02")), { target: { value: "look" } });
    expect((screen.getByLabelText(label("client.composer.02")) as HTMLInputElement).value).toBe("look");
    fireEvent.click(button("client.composer.03"));
    await expectNothingShown("client.composer.03");
    fireEvent.click(button("client.game.09"));
    const menu = await screen.findByRole("menu", { name: label("client.game.09") });
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(8);
    fireEvent.click(within(menu).getByRole("menuitem", { name: label("client.panels.03") }));
    const drawer = await screen.findByRole("complementary", { name: label("client.panels.03") });
    fireEvent.click(within(drawer).getByRole("button", { name: label("client.panels.11") }));
    await waitFor(() => expect(screen.queryByRole("complementary")).toBeNull());
    fireEvent.click(button("client.game.03"));
    expect(await screen.findByText("No saved worlds.")).toBeTruthy();
    expect(sessions.getSnapshot().sessions).toEqual([]);
  });

  it("draws the session tab strip only while two games are open", async () => {
    sessions.open({ id: "one", worldName: "Ashenvale", connected: true });
    await open("play");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    act(() => sessions.open({ id: "two", worldName: "Brackwater", connected: true }));
    expect((await screen.findAllByRole("tab")).map((tab) => tab.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("Ashenvale"), expect.stringContaining("Brackwater")]));
  });
});

describe("Host", () => {
  it("shows the stopped state and Start in the frame row, with no section list until asked, and Start shows nothing", async () => {
    await open("host");
    expectCatalogControls(document.body, ["host.dashboard.03", "host.dashboard.13"]);
    expect(frameRow().contains(button("host.dashboard.03"))).toBe(true);
    expect(byTestId("host.dashboard.02")?.textContent).toBe("Stopped");
    expect(screen.queryByRole("button", { name: label("host.dashboard.04") })).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByText("No releases.")).toBeNull();
    fireEvent.click(button("host.dashboard.03"));
    await expectNothingShown("host.dashboard.03");
  });

  it("switches sections from the Operations menu and warns about public exposure only for an address open to other machines", async () => {
    await open("host");
    const choose = async (id: string): Promise<void> => {
      fireEvent.click(button("host.dashboard.13"));
      fireEvent.click(await screen.findByRole("menuitem", { name: label(id) }));
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    };
    await choose("host.dashboard.10");
    expect(await screen.findByText("No log entries.")).toBeTruthy();
    await choose("host.network.10");
    const bind = await screen.findByLabelText(label("host.network.01"));
    fireEvent.change(bind, { target: { value: "127.0.0.1" } });
    expect(byTestId("host.network.09")).toBeNull();
    fireEvent.change(bind, { target: { value: "0.0.0.0" } });
    expect(byTestId("host.network.09")?.textContent).toBe("Public connections enabled");
    expect(screen.queryByLabelText(label("host.network.06"))).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: label("host.network.05") }));
    expect(await screen.findByLabelText(label("host.network.06"))).toBeTruthy();
    await choose("host.dashboard.11");
    expect(await screen.findByRole("button", { name: label("host.recovery.04") })).toBeTruthy();
    await choose("host.dashboard.12");
    expect(await screen.findByText("No releases.")).toBeTruthy();
  });
});
