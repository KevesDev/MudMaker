/** jsdom draws nothing and has no shell: these tests show the row's structure and slot order, not its pixels or dragging. */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Menu } from "../ui";
import { GO_SETTINGS, GO_TO, createTestUi, renderWithUi } from "../ui/testSupport";
import { AppFrame, AppWindow } from "./AppFrame";

afterEach(cleanup);

describe("AppFrame", () => {
  it("puts the title first, then the middle, then the end, and the window controls last", () => {
    const { container } = render(
      <AppFrame
        title="Workspace"
        titleTestId="title-id"
        middle={<span data-testid="middle">frequent</span>}
        end={<span data-testid="end">menus</span>}
        windowControls={<div data-testid="controls">window</div>}
      />,
    );
    const row = container.querySelector(".app-frame");
    expect([...(row?.children ?? [])].map((child) => child.className || child.getAttribute("data-testid"))).toEqual([
      "app-frame-title",
      "app-frame-middle",
      "app-frame-end",
      "controls",
    ]);
    expect(row?.querySelector(".app-frame-title")?.getAttribute("data-testid")).toBe("title-id");
    expect(row?.querySelector(".app-frame-middle [data-testid='middle']")).not.toBeNull();
    expect(row?.querySelector(".app-frame-end [data-testid='end']")).not.toBeNull();
  });

  it("is only the title and an empty middle on the home screen, and declares the whole row a drag region", () => {
    const { container } = render(<AppFrame title="MudMaker" />);
    const row = container.querySelector(".app-frame");
    expect(row?.textContent).toBe("MudMaker");
    expect(row?.querySelector(".app-frame-middle")?.childElementCount).toBe(0);
    expect(row?.querySelector(".app-frame-end")).toBeNull();
    expect(row?.getAttribute("data-tauri-drag-region")).toBe("deep");
  });

  it("puts the application mark ahead of the title when one is given, and draws nothing for it by default", () => {
    const withMark = render(<AppFrame title="MudMaker" leading={<span data-testid="mark">m</span>} />);
    const row = withMark.container.querySelector(".app-frame");
    expect([...(row?.children ?? [])].map((child) => child.className)).toEqual(["app-frame-leading", "app-frame-title", "app-frame-middle"]);
    expect(row?.querySelector(".app-frame-leading [data-testid='mark']")).not.toBeNull();
    cleanup();
    const without = render(<AppFrame title="MudMaker" />);
    expect(without.container.querySelector(".app-frame-leading")).toBeNull();
  });

  it("gives the title a test id only when it is given one", () => {
    const { container } = render(<AppFrame title="MudMaker" />);
    expect(container.querySelector(".app-frame-title")?.hasAttribute("data-testid")).toBe(false);
  });
});

describe("menus in the middle and end slots", () => {
  it("keep their own positioned anchor, which no window-control rule reaches", () => {
    const ui = createTestUi();
    const menu = <Menu opener={ui.control(GO_TO)} items={[ui.control(GO_SETTINGS)]} />;
    const { container } = renderWithUi(ui, <AppFrame title="Workspace" middle={menu} end={menu} windowControls={<div className="app-frame-controls" />} />);
    const anchors = [...container.querySelectorAll<HTMLElement>(".app-frame-middle .ui-anchor, .app-frame-end .ui-anchor")];
    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      expect(anchor.closest(".app-frame-controls")).toBeNull();
      expect(anchor.matches(".app-frame-controls .ui-anchor")).toBe(false);
    }
  });
});

describe("AppWindow", () => {
  it("places the frame above a separate content region that holds the screen", () => {
    const { container } = render(
      <AppWindow frame={<div data-testid="frame" />}>
        <p data-testid="screen">screen</p>
      </AppWindow>,
    );
    const window = container.querySelector(".app-window");
    expect([...(window?.children ?? [])].map((child) => child.getAttribute("data-testid") ?? child.className)).toEqual(["frame", "app-window-content"]);
    expect(window?.querySelector(".app-window-content [data-testid='screen']")).not.toBeNull();
  });
});
