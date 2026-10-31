/** Drives the World Library through the real application and Input Manager. jsdom cannot show layout or touch feel. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { healthyHome, renderApp } from "../home/homeTestSupport";
import { SPLASH } from "../home/homeLayout";
import { NAVIGATION } from "../nav/destinations";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ClientProfileBook, PreferencesStore } from "../prefs";
import { PREFERENCES_VERSION } from "../prefs/prefsConfig";
import { ThemeManager } from "../theme";
import { loadShippedRegistry } from "../ui";
import { ClientSessions } from "./ClientSessions";
import { PlayWorkspace } from "./PlayWorkspace";
import { ADAPTERS, LIBRARY } from "./playLayout";

const registry = loadShippedRegistry();
const label = (id: string): string => registry.requireControl(id).label;
let unbind: (() => void) | null = null;
let book: ClientProfileBook;

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
  book = new ClientProfileBook(ADAPTERS.map((adapter) => adapter.value));
});
afterEach(() => {
  cleanup();
  unbind?.();
  unbind = null;
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-input-modality");
});

async function openLibrary(): Promise<void> {
  const sessions = new ClientSessions();
  const Play = () => <PlayWorkspace sessions={sessions} profiles={book} />;
  unbind = renderApp(healthyHome({ surfaces: { play: Play } })).unbind;
  await screen.findByRole("heading", { level: 1 });
  await act(async () => undefined);
  fireEvent.click(screen.getByRole("button", { name: label(SPLASH.play) }));
  await screen.findByRole("main", { name: label(NAVIGATION.play.entries.play) });
}

const click = (name: string): void => {
  fireEvent.click(screen.getByRole("button", { name }));
};
const type = (name: string, value: string): void => {
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
};
async function addWorld(name: string, host: string, port: string, tlsOff = false): Promise<void> {
  click(label(LIBRARY.add));
  await screen.findByLabelText("Name");
  type("Name", name);
  type(label(LIBRARY.host), host);
  type(label(LIBRARY.port), port);
  if (tlsOff) {
    fireEvent.click(screen.getByRole("switch", { name: label(LIBRARY.tls) }));
    await screen.findByText("Not encrypted");
  }
  click("Save");
}
const rows = (): string[] => screen.queryAllByRole("option").map((row) => row.textContent ?? "");

describe("World Library profiles", () => {
  it("renders the library with search, Add World and the cue from a preferences file that has no client profiles", async () => {
    const store = new PreferencesStore({ bridge: { read: () => Promise.resolve({ version: PREFERENCES_VERSION }), write: () => Promise.resolve() }, report: () => undefined, profiles: book });
    await store.restore(new ThemeManager(themeDefaults));
    await openLibrary();
    expect(screen.getByLabelText(label(LIBRARY.search))).toBeTruthy();
    expect(screen.getByRole("button", { name: label(LIBRARY.add) })).toBeTruthy();
    expect(screen.getByRole("button", { name: label(LIBRARY.edit) })).toBeTruthy();
    expect(screen.getByText("No saved worlds.")).toBeTruthy();
  });

  it("saves a profile, lists favorites first then by name, and filters live", async () => {
    await openLibrary();
    await addWorld("Zephyr", "z.example.test", "4000");
    await addWorld("Ashenvale", "a.example.test", "4001", true);
    await waitFor(() => expect(rows()).toEqual(["Ashenvalea.example.test:4001Not encrypted", "Zephyrz.example.test:4000"]));
    expect(screen.queryByText("No saved worlds.")).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: /Zephyr/ }));
    click("Favorite");
    await waitFor(() => expect(rows()[0]).toBe("Zephyrz.example.test:4000Favorite"));
    fireEvent.change(screen.getByLabelText(label(LIBRARY.search)), { target: { value: "ASHEN" } });
    expect(rows()).toEqual(["Ashenvalea.example.test:4001Not encrypted"]);
  });

  it("edits the selected profile, asks before deleting and disables Edit and Delete with no selection", async () => {
    await openLibrary();
    await addWorld("Ashenvale", "a.example.test", "4001");
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByRole("option", { name: /Ashenvale/ }));
    click(label(LIBRARY.edit));
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Ashenvale");
    type("Name", "Ashenvale Two");
    click("Save");
    await waitFor(() => expect(rows()).toEqual(["Ashenvale Twoa.example.test:4001"]));
    expect(book.getSnapshot()).toHaveLength(1);
    click(label(LIBRARY.remove));
    const dialog = await screen.findByRole("dialog", { name: "Delete Ashenvale Two?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(book.getSnapshot()).toHaveLength(1);
    click(label(LIBRARY.remove));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(book.getSnapshot()).toEqual([]));
    expect(await screen.findByText("No saved worlds.")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("button", { name: label(LIBRARY.edit) }).getAttribute("aria-disabled")).toBe("true"));
  });

  it("shows inline errors and saves nothing for an incomplete form, and Cancel leaves without saving", async () => {
    await openLibrary();
    click(label(LIBRARY.add));
    click("Save");
    expect((await screen.findAllByRole("alert")).map((alert) => alert.textContent).filter((text) => text !== "")).toEqual(["Enter a name for this world.", "Enter the server address.", "Enter a port from 1 to 65535."]);
    expect(book.getSnapshot()).toEqual([]);
    type("Name", "Ashenvale");
    click("Cancel");
    expect(await screen.findByText("No saved worlds.")).toBeTruthy();
    expect(book.getSnapshot()).toEqual([]);
  });
});
