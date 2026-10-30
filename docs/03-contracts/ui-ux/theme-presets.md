# Built-in theme presets

The built-in presets are `neon-lights` and `neon-dark-mode`. They live in [theme-defaults.v1.json](../../../contracts/ui/v1/theme-defaults.v1.json) under `presets`. A preset sits between the application defaults and a user theme in the [ThemeManager](../editor-theme-manager.md) resolution order, and each scope chooses its own preset. `neon-lights` is the default for every scope.

## Palette values

The palette values below are sampled from the owner's palette images, taking the most common fill pixel of each swatch. The hex labels printed beside the swatches differed slightly (Neon Lights: Vulcan #1C291E, Persian Blue #222174, American Purple #45214D, Digital Mint #5DEA90, Intense Hot Pink #E23D8B; Neon Dark Mode: Dark Graphite #141414, Electric Purple #9B5CFF, Neon Cyan #00F5FF, Neon Lime #AAFF00). The swatch is the reference, the labels are not. Every derived value below is recomputed from the sampled values with the rules in its row.

## Palette derivation rule

Surfaces, text, borders, focus, interaction states and accents come only from the palette of the preset, or from a blend of one palette color toward white or toward black. Each blend is an integer percentage: `channel = round(source + (target - source) * amount / 100)`. The Rule column of each table names how the amount was chosen: the smallest lightening or darkening that reaches a contrast floor, the largest one that still keeps a floor, or a fixed layer step where the contract needs separation between layers.

The functional fallback set below is exempt. Standard ANSI meaning, status meaning and distinct graph type hues cannot come from five or six palette colors. Nothing in the interface may rely on color alone: status, graph node types and map symbols always carry a label or shape as well. A preset may override any fallback token with a palette color.

## Usage rules

- The accent colors are the exact palette colors, never tints. `color.accent.primary` and `tertiary` draw rules, wordmark and action borders and reach 3:1 on the surfaces they sit on (tertiary on every surface but the overlay, where it is not drawn). `color.accent.secondary` is a boundary and text color in neon-dark-mode (Neon Cyan) and a fill under `color.text.primary` in neon-lights (Electric Navy), where it is too dark to draw a boundary. In neon-dark-mode `primary` is 3.03:1 on the overlay, so it is used only for borders, rules and display-size text.
- `color.accent.onSecondary` is the text drawn on a `color.accent.secondary` fill: Digital Mint on Electric Navy in neon-lights (6.81:1), Void on Neon Cyan in neon-dark-mode (14.11:1). It exists because no single text color reads on both fills. In high contrast it is moved by the smallest blend that reaches 7:1 on the secondary accent.
- The launch screen draws `color.accent.primary` and `color.accent.tertiary` as text only on `color.surface.canvas`, where both reach 4.5:1 in both presets (neon-lights tertiary 4.63:1, neon-dark-mode primary 4.95:1); on the other surfaces they remain borders, rules and display text.
- The launch screen measures are derived, not chosen by eye (table below). The stacking width scales with the text scale, because the buttons grow with it.
| Token | Value | Derivation |
|---|---|---|
| `font.size.wordmarkStep` | 2 | The banner font size is a whole number of these units. The banner is 76 columns wide and one column is about 0.55 of the font size, so one unit adds about 84px to the banner: coarse enough that every step is a visible change, fine enough that the banner fills the space it has. |
| `font.size.icon` | 8 | The size of the cell of an 8 by 8 pixel icon or the application mark. One pixel is about 0.55 of this wide and half of it tall, so an icon is about 35px wide and 32px tall: a little shorter than two lines of caption text, and inside the 40px frame row. It scales with the text scale like every font size. |
| `wordmark.defaultStep` | 5 | The step used when the window cannot be measured: the largest step that fits the content width at the minimum window (480 wide, less the 1px window border twice and 16px of stage padding twice, 446px; five steps are about 418px). |
| `wordmark.seam` | 1 | Fractional character widths leave a hairline, narrower than one device pixel, between neighbouring block characters. A copy of the banner one seam to the right and one below overlaps it. 1px is the smallest whole unit the stylesheet states; at a scaled display it spans more device pixels, which overlaps more and stays invisible. |
| `layout.splashMaxWidth` | 640 | Half the default window width (1280). The mockup's action row is 805 of its 1672px width, 48%. |
| _Version placement and the row under the banner_ | derived | Under the banner sits one reserved row on every screen: one caption line at the body line height plus one row gap, 12 x 1.5 + 8 = 26px. It is the whole distance from the banner's foot to the divider, or to the loading bar, because the block below adds no spacing of its own. The divider row has the body line height (14 x 1.5 = 21px) and no token of the banner, so its line sits 10.5px lower: 36.5px from the banner's foot, against 29px in the mockup. With room beside the banner the version hangs there as the two lines of the copy (version, then build) at its lower right and uses none of the row. Without room it is the one compact string of the copy, `Version x, build y`, right-aligned in the row. Either way nothing in the flow changes, so the banner and everything after it keep their places. |
| _Action row stacking_ | measured | There is no width token. The row stacks when the three buttons do not fit one line, measured on the page: the screen lays the row out in one line, checks whether the last button runs past the row, and stacks it when it does. Any code font and any text scale therefore give the right answer, and a button's least width is its label plus its padding, never less than the pointer or touch hit size. |
| `layout.dividerRatio.wide`, `layout.dividerRatio.narrow` | 0.76, 0.59 | The mockup measures the action row at 805px and its two dividers at 610px and 471px: 610 / 805 = 0.76 and 471 / 805 = 0.585, rounded to 0.59. Each divider is that fraction of the action row at every width, so it is narrower than the row down to the minimum window. |
| `layout.share.above`, `layout.share.below` | 135, 610 | The mockup measures 135px of free space between the frame row and the top of the banner, and 610px from the bottom of the banner to the window edge. The free height of the launch screen divides in that proportion, 135 : 610, between the space above the banner and the block below it. The banner therefore keeps the same place on the loading, loaded and failed screens, and the whole composition keeps the mockup's proportions as the window grows: at 680px high the banner top sits about 16% of the way down, at 1000px about 17%, against 15% in the mockup. |
| `font.lineHeight.wordmark` | 1 | Block rows touch only when the line height equals the font size. |
| `font.lineHeight.art` | 1 | A text-art cell shows two pixels with one half block, so rows join without a gap only when the line height equals the font size. |
| `font.letterSpacing.tagline` | 4 | The mockup spaces the brand line by about a third of its size; 4px is 0.29 of the 14px body size the line uses. |

