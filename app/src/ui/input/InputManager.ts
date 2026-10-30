import type { ActionBus, ActionRequest, Correlation, DiagnosticSink } from "../actions/ActionBus";
import type { ActionRegistry } from "../actions/ActionRegistry";
import { UiContractError } from "../actions/types";
import { chordFromEvent } from "./chords";
import { activatesNatively, isTextEntry } from "./dom";
import type { FocusMediator } from "./FocusMediator";
import { HelpTracker } from "./HelpTracker";
import type { ShortcutRegistry } from "./ShortcutRegistry";

export type PointerKind = "mouse" | "touch" | "pen";

/** Streams a registered surface may consume. Touch and pen arrive as pointer events of that type. */
export interface SurfaceHandlers {
  readonly wheel?: (event: WheelEvent) => void;
  readonly mouse?: (event: PointerEvent) => void;
  readonly touch?: (event: PointerEvent) => void;
  readonly pen?: (event: PointerEvent) => void;
  readonly drag?: (event: DragEvent) => void;
}

export interface InputSurface {
  readonly id: string;
  readonly element: HTMLElement;
  readonly handlers: SurfaceHandlers;
}

/** Supplies the world, session and request identifiers for an intent that starts in the interface. */
export type CorrelationSource = (intent: { readonly actionId: string | null; readonly controlId: string | null }) => Correlation;

export interface InputManagerDependencies {
  readonly document: Document;
  readonly registry: ActionRegistry;
  readonly bus: ActionBus;
  readonly focus: FocusMediator;
  readonly shortcuts: ShortcutRegistry;
  readonly diagnostics: DiagnosticSink;
  readonly correlation?: CorrelationSource;
}

type Modality = PointerKind | "keyboard";

/** Browsers report 229 for key events produced by an input method editor. */
const COMPOSITION_KEY_CODE = 229;
const CONTROL_SELECTOR = "[data-control-id], [data-ui-command]";
/** Everything that can hold help: controls, local commands and the help text itself. */
const HELP_SELECTOR = `${CONTROL_SELECTOR}, [data-help-for]`;
const ROVING_ITEM_SELECTOR = CONTROL_SELECTOR;
const POINTER_STREAMS = ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const;
const DRAG_STREAMS = ["dragstart", "dragover", "drop", "dragend"] as const;

function pointerKindOf(event: PointerEvent): PointerKind {
  return event.pointerType === "touch" || event.pointerType === "pen" ? event.pointerType : "mouse";
}

/** Actions and local commands share one help key space: the control id or the command id. */
function helpKeyOf(element: Element | null): string | null {
  return (
    element?.getAttribute("data-control-id") ??
    element?.getAttribute("data-ui-command") ??
    element?.getAttribute("data-help-for") ??
    null
  );
}

/** An item of a choice list carries the value it stands for; fields and switches report their own. */
function readControlValue(element: Element): string | boolean | undefined {
  const chosen = element.getAttribute("data-value");
  if (chosen !== null) return chosen;
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) return element.value;
  if (element.getAttribute("role") === "switch") return element.getAttribute("aria-checked") !== "true";
  return undefined;
}

/**
 * The single owner of keyboard, focus and pointer input. It installs one set of listeners on the
 * document, turns activation of any control into an action on the ActionBus, and hands wheel,
 * drag, touch and pen streams to registered surfaces. Components never attach activation handlers.
 */
export class InputManager {
  readonly help = new HelpTracker();
  private readonly surfaces = new Map<HTMLElement, InputSurface>();
  private readonly surfaceIds = new Set<string>();
  private readonly commands = new Map<string, () => void>();
  private teardown: (() => void) | null = null;
  private wheelListener: ((event: WheelEvent) => void) | null = null;

  constructor(private readonly deps: InputManagerDependencies) {}

