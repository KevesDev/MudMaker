# 17 — Splash implementation contract: text-mode art, wordmark, icons, window frame

**Status: DECIDED implementation contract for the owner-approved splash. Not implementation proof.** Layout, states and copy rules are owned by [11 splash visual spec](11-splash-screen-visual-spec.md), [15 wireframes](15-screen-wireframes-and-interaction-states.md), [16 microcopy](16-microcopy-and-density-acceptance.md) and [10 shared language](10-visual-language-and-shared-shell.md). This page adds only what they leave open: how the artwork, wordmark, icons and window frame are built. Visual reference: [owner mockup](assets/mudmaker-neon-splash-reference.png) (aesthetic reference; its sample version, build id and tagline are not content).

## Matching the mockup (owner instruction 2026-10-29: match as closely as possible)
The splash follows the [mockup](assets/mudmaker-neon-splash-reference.png) in composition, proportions, ornament and color roles. Deliberate decisions where the mockup and other documents meet:
| Mockup shows | Decision | Why |
|---|---|---|
| Tagline "BUILD WORLDS. YOUR WAY." under the wordmark | **Shown, letter-spaced, in the secondary accent**, as in the mockup. It is one fixed brand line stored as a single string and can be removed by deleting that string. | Owner asked for the mockup as closely as possible; this overrides the general no-subtitle rule of doc 16 for this one brand line only. Flagged for owner confirmation. |
| Version at the left of the title row and again beside the wordmark | **Once**, small, beside the wordmark (version, then build on the next line), exactly where the mockup places it. The frame row carries the application mark and `MudMaker` only. | doc 16 one label per intent |
| Recent Projects and Recent Worlds row | Built and styled as in the mockup but **rendered only when their Home/Library lists exist and hold data** (S04.6, S08.2). Until then the splash omits the row. | owner rule: no placeholder content in production UI |
| Settings and Quit at the bottom with icons, a thin divider with a center ornament above | As in the mockup. | |
| Fantasy landscape filling the window behind the content | As in the mockup, built as text-mode pixel art (below), scaled to the window. | |
| Sample version and build id | Real installed values from the shell. | doc 15 |
| Appearance not visible | Under Settings. | doc 11, 15 |
| Background hosting | `Active World: {name}` only while hosting. | doc 11, 15 |

## Window frame (the top row)
- The application draws its own frame row, matching the wireframe and the mockup: at the start the application mark and `MudMaker`; at the end minimize, maximize or restore, and close. The OS title bar is removed (`decorations: false`); the whole row except its controls is a drag region; double click toggles maximize.
- The same row becomes the shared toolbar row for Create, Play and Host (doc 10 and 15): identity at the start, frequent actions in the middle, `Settings ▾` and `Go To ▾` at the end. The window controls stay at the far end. One component, one height token, one set of window actions.
- Window controls are registered controls with action ids owned by the shell (minimize, maximize or restore, close). Close behaves exactly as Quit, including the stop-hosting guard. Every control is keyboard reachable with an accessible name and tooltip; targets meet the pointer and touch hit-size tokens.
- A thin continuous border in an accent token surrounds the window; it is part of the frame, not a card.

## Typography
- Labels, buttons, frame text and the footer use the monospace family token (`font.family.code`); no remote fonts and no new font files. Sizes from tokens; add a display size token for the wordmark only if the banner needs it.