- The `color.art.*` tokens (`deep`, `sky`, `haze`, `far`, `mid`, `near`, `accent`, `glow`, `star`, `light`) are the roles of the text-mode art. They are decorative: they carry no text contrast floor, they never show information, and every role of a preset is separated from every other role of that preset by a CIE76 delta E of at least 10 (the smallest difference the eye notices is about 2.3, so ten reads as a different color at a glance even in dim art), measured in CIE L*a*b* from sRGB with the D65 white point; hue-separated pairs pass by delta E, not by lightness. The lowest pair is 13.0 (`deep` and `near`) in neon-lights and 13.1 (`glow` and `light`) in neon-dark-mode. High contrast mode leaves them as they are. Art data names a role, never a color. Neon Lime is not used in art. The art is not drawn when the platform forces its own colors (`forced-colors: active`) or when the page is printed: its block is hidden and takes no space, so text stays readable.
- `color.border.frame` is the window border. It is the exact Intense Hot Pink in neon-lights and the exact Electric Purple in neon-dark-mode, and it reaches 3:1 against the page and the frame row.
- `layout.frameRowHeight` is the least height of the window frame row; controls inside it keep their pointer or touch hit size, so the row grows rather than clips them.
- `color.border.subtle` is a decorative divider only and never marks an interactive boundary. Interactive boundaries use `color.border.normal`.
- Graph grid lines are quiet, continuous lines. They are never dots.
- `color.surface.scrim` is the color laid over the interface behind a modal dialog, and `opacity.scrim` is how much of that color covers it, in whole percent. The application default is 65: the smallest step of 5 at which primary text on the covered `color.surface.app` falls below 3:1 in both presets, so covered content reads as inactive. `presetContrast.test.ts` recomputes it. A dialog and its text sit above the scrim and use the overlay surface.
- `layer.popup`, `layer.tooltip` and `layer.dialog` order floating interface from lowest to highest; a tooltip sits above a menu and a dialog above both.

