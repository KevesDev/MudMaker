import { APPEARANCE, APPEARANCE_MENU, SPLASH } from "../home/homeLayout";
import { clientDisplay } from "../prefs";
import { useTheme, type ThemeManager } from "../theme";
import { CUSTOMIZE_CONTROL } from "../theme/themeEditorControls";
import { useSyncExternalStore } from "react";
import { Menu, useUi } from "../ui";
import { APPEARANCE_CHECKS, APPEARANCE_ITEMS, SETTINGS_CHECKS, SETTINGS_ITEMS, TIMESTAMPS_SETTING } from "./settingsMenu";
import { MENU_CARET, NAVIGATION, WORKSPACE_SCOPE, goToDestinations, type WorkspaceDestination } from "./destinations";

/** The name of the workspace at the start of the row. It is the current place, so it is text and not a way to go there. */
export function WorkspaceIdentity({ workspace }: { readonly workspace: WorkspaceDestination }) {
  const { registry } = useUi();
  const identity = registry.requireControl(NAVIGATION[workspace].entries[workspace]);
  return (
    <span className="workspace-identity" data-testid={identity.testId}>
      {identity.label}
    </span>
  );
}

/** Settings and Go To, in the same place and order in every workspace. Go To never lists the workspace it is in. */
export function WorkspaceMenus({ workspace, theme }: { readonly workspace: WorkspaceDestination; readonly theme: ThemeManager }) {
  const { registry } = useUi();
  const navigation = NAVIGATION[workspace];
  const presetId = useTheme(WORKSPACE_SCOPE[workspace], theme).themeId;
  const display = useSyncExternalStore(clientDisplay.subscribe, clientDisplay.getSnapshot);
  return (
    <>
      <Menu
        opener={registry.requireControl(SPLASH.settings)}
        items={SETTINGS_ITEMS[workspace].map((id) => registry.requireControl(id))}
        checks={SETTINGS_CHECKS[workspace].filter((id) => id !== TIMESTAMPS_SETTING).map((id) => ({ control: registry.requireControl(id), checked: false }))}
        submenus={[{ opener: registry.requireControl(APPEARANCE_MENU), choices: {
          control: registry.requireControl(APPEARANCE),
          options: theme.listPresets().map((preset) => ({ value: preset.id, label: preset.label })),
          value: presetId,
          items: [registry.requireControl(CUSTOMIZE_CONTROL[WORKSPACE_SCOPE[workspace]]), ...APPEARANCE_ITEMS[workspace].map((id) => registry.requireControl(id))],
          checks: [...APPEARANCE_CHECKS[workspace].map((id) => ({ control: registry.requireControl(id), checked: false })), ...(workspace === "play" ? [{ control: registry.requireControl(TIMESTAMPS_SETTING), checked: display.timestamps }] : [])],
        } }]}
        trailingGlyph={MENU_CARET}
      />
      <Menu
        opener={registry.requireControl(navigation.opener)}
        items={goToDestinations(workspace).map((destination) => registry.requireControl(navigation.entries[destination]))}
        trailingGlyph={MENU_CARET}
      />
    </>
  );
}
