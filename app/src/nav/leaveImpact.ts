/** What the owning services tell the navigator before a workspace is left. The services arrive in later phases; the navigator only depends on these shapes. */
import type { Destination } from "./destinations";

export interface LeaveRequest {
  readonly from: Destination;
  readonly to: Destination;
}

export interface LeaveImpact {
  /** Changes whenever the affected state changes, so a decision made on old information is refused. */
  readonly revision: number;
  /** What the person would be affected in, such as project names or world names, as the service names them. */
  readonly resources: readonly string[];
}

export interface HostLeaveImpact extends LeaveImpact {
  readonly connectedPlayers: number;
}

export type ServiceOutcome =
  | { readonly ok: true; /** The revision of the state after the operation. */ readonly revision: number }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** The code a service answers when the revision it was given is no longer the current one. */
export const STALE_IMPACT = "leave-impact-stale";

export interface EditorSessionController {
  /** Null when leaving costs the editor session nothing. */
  describeLeaveImpact(request: LeaveRequest): Promise<LeaveImpact | null>;
  retainDraft(revision: number): Promise<ServiceOutcome>;
  save(revision: number): Promise<ServiceOutcome>;
}

export interface ClientSessionController {
  describeLeaveImpact(request: LeaveRequest): Promise<LeaveImpact | null>;
  disconnectAll(revision: number): Promise<ServiceOutcome>;
}

export interface HostSupervisorSession {
  describeLeaveImpact(request: LeaveRequest): Promise<HostLeaveImpact | null>;
  continueHosting(revision: number): Promise<ServiceOutcome>;
  requestStop(revision: number): Promise<ServiceOutcome>;
}

/** Only the services that exist are given; a missing one means that part of the application is not there to be affected. */
export interface LeaveServices {
  readonly editor?: EditorSessionController;
  readonly client?: ClientSessionController;
  readonly host?: HostSupervisorSession;
}

export type ImpactKind = "editor" | "client" | "host";