## Contrast floors

The same floors are named constants in `presetContrast.test.ts` and are checked against both presets.

The client scope inherits the editor tokens of its preset, so the text, status, border, focus and subtle-border floors below, and the interaction-fill floors, are also checked for the client scope against all six surfaces, and in high-contrast mode. Both presets pass with the inherited values, so the client scope needs no derived override of an inherited color.

| Token group | Floor |
|---|---|
| Text and status colors against every surface of their scope | 4.5:1 |
| Borders, focus ring, graph accents, map symbols, accent colors against the surfaces they sit on | 3:1 |
| `color.accent.primary` against every editor surface; `color.accent.tertiary` against every editor surface but the overlay; `color.border.frame` against the page and toolbar surfaces | 3:1 |
| `color.accent.secondary` as a fill under `color.text.primary` (neon-lights), or against every editor surface (neon-dark-mode) | 4.5:1 as a fill, 3:1 as a boundary |
| `color.accent.onSecondary` against `color.accent.secondary`; `color.accent.primary` and `color.accent.tertiary` as text against `color.surface.canvas` | 4.5:1 |
| `color.border.subtle` against every editor surface | 1.1:1 |
| `color.graph.grid.minor` against `color.surface.canvas` | at least 1.2:1 and below 2:1 |
| `color.graph.grid.major` against `color.surface.canvas` | at least 1.5:1 and below 2.5:1 |
| `color.interaction.selection`, `hover` and `pressed` from every editor surface and the node surface | 1.2:1 |
| `color.client.historyHighlight` and `matchHighlight` from client surfaces and terminal background | 1.2:1 |
| Primary text on selection, hover, pressed and node fills | 4.5:1 |
| High contrast mode: text and status colors | 7:1 |
| High contrast mode: normal, focused and invalid borders, the focus ring, `color.border.frame`, `color.accent.primary` and `color.accent.tertiary`, each against every editor surface | 3:1 |
| High contrast mode: `color.accent.primary` and `color.accent.tertiary` as text against `color.surface.canvas` | 7:1 |
| High contrast mode: `color.accent.onSecondary` against `color.accent.secondary` | 7:1 |
| High contrast mode: `color.accent.secondary`, unless it already reaches 3:1 against every editor surface, against `color.text.primary` | 7:1 |

High contrast mode only moves a color that does not already comply, toward white or black by the smallest blend that reaches the floor, and never moves a surface. The normal-mode palette values are never edited. In high contrast the exact secondary accents of both presets are left as they are; in neon-lights `color.border.frame` and `color.accent.tertiary` are the same exact Intense Hot Pink, which is 2.63:1 on the overlay surface, so high contrast lightens both of them there. The primary and tertiary accents are drawn as text on the canvas by the launch screen (Create, Host, the wordmark), so in high contrast they are raised by the same smallest blend to the 7:1 text floor on the canvas; that moves them toward white, so their 3:1 against every other surface still holds. In normal mode they keep the exact palette values. The secondary accent is a boundary or a fill under primary text, never pushed toward a surface color: if it bounds every surface at 3:1 it is left alone, otherwise it moves away from the text color until the text reaches 7:1 on it. That second rule only changes a user theme whose secondary accent can do neither.

## neon-lights

Palette colors and the tokens that use them directly:

| Palette color | Hex | Tokens |
|---|---|---|
| Vulcan | #111320 | `color.art.deep`, `color.surface.app`, `color.surface.canvas`, `color.terminal.background` |
| Persian Blue | #232175 | `color.art.sky`, `color.client.inputBackground`, `color.graph.node.surface`, `color.surface.inspector`, `color.surface.panel` |
| American Purple | #41204D | `color.art.haze`, `color.graph.node.header`, `color.surface.toolbar` |
| Electric Navy | #2A28AD | `color.accent.secondary`, `color.graph.node.selected`, `color.surface.overlay` |
| Digital Mint | #5EEA91 | `color.accent.onSecondary`, `color.accent.primary`, `color.art.glow`, `color.graph.edge.active`, `color.graph.node.action`, `color.graph.port.value`, `color.status.connected`, `color.status.success`, `color.terminal.foreground`, `color.text.primary` |
| Intense Hot Pink | #E23D8A | `color.accent.tertiary`, `color.art.accent`, `color.border.frame` |

