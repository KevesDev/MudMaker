import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import type { ScopeId } from "./types";

/** Shared dialog controls are catalogued once; the active scope determines their target. */
export const THEME_EDITOR = { customize: "home.themeEditor.01", preview: "home.themeEditor.02", save: "home.themeEditor.03", cancel: "home.themeEditor.04" } as const;
export const CUSTOMIZE_CONTROL = { home: THEME_EDITOR.customize, editor: "editor.preferences.02", client: "client.preferences.02", host: THEME_EDITOR.customize } as const satisfies Readonly<Record<ScopeId, string>>;
export const THEME_TOKEN_CONTROLS = homeCatalog.controls.filter((control) => control.surface === "home.themeTokens");

export const themeTokenControl = (token: string): string => {
  const control = THEME_TOKEN_CONTROLS.find((entry) => entry.label === token);
  if (control === undefined) throw new Error(`No theme editor control for ${token}.`);
  return control.id;
};
