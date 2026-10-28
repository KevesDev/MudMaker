# Central ThemeManager and Graph-Paper Visual Contract

**Status: DECIDED design; implementation pending.** **Owner: one shared ThemeManager library with separately resolved Editor/Client preference scopes**, shared by all Map, Code, Visual Graph, Blueprint, Quest, Dialogue and world-system editing surfaces. No feature may define its own palette, fonts, theme rules or duplicated theme settings. [S02 implementation phases](../05-sprints/specs/S03.md).

## Required default
The visual graph canvas uses a **quiet dark graph-paper background** with continuous horizontal/vertical minor square lines and subtly stronger lines every `grid.majorEvery` cells. **No dotted grid, stars, noise, checkerboard or decorative gradients.** Nodes, connections, selection, focus, labels and errors remain visually dominant. This is a view renderer, not graph semantics or the Map editor's world cells.

Pan and zoom use stable world coordinates. Grid lines are viewport-clipped and aligned to avoid jitter/moire; minor grid visibility adapts to zoom via theme token. Snap is user-toggleable and calculated in world coordinates. Grid display and snap are independent toggles. High-DPI, keyboard, pen and touch work with the same world transform. This shared renderer is reused by visual scripting, Blueprints, quests/dialogue and world-system graphs.

## Theme ownership and user customization
`ThemeManager` owns one versioned `ThemeDefinition`, a validated `ThemeSchema` and one observable immutable resolved `ThemeTokens` snapshot. All editors subscribe to the same Editor-scope resolved tokens. Player Client uses the **same ThemeManager and token schema** in its own independently selected Client scope; remote hosts cannot overwrite either user's theme. The baseline preset is dark, and users can choose other presets and **create, import, export, preview, edit and persist their own themes**. Theme changes update all open panes without restarting a game, changing project assets or publishing code.

Theme resolution: application defaults → selected user theme → user's explicit token overrides → operating-system/accessibility adjustments (text scale, contrast and reduced motion). Import parses theme **data only**; no executable expressions or scripts. Invalid tokens, wrong types, alias cycles, invalid ranges and unsupported versions fail with the exact token/error and preserve the last valid theme. A game host does not control remote players' editor themes; room colors/icons authored for a game are game data, not theme overrides.

## Required semantic token namespaces
`color.surface.{app,panel,toolbar,inspector,canvas,overlay}`; `color.text.{primary,secondary,muted,disabled}`; `color.border.{normal,subtle,focused,invalid}`; `color.graph.grid.{minor,major}`; `color.graph.{edge,port,node}.*`; `color.status.{success,warning,error,information}`; `color.interaction.{focus,selection,hover,pressed}`; `font.family.{interface,code,numeric}`; `font.size.{body,caption,nodeTitle,heading,code}`; `font.weight.*`; `spacing.*`; `shape.*`; `motion.*`; `interaction.{pointerHitSize,touchHitSize}`; `grid.{baseStep,majorEvery,snapStep,minorVisibilityMinScreenStep,lineWidth}`.

The centrally pinned [theme-defaults.v1.json](../../contracts/ui/v1/theme-defaults.v1.json) provides **all initial actual values** and type constraints. Each consumer asks for semantic tokens and **never embeds hardcoded hex colors, font stacks, graphical grid spacing, shadow presets or animation timing**. Type schema enforces valid colors, contrast, non-negative dimensions, positive integers, supported font stacks and non-cyclic aliases. Semantic shape/labels distinguish graph node types without relying on color.

## Concrete behavior and acceptance
- Change the active theme while Map, Code, Blueprint, Quest and Graph panes are visible: all consume updated colors/type/spacing and no ECS gameplay values change.
- Import and edit custom user theme; restart editor; selected theme persists. Invalid import shows exact diagnostic without damaging the last valid theme.
- Render graph-paper minor/major **lines**, never dots; pan/zoom/snap across multiple scales and HiDPI retains stable anchors and bounded rendering cost.
- Verify high-contrast, enlarged text, reduced motion and screen reader access. Theme preview can be cancelled.
- Map's authored region colors remain authored **content** while UI chrome responds to theme.
- One ThemeManager owns values; no feature-specific style managers and no arbitrary visual constants in feature docs.

**Source of truth:** this page controls common appearance and editor graph styling; [scope and Client theme](ui-ux/03-theme-and-preferences.md) controls Editor/Client preference isolation and terminal-only semantic tokens. [Machine preset values](../../contracts/ui/v1/theme-defaults.v1.json) are one centralized bundle, not local component constants. [Graph interaction design](../04-features/scripting/02-visual-graph-editor.md) controls graph UX; [S02](../05-sprints/specs/S03.md) delivers ThemeManager; S09/S13/S15/S16 use it; S18 audits accessibility.
