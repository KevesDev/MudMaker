import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GLYPHS } from "../frame/frameLayout";
import { SPLASH } from "../home/homeLayout";
import { healthyHome, renderApp, visibleText } from "../home/homeTestSupport";
import { MENU_CARET, NAVIGATION } from "../nav/destinations";
import { focusableWithin, loadShippedRegistry } from "../ui";
import { createTestUi, renderWithUi } from "../ui/testSupport";
import { DockPanel } from "./DockPanel";
import { CreateShell, EditorShell } from "./EditorShell";
import { described, stubBox } from "./editorTestSupport";

const registry = loadShippedRegistry();
const label = (id: string): string => registry.requireControl(id).label;
let unbind: (() => void) | null = null;

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  cleanup();
  unbind?.();
  unbind = null;
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-input-modality");
});

describe("the Create workspace as the application mounts it", () => {
  it("shows empty graph paper and its two toggles and nothing else beyond the frame row", async () => {
    unbind = renderApp(healthyHome({ surfaces: { create: CreateShell } })).unbind;
    await screen.findByRole("heading", { level: 1 });
    await act(async () => undefined);
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH.create) }));
    const surface = await screen.findByRole("main", { name: label(NAVIGATION.create.entries.create) });
    await waitFor(() => expect(document.activeElement).toBe(surface));
    expect(surface.querySelector(".editor-shell")).not.toBeNull();
    expect(focusableWithin(surface).map((stop) => stop.getAttribute("aria-label") ?? stop.textContent)).toEqual([label("editor.graph.10"), label("editor.graph.09"), label("editor.graph.01")]);
    expect(surface.querySelector("h1, h2, h3, [role=tab], [role=tablist], [role=separator], p")).toBeNull();
    expect(surface.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
    expect(visibleText()).toEqual([
      "MudMaker",
      label(NAVIGATION.create.entries.create),
      label(SPLASH.settings),
      MENU_CARET,
      label(NAVIGATION.create.opener),
      MENU_CARET,
      GLYPHS.minimize,
      GLYPHS.maximize,
      GLYPHS.close,
      label("editor.graph.10"),
      label("editor.graph.09"),
    ]);
  });
});

describe("the shell with features mounted into it", () => {
  const sections = [{ id: "id", label: "Identity", fields: [{ id: "name", label: "Name", control: ({ id }: { id: string }) => <input id={id} /> }] }];

  function mountShell(withInspector: boolean) {
    stubBox(".editor-split", { width: 1000 });
    return renderWithUi(
      createTestUi(),
      <EditorShell
        documents={{ described: described("editor.shell.13"), tabs: [{ id: "a", title: "Docs A", dirty: false }, { id: "b", title: "Docs B", dirty: true }], activeId: "b", onSelect: () => undefined, onClose: () => undefined, onMove: () => undefined }}
        assets={
          <DockPanel described={described("editor.assets.01")} open onClose={() => undefined}>
            <button type="button">Assets control</button>
          </DockPanel>
        }
        surface={<button type="button">Surface control</button>}
        {...(withInspector ? { inspector: { described: described("editor.inspector.01"), sections } } : {})}
      />,
    );
  }

  it("orders focus across the open documents, the Assets drawer, the surface and the Inspector, and names the surface by the active document", () => {
    mountShell(true);
    const stops = [screen.getByRole("tab", { name: /Docs B/ }), screen.getByText("Assets control"), screen.getByText("Surface control"), screen.getByRole("button", { name: "Identity" })];
    stops.slice(1).forEach((stop, index) => {
      expect((stops[index] as Element).compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(screen.getByRole("tab", { name: /Docs B/ }).id);
    expect(panel.contains(screen.getByText("Surface control"))).toBe(true);
    expect(screen.getByRole("separator")).toBeTruthy();
  });

  it("has no separator and no Inspector region while nothing is selected", () => {
    mountShell(false);
    expect(screen.queryByRole("separator")).toBeNull();
    expect(screen.queryByRole("region", { name: described("editor.inspector.01").label })).toBeNull();
  });

  it("draws no tab panel or strip for a single document", () => {
    renderWithUi(
      createTestUi(),
      <EditorShell documents={{ described: described("editor.shell.13"), tabs: [{ id: "a", title: "Only", dirty: false }], activeId: "a", onSelect: () => undefined, onClose: () => undefined, onMove: () => undefined }} surface={<p>Work</p>} />,
    );
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.getByText("Work")).toBeTruthy();
  });
});
