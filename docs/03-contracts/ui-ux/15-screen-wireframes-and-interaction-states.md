# 15 — Screen-level wireframes and interaction states

**Owner-approved UI specification, not implemented evidence.** Use with [shared visual language](10-visual-language-and-shared-shell.md), [microcopy and anti-clutter rules](16-microcopy-and-density-acceptance.md), [navigation contracts](00-launch-and-workspace-navigation.md), and [control catalog](../../../contracts/ui/v1/INDEX.md). ASCII frames specify **regions and hierarchy**, not fixed pixels or a new color palette. Use the current ThemeManager presets and accessible scalable spacing.

## Shared shell: Create, Play, Host

```text
┌ MudMaker / WORKSPACE · relevant current context ────────────────────────────┐
│ [contextual frequent actions]                      [Settings ▾] [Go To ▾] │
├─────────────────────────────────────────────────────────────────────────────┤
│                          DOMINANT WORKING SURFACE                         │
│            [secondary tools only when selected or requested]             │
└─────────────────────────────────────────────────────────────────────────────┘
```

- The workspace's current identity is plain text; it must NOT be a redundant clickable Go To item. There are exactly three workspaces, Create, Play and Host, besides the Splash. Go To offers only the other two. In Host: Create, Play. In Create: Play, Host. In Play: Create, Host.
- Settings → Appearance is always findable in the same menu location, but editor/client/host preference scope remains separate. Other settings grouped by purpose. Secondary functionality belongs to contextual menus and drawers, not an always-visible app-wide tab strip.
- Opening menu: anchored to trigger, compact one-column options, keyboard focus, Escape dismissal and focus restoration. Active, disabled and pending states have explicit accessible explanations. A dropdown never automatically changes workspace merely by focus/hover.
- When width contracts: keep Settings and Go To reachable in compact overflow or appropriate drawer, not clipped; never transform the main surface into four columns.

## Splash: default / hosting / startup failure

```text
┌ MudMaker                                      version · build ──────────────┐
│                     [compact retro ornamental backdrop]                 │
│                             MUDMAKER                                      │
│                       [ CREATE ] [ PLAY ] [ HOST ]                         │
│                 Recent Projects   ·   Recent Worlds                      │
│                   [Active World: Name]  (hosting only)                    │
│                         Settings   ·   Quit                               │
└───────────────────────────────────────────────────────────────────────────┘
```

- Artwork is **decorative**, preferably restrained pixel/dither fantasy with approved preset palette. It may span background but must not overpower focus, controls or readability. [Owner-approved illustration placement](11-splash-screen-visual-spec.md).
- Create/Play/Host are equal-weight, direct route selectors, not project creation, network connect or server startup.
- **Normal:** no connectivity notice, engine-ready boast, startup instruction, onboarding paragraph or missing-world explanation.
- **Hosting:** one exact compact status `Active World: {worldname}`; absent when not hosting. No Connected Worlds widget.
- **Startup loading/recovery:** only a short actual progress/error status; if validation fails, show one actionable error summary and Retry. Preserve diagnostic detail in expandable details/log, not a giant diagnostic card.
- **Recent Projects/Recent Worlds:** route to focused Home/Library lists; no large duplicate lists on the splash.
- **Quit while hosting:** prompt Stop Hosting & Exit or Cancel; if shutdown fails show failure and do not claim exit succeeded.
- Mockup is a visual reference, **not literal requirement for fake version numbers, sample build IDs, or hardcoded colors**.

## Create: workspace / selection / errors

