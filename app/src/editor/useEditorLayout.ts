import { useMemo } from "react";
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