Intense Hot Pink is below 4.5:1 on these surfaces, so it appears exact only as the tertiary accent, the window border and the decorative art accent (3.41:1 or more on every surface but the overlay, 3.42:1 for the border against the page and the frame row), and otherwise only as lightened border, focus ring and edge colors, a darkened selection fill and an error tone, never as body text. Electric Navy is exact as the secondary accent, a fill under Digital Mint text (6.81:1); it is 1.0:1 to 1.76:1 against the surfaces, so it never draws a boundary or text. Status warning has no amber in the palette, so it is a lightened American Purple.

| Token | Source color | Blend toward | Amount | Result | Rule |
|---|---|---|---|---|---|
| `color.terminal.chat`, `color.text.secondary` | Digital Mint #5EEA91 | black | 6% | `#58DC88` | one third of the 18% floor |
| `color.status.offline`, `color.terminal.system`, `color.text.muted` | Digital Mint #5EEA91 | black | 12% | `#53CE80` | two thirds of the 18% floor |
| `color.text.disabled` | Digital Mint #5EEA91 | black | 18% | `#4DC077` | largest darkening that keeps 4.5:1 on every surface |
| `color.border.invalid`, `color.client.channelAccent`, `color.graph.edge.invalid`, `color.graph.node.data`, `color.status.error` | Intense Hot Pink #E23D8A | white | 40% | `#EE8BB9` | smallest lightening reaching 4.5:1 on every surface |
| `color.graph.node.event`, `color.graph.port.event`, `color.status.information`, `color.terminal.link`, `color.terminal.prompt` | Electric Navy #2A28AD | white | 58% | `#A6A5DD` | smallest lightening reaching 4.5:1 on every surface |
| `color.graph.node.condition`, `color.graph.port.condition`, `color.status.reconnecting`, `color.status.warning`, `color.terminal.tell`, `color.terminal.warning` | American Purple #41204D | white | 60% | `#B3A6B8` | smallest lightening reaching 4.5:1 on every surface |
| `color.border.focused`, `color.graph.edge.selected`, `color.graph.port.execution`, `color.interaction.focus` | Intense Hot Pink #E23D8A | white | 12% | `#E55498` | smallest lightening reaching 3:1 on every surface |
| `color.border.normal` | Digital Mint #5EEA91 | black | 33% | `#3F9D61` | largest darkening that keeps 3:1 on every surface |
| `color.border.subtle` | Electric Navy #2A28AD | white | 4% | `#3331B0` | smallest lightening reaching 1.1:1 on every surface |
| `color.graph.grid.minor` | American Purple #41204D | white | 0% | `#41204D` | smallest lightening reaching 1.2:1 on the canvas; the palette color already reaches 1.35:1, so the blend is 0% |
| `color.graph.grid.major` | Electric Navy #2A28AD | white | 0% | `#2A28AD` | smallest lightening reaching 1.5:1 on the canvas; the palette color already reaches 1.76:1, so the blend is 0% |
| `color.graph.edge.default` | Digital Mint #5EEA91 | black | 39% | `#398F58` | largest darkening that keeps 4.5:1 on the canvas |
| `color.graph.edge.disabled` | Digital Mint #5EEA91 | black | 53% | `#2C6E44` | largest darkening that keeps 3:1 on the canvas |
| `color.graph.node.shadow`, `color.surface.scrim` | Vulcan #111320 | black | 100% | `#000000` | shadow and scrim are the black end of the blend |
| `color.client.matchHighlight`, `color.interaction.selection` | Intense Hot Pink #E23D8A | black | 29% | `#A02B62` | smallest darkening that gives Digital Mint text 4.5:1 |
| `color.client.historyHighlight`, `color.interaction.hover` | Electric Navy #2A28AD | white | 8% | `#3B39B4` | smallest lightening reaching 1.2:1 from every surface |
| `color.interaction.pressed` | Electric Navy #2A28AD | white | 16% | `#4C4ABA` | largest lightening that keeps Digital Mint text at 4.5:1 and 1.2:1 from every surface |
| `color.art.far` | Electric Navy #2A28AD | black | 55% | `#13124E` | depth step: the farthest land, darker than the sky behind it |
| `color.art.mid` | Electric Navy #2A28AD | white | 12% | `#4442B7` | depth step: the brightest land layer, between the far hills and the dark foreground |
| `color.art.near` | Persian Blue #232175 | black | 62% | `#0D0D2C` | depth step: the darkest land, silhouettes in front of every other layer |
| `color.art.light` | Digital Mint #5EEA91 | white | 30% | `#8EF0B2` | fixed step: a soft tint of the moon color for lit windows and reflections |
| `color.art.star` | Digital Mint #5EEA91 | white | 60% | `#BFF7D3` | fixed step: a pale tint of the moon color for sparse star points |

