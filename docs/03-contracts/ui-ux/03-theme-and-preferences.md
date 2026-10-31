# 03 — Central ThemeManager and app-wide Appearance

**Owner correction, 2026-10-31:** app appearance is one application-wide choice. Earlier separate workspace selection rules are superseded. The existing [ThemeManager](../editor-theme-manager.md) is the sole token schema, validation and rendering authority; PreferencesStore is the sole persistence owner.

## App-wide choice and internal scopes

Settings > Appearance is an actual submenu in Splash, Create, Play and Host. Its child menu lists the bundled theme names, Customize Theme and relevant existing appearance controls. Root Settings contains the Appearance opener and other settings grouped by purpose; it does not list theme names. Selecting a theme changes the whole app. One `selectApplicationPreset` operation stages and validates every affected scope before changing any committed inputs or render snapshot. Every scope is committed before listeners run; failure changes nothing.

The internal `home`, `editor`, `client` and `host` scopes retain their semantic token definitions and accessibility inputs. Home and Host inherit editor defaults and tokens for the **same app-selected preset**; Client additionally defines terminal/map/status values and contrast-safe derivations. Scope existence is not a separate appearance selection. A hosted world cannot replace local appearance.

## Custom theme editing

Customize Theme uses existing typed token fields grouped by semantic namespace. Color fields offer a native picker and editable hex/alias text; numeric fields accept decimal or alias text; enum/boolean choices read ThemeSchema. No raw document editor or future fields. Shared dialog controls are `home.themeEditor.01` through `.04`; 168 field controls in `home.themeTokens` are shared across destinations, with only existing tokens of the editing scope rendered. Field metadata is covered by schema-kind and key-coverage tests.

The draft starts from committed merged values before accessibility adjustments. **Changed shared tokens Preview and Save app-wide**, across scopes owning those keys; scope-only tokens change only their valid rendering scope. Unchanged target-specific values remain intact, including client derivations. Existing per-scope custom documents are tied representations owned by the one manager, not independently selectable themes. All affected snapshots validate before publication. Aliases remain data and are validated by ThemeManager.

Preview changes render snapshots without changing committed inputs or writing preferences. Save commits through that same staged operation and PreferencesStore persists the tied custom documents and common selection. Cancel, Escape, destination change and unmount restore all original previewed snapshots/committed choices; navigation does not clear useful custom layers. Invalid Preview/Save preserves committed inputs and the last valid preview and shows the exact reason beside the originating field. Unknown-alias errors retain the missing target in `ThemeError.token` and optionally identify the edited origin with `sourceToken`. Bundled preset data is never edited. Choosing a bundled theme clears active custom layers for the entire app.

## Persistence and compatibility

`app.global.appearance` stores `{version: 1, presetId}` as the authoritative selection; existing scoped theme documents retain semantic custom token data and text scale. Restore uses that explicit record when valid. Legacy files choose the first valid preset in deterministic home, editor, client, host order, falling back to the default home preset. Before this first destructive reconciliation, **one bounded `app.global.legacyScopedThemesV1` backup** retains the original scoped theme documents verbatim as data, including custom/override and unknown fields. It is never overwritten or expanded into history. Disagreement or parked custom data produces a persistent diagnostic. The chosen legacy source's valid custom values are applied through the app-wide custom operation; other original values remain in the backup. Restore itself writes nothing, and later saves preserve the backup. Invalid saved values retain existing structured rejection diagnostics.

Other preference ownership stays separate: app language/consent, editor docking/selection/shortcuts, client profiles/endpoints/automation/history, and host operational configuration. These do not create separate app theme choices. Client-only terminal values (`color.terminal.*`, `font.terminal.*`, `text.*`, `color.map.*`, `color.client.*`, connection status and client interaction values) remain part of the same validated schema. ANSI content is untrusted and never arbitrary CSS or a replacement ThemeManager. Credentials never enter portable plain preferences export.

## Examples and boundaries

Choose Neon Dark Mode from Play and Splash/Create/Host immediately follow it. Edit a shared app surface color in Customize Theme and Preview it everywhere; Cancel restores every original scope. Edit a terminal-only value and only the terminal rendering changes. Restart after Save restores the app-selected theme and its tied custom values. Legacy conflicting scoped choices survive in the one-time backup rather than being silently discarded. Import/export remains a later phase; no server, game-content or world-authority behavior changes here.
