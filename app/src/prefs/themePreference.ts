import type { ScopeId, ThemeError, ThemeInputs, ThemeManager, ThemeResult, TokenMap } from "../theme";

/** The appearance choices saved for one scope. Contrast and reduced motion follow the system, so they are not saved. */
export interface ThemePreference {
  readonly presetId: string;
  readonly userTheme: ThemeInputs["userTheme"];
  readonly overrides: TokenMap;
  readonly textScale: number;
}

export interface Rejection {
  readonly scope: ScopeId;
  /** The part that was refused: a token name or a field of the saved choices. */
  readonly field: string;
  readonly message: string;
}

export function preferenceOf(inputs: ThemeInputs): ThemePreference {
  return { presetId: inputs.presetId, userTheme: inputs.userTheme, overrides: inputs.overrides, textScale: inputs.accessibility.textScale };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const describe = (errors: readonly ThemeError[]): string => errors.map((error) => error.message).join(" ");

/**
 * Applies a token layer one token at a time through the manager's own validation, so one bad token
 * costs only itself. Each accepted token is kept; the manager always holds the last layer it accepted.
 */
function applyTokens(tokens: unknown, scope: ScopeId, field: string, apply: (accepted: TokenMap) => ThemeResult, rejected: Rejection[]): void {
  if (!isRecord(tokens)) {
    rejected.push({ scope, field, message: "The saved tokens are not a list of names and values." });
    return;
  }
  let accepted: TokenMap = {};
  for (const [name, value] of Object.entries(tokens)) {
    const attempt = { ...accepted, [name]: value } as TokenMap;
    const result = apply(attempt);
    if (result.ok) accepted = attempt;
    else rejected.push({ scope, field: `${field}.${name}`, message: describe(result.errors) });
  }
}

/** Applies what was saved for one scope, validated exactly as live input is. Returns every part that was refused. */
export function applyPreference(manager: ThemeManager, scope: ScopeId, saved: unknown): readonly Rejection[] {
  const rejected: Rejection[] = [];
  if (!isRecord(saved)) return [{ scope, field: "theme", message: "The saved appearance is not an object." }];
  const refuse = (field: string, result: ThemeResult): void => {
    if (!result.ok) rejected.push({ scope, field, message: describe(result.errors) });
  };
  if (saved["presetId"] !== undefined) refuse("presetId", manager.selectPreset(scope, saved["presetId"] as string));
  const userTheme = saved["userTheme"];
  if (isRecord(userTheme)) {
    const head = manager.setUserTheme(scope, { ...userTheme, tokens: {} });
    refuse("userTheme", head);
    if (head.ok) applyTokens(userTheme["tokens"], scope, "userTheme.tokens", (accepted) => manager.setUserTheme(scope, { ...userTheme, tokens: accepted }), rejected);
  } else if (userTheme !== undefined && userTheme !== null) {
    rejected.push({ scope, field: "userTheme", message: "The saved user theme is not an object." });
  }
  if (saved["overrides"] !== undefined) applyTokens(saved["overrides"], scope, "overrides", (accepted) => manager.setOverrides(scope, accepted), rejected);
  if (saved["textScale"] !== undefined) {
    refuse("textScale", manager.setAccessibility(scope, { ...manager.getInputs(scope).accessibility, textScale: saved["textScale"] as number }));
  }
  return rejected;
}
