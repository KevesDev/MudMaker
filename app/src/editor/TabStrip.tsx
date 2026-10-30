import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { GestureRecognizer, REGION, UiContractError, requireName, useCommand, useLatest, useUi, type Described } from "../ui";
import { EDITOR_LIMITS } from "./editorConfig";
import { editorCopy } from "./editorCopy";

export interface DocumentTab {
  readonly id: string;
  readonly title: string;
  readonly dirty: boolean;
}

export interface TabStripProps {
  readonly described: Described;
  /** The documents that are open. Fewer than two draw nothing, since one document needs no switcher. */
  readonly tabs: readonly DocumentTab[];
  readonly activeId: string;
  /** The id of the tab panel that shows the active document. */
  readonly panelId: string;
  readonly onSelect: (id: string) => void;
  readonly onClose: (id: string) => void;
  /** Asks the owner to put the document at this index of the resulting order. The strip follows what the owner then passes in `tabs`. */
  readonly onMove: (id: string, toIndex: number) => void;
}

/** The DOM id of a document's tab, so the panel that shows it can name it. */
export function documentTabId(panelId: string, documentId: string): string {
  return `${panelId}-tab-${documentId}`;
}

type Pending = { readonly kind: "close"; readonly id: string; readonly neighbour: string } | { readonly kind: "move"; readonly id: string; readonly index: number };

interface PointerDrag {
  readonly pointerId: number;
  readonly id: string;
  readonly startX: number;
  engaged: boolean;
}

const TAB_SELECTOR = '[role="tab"]';
const ITEM_SELECTOR = "[data-tab-id]";

interface TabProps {
  readonly tab: DocumentTab;
  readonly panelId: string;
  readonly active: boolean;
  /** True while a long press has picked this tab up for a touch drag. */
  readonly lifted: boolean;
  readonly onSelect: (id: string) => void;
  readonly onClose: (id: string) => void;
}

function Tab({ tab, panelId, active, lifted, onSelect, onClose }: TabProps) {
  const uid = useId();
  const selectCommand = `tab.select.${uid}`;
  const closeCommand = `tab.close.${uid}`;
  useCommand(selectCommand, () => onSelect(tab.id));
  useCommand(closeCommand, () => onClose(tab.id));
  return (
    <div role="presentation" className="editor-tab-item" data-tab-id={tab.id} data-active={active ? "true" : undefined} data-lifted={lifted ? "true" : undefined}>
      <button
        type="button"
        role="tab"
        id={documentTabId(panelId, tab.id)}
        aria-selected={active}
        aria-controls={panelId}
        tabIndex={active ? 0 : -1}
        data-ui-command={selectCommand}
        className="ui-hit editor-tab"
      >
        <span className="editor-tab-title">{tab.title}</span>
        {tab.dirty ? (
          <>
            <span className="editor-tab-dirty" aria-hidden="true">
              {editorCopy.dirtyMark}
            </span>
            <span className="ui-visually-hidden">{editorCopy.unsavedChanges}</span>
          </>
        ) : null}
      </button>
      <button type="button" tabIndex={-1} aria-label={editorCopy.closeDocument(tab.title)} data-ui-command={closeCommand} className="ui-hit editor-tab-close">
        <span aria-hidden="true">{editorCopy.closeMark}</span>
      </button>
    </div>
  );
}

function itemOf(list: HTMLElement | null, documentId: string): HTMLElement | null {
  return [...(list?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])].find((item) => item.dataset["tabId"] === documentId) ?? null;
}

/**
 * Tabs for documents that are open at the same time. Arrow keys, Home and End move between tabs and open the
 * one reached, Delete closes the focused tab and Control+Shift with an arrow moves it. A mouse or pen can drag a
 * tab to a new place; a touch scrolls the strip, and a long press picks a tab up to drag it. All of it reaches the
 * strip through the input manager.
 * The strip only asks; the owner of the documents decides, and what the owner then passes in is what shows.
 */