## Wordmark
- Block-letter text banner of `MudMaker` made of full and half block characters in a fixed monospace grid, stored as data (rows of text), rendered as text in `color.accent.primary` with a restrained dithered lower edge as in the mockup. Not an image, not a font. Accessible name `MudMaker` (the banner itself is `aria-hidden`; the h1 text is the real wordmark text, visually hidden or the banner's accessible label).
- Installed version and build identifier sit beside the wordmark at its right, small, from `app_info` (as in the mockup).
- Thin divider below the wordmark: line characters with a small center ornament (a four-point star glyph as in the mockup), in the tertiary accent token, then the letter-spaced tagline line in the secondary accent.

## Text-mode art system
- **Format:** art is data, never a bitmap file. Each piece is a grid of palette indices, authored in a plain text file with one character per pixel and a legend. Two pixel rows map to one character cell using the upper half block with foreground and background colors (so one cell shows two pixels). Ordered dither is expressed in the data. Stars and sparkles use plain ASCII characters (`·`, `+`, `*`).
- **Colors:** palette indices map to semantic art tokens, never to hex values in the art data. Add `color.art.*` tokens (sky, far, mid, near, glow, star, accent) and three accent tokens `color.accent.primary|secondary|tertiary` through the ThemeManager process, derived from each preset palette and documented in [theme presets](theme-presets.md). Neon Lights: primary Digital Mint (wordmark, Create), secondary a blue from Electric Navy (Play), tertiary Hot Pink (Host); sky Vulcan toward Persian Blue, castle Electric Navy with Hot Pink windows, moon Digital Mint, mountains American Purple and Hot Pink dither, lake mint reflections. Neon Dark Mode: primary Electric Purple, secondary Neon Cyan, tertiary a derived tint of purple; sky Void, graphite and purple steps, moon Neon Cyan; Neon Lime stays a single status token and is not used in art.
- **Composition (from the mockup):** a night sky with sparse stars and a pale moon at the right; a fantasy castle on a cliff with a viaduct at the left; layered mountains and pines at the right; a calm lake at the bottom with reflections. Style is restrained pixel and dither fantasy.
- **Anchoring and sizing:** the scene is built from layers anchored to the window edges (castle left, mountains and moon right, lake along the bottom, sky and star scatter filling the rest, seeded so it is stable), so any window width and height works. The art scales in whole character cells; it never stretches or blurs.
- **Clear zone:** a central rectangle holding the wordmark, actions and footer is kept free of lit art or has the art dimmed so every text color keeps its contract contrast over whatever lies beneath. Art is decorative: `aria-hidden`, not focusable, never under focus rings in a way that hides them, not a status graphic, no animation except an optional single twinkle that honors reduced motion (none by default).
- **Icons:** the small icons in the mockup (document, play, server stack, folder, globe, gear, door) are 8 by 8 pixel grids in the same data format and renderer, `aria-hidden` beside visible labels. No icon library.

## Splash layout details (adding to doc 15)
- Content block sits slightly above the vertical center. Vertical gaps between wordmark, divider, action row, recent links, divider and footer are the small spacing tokens (no large gutters).
- **Action row:** Create, Play, Host equal width, one row, thin accent border each (primary, secondary, tertiary), icon then label then a chevron glyph, same height, compact gap. Below about the narrow breakpoint token they stack vertically. They are the catalog controls themselves, not wrappers around other buttons.
- **Footer:** `Settings` and `Quit` as small text actions with icons, separated by a thin vertical rule. `Settings` opens a compact menu anchored to it with `Appearance` (and later items); `Appearance` lists the presets with the current one marked and applies immediately through the ThemeManager for every scope; the not-saved note is not shown (it is removed when theme persistence lands in the Settings phase; until then the choice resets on restart).
- **Active World:** one line directly above the footer, only while hosting.
- **Startup states:** loading shows the wordmark and a short progress indicator only; failure replaces the action row with one concise error line and `Retry`, details in the log. Quit while hosting uses the stop-hosting guard.

## Registry reconciliation (home catalog)
Keep existing ids where they apply. Appearance moves from `home.splash.12` to the Settings surface; `home.splash.10` Connected Worlds is removed; `home.splash.09` becomes the conditional `Active World: {name}` line; add window frame and Settings entries with full metadata; Recent controls stay registered and are hidden until their lists exist. Counts and drift tests update in the same phase.

## Acceptance checks
1. Text inventory of the default state is exactly: frame title, wordmark, version and build, the tagline, Create, Play, Host, Settings, Quit (plus Recent links, Active World or failure text only when their conditions are real). Anything else fails.
2. Art renders deterministically from data with token colors only; changing preset recolors it; no hex literals in art data.
3. Contrast of every text color against the actual rendered cell colors beneath it, computed, passes in both presets including over the art edge cases.
4. Narrow width stacks the action row with no horizontal scroll down to the minimum window size; text scale 200 percent keeps all actions reachable.
5. Keyboard: Tab order frame controls, Create, Play, Host, Settings, Quit; visible focus ring on each; Escape closes the Settings menu and returns focus.
6. Window drag, double click maximize, minimize, restore and close work on Windows; close while hosting shows the guard.
7. Owner review against the mockup for look and feel in both presets.
