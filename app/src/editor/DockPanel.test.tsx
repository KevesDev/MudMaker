import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tabletQuery } from "../frame/useTabletLayout";
import { createTestUi, renderWithUi } from "../ui/testSupport";
import { DockPanel } from "./DockPanel";
import { described, editorToken, stubMatchMedia } from "./editorTestSupport";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const assets = described("editor.assets.01");

/** The owner of the drawer: an opener it focuses, the open flag, and a row of content with a control inside. */
function Owner({ onClose }: { readonly onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button id="opener" type="button">
        Opener
      </button>
      <button id="toggle" type="button" onClick={() => setOpen(true)}>
        Open drawer
      </button>
      <DockPanel
        described={assets}
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
      >
        <button type="button">First control</button>
        <button type="button">Second control</button>
      </DockPanel>
      <p id="elsewhere">Surface</p>
    </div>
  );
}

describe("the drawer", () => {
  it("draws nothing while collapsed, and when opened is a named region that takes focus into its first control", () => {
    stubMatchMedia(false);
    const ui = createTestUi();
    renderWithUi(ui, <Owner />);
    expect(screen.queryByRole("complementary")).toBeNull();
    fireEvent.click(screen.getByText("Open drawer"));
    expect(screen.getByRole("complementary", { name: assets.label })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByText("First control"));
    expect(ui.diagnostics).toEqual([]);
  });

  it("closes with Escape and returns focus to the control that was focused when it opened, but not on Tab", async () => {
    stubMatchMedia(false);
    const closed = vi.fn();
    renderWithUi(createTestUi(), <Owner onClose={closed} />);
    const opener = document.getElementById("opener") as HTMLElement;
    opener.focus();
    fireEvent.click(screen.getByText("Open drawer"));
    expect(document.activeElement).toBe(screen.getByText("First control"));
    fireEvent.keyDown(document.activeElement as Element, { key: "Tab" });
    expect(closed).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    expect(closed).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("complementary")).toBeNull();
    await act(async () => undefined);
    expect(document.activeElement).toBe(opener);
  });

  it("shares the row at a wide window, and a press outside does not close it", () => {
    stubMatchMedia(false);
    const closed = vi.fn();
    renderWithUi(createTestUi(), <Owner onClose={closed} />);
    fireEvent.click(screen.getByText("Open drawer"));
    expect(screen.getByRole("complementary").className).not.toContain("overlay");
    fireEvent.pointerDown(document.getElementById("elsewhere") as Element, { pointerId: 1, pointerType: "mouse" });
    expect(closed).not.toHaveBeenCalled();
  });

  it("lies over the surface at the tablet width, asked from the theme token, and closes on a press outside but not inside", () => {
    const media = stubMatchMedia(true);
    const closed = vi.fn();
    renderWithUi(createTestUi(), <Owner onClose={closed} />);
    expect(media.queries).toContain(tabletQuery(editorToken("layout.tabletWidth")));
    fireEvent.click(screen.getByText("Open drawer"));
    expect(screen.getByRole("complementary").className).toContain("overlay");
    fireEvent.pointerDown(screen.getByText("Second control"), { pointerId: 1, pointerType: "touch" });
    expect(closed).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.getElementById("elsewhere") as Element, { pointerId: 1, pointerType: "touch" });
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("changes between sharing and overlaying when the window crosses the tablet width, without moving focus", () => {
    const media = stubMatchMedia(false);
    renderWithUi(createTestUi(), <Owner />);
    fireEvent.click(screen.getByText("Open drawer"));
    const second = screen.getByText("Second control");
    second.focus();
    act(() => media.set(true));
    expect(screen.getByRole("complementary").className).toContain("overlay");
    expect(document.activeElement).toBe(second);
    act(() => media.set(false));
    expect(screen.getByRole("complementary").className).not.toContain("overlay");
  });
});
