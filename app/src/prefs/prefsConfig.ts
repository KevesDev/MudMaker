import type { ScopeId } from "../theme";

/** The file format version. The shell refuses to read or write any other, so the two must change together. */
export const PREFERENCES_VERSION = 1;

/** Which ownership namespace of the preferences file holds each theme scope's choices. */
export const SCOPE_NAMESPACE = {
  home: "app.global",
  editor: "editor.user",
  client: "client.global",
  host: "host.local",
} as const satisfies Readonly<Record<ScopeId, string>>;

/** Key under a namespace that holds the appearance choices. */
export const THEME_KEY = "theme";

/** Quiet time after the last appearance change before it is written, so choosing through several options writes once. */
export const SAVE_DEBOUNCE_MS = 400;

/** Longest a call to the shell may stay unanswered before it is treated as failed; the shell answers local file calls in milliseconds. */
export const SHELL_CALL_TIMEOUT_MS = 5_000;

/** Key under the client namespace that holds the saved world profiles. */
export const PROFILES_KEY = "profiles";

/** Longest accepted profile name and server host; a host name cannot exceed 253 characters. */
export const PROFILE_LIMITS = { nameMax: 80, hostMax: 253 } as const;