export function TabStrip({ described, tabs, activeId, panelId, onSelect, onClose, onMove }: TabStripProps) {
  const ui = useUi();
  const name = requireName(described, "TabStrip");
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<Pending | null>(null);
  const dragRef = useRef<PointerDrag | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);
  const latest = useLatest({ tabs, onSelect, onClose, onMove });
  const shown = tabs.length > 1;
  if (shown && !tabs.some((tab) => tab.id === activeId)) {
    throw new UiContractError("tab-active-unknown", activeId, `The tab strip was told "${activeId}" is active, but no open document has that id.`);
  }

  useLayoutEffect(() => {
    itemOf(listRef.current, activeId)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, shown]);

  // Focus and the announcement follow what the owner accepted, never what was asked.
  useLayoutEffect(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending === null) return;
    const focusTab = (documentId: string): void => itemOf(listRef.current, documentId)?.querySelector<HTMLElement>(TAB_SELECTOR)?.focus();
    if (pending.kind === "close") {
      if (!tabs.some((tab) => tab.id === pending.id)) focusTab(tabs.some((tab) => tab.id === pending.neighbour) ? pending.neighbour : activeId);
      return;
    }
    const moved = tabs[pending.index];
    if (moved?.id !== pending.id) return;
    focusTab(pending.id);
    ui.announcer.announce(editorCopy.movedDocument(moved.title, pending.index + 1, tabs.length));
  }, [tabs, activeId, ui]);

  useEffect(() => {
    const list = listRef.current;
    if (!shown || list === null) return;
    const removeKeys = ui.input.registerKeys(`tabs:${id}`, (event) => {
      const { tabs: open, onSelect: select, onClose: close, onMove: move } = latest.current;
      const focusedId = (event.target instanceof Element ? event.target.closest<HTMLElement>(ITEM_SELECTOR) : null)?.dataset["tabId"];
      const index = open.findIndex((tab) => tab.id === focusedId);
      const current = open[index];
      if (current === undefined) return false;
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (event.ctrlKey && event.shiftKey && step !== 0) {
        const target = index + step;
        if (target >= 0 && target < open.length) {
          pendingRef.current = { kind: "move", id: current.id, index: target };
          move(current.id, target);
        }
        return true;
      }
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return false;
      if (event.key === "Delete") {
        pendingRef.current = { kind: "close", id: current.id, neighbour: (open[index + 1] ?? open[index - 1])?.id ?? "" };
        close(current.id);
        return true;
      }
      const reached = step !== 0 ? open[(index + step + open.length) % open.length] : event.key === "Home" ? open[0] : event.key === "End" ? open[open.length - 1] : undefined;
      if (reached === undefined) return false;
      select(reached.id);
      itemOf(list, reached.id)?.querySelector<HTMLElement>(TAB_SELECTOR)?.focus();
      return true;
    });
    // The tab under the dragged one's new place is whatever lies left of the pointer's x position.
    const dragTo = (dragId: string, clientX: number): void => {
      const others = [...list.querySelectorAll<HTMLElement>(ITEM_SELECTOR)].filter((item) => item.dataset["tabId"] !== dragId);
      const target = others.filter((item) => {
        const box = item.getBoundingClientRect();
        return box.left + box.width / 2 < clientX;
      }).length;
      const { tabs: open, onMove: move } = latest.current;
      if (open.findIndex((tab) => tab.id === dragId) !== target) move(dragId, target);
    };
    const trackPointer = (event: PointerEvent): void => {
      const drag = dragRef.current;
      if (event.type === "pointerdown") {
        const target = event.target instanceof Element ? event.target : null;
        const item = target?.closest<HTMLElement>(ITEM_SELECTOR) ?? null;
        if (item === null || event.button !== 0 || target?.closest(".editor-tab-close") != null) return;
        dragRef.current = { pointerId: event.pointerId, id: item.dataset["tabId"] ?? "", startX: event.clientX, engaged: false };
        return;
      }
      if (drag?.pointerId !== event.pointerId) return;
      if (event.type !== "pointermove") {
        dragRef.current = null;
        return;
      }
      if (!drag.engaged) {
        if (Math.abs(event.clientX - drag.startX) < EDITOR_LIMITS.tabDragDistance) return;
        drag.engaged = true;
        list.setPointerCapture(event.pointerId);
      }
      dragTo(drag.id, event.clientX);
    };
    // The strip is scrolled by the pan, since a touch on it belongs to the recognizer and not to the browser.
    let held: string | null = null;
    const touch = new GestureRecognizer(list, {
      pan: (delta) => {
        list.scrollLeft -= delta.x;
      },
      hold: (_at, target) => {
        const item = target instanceof Element && target.closest(".editor-tab-close") === null ? target.closest<HTMLElement>(ITEM_SELECTOR) : null;
        if (item === null) return false;
        held = item.dataset["tabId"] ?? "";
        setLifted(held);
        return true;
      },
      holdMove: (at) => {
        if (held !== null) dragTo(held, at.x);
      },
      holdEnd: () => {
        held = null;
        setLifted(null);
      },
    });
    const removeSurface = ui.input.registerSurface({ id: `tabs:${id}`, element: list, handlers: { mouse: trackPointer, pen: trackPointer, touch: touch.handle, cancel: touch.cancel } });
    return () => {
      removeKeys();
      removeSurface();
      touch.cancel();
      dragRef.current = null;
    };
  }, [shown, ui, id, latest]);

  if (!shown) return null;
  return (
    <div ref={listRef} role="tablist" aria-label={name} aria-orientation="horizontal" data-ui-keys={`tabs:${id}`} data-region={REGION.tabs} className="editor-tabs">
      {tabs.map((tab) => (
        <Tab key={tab.id} tab={tab} panelId={panelId} active={tab.id === activeId} lifted={tab.id === lifted} onSelect={onSelect} onClose={onClose} />
      ))}
    </div>
  );
}
