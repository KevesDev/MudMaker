# Built-in theme presets

The built-in presets are `neon-lights` and `neon-dark-mode`. They live in [theme-defaults.v1.json](../../../contracts/ui/v1/theme-defaults.v1.json) under `presets`. A preset sits between the application defaults and a user theme in the [ThemeManager](../editor-theme-manager.md) resolution order, and each scope chooses its own preset. `neon-lights` is the default for every scope.

## Palette derivation rule

Surfaces, text, borders, focus, interaction states and accents come only from the palette of the preset, or from a blend of one palette color toward white or toward black. Each blend is an integer percentage: `channel = round(source + (target - source) * amount / 100)`. The Rule column of each table names how the amount was chosen: the smallest lightening or darkening that reaches a contrast floor, the largest one that still keeps a floor, or a fixed layer step where the contract needs separation between layers.

The functional fallback set below is exempt. Standard ANSI meaning, status meaning and distinct graph type hues cannot come from five or six palette colors. Nothing in the interface may rely on color alone: status, graph node types and map symbols always carry a label or shape as well. A preset may override any fallback token with a palette color.

## Usage rules

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
| Borders, focus ring, graph accents, map symbols against the surfaces they sit on | 3:1 |
| `color.border.subtle` against every editor surface | 1.1:1 |
| `color.graph.grid.minor` against `color.surface.canvas` | at least 1.2:1 and below 2:1 |
| `color.graph.grid.major` against `color.surface.canvas` | at least 1.5:1 and below 2.5:1 |
| `color.interaction.selection`, `hover` and `pressed` from every editor surface and the node surface | 1.2:1 |
| `color.client.historyHighlight` and `matchHighlight` from client surfaces and terminal background | 1.2:1 |
| Primary text on selection, hover, pressed and node fills | 4.5:1 |
| High contrast mode: text and status colors | 7:1 |
| High contrast mode: borders and focus ring | 3:1 |

## neon-lights

Palette colors and the tokens that use them directly:

| Palette color | Hex | Tokens |
|---|---|---|
| Vulcan | #1C291E | `color.surface.app`, `color.surface.canvas`, `color.terminal.background` |
| Persian Blue | #222174 | `color.client.inputBackground`, `color.graph.node.surface`, `color.surface.inspector`, `color.surface.panel` |
| American Purple | #45214D | `color.graph.node.header`, `color.surface.toolbar` |
| Electric Navy | #2A28AD | `color.graph.node.selected`, `color.surface.overlay` |
| Digital Mint | #5DEA90 | `color.graph.edge.active`, `color.graph.node.action`, `color.graph.port.value`, `color.status.connected`, `color.status.success`, `color.terminal.foreground`, `color.text.primary` |
| Intense Hot Pink | #E23D8B | none |

Intense Hot Pink is below 4.5:1 on these surfaces, so it appears only as lightened border, focus ring and edge colors, a darkened selection fill and an error tone, never as body text. Status warning has no amber in the palette, so it is a lightened American Purple.