## neon-dark-mode

Palette colors and the tokens that use them directly:

| Palette color | Hex | Tokens |
|---|---|---|
| Void | #080808 | `color.accent.onSecondary`, `color.art.deep`, `color.surface.app`, `color.surface.canvas`, `color.terminal.background` |
| Dark Graphite | #191919 | `color.client.inputBackground`, `color.graph.node.surface`, `color.surface.panel` |
| Electric Purple | #9759FF | `color.accent.primary`, `color.art.accent`, `color.border.focused`, `color.border.frame`, `color.graph.edge.selected`, `color.graph.node.data`, `color.graph.port.event`, `color.interaction.focus`, `color.terminal.tell` |
| Neon Cyan | #06EFFF | `color.accent.secondary`, `color.art.glow`, `color.client.channelAccent`, `color.graph.edge.active`, `color.graph.node.event`, `color.graph.port.execution`, `color.status.information`, `color.terminal.link`, `color.terminal.prompt` |
| Neon Lime | #B4FF00 | `color.accent.tertiary` |

Status error and status warning are not named by the mapping and use the fallback set.

| Token | Source color | Blend toward | Amount | Result | Rule |
|---|---|---|---|---|---|
| `color.surface.toolbar` | Dark Graphite #191919 | white | 4% | `#222222` | layer separation step |
| `color.surface.inspector` | Dark Graphite #191919 | white | 7% | `#292929` | layer separation step |
| `color.surface.overlay` | Dark Graphite #191919 | white | 12% | `#353535` | layer separation step above graphite |
| `color.terminal.foreground`, `color.text.primary` | Void #080808 | white | 92% | `#EBEBEB` | near-white neutral |
| `color.terminal.chat`, `color.text.secondary` | Void #080808 | white | 82% | `#D3D3D3` | two thirds from the 61% floor to primary |
| `color.graph.edge.default`, `color.terminal.system`, `color.text.muted` | Void #080808 | white | 71% | `#B7B7B7` | one third from the 61% floor to primary |
| `color.text.disabled` | Void #080808 | white | 61% | `#9F9F9F` | smallest lightening that reaches 4.5:1 on every surface |
| `color.border.normal`, `color.graph.edge.disabled` | Void #080808 | white | 48% | `#7F7F7F` | smallest lightening reaching 3:1 on every surface |
| `color.border.subtle` | Dark Graphite #191919 | white | 15% | `#3C3C3C` | smallest lightening reaching 1.1:1 on every surface |
| `color.status.success` | Neon Lime #B4FF00 | black | 10% | `#A2E600` | fixed step so the exact lime stays unique to the tertiary accent; 8.09:1 on every surface |
| `color.client.matchHighlight`, `color.interaction.selection` | Electric Purple #9759FF | black | 16% | `#7F4BD6` | smallest darkening that gives primary text 4.5:1 |
| `color.client.historyHighlight`, `color.interaction.hover` | Dark Graphite #191919 | white | 18% | `#424242` | hover step |
| `color.interaction.pressed` | Dark Graphite #191919 | white | 26% | `#555555` | pressed step |
| `color.graph.grid.minor` | Dark Graphite #191919 | white | 2% | `#1E1E1E` | smallest lightening reaching 1.2:1 on the canvas |
| `color.graph.grid.major` | Void #080808 | white | 16% | `#303030` | smallest lightening reaching 1.5:1 on the canvas |
| `color.graph.node.selected` | Dark Graphite #191919 | white | 14% | `#393939` | selected node step |
| `color.graph.node.header` | Dark Graphite #191919 | white | 7% | `#292929` | header step |
| `color.graph.node.shadow`, `color.surface.scrim` | Void #080808 | black | 100% | `#000000` | shadow and scrim are the black end of the blend |
| `color.art.sky` | Dark Graphite #191919 | white | 6% | `#272727` | fixed step: exact Dark Graphite is only 6.6 from `color.art.deep` (exact Void), so the sky is lightened until it is 13.4 from it |
| `color.art.haze` | Electric Purple #9759FF | black | 78% | `#211438` | depth step: the dim purple of the horizon over the graphite sky |
| `color.art.far` | Electric Purple #9759FF | black | 60% | `#3C2466` | depth step: the farthest land, darker than the middle layer |
| `color.art.mid` | Electric Purple #9759FF | black | 40% | `#5B3599` | depth step: the brightest land layer |
| `color.art.near` | Electric Purple #9759FF | black | 88% | `#120B1F` | depth step: the darkest land, a Void-dark purple that sits 10 or more from exact Void |
| `color.art.light` | Neon Cyan #06EFFF | white | 50% | `#83F7FF` | fixed step: a soft tint of the moon color for lit windows and reflections, at least 10 from exact Neon Cyan |
| `color.art.star` | Neon Cyan #06EFFF | white | 75% | `#C1FBFF` | fixed step: a pale tint of the moon color for sparse star points |

