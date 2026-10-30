import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestUi, renderWithUi, type TestUi } from "../ui/testSupport";
import { EDITOR_LIMITS } from "./editorConfig";
import { editorCopy } from "./editorCopy";
import { described } from "./editorTestSupport";
import { TabStrip, type DocumentTab } from "./TabStrip";

const strip = described("editor.shell.13");
const doc = (id: string, dirty = false): DocumentTab => ({ id, title: `Doc ${id}`, dirty });
const scrolled = vi.fn();
const capture = vi.fn();
const TAB_WIDTH = 100;

beforeEach(() => {
  Element.prototype.scrollIntoView = scrolled;
  HTMLElement.prototype.setPointerCapture = capture;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const index = Number(this.getAttribute("data-order") ?? Number.NaN);
    const left = Number.isNaN(index) ? 0 : index * TAB_WIDTH;
    const width = Number.isNaN(index) ? 0 : TAB_WIDTH;
    return { x: left, y: 0, left, top: 0, right: left + width, bottom: 0, width, height: 0, toJSON: () => ({}) };
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  scrolled.mockReset();
  capture.mockReset();
});

interface Calls {
  readonly selected: string[];
  readonly closed: string[];
  readonly moved: [string, number][];
}

/** The owner of the documents: it accepts or refuses what the strip asks, and the strip shows what it keeps. */
function Owner({ initial, active, calls, refuse = false }: { readonly initial: DocumentTab[]; readonly active: string; readonly calls: Calls; readonly refuse?: boolean }) {
  const [tabs, setTabs] = useState(initial);
  const [activeId, setActiveId] = useState(active);
  const ordered = tabs.map((tab, index) => ({ ...tab, order: index }));
  return (
    <>
      <TabStrip
        described={strip}
        tabs={tabs}
        activeId={activeId}
        panelId="panel"
        onSelect={(id) => {
          calls.selected.push(id);
          setActiveId(id);
        }}
        onClose={(id) => {
          calls.closed.push(id);
          if (refuse) return;
          const index = tabs.findIndex((tab) => tab.id === id);
          const rest = tabs.filter((tab) => tab.id !== id);
          setTabs(rest);
          if (id === activeId) setActiveId((rest[index] ?? rest[index - 1])?.id ?? "");
        }}
        onMove={(id, toIndex) => {
          calls.moved.push([id, toIndex]);
          if (refuse) return;
          const moving = tabs.find((tab) => tab.id === id);
          if (moving === undefined) return;
          const rest = tabs.filter((tab) => tab.id !== id);
          setTabs([...rest.slice(0, toIndex), moving, ...rest.slice(toIndex)]);
        }}
      />
      <output data-testid="order">{ordered.map((tab) => tab.id).join(",")}</output>
    </>
  );
}

let ui: TestUi;
function mountTabs(ids: string[], active: string, options: { dirty?: string[]; refuse?: boolean } = {}) {
  ui = createTestUi();
  const calls: Calls = { selected: [], closed: [], moved: [] };
  const initial = ids.map((id) => doc(id, options.dirty?.includes(id) ?? false));
  const view = renderWithUi(ui, <Owner initial={initial} active={active} calls={calls} refuse={options.refuse ?? false} />);
  // Tabs report their place in the row so pointer positions can be judged without a layout engine.
  const mark = (): void => {
    for (const [index, item] of [...view.container.querySelectorAll("[data-tab-id]")].entries()) item.setAttribute("data-order", String(index));
  };
  mark();
  return { calls, mark, order: () => screen.getByTestId("order").textContent, tab: (id: string) => screen.getByRole("tab", { name: new RegExp(`Doc ${id}`) }) };
}

