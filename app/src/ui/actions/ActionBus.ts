import { copy } from "../copy";
import type { ActionRegistry } from "./ActionRegistry";
import type { Announcer } from "./Announcer";
import { UI_LIMITS } from "./config";
import { UiContractError, type ActionId, type ControlId } from "./types";

export const CONTROL_STATES = [
  "ready",
  "pending",
  "success",
  "validation-error",
  "denied",
  "unavailable",
  "recoverable-error",
  "disabled",
] as const;
export type ControlState = (typeof CONTROL_STATES)[number];

export type FailureStatus = "validation-error" | "denied" | "unavailable" | "recoverable-error";

export type ActionValue = string | number | boolean;

/** Identifiers the dispatching owner supplies so one request can be followed across logs. */
export interface Correlation {
  /** Names one run of the application, so every line a launch writes can be found together. */
  readonly launchId?: string;
  readonly worldId?: string;
  readonly sessionId?: string;
  readonly requestId?: string;
}

export interface ActionBusOptions {
  /** How long a handler may stay pending before the control shows a recoverable error. */
  readonly maxPendingMs?: number;
}

export interface ActionRequest {
  readonly actionId: ActionId;
  readonly correlation?: Correlation;
  /** Null when the intent came from a shortcut rather than a visible control. */
  readonly controlId: ControlId | null;
  readonly value?: ActionValue;
}

export interface ActionSuccess {
  readonly status: "success";
  readonly message?: string;
}

export interface ActionFailure {
  readonly status: FailureStatus;
  /** Stable error code for support and logs. */
  readonly code: string;
  /** Safe, human readable text shown next to the control. */
  readonly message: string;
}

/** What an owning router returns once it has confirmed or refused the intent. */
export type ActionOutcome = ActionSuccess | ActionFailure;

export interface ActionIgnored {
  readonly status: "ignored";
  readonly code: "already-running" | "control-disabled";
  readonly message: string;
}

export type DispatchResult = (ActionOutcome | ActionIgnored) & { readonly actionId: ActionId };

/** What a handler receives: the request plus a signal that aborts when the bus stops waiting for it. */
export type HandlerRequest = ActionRequest & { readonly signal: AbortSignal };

export type ActionHandler = (request: HandlerRequest) => Promise<ActionOutcome>;

export interface ControlRuntime {
  readonly state: ControlState;
  /** Outcome text for pending, success and failure states. */
  readonly message: string | null;
  readonly code: string | null;
  /** Why the control is disabled; set only in the disabled state. */
  readonly reason: string | null;
}

/** `info` marks expected outcomes such as an action nobody handles yet; `error` marks a defect the operator should look at. */
export const DIAGNOSTIC_SEVERITIES = ["error", "warning", "info"] as const;
export type DiagnosticSeverity = (typeof DIAGNOSTIC_SEVERITIES)[number];

export interface UiDiagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly actionId: ActionId | null;
  readonly controlId: ControlId | null;
  /** A safe sentence. Raw failure text belongs in `detail`. */
  readonly message: string;
  /** Raw technical text for the operator log; never shown to the user. */
  readonly detail?: string;
  /** The correlation the dispatching owner supplied, echoed unchanged; empty when none was given. */
  readonly correlation: Correlation;
}

export type DiagnosticSink = (diagnostic: UiDiagnostic) => void;

const NO_CORRELATION: Correlation = Object.freeze({});
/** Nobody has registered a handler yet: expected while a feature is not built, so it is not an error. */
const NO_OWNER_CODE = "no-action-owner";
const TIMED_OUT: unique symbol = Symbol("handler-timed-out");

type Refusal =
  | { readonly kind: "ignored"; readonly code: ActionIgnored["code"]; readonly message: string }
  | { readonly kind: "refused"; readonly status: FailureStatus; readonly code: string; readonly message: string };

const READY: ControlRuntime = Object.freeze({ state: "ready", message: null, code: null, reason: null });
const FAILURE_STATUSES: readonly FailureStatus[] = ["validation-error", "denied", "unavailable", "recoverable-error"];

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** A failure or refusal must say what happened and carry a code, because the UI shows both and cannot invent either. */
function isOutcome(value: unknown): value is ActionOutcome {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Readonly<Record<string, unknown>>;
  if (record["status"] === "success") return record["message"] === undefined || typeof record["message"] === "string";
  return FAILURE_STATUSES.includes(record["status"] as FailureStatus) && hasText(record["code"]) && hasText(record["message"]);
}

type Listener = () => void;

/**
 * Sole dispatcher of user intents. Routers register one handler per action; the bus owns the
 * per-control state machine and shows success only when a handler confirms it.
 */
export class ActionBus {
  private readonly handlers = new Map<ActionId, ActionHandler>();
  private readonly inFlight = new Set<ActionId>();
  private readonly runtimes = new Map<ControlId, ControlRuntime>();
  private readonly listeners = new Set<Listener>();

