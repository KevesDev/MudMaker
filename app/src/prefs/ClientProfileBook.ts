import { PORT_RANGE, portIsInvalid } from "../workspaces/ports";
import { PROFILE_LIMITS } from "./prefsConfig";

/** A saved way to reach one world. It holds no password or other credential. */
export interface ClientProfile {
  readonly id: string;
  readonly name: string;
  readonly adapter: string;
  readonly host: string;
  readonly port: number;
  readonly tls: boolean;
  readonly favorite: boolean;
}

/** What the profile form holds; the port stays text until it validates. */
export interface ProfileDraft {
  readonly name: string;
  readonly adapter: string;
  readonly host: string;
  readonly port: string;
  readonly tls: boolean;
}

export interface ProfileErrors {
  readonly name?: string;
  readonly host?: string;
  readonly port?: string;
  readonly adapter?: string;
}

export type SaveResult = { readonly ok: true; readonly profile: ClientProfile } | { readonly ok: false; readonly errors: ProfileErrors };

/** A saved entry that was dropped, with the reason. */
export interface ProfileRejection {
  readonly index: number;
  readonly reason: string;
}

export const PROFILE_ERRORS = {
  name: "Enter a name for this world.",
  host: "Enter the server address.",
  port: "Enter a port from 1 to 65535.",
  adapter: "Choose one of the listed adapters.",
} as const;

/** Favorites first, then by name. */
export function orderProfiles(profiles: readonly ClientProfile[]): readonly ClientProfile[] {
  return [...profiles].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
}

export function matchesQuery(profile: ClientProfile, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle.length === 0 || profile.name.toLowerCase().includes(needle) || profile.host.toLowerCase().includes(needle);
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

/** The single owner of the saved world profiles: validates every change and entry, and tells subscribers. */
export class ClientProfileBook {
  private profiles: readonly ClientProfile[] = [];
  private readonly listeners = new Set<() => void>();

  constructor(private readonly adapters: readonly string[]) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): readonly ClientProfile[] => this.profiles;

  validate(draft: ProfileDraft): ProfileErrors {
    const name = draft.name.trim();
    const host = draft.host.trim();
    return {
      ...(name.length === 0 || name.length > PROFILE_LIMITS.nameMax ? { name: PROFILE_ERRORS.name } : {}),
      ...(host.length === 0 || host.length > PROFILE_LIMITS.hostMax || /\s/.test(host) ? { host: PROFILE_ERRORS.host } : {}),
      ...(draft.port.length === 0 || portIsInvalid(draft.port) ? { port: PROFILE_ERRORS.port } : {}),
      ...(this.adapters.includes(draft.adapter) ? {} : { adapter: PROFILE_ERRORS.adapter }),
    };
  }

  /** Creates a profile, or changes the one with `id`. Nothing changes when the draft is not valid. */
  save(id: string | null, draft: ProfileDraft): SaveResult {
    const errors = this.validate(draft);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    const existing = id === null ? undefined : this.profiles.find((profile) => profile.id === id);
    if (id !== null && existing === undefined) return { ok: false, errors: { name: PROFILE_ERRORS.name } };
    const profile: ClientProfile = {
      id: existing?.id ?? crypto.randomUUID(),
      name: draft.name.trim(),
      adapter: draft.adapter,
      host: draft.host.trim(),
      port: Number(draft.port),
      tls: draft.tls,
      favorite: existing?.favorite ?? false,
    };
    this.replace(existing === undefined ? [...this.profiles, profile] : this.profiles.map((item) => (item.id === profile.id ? profile : item)));
    return { ok: true, profile };
  }

  remove(id: string): void {
    this.replace(this.profiles.filter((profile) => profile.id !== id));
  }

  toggleFavorite(id: string): void {
    this.replace(this.profiles.map((profile) => (profile.id === id ? { ...profile, favorite: !profile.favorite } : profile)));
  }

  /** Replaces the profiles with the saved ones, keeping every valid entry and returning each dropped one. */
  load(saved: unknown): readonly ProfileRejection[] {
    if (saved === undefined) return [];
    if (!Array.isArray(saved)) return [{ index: -1, reason: "The saved worlds are not a list." }];
    const rejected: ProfileRejection[] = [];
    const kept: ClientProfile[] = [];
    saved.forEach((entry: unknown, index) => {
      const reason = this.entryProblem(entry, kept);
      if (reason === null) {
        const { id, name, adapter, host, port, tls, favorite } = entry as ClientProfile;
        kept.push({ id, name: name.trim(), adapter, host: host.trim(), port, tls, favorite });
      } else rejected.push({ index, reason });
    });
    this.replace(kept);
    return rejected;
  }

  private entryProblem(entry: unknown, kept: readonly ClientProfile[]): string | null {
    if (!isRecord(entry)) return "The entry is not an object.";
    const { id, name, adapter, host, port, tls, favorite } = entry;
    if (typeof id !== "string" || id.length === 0) return "The entry has no id.";
    if (kept.some((profile) => profile.id === id)) return "The entry repeats an earlier id.";
    if (typeof name !== "string" || typeof host !== "string" || typeof adapter !== "string") return "The name, adapter or host is not text.";
    if (typeof port !== "number" || !Number.isInteger(port) || port < PORT_RANGE.min || port > PORT_RANGE.max) return "The port is not a whole number in range.";
    if (typeof tls !== "boolean" || typeof favorite !== "boolean") return "The encryption or favorite flag is not true or false.";
    const errors = this.validate({ name, adapter, host, port: String(port), tls });
    const first = Object.values(errors)[0];
    return first === undefined ? null : first;
  }

  private replace(next: readonly ClientProfile[]): void {
    this.profiles = next;
    for (const listener of this.listeners) listener();
  }
}
