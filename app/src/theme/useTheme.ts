import { useCallback, useSyncExternalStore } from "react";
import { themeManager } from "./instance";
import type { ResolvedTheme, ScopeId } from "./types";

export function useTheme(scope: ScopeId): ResolvedTheme {
  const subscribe = useCallback(
    (listener: () => void) => themeManager.subscribe(scope, listener),
    [scope],
  );
  const getSnapshot = useCallback(() => themeManager.getSnapshot(scope), [scope]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
