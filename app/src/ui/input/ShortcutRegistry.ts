import type { ActionRegistry } from "../actions/ActionRegistry";
import type { ActionId } from "../actions/types";
import { normalizeChord } from "./chords";
import { APP_SCOPE, type ScopeEntry } from "./FocusMediator";

export interface ShortcutBinding {
  /** Key of the focus scope that must be on the stack for the shortcut to fire. */
  readonly scope: string;
  readonly chord: string;
  readonly actionId: ActionId;
  /** Who registered it, named in collision reports. */
  readonly owner: string;
  /** Fires even while typing or under a dialog; allowed only in the application scope. */
  readonly emergency: boolean;
}

export interface ShortcutRequest {
  readonly scope: string;
  readonly chord: string;
  readonly actionId: ActionId;
  readonly owner: string;
  readonly emergency?: boolean;
}

export type ShortcutErrorCode = "shortcut-collision" | "shortcut-chord-invalid" | "shortcut-action-unknown" | "shortcut-emergency-scope";

export interface ShortcutError {
  readonly code: ShortcutErrorCode;
  readonly message: string;
  /** Present for collisions: the binding that already holds the chord. */
  readonly existing?: ShortcutBinding;
}

export type ShortcutRegistration =
  | { readonly ok: true; readonly unregister: () => void }
  | { readonly ok: false; readonly error: ShortcutError };

type Listener = () => void;

/** Holds shortcut bindings per scope. Collisions are checked inside one scope only. */
export class ShortcutRegistry {
  private readonly byScope = new Map<string, Map<string, ShortcutBinding>>();
  private readonly listeners = new Set<Listener>();
  private version = 0;

  constructor(private readonly actions: ActionRegistry) {}

  register(request: ShortcutRequest): ShortcutRegistration {
    const emergency = request.emergency === true;
    if (!this.actions.action(request.actionId)) {
      return fail("shortcut-action-unknown", `${request.owner} asked for a shortcut on ${request.actionId}, which is not a known action.`);
    }
    const chord = normalizeChord(request.chord);
    if (!chord.ok) return fail("shortcut-chord-invalid", chord.message);
    if (emergency && request.scope !== APP_SCOPE) {
      return fail("shortcut-emergency-scope", `${request.owner} can mark a shortcut as emergency only in the ${APP_SCOPE} scope.`);
    }
    const scoped = this.byScope.get(request.scope) ?? new Map<string, ShortcutBinding>();
    const existing = scoped.get(chord.chord);
    if (existing) {
      return {
        ok: false,
        error: {
          code: "shortcut-collision",
          message: `${chord.chord} in ${request.scope} is already used by ${existing.owner} for ${existing.actionId}; ${request.owner} wanted it for ${request.actionId}.`,
          existing,
        },
      };
    }
    const binding: ShortcutBinding = Object.freeze({
      scope: request.scope,
      chord: chord.chord,
      actionId: request.actionId,
      owner: request.owner,
      emergency,
    });
    scoped.set(chord.chord, binding);
    this.byScope.set(request.scope, scoped);
    this.changed();
    return {
      ok: true,
      unregister: () => {
        if (scoped.get(chord.chord) !== binding) return;
        scoped.delete(chord.chord);
        this.changed();
      },
    };
  }

  /**
   * Picks the binding for a key press. Emergency bindings always win; otherwise only the top
   * scope is consulted, then lower scopes until a modal scope stops the search.
   */
  resolve(chord: string, stack: readonly ScopeEntry[], isModal: (entry: ScopeEntry) => boolean, typing: boolean): ShortcutBinding | null {
    const emergency = this.byScope.get(APP_SCOPE)?.get(chord);
    if (emergency?.emergency) return emergency;
    if (typing) return null;
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      const entry = stack[index];
      if (entry === undefined) continue;
      const match = this.byScope.get(entry.key)?.get(chord);
      if (match) return match;
      if (isModal(entry)) return null;
    }
    return null;
  }

  /** The first chord registered for an action, shown in that action's help. */
  labelFor(actionId: ActionId): string | null {
    for (const scoped of this.byScope.values()) {
      for (const binding of scoped.values()) {
        if (binding.actionId === actionId) return binding.chord;
      }
    }
    return null;
  }

  getVersion(): number {
    return this.version;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private changed(): void {
    this.version += 1;
    for (const listener of [...this.listeners]) listener();
  }
}

function fail(code: ShortcutErrorCode, message: string): ShortcutRegistration {
  return { ok: false, error: { code, message } };
}
