import { UiContractError } from "../actions/types";
import { focusableWithin, isTextEntry } from "./dom";

export type ScopeKind = "app" | "workspace" | "dialog" | "popup";

export interface ScopeEntry {
  readonly key: string;
  readonly kind: ScopeKind;
  /** The element that owns keyboard focus while the scope is on top; required for dialogs and popups. */
  readonly container?: HTMLElement | null;
  /** The opener of a popup; presses on it are not treated as outside presses. */
  readonly anchor?: HTMLElement | null;
  readonly onEscape?: () => void;
  readonly onOutsidePress?: () => void;
  /** Called after a control inside the scope has been activated. */
  readonly onActivated?: () => void;
}

export const APP_SCOPE = "app";

/**
 * Owns the stack of keyboard scopes (application, workspace, dialog, popup) and whether the
 * user is typing. Only the top scope receives shortcuts and Escape; dialogs also trap Tab.
 */
export class FocusMediator {
  private readonly stack: ScopeEntry[] = [{ key: APP_SCOPE, kind: "app" }];
  private composing = false;
  private pending: { readonly depth: number; readonly targets: HTMLElement[] }[] = [];
  private scheduled = false;
  private activated: HTMLElement | null = null;

  constructor(private readonly document: Document) {}

  /** Pushes a scope and returns the function that removes it, wherever it sits in the stack. */
  pushScope(entry: ScopeEntry): () => void {
    if (this.stack.some((existing) => existing.key === entry.key)) {
      throw new UiContractError("scope-duplicate", entry.key, `Focus scope "${entry.key}" is already active.`);
    }
    if (entry.kind === "app") {
      throw new UiContractError("scope-app-reserved", entry.key, "The application scope always exists and cannot be pushed.");
    }
    if (entry.kind === "workspace" && this.stack.some((existing) => existing.kind === "workspace")) {
      throw new UiContractError("scope-workspace-duplicate", entry.key, "Only one workspace can be active at a time.");
    }
    if ((entry.kind === "dialog" || entry.kind === "popup") && !entry.container) {
      throw new UiContractError("scope-container-missing", entry.key, `Focus scope "${entry.key}" needs a container element.`);
    }
    this.stack.push(entry);
    return () => {
      const index = this.stack.indexOf(entry);
      if (index > 0) this.stack.splice(index, 1);
    };
  }

  scopes(): readonly ScopeEntry[] {
    return [...this.stack];
  }

  top(): ScopeEntry {
    return this.stack[this.stack.length - 1] ?? { key: APP_SCOPE, kind: "app" };
  }

  /** The topmost modal dialog hides every scope beneath it from shortcuts. */
  isModal(entry: ScopeEntry): boolean {
    return entry.kind === "dialog";
  }

  setComposing(active: boolean): void {
    this.composing = active;
  }

  isComposing(): boolean {
    return this.composing;
  }

  isTextEditing(): boolean {
    return this.composing || isTextEntry(this.document.activeElement);
  }

  /**
   * Records that a dialog layer has closed, with the elements focus may return to: its opener first, then the
   * elements around the opener. Nothing is restored here. One settle step runs after every cleanup of the
   * same commit, so the order in which layers close cannot change the result.
   */
  releaseLayer(depth: number, targets: readonly HTMLElement[]): void {
    this.pending.push({ depth, targets: [...targets] });
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => this.settle());
  }

  /**
   * Records the last control the user activated. Some platforms (Safari and WebKit on macOS) do not focus a
   * button when it is clicked, so the focused element alone cannot say what opened a layer, and a layer may
   * open long after the action that opened it settled. The record is one element and ends when the next press
   * or non-modifier key starts another interaction, when another control is activated, when a layer takes it
   * as its opener. An element that has left the page is ignored when read, and its reference is dropped at the
   * next input. A layer opened with no user input in between therefore returns to the last activated control.
   */
  noteActivation(element: HTMLElement): void {
    this.activated = element;
  }

  /** Ends the record of the last activation. */
  endActivation(): void {
    this.activated = null;
  }

  /**
   * What a layer opening now should return focus to: the focused element if there is one, else the control
   * that the user activated last, if it is still on screen. It only reads, so it is safe while rendering.
   */
  openerCandidate(): HTMLElement | null {
    const focused = this.document.activeElement;
    if (focused instanceof HTMLElement && focused !== this.document.body && focused !== this.document.documentElement) return focused;
    return this.activated?.isConnected ? this.activated : null;
  }

  /** Layers released and not yet settled; zero outside a commit, so nothing outlives the step that handles it. */
  pendingLayers(): number {
    return this.pending.length;
  }

  /**
   * Restores focus once for all layers released in a commit. It does nothing unless focus was lost with the
   * closed layers (a connected element keeps it, including one inside a dialog that stays open). Otherwise
   * focus goes to the first element that can take it among the layers' openers, lowest layer first, then the
   * elements around those openers, then the workspace region. While a dialog stays open, only elements inside
   * it qualify and the workspace is not used. Nothing is carried over to a later commit.
   */
  private settle(): void {
    const layers = [...this.pending].sort((first, second) => first.depth - second.depth);
    this.pending = [];
    this.scheduled = false;
    const active = this.document.activeElement;
    const lost = active === null || active === this.document.body || active === this.document.documentElement;
    if (layers.length === 0 || !lost) return;
    const open = [...this.stack].reverse().find((entry) => entry.kind === "dialog" && entry.container?.isConnected)?.container ?? null;
    const workspace = this.stack.find((entry) => entry.kind === "workspace")?.container;
    const targets = [
      ...layers.flatMap((layer) => layer.targets.slice(0, 1)),
      ...layers.flatMap((layer) => layer.targets.slice(1)),
      ...(open === null && workspace ? [workspace] : []),
    ];
    for (const target of targets) {
      if (!target.isConnected || (open !== null && !open.contains(target))) continue;
      target.focus();
      if (this.document.activeElement === target) return;
    }
  }

  /**
   * Keeps Tab inside the topmost dialog; returns true when it moved focus itself. Popups open above the
   * dialog do not count as stops of it, because they are about to close and Tab is judged from the dialog's own stops.
   */
  trapTab(event: KeyboardEvent): boolean {
    const top = [...this.stack].reverse().find((entry) => entry.kind !== "popup") ?? this.top();
    if (!this.isModal(top) || !top.container) return false;
    const popups = this.stack.flatMap((entry) => (entry.kind === "popup" && entry.container ? [entry.container] : []));
    const items = focusableWithin(top.container).filter((item) => !popups.some((popup) => popup.contains(item)));
    const first = items[0];
    const last = items[items.length - 1];
    if (first === undefined || last === undefined) {
      event.preventDefault();
      top.container.focus();
      return true;
    }
    const active = this.document.activeElement;
    const inside = active !== null && top.container.contains(active);
    if (event.shiftKey && (!inside || active === first || active === top.container)) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }
}
