import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import { numberToken, useTheme } from "../theme";

/** Where the window is treated as a tablet: narrower than the theme's tablet width, or driven mainly by a finger or pen. */
export function tabletQuery(tabletWidth: number): string {
  return `(max-width: ${tabletWidth}px), (pointer: coarse)`;
}

export function useTabletLayout(): boolean {
  const { tokens } = useTheme("editor");
  const query = tabletQuery(numberToken(tokens, "layout.tabletWidth"));
  const subscribe = useCallback(
    (listener: () => void) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", listener);
      return () => list.removeEventListener("change", listener);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => typeof window.matchMedia === "function" && window.matchMedia(query).matches);
}

/** Marks the document while the tablet layout applies, so the stylesheets can enlarge hit areas without a width literal. */
export function useTabletLayoutMark(): void {
  const tablet = useTabletLayout();
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (tablet) root.dataset["layout"] = "tablet";
    else delete root.dataset["layout"];
    return () => {
      delete root.dataset["layout"];
    };
  }, [tablet]);
}