| Token | Source color | Blend toward | Amount | Result | Rule |
|---|---|---|---|---|---|
| `color.terminal.chat`, `color.text.secondary` | Digital Mint #5DEA90 | black | 6% | `#57DC87` | one third of the 18% floor |
| `color.status.offline`, `color.terminal.system`, `color.text.muted` | Digital Mint #5DEA90 | black | 12% | `#52CE7F` | two thirds of the 18% floor |
| `color.text.disabled` | Digital Mint #5DEA90 | black | 18% | `#4CC076` | largest darkening that keeps 4.5:1 on every surface |
| `color.border.invalid`, `color.client.channelAccent`, `color.graph.edge.invalid`, `color.graph.node.data`, `color.status.error` | Intense Hot Pink #E23D8B | white | 40% | `#EE8BB9` | smallest lightening reaching 4.5:1 on every surface |
| `color.graph.node.event`, `color.graph.port.event`, `color.status.information`, `color.terminal.link`, `color.terminal.prompt` | Electric Navy #2A28AD | white | 58% | `#A6A5DD` | smallest lightening reaching 4.5:1 on every surface |
| `color.graph.node.condition`, `color.graph.port.condition`, `color.status.reconnecting`, `color.status.warning`, `color.terminal.tell`, `color.terminal.warning` | American Purple #45214D | white | 60% | `#B5A6B8` | smallest lightening reaching 4.5:1 on every surface |
| `color.border.focused`, `color.graph.edge.selected`, `color.graph.port.execution`, `color.interaction.focus` | Intense Hot Pink #E23D8B | white | 12% | `#E55499` | smallest lightening reaching 3:1 on every surface |
| `color.border.normal` | Digital Mint #5DEA90 | black | 33% | `#3E9D60` | largest darkening that keeps 3:1 on every surface |
| `color.border.subtle` | Electric Navy #2A28AD | white | 4% | `#3331B0` | smallest lightening reaching 1.1:1 on every surface |
| `color.graph.grid.minor` | American Purple #45214D | white | 2% | `#492551` | smallest lightening reaching 1.2:1 on the canvas |
| `color.graph.grid.major` | Electric Navy #2A28AD | white | 2% | `#2E2CAF` | smallest lightening reaching 1.5:1 on the canvas |
| `color.graph.edge.default` | Digital Mint #5DEA90 | black | 32% | `#3F9F62` | largest darkening that keeps 4.5:1 on the canvas |
| `color.graph.edge.disabled` | Digital Mint #5DEA90 | black | 46% | `#327E4E` | largest darkening that keeps 3:1 on the canvas |
| `color.graph.node.shadow`, `color.surface.scrim` | Vulcan #1C291E | black | 100% | `#000000` | shadow and scrim are the black end of the blend |
| `color.client.matchHighlight`, `color.interaction.selection` | Intense Hot Pink #E23D8B | black | 29% | `#A02B63` | smallest darkening that gives Digital Mint text 4.5:1 |
| `color.client.historyHighlight`, `color.interaction.hover` | Electric Navy #2A28AD | white | 8% | `#3B39B4` | smallest lightening reaching 1.2:1 from every surface |
| `color.interaction.pressed` | Electric Navy #2A28AD | white | 16% | `#4C4ABA` | largest lightening that keeps Digital Mint text at 4.5:1 and 1.2:1 from every surface |

## neon-dark-mode

Palette colors and the tokens that use them directly:

| Palette color | Hex | Tokens |
|---|---|---|
| Void | #080808 | `color.surface.app`, `color.surface.canvas`, `color.terminal.background` |
| Dark Graphite | #141414 | `color.client.inputBackground`, `color.graph.node.surface`, `color.surface.panel` |
| Electric Purple | #9B5CFF | `color.border.focused`, `color.graph.edge.selected`, `color.graph.node.data`, `color.graph.port.event`, `color.interaction.focus`, `color.terminal.tell` |
| Neon Cyan | #00F5FF | `color.client.channelAccent`, `color.graph.edge.active`, `color.graph.node.event`, `color.graph.port.execution`, `color.status.information`, `color.terminal.link`, `color.terminal.prompt` |
| Neon Lime | #AAFF00 | `color.status.success` |

Status error and status warning are not named by the mapping and use the fallback set.

