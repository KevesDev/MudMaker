# 03 — Central ThemeManager, isolated Editor/Client preferences

The existing [ThemeManager](../editor-theme-manager.md) remains **sole authority for token schema, user override validation, and dark graph-paper rendering**. This contract extends it to the Player Client without creating another styling service.

## ThemeManager operation
One library `ThemeManager` resolves `ThemeSchema` and distributes immutable `ResolvedTheme(scope,themeId,revision,accessibility)` snapshots. **Different scope instances** `editor`, `client`, `host` and `home` can select different presets and persist different overrides. One token registry and one design system, **not one forced visual appearance**. Host inherits editor baseline but its layout/preferences are separate. Theme files are schema-checked **data only**. Default editor = dark; default player = legible dark text terminal, client theme customizable independently; users can choose light/high-contrast variants, customize tokens and fonts, preview/cancel/import/export/reset.

## Client-specific semantic tokens
`color.terminal.{background,foreground,ansi0..15,link,prompt,system,chat,tell,emote,combat,warning}`; `font.terminal.{family,size,lineHeight,weight}`; `text.{wrapWidth,spacing,ligatures,ansiColorPolicy,timestamps}`; `color.map.{room,visited,current,unknown,exit,locked,uncertain,note}`; `color.status.{connected,reconnecting,offline}`; `color.client.{inputBackground,historyHighlight,matchHighlight,channelAccent}`; `interaction.client.{scrollbackPause,autofollow,focusMode}`. All are part of same validated schema and support contrast adjustments. Server ANSI palette can be **honored, adapted or ignored** per local user preference; never overwrites ThemeManager or injects CSS.

## Separate preference ownership
`app.global`: language, telemetry consent, keyboard navigation, reduced motion, contrast.
`editor.user`: editor theme/customizations, docking, graph grid, code font, selection and shortcuts.
`client.global`: transcript theme, text scale/spacing, logging defaults, map style, notification preferences.
`client.profile.<world>.<character>`: endpoint, adapter, panel layout, hotkeys, aliases, triggers, notes, map, text filters, commands history and reconnect rules (sensitive credentials stored securely and **never** in portable plain JSON export).
`host.local`: network configuration, logs, admin dashboards. Game content saves separately; **neither server nor host can replace the player's local settings**.

## Renderer decisions
Editor graph-paper background has continuous square grid lines, snap and pan/zoom as already decided. Player mini mapper draws its own rooms/links/confidence symbols, **not** editor grid cells or server-authoring coordinates. Client transcript is virtualized, preserves selectable/copyable raw text (safe rendered form), supports no forced autoscroll when user reads history, and can highlight semantic events/timestamps. Third-party MUD ANSI/GMCP text is untrusted: never apply arbitrary CSS/HTML or fonts from a host.

## UX examples
User selects a light, large-font profile for one external MUD while keeping dark Editor. User changes terminal font and ANSI mapping while disconnected; next connection uses that setting. User imports broken theme; both previously valid Editor and Client settings survive. A hosted MudMaker game sends a color hint; client may display as content, but personal terminal scheme stays intact.