  /** Installs the root listeners; the returned function removes them. */
  attach(): () => void {
    if (this.teardown) {
      throw new UiContractError("input-attached", "InputManager", "The input manager is already attached to a document.");
    }
    const doc = this.deps.document;
    const win = doc.defaultView;
    const removers: (() => void)[] = [];
    const listen = <K extends keyof DocumentEventMap>(type: K, handler: (event: DocumentEventMap[K]) => void, capture = false): void => {
      doc.addEventListener(type, handler, capture);
      removers.push(() => doc.removeEventListener(type, handler, capture));
    };
    listen("click", (event) => this.onClick(event));
    listen("keydown", (event) => this.onKeyDown(event));
    // Captured so a chosen value is read before a controlled component restores the confirmed one.
    listen("change", (event) => this.onChange(event), true);
    listen("compositionstart", () => this.deps.focus.setComposing(true));
    listen("compositionend", () => this.deps.focus.setComposing(false));
    listen("focusin", (event) => this.onFocusIn(event));
    listen("focusout", () => this.onFocusOut());
    listen("pointerover", (event) => this.onPointerOver(event));
    listen("pointerout", (event) => this.onPointerOut(event));
    listen("contextmenu", (event) => this.onContextMenu(event));
    for (const type of POINTER_STREAMS) {
      listen(type, (event) => {
        if (type === "pointerdown") this.onPointerDown(event);
        this.routePointer(event);
      });
    }
    for (const type of DRAG_STREAMS) listen(type, (event) => this.routeDrag(event));
    if (win) {
      const onBlur = (): void => {
        this.deps.focus.setComposing(false);
        this.help.clear();
      };
      win.addEventListener("blur", onBlur);
      removers.push(() => win.removeEventListener("blur", onBlur));
    }
    this.teardown = () => {
      for (const remove of removers) remove();
      this.removeWheelListener();
      this.teardown = null;
    };
    this.syncWheelListener();
    return () => this.teardown?.();
  }

  /** Surfaces receive wheel, drag, touch and pen input that starts inside their element. */
  registerSurface(surface: InputSurface): () => void {
    if (this.surfaceIds.has(surface.id)) {
      throw new UiContractError("surface-duplicate", surface.id, `Input surface "${surface.id}" is already registered.`);
    }
    if (this.surfaces.has(surface.element)) {
      throw new UiContractError("surface-element-taken", surface.id, `The element for surface "${surface.id}" already belongs to another surface.`);
    }
    this.surfaceIds.add(surface.id);
    this.surfaces.set(surface.element, surface);
    this.syncWheelListener();
    return () => {
      if (this.surfaces.get(surface.element) !== surface) return;
      this.surfaces.delete(surface.element);
      this.surfaceIds.delete(surface.id);
      this.syncWheelListener();
    };
  }

  /** Local interface commands (open a menu, close a dialog) activate through the same path as actions. */
  registerCommand(id: string, handler: () => void): () => void {
    if (this.commands.has(id)) {
      throw new UiContractError("command-duplicate", id, `Interface command "${id}" is already registered.`);
    }
    this.commands.set(id, handler);
    return () => {
      if (this.commands.get(id) === handler) this.commands.delete(id);
    };
  }

  private onClick(event: MouseEvent): void {
    const hit = this.controlAt(event.target);
    if (hit === null || isTextEntry(hit)) return;
    this.activate(hit);
  }

