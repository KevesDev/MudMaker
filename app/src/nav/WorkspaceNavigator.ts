import { untilAborted } from "../frame/frameActions";
import type { Correlation, DiagnosticSink } from "../ui";
import { WORKSPACE_DESTINATIONS, isWorkspace, type Destination, type WorkspaceDestination } from "./destinations";
import { STALE_IMPACT, type ImpactKind, type LeaveRequest, type LeaveServices, type ServiceOutcome } from "./leaveImpact";
import { navCopy } from "./navCopy";

export type ImpactStage = "deciding" | "confirmingStop" | "resolved";

export interface ImpactState {
  readonly kind: ImpactKind;
  readonly revision: number;
  readonly resources: readonly string[];
  readonly connectedPlayers: number;
  readonly stage: ImpactStage;
  /** The revision the service reported after the chosen operation; the check before the switch holds the service to it. */
  readonly resolvedRevision: number | null;
}

export interface Transition {
  readonly id: number;
  readonly from: Destination;
  readonly to: Destination;
  readonly impacts: readonly ImpactState[];
}

export interface NavigatorSnapshot {
  readonly destination: Destination;
  /** Workspaces that have been opened. Their sessions are retained, whatever the destination is. */
  readonly opened: readonly WorkspaceDestination[];
  readonly transition: Transition | null;
}

export const CHOICES = ["editor-keep", "editor-save", "client-disconnect", "host-keep", "host-stop", "host-confirm-stop", "host-keep-running"] as const;
export type Choice = (typeof CHOICES)[number];

const CHOICE_KIND: Readonly<Record<Choice, ImpactKind>> = {
  "editor-keep": "editor",
  "editor-save": "editor",
  "client-disconnect": "client",
  "host-keep": "host",
  "host-stop": "host",
  "host-confirm-stop": "host",
  "host-keep-running": "host",
};

export type NavigationOutcome = { readonly ok: true } | { readonly ok: false; readonly code: string; readonly message: string };

const OK: NavigationOutcome = { ok: true };
const refuse = (code: string, message: string): NavigationOutcome => ({ ok: false, code, message });

type Attempt<T> = { readonly done: true; readonly value: T } | { readonly done: false; readonly failure: unknown };

/** Waits for a service, but never past the signal, and turns a thrown failure into a value. */
async function attempt<T>(work: () => Promise<T>, signal: AbortSignal): Promise<Attempt<T>> {
  try {
    return { done: true, value: await untilAborted(work(), signal) };
  } catch (failure) {
    return { done: false, failure };
  }
}

/**
 * Owns which destination is showing, which workspaces have been opened and the guarded switch between them.
 * It holds no host, client connection or editor state: the owning services say what leaving costs and perform
 * the chosen operation, and the switch happens only after each of them confirms.
 */
export class WorkspaceNavigator {
  private snapshot: NavigatorSnapshot = { destination: "splash", opened: [], transition: null };
  private readonly listeners = new Set<() => void>();
  /** True while a service is being asked something, so two decisions never overlap. */
  private working = false;
  private nextTransition = 1;

  constructor(
    private readonly services: LeaveServices,
    private readonly report: DiagnosticSink,
    private readonly correlation: () => Correlation,
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): NavigatorSnapshot => this.snapshot;

  /** Goes to a destination at once when leaving costs nothing, otherwise opens the guard and waits for a choice. */
  async request(to: Destination, signal: AbortSignal): Promise<NavigationOutcome> {
    if (this.working || this.snapshot.transition !== null) return refuse("navigation-busy", navCopy.busy);
    if (to === this.snapshot.destination) return OK;
    const request: LeaveRequest = { from: this.snapshot.destination, to };
    this.working = true;
    try {
      const found = await attempt(() => this.describe(request), signal);
      if (!found.done) return this.failedWith(found.failure, navCopy.checkFailed);
      if (found.value.length === 0) {
        this.commit(to);
        return OK;
      }
      this.update({ ...this.snapshot, transition: { id: this.nextTransition++, from: request.from, to, impacts: found.value } });
      return OK;
    } finally {
      this.working = false;
    }
  }

  /** Applies one choice of the guard to the service it belongs to. The switch completes only when every impact is resolved and still current. */
  async choose(choice: Choice, signal: AbortSignal): Promise<NavigationOutcome> {
    const transition = this.snapshot.transition;
    if (transition === null) return refuse("navigation-not-guarded", navCopy.notOffered);
    if (this.working) return refuse("navigation-busy", navCopy.busy);
    const impact = transition.impacts.find((candidate) => candidate.kind === CHOICE_KIND[choice] && candidate.stage !== "resolved");
    if (impact === undefined) return refuse("choice-not-offered", navCopy.notOffered);

    const answersConfirmation = choice === "host-confirm-stop" || choice === "host-keep-running";
    if ((impact.stage === "confirmingStop") !== answersConfirmation) return refuse("choice-not-offered", navCopy.notOffered);
    if (choice === "host-keep-running") {
      this.replaceImpact(transition, { ...impact, stage: "deciding" });
      return OK;
    }
    if (choice === "host-stop" && impact.connectedPlayers > 0) {
      this.replaceImpact(transition, { ...impact, stage: "confirmingStop" });
      return OK;
    }

    this.working = true;
    try {
      const done = await attempt(() => this.operate(choice, impact.revision), signal);
      if (this.snapshot.transition?.id !== transition.id) return refuse("navigation-cancelled", navCopy.cancelled);
      if (!done.done) return this.failedWith(done.failure, navCopy.stepFailed);
      const outcome = done.value;
      if (!outcome.ok) {
        if (outcome.code === STALE_IMPACT) return await this.refresh(transition, signal);
        this.log("warning", outcome.code, outcome.message);
        return refuse(outcome.code, outcome.message);
      }
      const resolved = this.replaceImpact(transition, { ...impact, stage: "resolved", resolvedRevision: outcome.revision });
      if (resolved.impacts.some((candidate) => candidate.stage !== "resolved")) return OK;
      return await this.commitIfCurrent(resolved, signal);
    } finally {
      this.working = false;
    }
  }