| Token | Source color | Blend toward | Amount | Result | Rule |
|---|---|---|---|---|---|
| `color.surface.toolbar` | Dark Graphite #141414 | white | 4% | `#1D1D1D` | layer separation step |
| `color.surface.inspector` | Dark Graphite #141414 | white | 7% | `#242424` | layer separation step |
| `color.surface.overlay` | Dark Graphite #141414 | white | 12% | `#303030` | layer separation step above graphite |
| `color.terminal.foreground`, `color.text.primary` | Void #080808 | white | 92% | `#EBEBEB` | near-white neutral |
| `color.terminal.chat`, `color.text.secondary` | Void #080808 | white | 81% | `#D0D0D0` | two thirds from the 58% floor to primary |
| `color.graph.edge.default`, `color.terminal.system`, `color.text.muted` | Void #080808 | white | 69% | `#B2B2B2` | one third from the 58% floor to primary |
| `color.text.disabled` | Void #080808 | white | 58% | `#979797` | smallest lightening that reaches 4.5:1 on every surface |
| `color.border.normal`, `color.graph.edge.disabled` | Void #080808 | white | 46% | `#7A7A7A` | smallest lightening reaching 3:1 on every surface |
| `color.border.subtle` | Dark Graphite #141414 | white | 15% | `#373737` | smallest lightening reaching 1.1:1 on every surface |
| `color.client.matchHighlight`, `color.interaction.selection` | Electric Purple #9B5CFF | black | 18% | `#7F4BD1` | smallest darkening that gives primary text 4.5:1 |
| `color.client.historyHighlight`, `color.interaction.hover` | Dark Graphite #141414 | white | 18% | `#3E3E3E` | hover step |
| `color.interaction.pressed` | Dark Graphite #141414 | white | 26% | `#515151` | pressed step |
| `color.graph.grid.minor` | Dark Graphite #141414 | white | 5% | `#202020` | smallest lightening reaching 1.2:1 on the canvas |
| `color.graph.grid.major` | Void #080808 | white | 16% | `#303030` | smallest lightening reaching 1.5:1 on the canvas |
| `color.graph.node.selected` | Dark Graphite #141414 | white | 14% | `#353535` | selected node step |
| `color.graph.node.header` | Dark Graphite #141414 | white | 7% | `#242424` | header step |
| `color.graph.node.shadow`, `color.surface.scrim` | Void #080808 | black | 100% | `#000000` | shadow and scrim are the black end of the blend |

## Functional fallback set

These application-default colors are not palette colors and not derived from one. The measured minimum is the lowest ratio over both presets and every surface listed in the last column.

| Token | Value | Role | Measured minimum | Measured against |
|---|---|---|---|---|
| `color.terminal.ansi1` | `#D98289` | Standard ANSI color slot | 5.42:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi2` | `#9AD1A6` | Standard ANSI color slot | 8.69:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi3` | `#E6C48A` | Standard ANSI color slot | 9.12:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi4` | `#A5C8F3` | Standard ANSI color slot | 8.77:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi5` | `#D6B3EC` | Standard ANSI color slot | 8.31:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi6` | `#9ED6DC` | Standard ANSI color slot | 9.46:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi7` | `#B7C3D1` | Standard ANSI color slot | 8.47:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi9` | `#FFB2B8` | Standard ANSI color slot | 8.89:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi10` | `#BCE7C5` | Standard ANSI color slot | 11.10:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi11` | `#FFE1A0` | Standard ANSI color slot | 11.93:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi12` | `#CBDEFA` | Standard ANSI color slot | 11.09:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi13` | `#E8CAFC` | Standard ANSI color slot | 10.31:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi14` | `#B5EAF0` | Standard ANSI color slot | 11.54:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi15` | `#F6F9FF` | Standard ANSI color slot | 14.37:1 (floor 4.5:1) | terminal background |
| `color.terminal.ansi0` | `#6D7075` | ANSI black and bright black slot | 3.05:1 (floor 3:1) | terminal background |
| `color.terminal.ansi8` | `#63758A` | ANSI black and bright black slot | 3.21:1 (floor 3:1) | terminal background |
| `color.terminal.emote` | `#DFC4F4` | Terminal message type | 9.63:1 (floor 4.5:1) | terminal background |
| `color.terminal.combat` | `#FFB3AF` | Terminal message type | 8.89:1 (floor 4.5:1) | terminal background |
| `color.terminal.warning` | `#FFCC93` | Terminal message type | 10.33:1 (floor 4.5:1) | terminal background |
| `color.map.room` | `#64798F` | Mapper symbol | 3.04:1 (floor 3:1) | client panel and terminal background |
| `color.map.visited` | `#7A97B4` | Mapper symbol | 4.50:1 (floor 3:1) | client panel and terminal background |
| `color.map.current` | `#9FE1B9` | Mapper symbol | 9.07:1 (floor 3:1) | client panel and terminal background |
| `color.map.unknown` | `#8A97A8` | Mapper symbol | 4.60:1 (floor 3:1) | client panel and terminal background |
| `color.map.exit` | `#B6CADD` | Mapper symbol | 8.12:1 (floor 3:1) | client panel and terminal background |
| `color.map.locked` | `#E69BA6` | Mapper symbol | 6.25:1 (floor 3:1) | client panel and terminal background |
| `color.map.uncertain` | `#F2C887` | Mapper symbol | 8.71:1 (floor 3:1) | client panel and terminal background |
| `color.map.note` | `#E1CE9C` | Mapper symbol | 8.79:1 (floor 3:1) | client panel and terminal background |
| `color.status.connected` | `#9FE1B9` | Connection status | 9.07:1 (floor 4.5:1) | client app and panel surfaces |
| `color.status.reconnecting` | `#F2C887` | Connection status | 8.71:1 (floor 4.5:1) | client app and panel surfaces |
| `color.status.offline` | `#A4B2C1` | Connection status | 6.32:1 (floor 4.5:1) | client app and panel surfaces |
| `color.status.error` | `#FFA1A6` | Status meaning (error, warning) | 5.44:1 (floor 4.5:1) | all editor surfaces and client app and panel |
| `color.status.warning` | `#F6CC8B` | Status meaning (error, warning) | 6.95:1 (floor 4.5:1) | all editor surfaces and client app and panel |
| `color.border.invalid` | `#F58A91` | Invalid field boundary | 4.45:1 (floor 3:1) | all editor surfaces |
| `color.graph.edge.invalid` | `#FFA1A6` | Graph edge in error | 7.87:1 (floor 3:1) | canvas |
| `color.graph.port.value` | `#B6DDB8` | Graph port and node type hue | 9.12:1 (floor 3:1) | canvas and node surface |
| `color.graph.port.condition` | `#F8D493` | Graph port and node type hue | 9.64:1 (floor 3:1) | canvas and node surface |
| `color.graph.node.condition` | `#F1CF96` | Graph port and node type hue | 9.17:1 (floor 3:1) | canvas and node surface |
| `color.graph.node.action` | `#ABE1BB` | Graph port and node type hue | 9.25:1 (floor 3:1) | canvas and node surface |
| `color.graph.node.data` | `#C9B2F2` | Graph port and node type hue | 7.24:1 (floor 3:1) | canvas and node surface |

