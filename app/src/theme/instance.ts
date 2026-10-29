import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { ThemeManager } from "./ThemeManager";

/** The single ThemeManager for this window, built from the centrally pinned defaults. */
export const themeManager = new ThemeManager(themeDefaults);
