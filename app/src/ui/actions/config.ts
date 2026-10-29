/** Limits the shared interface applies unless the host passes its own. */
export const UI_LIMITS = {
  /**
   * Longest a handler may stay pending before its control reports a recoverable error. Thirty seconds is
   * well past any local project operation yet short enough that a stalled one is reported while the user
   * is still looking; a host with slower owners passes its own value to createUiRuntime.
   */
  maxPendingMs: 30_000,
} as const;