## Functional fallback set

These application-default colors are not palette colors and not derived from one. The measured minimum is the lowest ratio over both presets and every surface listed in the last column.

| Token | Value | Role | Measured minimum | Measured against |
|---|---|---|---|---|
| `color.terminal.ansi1` | `#D98289` | Standard ANSI color slot | 6.60:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi2` | `#9AD1A6` | Standard ANSI color slot | 10.59:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi3` | `#E6C48A` | Standard ANSI color slot | 11.10:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi4` | `#A5C8F3` | Standard ANSI color slot | 10.68:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi5` | `#D6B3EC` | Standard ANSI color slot | 10.12:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi6` | `#9ED6DC` | Standard ANSI color slot | 11.52:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi7` | `#B7C3D1` | Standard ANSI color slot | 10.32:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi9` | `#FFB2B8` | Standard ANSI color slot | 10.82:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi10` | `#BCE7C5` | Standard ANSI color slot | 13.51:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi11` | `#FFE1A0` | Standard ANSI color slot | 14.53:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi12` | `#CBDEFA` | Standard ANSI color slot | 13.51:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi13` | `#E8CAFC` | Standard ANSI color slot | 12.55:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi14` | `#B5EAF0` | Standard ANSI color slot | 14.05:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi15` | `#F6F9FF` | Standard ANSI color slot | 17.50:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi0` | `#6D7075` | ANSI black and bright black slot | 3.71:1 (floor 3:1) | terminal background |
| `color.terminal.ansi8` | `#63758A` | ANSI black and bright black slot | 3.90:1 (floor 3:1) | terminal background |
| `color.terminal.emote` | `#DFC4F4` | Terminal message type | 11.72:1 (floor 4.5:1) | terminal background |
| `color.terminal.combat` | `#FFB3AF` | Terminal message type | 10.83:1 (floor 4.5:1) | terminal background |
| `color.terminal.warning` | `#FFCC93` | Terminal message type | 12.58:1 (floor 4.5:1) | terminal background |
| `color.map.room` | `#64798F` | Mapper symbol | 3.02:1 (floor 3:1) | client panel and terminal background |
| `color.map.visited` | `#7A97B4` | Mapper symbol | 4.47:1 (floor 3:1) | client panel and terminal background |
| `color.map.current` | `#9FE1B9` | Mapper symbol | 9.02:1 (floor 3:1) | client panel and terminal background |
| `color.map.unknown` | `#8A97A8` | Mapper symbol | 4.58:1 (floor 3:1) | client panel and terminal background |
| `color.map.exit` | `#B6CADD` | Mapper symbol | 8.07:1 (floor 3:1) | client panel and terminal background |
| `color.map.locked` | `#E69BA6` | Mapper symbol | 6.21:1 (floor 3:1) | client panel and terminal background |
| `color.map.uncertain` | `#F2C887` | Mapper symbol | 8.66:1 (floor 3:1) | client panel and terminal background |
| `color.map.note` | `#E1CE9C` | Mapper symbol | 8.74:1 (floor 3:1) | client panel and terminal background |
| `color.status.connected` | `#9FE1B9` | Connection status | 9.02:1 (floor 4.5:1) | client app and panel surfaces |
| `color.status.reconnecting` | `#F2C887` | Connection status | 8.66:1 (floor 4.5:1) | client app and panel surfaces |
| `color.status.offline` | `#A4B2C1` | Connection status | 6.29:1 (floor 4.5:1) | client app and panel surfaces |
| `color.status.error` | `#FFA1A6` | Status meaning (error, warning) | 5.44:1 (floor 4.5:1) | all editor surfaces and client app and panel |
| `color.status.warning` | `#F6CC8B` | Status meaning (error, warning) | 6.95:1 (floor 4.5:1) | all editor surfaces and client app and panel |
| `color.border.invalid` | `#F58A91` | Invalid field boundary | 4.45:1 (floor 3:1) | all editor surfaces |
| `color.graph.edge.invalid` | `#FFA1A6` | Graph edge in error | 9.58:1 (floor 3:1) | canvas |
| `color.graph.port.value` | `#B6DDB8` | Graph port and node type hue | 9.07:1 (floor 3:1) | canvas and node surface |
| `color.graph.port.condition` | `#F8D493` | Graph port and node type hue | 9.59:1 (floor 3:1) | canvas and node surface |
| `color.graph.node.condition` | `#F1CF96` | Graph port and node type hue | 9.12:1 (floor 3:1) | canvas and node surface |
| `color.graph.node.action` | `#ABE1BB` | Graph port and node type hue | 9.20:1 (floor 3:1) | canvas and node surface |
| `color.graph.node.data` | `#C9B2F2` | Graph port and node type hue | 7.20:1 (floor 3:1) | canvas and node surface |

