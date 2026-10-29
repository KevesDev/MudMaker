import { applyHighContrast } from "./highContrast";
import { ThemeSchema } from "./schema";
import type { AccessibilitySettings, ThemeError, TokenMap, TokenValue } from "./types";
import { themeError, validateTokenValue } from "./validate";

export type ResolveOutcome =
  | { readonly ok: true; readonly tokens: TokenMap }
  | { readonly ok: false; readonly errors: readonly ThemeError[] };

const ALIAS = /^\{([A-Za-z0-9.]+)\}$/;
const REDUCED_DURATION_TOKEN = "motion.reducedDurationMs";

function aliasTarget(value: TokenValue): string | null {
  if (typeof value !== "string") return null;
  return ALIAS.exec(value)?.[1] ?? null;
}

function dedupe(errors: readonly ThemeError[]): readonly ThemeError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}\u0000${error.token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Follows alias chains to concrete values; tokens whose chain fails are reported and left out. */
function resolveAliases(
  raw: Readonly<Record<string, TokenValue>>,
  errors: ThemeError[],
): Record<string, TokenValue> {
  const resolved: Record<string, TokenValue> = {};
  for (const start of Object.keys(raw)) {
    const chain: string[] = [start];
    let current = start;
    for (;;) {
      const value = raw[current];
      if (value === undefined) break;
      const target = aliasTarget(value);
      if (target === null) {
        resolved[start] = value;
        break;
      }
      const targetType = ThemeSchema.describeToken(target)?.type;
      if (!targetType) {
        errors.push(
          themeError("unknown-token", target, `Token "${target}" is not part of the theme schema (referenced by "${current}").`),
        );
        break;
      }
      if (!Object.hasOwn(raw, target)) {
        errors.push(
          themeError("alias-target-missing", current, `Token "${current}" refers to "${target}", which has no value in this theme.`),
        );
        break;
      }
      if (chain.includes(target)) {
        errors.push(
          themeError("alias-cycle", target, `Tokens refer to each other in a loop: ${[...chain, target].join(" to ")}.`),
        );
        break;
      }
      if (ThemeSchema.describeToken(current)?.type !== targetType) {
        errors.push(
          themeError("alias-type-mismatch", current, `Token "${current}" cannot refer to "${target}" because they hold different kinds of values.`),
        );
        break;
      }
      chain.push(target);
      current = target;
    }
  }
  return resolved;
}

function applyAccessibility(
  tokens: Record<string, TokenValue>,
  accessibility: AccessibilitySettings,
): TokenMap {
  const adjusted = accessibility.contrast === "high" ? applyHighContrast(tokens) : { ...tokens };
  const reducedValue = adjusted[REDUCED_DURATION_TOKEN];
  const reducedDuration = typeof reducedValue === "number" ? reducedValue : 0;
  for (const [name, value] of Object.entries(adjusted)) {
    if (typeof value !== "number") continue;
    const role = ThemeSchema.describeToken(name)?.role;
    if (role === "fontSize") {
      adjusted[name] = value * accessibility.textScale;
    } else if (role === "motionDuration" && accessibility.reducedMotion) {
      adjusted[name] = reducedDuration;
    }
  }
  return adjusted;
}

/**
 * Merges the layers in order, resolves aliases, validates every value and only then
 * applies accessibility adjustments, so adjustments always come last.
 */
export function resolveTokens(
  base: TokenMap,
  layers: readonly TokenMap[],
  accessibility: AccessibilitySettings,
): ResolveOutcome {
  const raw: Record<string, TokenValue> = {};
  for (const source of [base, ...layers]) {
    for (const [name, value] of Object.entries(source)) raw[name] = value;
  }
  const errors: ThemeError[] = [];
  const resolved = resolveAliases(raw, errors);
  for (const [name, value] of Object.entries(resolved)) {
    const descriptor = ThemeSchema.describeToken(name);
    if (!descriptor) {
      errors.push(themeError("unknown-token", name, `Token "${name}" is not part of the theme schema.`));
      continue;
    }
    const problem = validateTokenValue(name, descriptor.type, value);
    if (problem) errors.push(problem);
  }
  if (errors.length > 0) return { ok: false, errors: dedupe(errors) };
  return { ok: true, tokens: applyAccessibility(resolved, accessibility) };
}
