export const SCOPE_IDS = ["editor", "client", "host", "home"] as const;
export type ScopeId = (typeof SCOPE_IDS)[number];

export function isScopeId(value: unknown): value is ScopeId {
  return SCOPE_IDS.some((id) => id === value);
}

export type TokenValue = string | number | boolean;
export type TokenMap = Readonly<Record<string, TokenValue>>;

export type ContrastMode = "normal" | "high";

export interface AccessibilitySettings {
  readonly textScale: number;
  readonly contrast: ContrastMode;
  readonly reducedMotion: boolean;
}

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = Object.freeze({
  textScale: 1,
  contrast: "normal",
  reducedMotion: false,
});

export interface ResolvedTheme {
  readonly scope: ScopeId;
  readonly themeId: string;
  readonly revision: number;
  readonly accessibility: AccessibilitySettings;
  readonly tokens: TokenMap;
}

/** What a scope was told to resolve from, as opposed to the tokens that came out. Persistence saves these. */
export interface ThemeInputs {
  readonly presetId: string;
  readonly userTheme: UserThemeDocument | null;
  readonly overrides: TokenMap;
  readonly accessibility: AccessibilitySettings;
}

export const DEFAULTS_SCHEMA = "mudmaker.theme-defaults.v1";
export const USER_THEME_SCHEMA = "mudmaker.theme.v1";

export interface UserThemeDocument {
  readonly schema: typeof USER_THEME_SCHEMA;
  readonly id: string;
  readonly tokens: TokenMap;
}

export type ThemeErrorCode =
  | "unknown-scope"
  | "unknown-preset"
  | "unknown-token"
  | "unsupported-schema-version"
  | "malformed-document"
  | "invalid-type"
  | "invalid-color"
  | "invalid-dimension"
  | "invalid-integer"
  | "invalid-font-stack"
  | "invalid-enum"
  | "out-of-range"
  | "alias-cycle"
  | "alias-target-missing"
  | "alias-type-mismatch";

export interface ThemeError {
  readonly code: ThemeErrorCode;
  /** Exact token name, or the document field when the problem is not a token. */
  readonly token: string;
  readonly message: string;
}

export interface PresetSummary {
  readonly id: string;
  readonly label: string;
}

export type ThemeResult =
  | { readonly ok: true; readonly theme: ResolvedTheme }
  | { readonly ok: false; readonly errors: readonly ThemeError[] };

export class ThemeDefaultsError extends Error {
  readonly errors: readonly ThemeError[];

  constructor(errors: readonly ThemeError[]) {
    super(
      `The built-in theme defaults are invalid: ${errors
        .map((error) => error.message)
        .join(" ")}`,
    );
    this.name = "ThemeDefaultsError";
    this.errors = errors;
  }
}