## Measured minimum contrast

Lowest ratio over every pair in each group, computed with the WCAG 2.2 relative luminance formula.

| Group | neon-lights | neon-dark-mode |
|---|---|---|
| Text primary | 6.81:1 | 10.29:1 |
| Text secondary | 5.99:1 | 8.19:1 |
| Text muted | 5.24:1 | 6.12:1 |
| Text disabled | 4.55:1 | 4.63:1 |
| Status colors on editor surfaces | 4.50:1 | 6.37:1 |
| Normal, focused and invalid borders | 3.02:1 | 3.03:1 |
| Focus ring | 3.02:1 | 3.03:1 |
| Primary accent against every editor surface | 6.81:1 | 3.03:1 |
| Tertiary accent against every editor surface but the overlay | 3.41:1 | 11.95:1 |
| Window border against the page and toolbar surfaces | 3.42:1 | 3.93:1 |
| Secondary accent (fill under primary text in neon-lights, boundary in neon-dark-mode) | 6.81:1 | 8.64:1 |
| Text on the secondary accent fill | 6.81:1 | 14.11:1 |
| Primary and tertiary accent text on the canvas | 4.63:1 | 4.95:1 |
| Primary text on selection, hover, pressed and node fills | 4.53:1 | 4.54:1 |
| Graph edges, ports and node types | 3.01:1 | 4.34:1 |
| Subtle border against every surface | 1.10:1 | 1.11:1 |
| Grid minor line against the canvas | 1.35:1 | 1.20:1 |
| Grid major line against the canvas | 1.76:1 | 1.52:1 |
| Selection, hover and pressed from every surface and the node surface | 1.21:1 | 1.22:1 |
| Client history and match highlights from client surfaces and terminal background | 1.57:1 | 1.75:1 |
| Client text | 7.77:1 | 11.74:1 |
| Client status colors | 5.84:1 | 8.14:1 |
| Client borders | 3.92:1 | 4.34:1 |
| Terminal message colors | 7.95:1 | 4.95:1 |
| ANSI palette | 3.71:1 | 4.03:1 |
| Channel accent | 7.94:1 | 14.11:1 |
| Terminal text on highlights and input background | 4.53:1 | 4.54:1 |
| Map symbols | 3.02:1 | 3.91:1 |
