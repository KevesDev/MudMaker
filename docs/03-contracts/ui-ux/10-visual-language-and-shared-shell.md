# 10 — Shared retro-minimalist visual language and workspace shell

**Status: OWNER-DECIDED DESIGN DIRECTION / DESIGN SPECIFICATION, NOT IMPLEMENTATION PROOF.** Applies to Splash, Creator Editor, Player Client, and Host Operations. This document controls **presentation and information hierarchy**, not engine/API ownership, registered actions, or feature semantics. For those use [workspace ownership](01-workspaces-and-ownership.md), [navigation and transition guards](00-launch-and-workspace-navigation.md), [ThemeManager](03-theme-and-preferences.md), and the [machine UI registry](../../../contracts/ui/v1/INDEX.md). If a proposed visible action is not registered, add its metadata in the implementation phase rather than inventing a handler.

## Identity and hierarchy
- **Retro desktop utility / MUD terminal**, elegant rather than noisy: crisp typography (monospaced accents, readable body text), angular geometry, restrained pixel/ASCII-inspired ornament, thin separators, and a very limited accent palette.
- **Minimalist and dense, not cramped:** small deliberate gaps between related text, controls and borders; consistent padding; no giant empty gutters or oversized headers. Preserve legible text, minimum accessible hit targets, visible focus, and zoom/reflow per [accessibility contract](02-interaction-state-and-accessibility.md).
- **No generic AI cards**, piles of nested framed boxes, promotional dashboards, status tiles, or repeated headings explaining obvious controls. Prefer a continuous desktop work surface with one prominent working region, subtle dividers and compact tool strips.
- **Avoid tab overload.** Tabs are justified for genuinely simultaneous documents/sessions, not every functional category. Contextual inspectors/tool drawers appear when relevant; inactive functionality remains discoverable via menus, searchable commands or contextual actions. A user-configurable layout can show more; do not make crowded mode the default.
- Do not sacrifice authoring, client, or host features to achieve visual minimalism. Feature specs and control catalogs enumerate capabilities, **not** a requirement to show all their panels at once.
- Small thematic decorations are permissible on Splash, but never obscure tasks or impersonate status. No fictional projects, counts, engine readiness, player sessions or network state in production UI.

## Unified toolbar, separate commands
Creator, Play and Host use a **common single-row toolbar design**: compact workspace identity/current context at start, immediate frequent actions in the middle, and stable **Settings ▾** and **Go To ▾** at the end. Same height, alignment, typography, interaction/focus treatment and icon conventions; **content and permissions differ by workspace**.
- **Settings ▾ → Appearance** in **every** Creator, Play and Host toolbar. Scope-specific appearance changes are applied through the existing ThemeManager (editor, client, host). Other settings can be grouped logically underneath; do not create duplicate appearance systems.
- **Go To ▾** lists the **other** destinations among Create, Play and Host. Example: from Host → Create, Play. Current workspace is identified in the toolbar but **not offered as a clickable redundant destination**. Provide an unobtrusive **Splash / Home** destination as well, to preserve the navigation contract and return path. Do not duplicate these controls in a second sidebar.
- Toolbar actions have real registered ActionIds and owners; single-action buttons only for frequent tasks. Less frequent commands belong in compact menus or context surfaces. A workspace-specific overflow is acceptable when needed, never a permanent second button ribbon.
- Switching **out of Play** disconnects its active game sessions after a Disconnect & Switch / Cancel guard; there is no background client connection. **Hosting** alone can persist on another workspace while the application stays open; app exit stops hosting (or can be canceled).
- Only show meaningful truthful state: unsaved Editor draft, connected state within Play, active host when applicable. **Splash uses `Active World: {world}` only while hosting**.

## Layout rules shared by all workspaces
1. One visually dominant task surface (Editor canvas / Play transcript / Host operations / Splash launch actions).
2. Secondary information sits close to the relevant action. Contextual drawers or collapsible side regions can be opened on demand, rather than permanent banks of panels.
3. Status and diagnostics are compact and conditional. Errors and destructive confirmations remain explicit and accessible; do not conceal important information for aesthetics.
4. Use subtle separators, consistent compact row heights and direct inline labels. Avoid excessive nested borders, giant cards, decorative empty space, needless subtitles or redundant help paragraphs.
5. Responsive desktop/tablet: collapse secondary tools into accessible drawers; keep the primary work surface and key actions in reach. No hover-only actions.
6. Use actual **existing preset tokens**, not hardcoded colors; see [theme presets](theme-presets.md). The desired retro look is a layout/typography/ornament direction compatible with the user's chosen theme. The current neon-lights / neon-dark-mode presets remain authoritative until separately changed through ThemeManager decisions.
7. Reuse shared Tauri/React-facing UI primitives and theme/focus/action plumbing. These presentation documents do **not** add a web dashboard, separate UI app framework or backend dependencies.

## Visual acceptance checks
- At ordinary desktop width, each workspace makes its primary task obvious without scanning a grid of cards or navigating clusters of redundant tabs.
- Both dropdowns are easy to find and usable from keyboard, pointer and touch; Settings contains Appearance, and Go To offers the other destinations plus Home.
- A basic task is performed with minimal repeated navigation; nothing falsely claims connected/saved/hosted state.
- Increasing font scale or narrowing window does not hide actions, overlap the primary work area, or make targets inaccessible.
- Builder must map every newly displayed actionable element to [control/action registry](../../../contracts/ui/v1/INDEX.md). These documents do not supersede functional behavior contracts.

## Screen-specific implementation detail

For default/empty/pending/error/transition layouts consult [screen-level wireframes](15-screen-wireframes-and-interaction-states.md). For visible text and tooltip decisions consult [anti-redundancy and microcopy contract](16-microcopy-and-density-acceptance.md). These are mandatory checks alongside the workspace feature-placement tables.
