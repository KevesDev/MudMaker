import { startTheme, type ThemeManager } from "./theme";
import type { PreferencesStore } from "./prefs";

type Window = Parameters<typeof startTheme>[2];

export interface LaunchParts {
  readonly preferences: Pick<PreferencesStore, "restore" | "bind">;
  readonly manager: ThemeManager;
  readonly window: Window;
  /** Draws the first screen. */
  readonly mount: () => void;
}

/**
 * Restores the saved appearance, writes the theme to the page, then draws the first screen, in that order,
 * so the first frame already shows the saved choice. Saving starts only after the restore, so restoring never writes.
 */
export async function launch(parts: LaunchParts): Promise<void> {
  await parts.preferences.restore(parts.manager);
  startTheme(parts.manager, "home", parts.window);
  parts.preferences.bind(parts.manager);
  parts.mount();
}