describe("when the strip is shown", () => {
  it.each([[[]], [["a"]]])("draws nothing for %j, since a single document needs no switcher", (ids) => {
    ui = createTestUi();
    const view = renderWithUi(ui, <TabStrip described={strip} tabs={ids.map((id) => doc(id))} activeId={ids[0] ?? ""} panelId="panel" onSelect={vi.fn()} onClose={vi.fn()} onMove={vi.fn()} />);
    expect(view.container.querySelector("[role=tablist]")).toBeNull();
  });

  it("fails loudly with a code when told an unknown document is active", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    ui = createTestUi();
    expect(() => renderWithUi(ui, <TabStrip described={strip} tabs={[doc("a"), doc("b")]} activeId="zzz" panelId="panel" onSelect={vi.fn()} onClose={vi.fn()} onMove={vi.fn()} />)).toThrowError(
      expect.objectContaining({ code: "tab-active-unknown" }),
    );
  });
});

describe("roles and marks", () => {
  it("is a named tablist of tabs with one selected tab in the tab order, each pointing at the panel", () => {
    const { tab } = mountTabs(["a", "b", "c"], "b");
    expect(screen.getByRole("tablist", { name: strip.label })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(tab("b").getAttribute("aria-selected")).toBe("true");
    expect(tab("a").getAttribute("aria-selected")).toBe("false");
    expect([tab("a"), tab("b"), tab("c")].map((element) => element.tabIndex)).toEqual([-1, 0, -1]);
    expect(tab("a").getAttribute("aria-controls")).toBe("panel");
  });

  it("marks unsaved changes with a shape and words, and a clean document with neither", () => {
    const { tab } = mountTabs(["a", "b"], "a", { dirty: ["b"] });
    expect(tab("b").textContent).toContain(editorCopy.dirtyMark);
    expect(within(tab("b")).getByText(editorCopy.unsavedChanges)).toBeTruthy();
    expect(tab("a").textContent).not.toContain(editorCopy.dirtyMark);
    expect(within(tab("a")).queryByText(editorCopy.unsavedChanges)).toBeNull();
  });

  it("scrolls the selected tab into view when the selection changes, so an overflowing strip never hides it", () => {
    const { tab } = mountTabs(["a", "b", "c"], "a");
    scrolled.mockClear();
    fireEvent.click(tab("c"));
    expect(scrolled).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    expect((scrolled.mock.contexts.at(-1) as HTMLElement).getAttribute("data-tab-id")).toBe("c");
  });
});

describe("selecting and closing by pointer", () => {
  it("selects the pressed tab and closes the tab whose close control is pressed, through the input manager", () => {
    const { calls, order } = mountTabs(["a", "b", "c"], "a");
    fireEvent.click(screen.getByRole("tab", { name: /Doc b/ }));
    expect(calls.selected).toEqual(["b"]);
    fireEvent.click(screen.getByRole("button", { name: editorCopy.closeDocument("Doc c") }));
    expect(calls.closed).toEqual(["c"]);
    expect(order()).toBe("a,b");
    expect(ui.diagnostics).toEqual([]);
  });
});

describe("keyboard", () => {
  it("moves between tabs with the arrows, wrapping, and with Home and End, selecting and focusing the one reached", () => {
    const { calls, tab } = mountTabs(["a", "b", "c"], "a");
    tab("a").focus();
    fireEvent.keyDown(tab("a"), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tab("c"));
    fireEvent.keyDown(tab("c"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(tab("a"));
    fireEvent.keyDown(tab("a"), { key: "End" });
    expect(document.activeElement).toBe(tab("c"));
    fireEvent.keyDown(tab("c"), { key: "Home" });
    expect(document.activeElement).toBe(tab("a"));
    expect(calls.selected).toEqual(["c", "a", "c", "a"]);
  });

  it("closes the focused tab with Delete and puts focus on the tab that took its place", () => {
    const { calls, tab, order } = mountTabs(["a", "b", "c"], "a");
    tab("b").focus();
    fireEvent.keyDown(tab("b"), { key: "Delete" });
    expect(calls.closed).toEqual(["b"]);
    expect(order()).toBe("a,c");
    expect(document.activeElement).toBe(tab("c"));
  });

  it("leaves focus alone when the owner refuses to close", () => {
    const { tab, order } = mountTabs(["a", "b"], "a", { refuse: true });
    tab("b").focus();
    fireEvent.keyDown(tab("b"), { key: "Delete" });
    expect(order()).toBe("a,b");
    expect(document.activeElement).toBe(tab("b"));
  });

  it("moves a tab with Control and Shift plus an arrow, keeps focus on it and announces the new place only after the owner accepts", () => {
    const { calls, tab, order } = mountTabs(["a", "b", "c"], "a");
    tab("b").focus();
    fireEvent.keyDown(tab("b"), { key: "ArrowRight", ctrlKey: true, shiftKey: true });
    expect(calls.moved).toEqual([["b", 2]]);
    expect(order()).toBe("a,c,b");
    expect(document.activeElement).toBe(tab("b"));
    expect(ui.runtime.announcer.getLast()?.text).toBe(editorCopy.movedDocument("Doc b", 3, 3));
    fireEvent.keyDown(tab("b"), { key: "ArrowRight", ctrlKey: true, shiftKey: true });
    expect(calls.moved).toHaveLength(1);
  });

  it("does not announce a move the owner refused", () => {
    const { calls, tab } = mountTabs(["a", "b"], "a", { refuse: true });
    tab("a").focus();
    fireEvent.keyDown(tab("a"), { key: "ArrowRight", ctrlKey: true, shiftKey: true });
    expect(calls.moved).toEqual([["a", 1]]);
    expect(ui.runtime.announcer.getLast()).toBeNull();
  });

  it("leaves other chords to the page", () => {
    const { calls, tab } = mountTabs(["a", "b"], "a");
    tab("a").focus();
    expect(fireEvent.keyDown(tab("a"), { key: "ArrowRight", altKey: true })).toBe(true);
    expect(fireEvent.keyDown(tab("a"), { key: "Delete", ctrlKey: true })).toBe(true);
    expect(calls.selected).toEqual([]);
    expect(calls.closed).toEqual([]);
  });
});

describe("reordering by pointer", () => {
  const press = (target: Element, type: "mouse" | "pen" | "touch", x: number) => fireEvent.pointerDown(target, { pointerId: 3, pointerType: type, clientX: x, button: 0 });
  const move = (target: Element, type: "mouse" | "pen" | "touch", x: number) => fireEvent.pointerMove(target, { pointerId: 3, pointerType: type, clientX: x });

  it.each(["mouse", "pen"] as const)("drags a tab with a %s past its neighbours, capturing the pointer on the strip", (type) => {
    const { calls, tab, order } = mountTabs(["a", "b", "c"], "a");
    press(tab("a"), type, 50);
    move(tab("a"), type, 50 + EDITOR_LIMITS.tabDragDistance + 1);
    expect(capture).toHaveBeenCalledWith(3);
    expect(calls.moved).toEqual([]);
    move(tab("a"), type, 260);
    expect(calls.moved).toEqual([["a", 2]]);
    expect(order()).toBe("b,c,a");
    fireEvent.pointerUp(tab("a"), { pointerId: 3, pointerType: type, clientX: 250 });
    move(tab("a"), type, 0);
    expect(calls.moved).toHaveLength(1);
  });

  it("does not reorder for a slip shorter than the drag distance, for a press on a close control, or for a touch", () => {
    const { calls, tab } = mountTabs(["a", "b", "c"], "a");
    press(tab("a"), "mouse", 50);
    move(tab("a"), "mouse", 50 + EDITOR_LIMITS.tabDragDistance - 1);
    fireEvent.pointerUp(tab("a"), { pointerId: 3, pointerType: "mouse", clientX: 50 });
    press(screen.getByRole("button", { name: editorCopy.closeDocument("Doc a") }), "mouse", 50);
    move(tab("a"), "mouse", 250);
    fireEvent.pointerUp(tab("a"), { pointerId: 3, pointerType: "mouse", clientX: 250 });
    press(tab("a"), "touch", 50);
    move(tab("a"), "touch", 250);
    expect(calls.moved).toEqual([]);
  });
});