```text
┌ CREATE · ProjectName*   [Save] [Save All] [Undo] [Redo] [Build ▾] [View ▾] ... Settings ▾ Go To ▾ ┐
├ Assets ▸ ┬───────────── active document: MAP / GRAPH / CODE ──────────────────────────┤
│ (drawer) │ [contextual map/graph/code tools]                                           │
│          │                     CANVAS / DOCUMENT                                      │
│          │                                                                            │
│          │                                      [Inspector ▸ when selected]            │
├──────────┴────────────────────── [Problems/Output ▴ only as needed] ───────────────────┤
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- Initial project view: main active document, compact document switcher/actual open-document tabs only; do not make permanent tabs for every editor module.
- Asset Explorer opens via View/Assets or context; collapsed by default when task does not require it. Node/room selection reveals Inspector directly adjacent; hide irrelevant fields and empty sections.
- Canvas-specific tools appear in narrow local strip; selecting Graph replaces Map tools, not stacks another toolbar. Code may use a collapsible file tree and a focused diagnostics output.
- Quests, Dialogue, World Systems, Commands, Blueprints and Publish are **focused document modes/actions**, found via a compact workspace feature chooser or search; no page of launch cards.
- **No selection:** show canvas, not a giant 'select something' tutorial panel; Inspector can be absent. **Invalid field:** inline short validation tied to field. **Build/Publish errors:** unobtrusive Problems drawer with actionable entries and navigation to issue.
- **Unsaved draft on Go To:** Keep Draft & Switch, Save & Switch, Cancel; save pending state truthful; no discard without explicit destructive operation.
- **Publish:** focused review/diff with progress and valid confirmation; never a promotional success summary or fake finished state.

## Play: library / connected session / sidebar / navigation

```text
┌ PLAY · WorldName · Connected [Disconnect] [Find] ... Settings ▾ Go To ▾ ┐
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         PRIMARY TRANSCRIPT                              │
│                    (real text, virtualized)        [Map ▸ if opened]    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ [Mode ▾ if supported] [command/message entry                        ] [Send] │
└─────────────────────────────────────────────────────────────────────────┘
```

- **No active session:** a focused searchable World Library with saved profiles, Add World, Connect; editing one profile reveals a compact dedicated form with host/port/adapter/TLS. Never imply an external MUD supports native game widgets.
- **Connected:** transcript and composer dominate. The map/notes/channels/vitals/inventory/quests/hotbuttons/debug tools use one accessible secondary drawer chosen via View or context; only show structured data when supported and authorized. Open multiple real sessions may justify a compact session tab strip.
- **Composer:** local send mode only when protocol supports it; optional history/preview actions appear on demand. No generic chat instructions in a panel. Status, unread, security and errors appear only where meaningful.
- **Connection failure:** concise status beside world/connect action, preserve profile inputs, Retry where supported. **Search/selection:** inline transient find strip and actual text selection commands; avoid stacked tool panels.
- **Leaving Play while connected:** one dialog lists affected session names and offers Disconnect & Switch / Cancel. Close every Play socket before switching. No Keep Connected, background transcript, or automatic reconnect. Local draft/profile preferences may remain for explicit reconnect.
- **No active game:** avoid a fake 'Disconnected' card that repeats the absence of a session.

## Host: stopped / running / focused operations / exit

```text
┌ HOST · WorldName · [Running|Stopped] [Start/Stop] ... Settings ▾ Go To ▾ ┐
├──────────────────────────────────────────────────────────────────────────┤
│ [Project to Host ▾] [Player Sessions] [Traffic] [Logs] [Backups] [Release] │
│ [Operations ▾ → Network]                                                │
│                                                                          │
│            PRIMARY OPERATIONS / SELECTED FOCUSED VIEW                   │
│         real server state, necessary actions, relevant data             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Stopped:** selected world/release, verification and Start. No empty metric cards. **Running:** true running state, actual player count/connection details when useful, Stop and operational view. Never advertise uptime/health without real source.
- **Switching operations:** Player Sessions, Traffic, Logs, Backups and Release are bordered splash-style buttons, one selected at a time, with no underlines or tab styling. Operations → Network is a secondary focused view and does not repeat those five primary routes. Its selection clears the primary choice. Project to Host uses only real project/release options; no fake empty choice or status is drawn.
- **Player row selected:** contextual moderation actions, with permission check and confirmation for kick/ban. **Network settings:** focused labeled fields and relevant exposure warning by the risky input/action; not a wallpaper of warnings.
- **Recovery/rollback:** selected release and actual impact confirmation with pending/error states; do not silently modify current host. Single-host conflict offers Go to Existing Host / Stop Existing Host… / Cancel.
- **Leaving Host:** Keep Hosting & Switch / Stop Hosting & Switch / Cancel, with connected player impact where relevant. **Exit app:** Stop Hosting & Exit / Cancel, never background persistence after app termination.

## Common interaction state examples

| State | Visual rule | Forbidden pattern |
|---|---|---|
| Ready | concise label and clear activation affordance | explanatory subtitle repeating the button |
| Hover/focus | token-based visible highlight and brief help tooltip on demand | always-visible instructions |
| Disabled | still discoverable where needed; tooltip explains specific reason | unlabeled grayed icon / paragraphs of warnings |
| Pending | button shows busy state, duplicate action blocked; actual operation tracked | fictional 'Success' before confirmation |
| Empty | one short contextual cue only if next action is unclear | large empty-state card with title, subtitle and tutorial |
| Validation error | short inline message at affected input plus accessible announcement | generic error dashboard |
| Recoverable error | localized message and Retry/View Details if useful | permanent stack of diagnostics |
| Destructive confirmation | explicit affected entities, consequences, Cancel and confirm | decorative warning panel |
| Background host | one truthful active-host cue on Splash; full detail in Host | always-on host metrics across mini-apps |
| Leave Play | disconnect guard before navigation | background client socket / keep-connected option |

## Test oracle
For each screen and state above: screenshot at ordinary desktop and constrained width, keyboard and screen reader walk-through, and verify every action maps to its registered UI action. Any permanent panel, tab, subtitle, instruction block or extra label requires a functional reason; [microcopy rules](16-microcopy-and-density-acceptance.md) apply.