  private readonly maxPendingMs: number;

  constructor(
    private readonly registry: ActionRegistry,
    private readonly announcer: Announcer,
    private readonly diagnostics: DiagnosticSink,
    options: ActionBusOptions = {},
  ) {
    const limit = options.maxPendingMs ?? UI_LIMITS.maxPendingMs;
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new UiContractError(
        "max-pending-invalid",
        "ActionBus",
        `The longest wait for a handler must be a positive number of milliseconds, not ${String(limit)}.`,
      );
    }
    this.maxPendingMs = limit;
  }

  /** The router named as owner in the action table registers each of its actions exactly once. */
  registerHandler(owner: string, actionId: ActionId, handler: ActionHandler): () => void {
    const action = this.registry.action(actionId);
    if (!action) throw new UiContractError("action-unknown", actionId, `Action ${actionId} is not in the action table.`);
    if (action.owner !== owner) {
      throw new UiContractError(
        "action-wrong-owner",
        actionId,
        `Action ${actionId} belongs to ${action.owner}, so ${owner} cannot handle it.`,
      );
    }
    if (this.handlers.has(actionId)) {
      throw new UiContractError("action-owner-duplicate", actionId, `Action ${actionId} already has a handler.`);
    }
    this.handlers.set(actionId, handler);
    return () => {
      if (this.handlers.get(actionId) === handler) this.handlers.delete(actionId);
    };
  }

  getRuntime(controlId: ControlId): ControlRuntime {
    return this.runtimes.get(controlId) ?? READY;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** The owning state decides availability; the reason is shown to the user in the control's help. */
  setDisabled(controlId: ControlId, reason: string): void {
    this.registry.requireControl(controlId);
    if (reason.trim().length === 0) {
      throw new UiContractError("disabled-reason-missing", controlId, `Control ${controlId} cannot be disabled without a reason.`);
    }
    this.write(controlId, { state: "disabled", message: null, code: null, reason });
  }

  /** Returns a control that is disabled, or showing a finished outcome, to ready. */
  reset(controlId: ControlId): void {
    this.registry.requireControl(controlId);
    if (this.getRuntime(controlId).state === "pending") return;
    this.write(controlId, READY);
  }

  /** True when dispatching the request would run its handler; it changes nothing and announces nothing. */
  admits(request: ActionRequest): boolean {
    return this.screen(request) === null;
  }

  async dispatch(request: ActionRequest): Promise<DispatchResult> {
    const { actionId } = request;
    const label = this.labelFor(request);
    const refusal = this.screen(request);
    if (refusal?.kind === "ignored") {
      this.announcer.announce(refusal.message);
      return { actionId, status: "ignored", code: refusal.code, message: refusal.message };
    }
    if (refusal?.kind === "refused") return this.refuseQuietly(request, refusal.status, refusal.code, refusal.message);
    const handler = this.handlers.get(actionId);
    if (!handler) return this.refuseQuietly(request, "unavailable", NO_OWNER_CODE, `${label} has no registered owner.`);

    this.inFlight.add(actionId);
    const bound = this.registry.controlsForAction(actionId);
    this.writeMany(bound, (runtime) => runtime.state !== "disabled", {
      state: "pending",
      message: copy.working,
      code: null,
      reason: null,
    });
    const cancel = new AbortController();
    const settled = this.settle(handler, { ...request, signal: cancel.signal }, label);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limit = new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), this.maxPendingMs);
    });
    const first = await Promise.race([settled, limit]).finally(() => clearTimeout(timer));
    if (first !== TIMED_OUT) {
      this.inFlight.delete(actionId);
      this.show(bound, first, label, "pending");
      return { ...first, actionId };
    }
    // The handler may still be running, so the action stays blocked until it answers: a retry never
    // runs beside it. Handlers honour the abort signal (interaction contract, "Handler contract").
    // The user sees the stall now and the real answer replaces it when it arrives.
    cancel.abort();
    const stalled: ActionFailure = {
      status: "recoverable-error",
      code: "handler-timeout",
      message: copy.takingLong(label),
    };
    this.report(request, "error", stalled.code, `The handler for ${actionId} did not answer within ${this.maxPendingMs} milliseconds.`);
    this.show(bound, stalled, label, "pending");
    void settled.then((late) => {
      this.inFlight.delete(actionId);
      this.report(request, "warning", "handler-settled-late", `The handler for ${actionId} answered after the wait ended with ${late.status}.`);
      this.show(bound, late, label, "recoverable-error", stalled.code);
    });
    return { ...stalled, actionId };
  }

  /** Runs the owning router's handler and always yields an outcome: a failure or a bad result becomes a recoverable error. */
  private async settle(handler: ActionHandler, request: HandlerRequest, label: string): Promise<ActionOutcome> {
    try {
      const returned: unknown = await handler(request);
      if (isOutcome(returned)) return returned;
      this.report(request, "error", "handler-invalid-outcome", `The handler for ${request.actionId} returned an unrecognised result.`);
      return { status: "recoverable-error", code: "handler-invalid-outcome", message: copy.didNotFinish(label) };
    } catch (failure) {
      this.report(request, "error", "handler-failed", `The handler for ${request.actionId} failed.`, describeFailure(failure));
      return { status: "recoverable-error", code: "handler-failed", message: copy.didNotFinish(label) };
    }
  }

  /** Writes an outcome to the controls still showing the state it replaces, then announces it. */
  private show(bound: readonly { readonly id: ControlId }[], outcome: ActionOutcome, label: string, replaces: ControlState, code?: string): void {
    if (outcome.status === "unavailable") {
      this.writeMany(bound, (runtime) => runtime.state === replaces && (code === undefined || runtime.code === code), READY);
      return;
    }
    this.writeMany(bound, (runtime) => runtime.state === replaces && (code === undefined || runtime.code === code), this.runtimeFor(outcome));
    this.announcer.announce(this.outcomeText(outcome, label), outcome.status === "success" ? "polite" : "assertive");
  }

  private screen(request: ActionRequest): Refusal | null {
    const { actionId } = request;
    const label = this.labelFor(request);
    if (!this.registry.action(actionId)) {
      return { kind: "refused", status: "unavailable", code: "action-unknown", message: `${label} is not in the action table.` };
    }
    if (this.inFlight.has(actionId)) {
      return { kind: "ignored", code: "already-running", message: copy.alreadyRunning(label) };
    }
    const reason = this.disabledReasonFor(request);
    if (reason !== null) return { kind: "ignored", code: "control-disabled", message: copy.disabledBecause(label, reason) };
    if (!this.handlers.has(actionId)) {
      return { kind: "refused", status: "unavailable", code: NO_OWNER_CODE, message: `${label} has no registered owner.` };
    }
    return null;
  }

  private labelFor(request: ActionRequest): string {
    if (request.controlId !== null) return this.registry.control(request.controlId)?.label ?? request.actionId;
    return this.registry.controlsForAction(request.actionId)[0]?.label ?? request.actionId;
  }

  /** A shortcut is blocked only when every control that shows the action is disabled. */
  private disabledReasonFor(request: ActionRequest): string | null {
    if (request.controlId !== null) {
      const runtime = this.getRuntime(request.controlId);
      return runtime.state === "disabled" ? runtime.reason : null;
    }
    const bound = this.registry.controlsForAction(request.actionId);
    if (bound.length === 0) return null;
    const runtimes = bound.map((control) => this.getRuntime(control.id));
    return runtimes.every((runtime) => runtime.state === "disabled") ? (runtimes[0]?.reason ?? null) : null;
  }

  /** An action nobody owns changes nothing on screen; the diagnostic log is its only trace. */
  private refuseQuietly(request: ActionRequest, status: FailureStatus, code: string, message: string): DispatchResult {
    this.report(request, code === NO_OWNER_CODE ? "info" : "error", code, message);
    return { actionId: request.actionId, status, code, message };
  }

  private runtimeFor(outcome: ActionOutcome): ControlRuntime {
    if (outcome.status === "success") {
      return { state: "success", message: outcome.message ?? copy.done, code: null, reason: null };
    }
    return { state: outcome.status, message: outcome.message, code: outcome.code, reason: null };
  }

  private outcomeText(outcome: ActionOutcome, label: string): string {
    if (outcome.status === "success") return outcome.message ?? `${label}: ${copy.done}`;
    return outcome.message;
  }

  private report(request: ActionRequest, severity: DiagnosticSeverity, code: string, message: string, detail?: string): void {
    this.diagnostics({
      severity,
      code,
      actionId: request.actionId,
      controlId: request.controlId,
      message,
      ...(detail === undefined ? {} : { detail }),
      correlation: request.correlation ?? NO_CORRELATION,
    });
  }

  private writeMany(
    controls: readonly { readonly id: ControlId }[],
    applies: (runtime: ControlRuntime) => boolean,
    next: ControlRuntime,
  ): void {
    let changed = false;
    for (const { id } of controls) {
      if (!applies(this.getRuntime(id))) continue;
      this.runtimes.set(id, Object.freeze({ ...next }));
      changed = true;
    }
    if (changed) this.notify();
  }

  private write(controlId: ControlId, next: ControlRuntime): void {
    this.runtimes.set(controlId, Object.freeze({ ...next }));
    this.notify();
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

function describeFailure(failure: unknown): string {
  return failure instanceof Error ? failure.message : String(failure);
}
