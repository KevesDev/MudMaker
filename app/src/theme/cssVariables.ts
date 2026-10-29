import { ThemeSchema } from "./schema";
import type { ThemeManager } from "./ThemeManager";
import type { ResolvedTheme, ScopeId, TokenValue } from "./types";

/** `color.surface.app` becomes `--color-surface-app`; token names never contain hyphens, so the mapping is one to one. */
export function cssVariableName(token: string): string {
  return `--${token.replaceAll(".", "-")}`;
}

export function cssVariableValue(token: string, value: TokenValue): string {
  switch (ThemeSchema.describeToken(token)?.type.kind) {
    case "length":
      return `${String(value)}px`;
    case "duration":
      return `${String(value)}ms`;
    default:
      return String(value);
  }
}

const writtenNames = new WeakMap<HTMLElement, ReadonlySet<string>>();

/** The only place theme tokens are written to the DOM. Variables from an earlier snapshot that are gone are removed. */
export function applyThemeToRoot(theme: ResolvedTheme, root: HTMLElement): void {
  const next = new Set<string>();
  for (const [token, value] of Object.entries(theme.tokens)) {
    const name = cssVariableName(token);
    root.style.setProperty(name, cssVariableValue(token, value));
    next.add(name);
  }
  for (const name of writtenNames.get(root) ?? []) {
    if (!next.has(name)) root.style.removeProperty(name);
  }
  writtenNames.set(root, next);
}

/** Applies the scope's current snapshot to the element now and after every accepted change. */
export function bindThemeToElement(manager: ThemeManager, scope: ScopeId, root: HTMLElement): () => void {
  applyThemeToRoot(manager.getSnapshot(scope), root);
  return manager.subscribe(scope, () => applyThemeToRoot(manager.getSnapshot(scope), root));
}
