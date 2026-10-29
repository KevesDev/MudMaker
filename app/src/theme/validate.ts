import { parseHexColor } from "./color";
import { ThemeSchema, type TokenType } from "./schema";
import {
  USER_THEME_SCHEMA,
  type AccessibilitySettings,
  type ThemeError,
  type ThemeErrorCode,
  type TokenMap,
  type TokenValue,
  type UserThemeDocument,
} from "./types";

/** Text scale range that keeps layouts usable while covering large-text accessibility settings. */
export const TEXT_SCALE_MIN = 0.5;
export const TEXT_SCALE_MAX = 3;

/** Longest accepted font list; keeps a theme value from carrying a payload. */
export const FONT_STACK_MAX_LENGTH = 200;

/** Characters and words that could end a declaration or load a resource from a font value. */
const FONT_STACK_FORBIDDEN: readonly string[] = [";", "{", "}", "\\", "url(", "@"];

const GENERIC_FAMILIES: ReadonlySet<string> = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
]);

const UNQUOTED_FAMILY = /^[A-Za-z_][A-Za-z0-9_-]*(?: [A-Za-z0-9_-]+)*$/;
const QUOTED_FAMILY = /^(?:"[A-Za-z0-9 _.-]+"|'[A-Za-z0-9 _.-]+')$/;

const IDENTIFIER = /^[a-z][A-Za-z0-9]*$/;

export function themeError(code: ThemeErrorCode, token: string, message: string): ThemeError {
  return { code, token, message };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function show(value: unknown): string {
  if (typeof value === "string") {
    return `"${value.length > 40 ? `${value.slice(0, 40)}...` : value}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return Array.isArray(value) ? "a list" : typeof value === "object" ? "an object" : typeof value;
}

function isFontStack(value: string): boolean {
  if (value.length > FONT_STACK_MAX_LENGTH) return false;
  const lower = value.toLowerCase();
  if (FONT_STACK_FORBIDDEN.some((marker) => lower.includes(marker))) return false;
  const entries = value.split(",").map((entry) => entry.trim());
  const last = entries[entries.length - 1] ?? "";
  return (
    GENERIC_FAMILIES.has(last) &&
    entries.every((entry) => UNQUOTED_FAMILY.test(entry) || QUOTED_FAMILY.test(entry))
  );
}

function wrongType(name: string, expected: string, value: unknown): ThemeError {
  return themeError("invalid-type", name, `Token "${name}" must be ${expected}, but received ${show(value)}.`);
}

/** Checks one resolved value against the declared type of its token. */
export function validateTokenValue(name: string, type: TokenType, value: unknown): ThemeError | null {
  switch (type.kind) {
    case "color":
      if (typeof value !== "string") return wrongType(name, "a color", value);
      return parseHexColor(value)
        ? null
        : themeError(
            "invalid-color",
            name,
            `Token "${name}" must be a six digit hex color such as #1A2B3C, but received ${show(value)}.`,
          );
    case "fontStack":
      if (typeof value !== "string") return wrongType(name, "a font list", value);
      return isFontStack(value)
        ? null
        : themeError(
            "invalid-font-stack",
            name,
            `Token "${name}" must list font family names ending with a generic family such as sans-serif, using only letters, digits, spaces, hyphens and quoted names, up to ${FONT_STACK_MAX_LENGTH} characters, but received ${show(value)}.`,
          );
    case "length":
    case "duration":
      if (typeof value !== "number") return wrongType(name, "a number", value);
      return Number.isFinite(value) && value >= 0
        ? null
        : themeError(
            "invalid-dimension",
            name,
            `Token "${name}" must be a finite number of zero or more, but received ${show(value)}.`,
          );
    case "number":
      if (typeof value !== "number") return wrongType(name, "a number", value);
      return Number.isFinite(value) && (type.minExclusive ? value > type.min : value >= type.min)
        ? null
        : themeError(
            "out-of-range",
            name,
            `Token "${name}" must be a finite number ${type.minExclusive ? "greater than" : "of at least"} ${type.min}, but received ${show(value)}.`,
          );
    case "integer":
      if (typeof value !== "number") return wrongType(name, "a whole number", value);
      if (!Number.isInteger(value)) {
        return themeError(
          "invalid-integer",
          name,
          `Token "${name}" must be a whole number, but received ${show(value)}.`,
        );
      }
      return value >= type.min && value <= type.max
        ? null
        : themeError(
            "out-of-range",
            name,
            `Token "${name}" must be between ${type.min} and ${type.max}, but received ${show(value)}.`,
          );
    case "boolean":
      return typeof value === "boolean" ? null : wrongType(name, "true or false", value);
    case "identifier":
      if (typeof value !== "string") return wrongType(name, "a name", value);
      return IDENTIFIER.test(value)
        ? null
        : themeError(
            "invalid-enum",
            name,
            `Token "${name}" must be a plain name made of letters and digits, but received ${show(value)}.`,
          );
    case "enum":
      if (typeof value !== "string") return wrongType(name, "text", value);
      return type.values.includes(value)
        ? null
        : themeError(
            "invalid-enum",
            name,
            `Token "${name}" must be one of ${type.values.join(", ")}, but received ${show(value)}.`,
          );
  }
}

