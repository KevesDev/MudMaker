import { ActionBus, type DiagnosticSink } from "./actions/ActionBus";
import type { ActionRegistry } from "./actions/ActionRegistry";
import { Announcer } from "./actions/Announcer";
import { FocusMediator } from "./input/FocusMediator";
import { RegionNavigator } from "./input/RegionNavigator";
import { InputManager, type CorrelationSource } from "./input/InputManager";
import { ShortcutRegistry } from "./input/ShortcutRegistry";

export interface UiRuntimeOptions {
  readonly registry: ActionRegistry;
  readonly document: Document;
  /** Receives structured records for failures the user cannot fix; the host persists them. */
  readonly diagnostics: DiagnosticSink;
  /** Adds the world, session and request identifiers to intents that start in the interface. */
  readonly correlation?: CorrelationSource;
  /** Longest a handler may stay pending; defaults to the shared interface limit. */
  readonly maxPendingMs?: number;
}

/** The one set of shared UI services for a window: registry, bus, input and focus. */
export interface UiRuntime {
  readonly registry: ActionRegistry;
  readonly announcer: Announcer;
  readonly bus: ActionBus;
  readonly focus: FocusMediator;
  readonly shortcuts: ShortcutRegistry;
  readonly regions: RegionNavigator;
  readonly input: InputManager;
}

export function createUiRuntime(options: UiRuntimeOptions): UiRuntime {
  const { registry, diagnostics } = options;
  const announcer = new Announcer();
  const bus = new ActionBus(registry, announcer, diagnostics, options.maxPendingMs === undefined ? {} : { maxPendingMs: options.maxPendingMs });
  const focus = new FocusMediator(options.document);
  const shortcuts = new ShortcutRegistry(registry);
  const regions = new RegionNavigator(options.document);
  const input = new InputManager({
    document: options.document,
    registry,
    bus,
    focus,
    shortcuts,
    regions,
    diagnostics,
    ...(options.correlation === undefined ? {} : { correlation: options.correlation }),
  });
  return { registry, announcer, bus, focus, shortcuts, regions, input };
}
