import { useCallback, useSyncExternalStore } from "react";
import { themeManager } from "./instance";
import type { ThemeManager } from "./ThemeManager";
import type { ResolvedTheme, ScopeId } from "./types";

/** Follows one scope of a theme manager; the window's own manager unless the owner passes another. */
export function useTheme(scope: ScopeId, manager: ThemeManager = themeManager): ResolvedTheme {
  const subscribe = useCallback(
    (listener: () => void) => manager.subscribe(scope, listener),
    [manager, scope],
  );
  const getSnapshot = useCallback(() => manager.getSnapshot(scope), [manager, scope]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