  /** Leaves everything as it was. Allowed at any time, including while a service is still answering. */
  cancel(): NavigationOutcome {
    if (this.snapshot.transition !== null) this.update({ ...this.snapshot, transition: null });
    return OK;
  }

  private operate(choice: Exclude<Choice, "host-keep-running">, revision: number): Promise<ServiceOutcome> {
    const { editor, client, host } = this.services;
    switch (choice) {
      case "editor-keep":
        return required(editor).retainDraft(revision);
      case "editor-save":
        return required(editor).save(revision);
      case "client-disconnect":
        return required(client).disconnectAll(revision);
      case "host-keep":
        return required(host).continueHosting(revision);
      case "host-stop":
      case "host-confirm-stop":
        return required(host).requestStop(revision);
    }
  }

  private async describe(request: LeaveRequest): Promise<readonly ImpactState[]> {
    const { editor, client, host } = this.services;
    const [editorImpact, clientImpact, hostImpact] = await Promise.all([
      editor?.describeLeaveImpact(request) ?? null,
      client?.describeLeaveImpact(request) ?? null,
      host?.describeLeaveImpact(request) ?? null,
    ]);
    const deciding = { stage: "deciding", resolvedRevision: null, connectedPlayers: 0 } as const;
    const impacts: ImpactState[] = [];
    if (editorImpact !== null) impacts.push({ kind: "editor", revision: editorImpact.revision, resources: editorImpact.resources, ...deciding });
    if (clientImpact !== null) impacts.push({ kind: "client", revision: clientImpact.revision, resources: clientImpact.resources, ...deciding });
    if (hostImpact !== null) {
      impacts.push({ kind: "host", revision: hostImpact.revision, resources: hostImpact.resources, ...deciding, connectedPlayers: hostImpact.connectedPlayers });
    }
    return impacts;
  }

  /** The services changed under the decision: ask again and let the person choose on the new information. */
  private async refresh(transition: Transition, signal: AbortSignal): Promise<NavigationOutcome> {
    const found = await attempt(() => this.describe({ from: transition.from, to: transition.to }), signal);
    if (this.snapshot.transition?.id !== transition.id) return refuse("navigation-cancelled", navCopy.cancelled);
    if (!found.done) return this.failedWith(found.failure, navCopy.checkFailed);
    if (found.value.length === 0) {
      this.commit(transition.to);
      return OK;
    }
    this.update({ ...this.snapshot, transition: { ...transition, impacts: found.value } });
    return refuse(STALE_IMPACT, navCopy.impactChanged);
  }

  /** Versions are checked once more before the switch: each resolved service must still report exactly what it confirmed. */
  private async commitIfCurrent(transition: Transition, signal: AbortSignal): Promise<NavigationOutcome> {
    const found = await attempt(() => this.describe({ from: transition.from, to: transition.to }), signal);
    if (this.snapshot.transition?.id !== transition.id) return refuse("navigation-cancelled", navCopy.cancelled);
    if (!found.done) return this.failedWith(found.failure, navCopy.checkFailed);
    const confirmed = new Map(transition.impacts.map((impact) => [impact.kind, impact]));
    const stillCurrent = (now: ImpactState): boolean => confirmed.get(now.kind)?.resolvedRevision === now.revision;
    if (found.value.every(stillCurrent)) {
      this.commit(transition.to);
      return OK;
    }
    const impacts = found.value.map((now) => (stillCurrent(now) ? (confirmed.get(now.kind) ?? now) : now));
    this.update({ ...this.snapshot, transition: { ...transition, impacts } });
    return refuse(STALE_IMPACT, navCopy.impactChanged);
  }

  private replaceImpact(transition: Transition, next: ImpactState): Transition {
    const updated: Transition = { ...transition, impacts: transition.impacts.map((impact) => (impact.kind === next.kind ? next : impact)) };
    this.update({ ...this.snapshot, transition: updated });
    return updated;
  }

  private commit(to: Destination): void {
    const opened = isWorkspace(to) ? WORKSPACE_DESTINATIONS.filter((workspace) => workspace === to || this.snapshot.opened.includes(workspace)) : this.snapshot.opened;
    this.update({ destination: to, opened, transition: null });
  }

  /** A stopped wait is reported as that; anything a service threw is reported in the screen's own words and logged in full. */
  private failedWith(failure: unknown, message: string): NavigationOutcome {
    const timedOut = typeof failure === "object" && failure !== null && "name" in failure && failure.name === "AbortError";
    const code = timedOut ? "navigation-timeout" : "leave-check-failed";
    this.log("error", code, message, failure instanceof Error ? failure.message : String(failure));
    return refuse(code, timedOut ? navCopy.timedOut : message);
  }

  private log(severity: "warning" | "error", code: string, message: string, detail?: string): void {
    this.report({ severity, code, actionId: null, controlId: null, message, ...(detail === undefined ? {} : { detail }), correlation: this.correlation() });
  }

  private update(next: NavigatorSnapshot): void {
    this.snapshot = next;
    for (const listener of [...this.listeners]) listener();
  }
}

function required<T>(service: T | undefined): T {
  if (service === undefined) throw new Error("No service answers for this choice.");
  return service;
}
