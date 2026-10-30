import { useCallback, useMemo, useSyncExternalStore } from "react";
import { numberToken, useTheme } from "../theme";

/** The editor's layout measures, in pixels, from the theme. */
export interface EditorLayout {
  readonly panelMinSize: number;
  readonly panelDefaultSize: number;
  readonly splitStep: number;
  readonly tabletWidth: number;
  /** The drawn width of a split separator. */
  readonly separatorSize: number;
}

export function useEditorLayout(): EditorLayout {
  const { tokens } = useTheme("editor");
  return useMemo(
    () => ({
      panelMinSize: numberToken(tokens, "layout.panelMinSize"),
      panelDefaultSize: numberToken(tokens, "layout.panelDefaultSize"),
      splitStep: numberToken(tokens, "layout.splitStep"),
      tabletWidth: numberToken(tokens, "layout.tabletWidth"),
      separatorSize: numberToken(tokens, "shape.borderWidth"),
    }),
    [tokens],
  );
}

/** Whether the window is at or below the tablet width. Where the window cannot say, it is not. */
export function useTabletWidth(): boolean {
  const { tabletWidth } = useEditorLayout();
  const query = `(max-width: ${tabletWidth}px)`;
  const subscribe = useCallback(
    (listener: () => void) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", listener);
      return () => list.removeEventListener("change", listener);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
  );
}
