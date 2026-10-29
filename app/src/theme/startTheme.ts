import { bindThemeToElement } from "./cssVariables";
import {
  readSystemAccessibility,
  watchSystemAccessibility,
  type MediaQuerySource,
} from "./systemAccessibility";
import type { ThemeManager } from "./ThemeManager";
import type { AccessibilitySettings, ScopeId } from "./types";

/**
 * Adopts the operating system accessibility preferences for one scope, keeps them in
 * step as the system changes them, and mirrors the scope onto the document root.
 * A window shows one scope at a time. The returned function stops all of it.
 */
export function startTheme(
  manager: ThemeManager,
  scope: ScopeId,
  win: MediaQuerySource & { readonly document: Document },
): () => void {
  const adopt = (system: AccessibilitySettings): void => {
    const { textScale } = manager.getSnapshot(scope).accessibility;
    const result = manager.setAccessibility(scope, { ...system, textScale });
    if (!result.ok) {
      throw new Error(
        `Could not apply system accessibility settings: ${result.errors.map((error) => error.message).join(" ")}`,
      );
    }
  };
  adopt(readSystemAccessibility(win));
  const unbind = bindThemeToElement(manager, scope, win.document.documentElement);
  const unwatch = watchSystemAccessibility(win, adopt);
  return () => {
    unwatch();
    unbind();
  };
}