export interface LayerParse {
  readonly tokens: TokenMap;
  readonly errors: readonly ThemeError[];
}

/** Checks token names and primitive shapes of an incoming layer before any merging happens. */
export function parseTokenLayer(tokens: unknown, field: string): LayerParse {
  if (!isRecord(tokens)) {
    return {
      tokens: {},
      errors: [themeError("malformed-document", field, `The field "${field}" must be a list of token values.`)],
    };
  }
  const accepted: Record<string, TokenValue> = {};
  const errors: ThemeError[] = [];
  for (const [name, value] of Object.entries(tokens)) {
    if (!ThemeSchema.describeToken(name)) {
      errors.push(themeError("unknown-token", name, `Token "${name}" is not part of the theme schema.`));
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      accepted[name] = value;
    } else {
      errors.push(wrongType(name, "text, a number or true or false", value));
    }
  }
  return { tokens: accepted, errors };
}

export interface UserThemeParse {
  readonly theme: UserThemeDocument | null;
  readonly errors: readonly ThemeError[];
}

export function parseUserTheme(document: unknown): UserThemeParse {
  if (!isRecord(document)) {
    return {
      theme: null,
      errors: [themeError("malformed-document", "theme", "A theme must be an object with a schema, an id and tokens.")],
    };
  }
  const errors: ThemeError[] = [];
  if (document["schema"] !== USER_THEME_SCHEMA) {
    errors.push(
      themeError(
        "unsupported-schema-version",
        "schema",
        `Theme schema ${show(document["schema"])} is not supported. Expected "${USER_THEME_SCHEMA}".`,
      ),
    );
  }
  const id = document["id"];
  if (typeof id !== "string" || id.trim() === "") {
    errors.push(themeError("invalid-type", "id", "A theme needs a non-empty id."));
  }
  const layer = parseTokenLayer(document["tokens"], "tokens");
  errors.push(...layer.errors);
  if (errors.length > 0 || typeof id !== "string") return { theme: null, errors };
  return { theme: { schema: USER_THEME_SCHEMA, id, tokens: layer.tokens }, errors: [] };
}

export function validateAccessibility(settings: AccessibilitySettings): readonly ThemeError[] {
  const errors: ThemeError[] = [];
  const candidate: unknown = settings;
  if (!isRecord(candidate)) {
    return [themeError("malformed-document", "accessibility", "Accessibility settings must be an object.")];
  }
  const scale = candidate["textScale"];
  if (typeof scale !== "number" || !Number.isFinite(scale) || scale < TEXT_SCALE_MIN || scale > TEXT_SCALE_MAX) {
    errors.push(
      themeError(
        "out-of-range",
        "accessibility.textScale",
        `Text scale must be a number from ${TEXT_SCALE_MIN} to ${TEXT_SCALE_MAX}, but received ${show(scale)}.`,
      ),
    );
  }
  const contrast = candidate["contrast"];
  if (contrast !== "normal" && contrast !== "high") {
    errors.push(
      themeError(
        "invalid-enum",
        "accessibility.contrast",
        `Contrast must be "normal" or "high", but received ${show(contrast)}.`,
      ),
    );
  }
  const reducedMotion = candidate["reducedMotion"];
  if (typeof reducedMotion !== "boolean") {
    errors.push(
      themeError(
        "invalid-type",
        "accessibility.reducedMotion",
        `Reduced motion must be true or false, but received ${show(reducedMotion)}.`,
      ),
    );
  }
  return errors;
}