  private onChange(event: Event): void {
    const hit = this.controlAt(event.target);
    if (hit instanceof HTMLSelectElement) this.activate(hit);
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.setModality("keyboard");
    const { focus } = this.deps;
    if (event.isComposing || event.keyCode === COMPOSITION_KEY_CODE || focus.isComposing()) return;
    if (chordFromEvent(event) !== null) focus.endActivation();
    if (event.key === "Escape") {
      this.onEscape(event);
      return;
    }
    if (event.key === "Tab") {
      this.leavePopupOnTab();
      focus.trapTab(event);
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (event.key === "F1") {
      const helpId = helpKeyOf(this.helpAt(target));
      if (helpId !== null) {
        event.preventDefault();
        this.help.pin(helpId);
        return;
      }
    }
    if (target !== null && this.navigateWithinGroup(event, target)) return;
    if (target !== null && (event.key === "Enter" || event.key === " ") && this.activateFromKeyboard(event, target)) return;
    if (event.repeat) return;
    const chord = chordFromEvent(event);
    if (chord === null) return;
    const binding = this.deps.shortcuts.resolve(chord, focus.scopes(), (entry) => focus.isModal(entry), focus.isTextEditing());
    if (binding === null) return;
    event.preventDefault();
    void this.deps.bus.dispatch(this.requestFor(binding.actionId, null));
  }

  /** Escape leaves the innermost layer and also hides any help showing, so help can always be dismissed. */
  private onEscape(event: KeyboardEvent): void {
    const top = this.deps.focus.top();
    if (top.onEscape) top.onEscape();
    const dismissedHelp = this.help.dismiss();
    if (top.onEscape || dismissedHelp) event.preventDefault();
  }

  /**
   * Tab leaves a popup the way Escape does, which puts focus back on its opener. The dialog beneath, if any,
   * then judges the same key press from the opener, so Tab can neither leave the dialog nor skip a stop.
   */
  private leavePopupOnTab(): void {
    const top = this.deps.focus.top();
    if (top.kind === "popup") top.onEscape?.();
  }

  /** Arrow, Home and End move focus between the controls of a roving group such as a toolbar or menu. */
  private navigateWithinGroup(event: KeyboardEvent, target: Element): boolean {
    if (isTextEntry(target)) return false;
    const group = target.closest<HTMLElement>("[data-roving-group]");
    if (group === null) return false;
    const vertical = group.getAttribute("data-roving-group") === "vertical";
    const forward = vertical ? "ArrowDown" : "ArrowRight";
    const backward = vertical ? "ArrowUp" : "ArrowLeft";
    if (event.key !== forward && event.key !== backward && event.key !== "Home" && event.key !== "End") return false;
    const items = [...group.querySelectorAll<HTMLElement>(ROVING_ITEM_SELECTOR)].filter(
      (item) => item.closest("[hidden]") === null && item.closest("[data-roving-group]") === group,
    );
    const current = items.indexOf(target.closest<HTMLElement>(ROVING_ITEM_SELECTOR) as HTMLElement);
    if (items.length === 0 || current < 0) return false;
    const last = items.length - 1;
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? last : event.key === forward ? (current === last ? 0 : current + 1) : current === 0 ? last : current - 1;
    event.preventDefault();
    items[next]?.focus();
    return true;
  }

  /**
   * Enter commits a single-line field; Enter and Space activate controls the browser would not click itself.
   * A held key repeats keydown, so a repeat is consumed without activating: cancelling it also cancels the
   * click a native button would otherwise make from it. Space in a text field stays ordinary typing.
   */
  private activateFromKeyboard(event: KeyboardEvent, target: Element): boolean {
    const hit = this.controlAt(target);
    if (hit === null) return false;
    const typing = isTextEntry(hit);
    if (typing && (event.key !== "Enter" || !(hit instanceof HTMLInputElement))) return false;
    if (event.repeat) {
      event.preventDefault();
      return true;
    }
    if (!typing && activatesNatively(hit)) return false;
    event.preventDefault();
    this.activate(hit);
    return true;
  }

  /** Runs what the element stands for; the enclosing scope hears about it only when the activation was accepted. */
  private activate(element: Element): void {
    const commandId = element.getAttribute("data-ui-command");
    if (commandId !== null) {
      if (element.getAttribute("aria-disabled") === "true") return;
      const command = this.commands.get(commandId);
      if (command) {
        if (element instanceof HTMLElement) this.deps.focus.noteActivation(element);
        command();
        this.notifyActivated(element);
      } else {
        this.deps.diagnostics({
          severity: "error",
          code: "command-unknown",
          actionId: null,
          controlId: null,
          message: `No interface command "${commandId}" is registered.`,
          correlation: this.correlate(null, null),
        });
      }
      return;
    }
    const controlId = element.getAttribute("data-control-id");
    if (controlId === null) return;
    const control = this.deps.registry.control(controlId);
    if (!control) {
      this.deps.diagnostics({
        severity: "error",
        code: "control-unknown",
        actionId: null,
        controlId,
        message: `A control on screen refers to "${controlId}", which is not in the catalogs.`,
        correlation: this.correlate(null, controlId),
      });
      return;
    }
    if (control.actionId === null) return;
    if (this.deps.bus.getRuntime(controlId).state === "disabled") this.help.pin(controlId);
    const value = readControlValue(element);
    const request = this.requestFor(control.actionId, controlId, value);
    const accepted = this.deps.bus.admits(request);
    const { focus } = this.deps;
    if (accepted && element instanceof HTMLElement) focus.noteActivation(element);
    void this.deps.bus.dispatch(request);
    if (accepted) this.notifyActivated(element);
  }

  private requestFor(actionId: string, controlId: string | null, value?: string | boolean): ActionRequest {
    return {
      actionId,
      controlId,
      correlation: this.correlate(actionId, controlId),
      ...(value === undefined ? {} : { value }),
    };
  }

  private correlate(actionId: string | null, controlId: string | null): Correlation {
    return this.deps.correlation?.({ actionId, controlId }) ?? {};
  }

  /** The element may be removed by what it did, and a removed element never reports the pointer leaving. */
  private notifyActivated(element: Element): void {
    this.help.setHovered(null);
    const scopes = this.deps.focus.scopes();
    for (let index = scopes.length - 1; index >= 0; index -= 1) {
      const scope = scopes[index];
      if (scope?.container?.contains(element)) {
        scope.onActivated?.();
        return;
      }
    }
  }

  private onFocusIn(event: FocusEvent): void {
    this.help.setFocused(helpKeyOf(this.helpAt(event.target)));
  }

  private onFocusOut(): void {
    this.help.setFocused(null);
    this.deps.focus.setComposing(false);
  }

  private onPointerOver(event: PointerEvent): void {
    if (pointerKindOf(event) !== "mouse") return;
    this.help.setHovered(helpKeyOf(this.helpAt(event.target)));
  }

  /** Moving from a control onto its help text keeps the help showing, so it can be read and hovered. */
  private onPointerOut(event: PointerEvent): void {
    if (pointerKindOf(event) === "mouse") this.help.setHovered(helpKeyOf(this.helpAt(event.relatedTarget)));
  }

  private onPointerDown(event: PointerEvent): void {
    const kind = pointerKindOf(event);
    this.setModality(kind);
    this.deps.focus.endActivation();
    this.help.unpin();
    const top = this.deps.focus.top();
    const target = event.target instanceof Node ? event.target : null;
    if (top.onOutsidePress && target !== null && !top.container?.contains(target) && !top.anchor?.contains(target)) {
      top.onOutsidePress();
    }
  }

  /**
   * A long press, a right click and the keyboard context key all raise the context menu event; the application
   * takes it for help instead of the native menu, whether or not the control has help. Text fields keep the
   * native menu for copy and paste.
   */
  private onContextMenu(event: MouseEvent): void {
    const holder = this.helpAt(event.target);
    const helpId = helpKeyOf(holder);
    if (helpId === null || isTextEntry(holder)) return;
    event.preventDefault();
    this.help.pin(helpId);
  }

  private routePointer(event: PointerEvent): void {
    const surface = this.surfaceAt(event.target);
    if (surface === null) return;
    surface.handlers[pointerKindOf(event)]?.(event);
  }

  private routeDrag(event: DragEvent): void {
    this.surfaceAt(event.target)?.handlers.drag?.(event);
  }

  private routeWheel(event: WheelEvent): void {
    this.surfaceAt(event.target)?.handlers.wheel?.(event);
  }

  /** The wheel listener must be non-passive so surfaces can stop page scroll; it exists only while one needs it. */
  private syncWheelListener(): void {
    const needed = this.teardown !== null && [...this.surfaces.values()].some((surface) => surface.handlers.wheel);
    if (needed && this.wheelListener === null) {
      this.wheelListener = (event) => this.routeWheel(event);
      this.deps.document.addEventListener("wheel", this.wheelListener, { passive: false });
    } else if (!needed) {
      this.removeWheelListener();
    }
  }

  private removeWheelListener(): void {
    if (this.wheelListener === null) return;
    this.deps.document.removeEventListener("wheel", this.wheelListener);
    this.wheelListener = null;
  }

  private surfaceAt(target: EventTarget | null): InputSurface | null {
    if (this.surfaces.size === 0 || !(target instanceof Element)) return null;
    for (let node: Element | null = target; node !== null; node = node.parentElement) {
      const surface = this.surfaces.get(node as HTMLElement);
      if (surface) return surface;
    }
    return null;
  }

  private controlAt(target: EventTarget | null): Element | null {
    return target instanceof Element ? target.closest(CONTROL_SELECTOR) : null;
  }

  /** The element under the target that can hold help; whether it has any is the help tracker's to say. */
  private helpAt(target: EventTarget | null): Element | null {
    return target instanceof Element ? target.closest(HELP_SELECTOR) : null;
  }

  private setModality(modality: Modality): void {
    this.deps.document.documentElement.dataset["inputModality"] = modality;
  }
}