## Measured minimum contrast

Lowest ratio over every pair in each group, computed with the WCAG 2.2 relative luminance formula.

| Group | neon-lights | neon-dark-mode |
|---|---|---|
| Text primary | 6.80:1 | 11.07:1 |
| Text secondary | 5.98:1 | 8.56:1 |
| Text muted | 5.23:1 | 6.22:1 |
| Text disabled | 4.54:1 | 4.52:1 |
| Status colors on editor surfaces | 4.50:1 | 6.85:1 |
| Normal, focused and invalid borders | 3.02:1 | 3.07:1 |
| Focus ring | 3.02:1 | 3.37:1 |
| Primary text on selection, hover, pressed and node fills | 4.52:1 | 4.60:1 |
| Graph edges, ports and node types | 3.05:1 | 4.67:1 |
| Subtle border against every surface | 1.10:1 | 1.11:1 |
| Grid minor line against the canvas | 1.20:1 | 1.23:1 |
| Grid major line against the canvas | 1.51:1 | 1.52:1 |
| Selection, hover and pressed from every surface and the node surface | 1.21:1 | 1.23:1 |
| Client history and match highlights from client surfaces and terminal background | 1.58:1 | 1.72:1 |
| Client text | 7.80:1 | 11.94:1 |
| Client status colors | 5.87:1 | 8.52:1 |
| Client borders | 3.94:1 | 4.29:1 |
| Terminal message colors | 6.53:1 | 5.12:1 |
| ANSI palette | 3.05:1 | 4.03:1 |
| Channel accent | 6.52:1 | 14.79:1 |
| Terminal text on highlights and input background | 4.52:1 | 4.60:1 |
| Map symbols | 3.04:1 | 4.10:1 |
