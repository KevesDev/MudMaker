# 04 | Shared Scripting UI Style, Controls, Tooltips and Accessibility

**Status:** REQUIRED modern, clean, approachable experience; design tokens PROPOSED. **Owner:** one shared product UI/design system across Code, Graph, Map, Quest and Blueprint.

## Design language
Avoid beveled 1990s boxed forms and complicated spaghetti diagrams. Use calm modern creative-software visual hierarchy: neutral adaptable dark/light surfaces, restrained accents by meaning, subtle dot grid, legible typography, compact rounded cards, soft elevation and smooth graph paths. Consistent spacing/type/contrast/touch targets from centralized design tokens. No hardcoded arbitrary pixel values until UI testing and accessibility ADR.

**Global shell**: header with project and active tab, left collapsible search/asset tree, large central editing surface, context inspector to right or bottom sheet, collapsible diagnostics/trace footer. A beginner's screen shows only what they need; advanced fields behind labeled accordions and tabs, not discarded.

## Exact component behavior
| Component | UI and control |
|---|---|
| Script/Graph toggle | Tabs or segmented control on the *behavior asset* when a shared handler offers two authoring types; changing type never converts code to nodes silently |
| Add Behavior | Primary labeled button in entity/quest/world inspector; opens search with **Code / Visual Graph** and templates |
| Asset/entrypoint pickers | Searchable list with icons, categories, asset path, version, short one-line description and clear unavailable reason |
| Hook mode selector | **Normal / Before / After / Replace / Conditional / Both** with 1-line helper tooltip on mode and effect ordering preview |
| Typed properties | Schema-generated checkboxes, numeric units/sliders, optional select, entity reference picker, quest/item picker, condition builder, reset-to-default action |
| Help and tooltip | Icon or focus/hover/tap popover: one or two concise sentences plus optional **More details** link. Keyboard focus triggers same help as hover |
| Problems badge/status | Unobtrusive count + exact error source navigation; no toast-only failure |
| Validate/Test/Save | Visible compact buttons; show **Draft Saved**, **Validated**, **Tested**, **Published**, **Live version** separately |
| Source/nav | Breadcrumb to owning Blueprint/Quest/Room, Find Usages, attached instances and versions |
| Dangerous operation | Confirmation for deleting widely used script, changing ABI while live, removing persistent state, merging unsafe script permissions; list exactly affected refs |
| Bottom trace panel | Collapsible tabs: Problems, Execution Trace, State Changes, Client Messages, Metrics. Summary by default, expanded details on click |

## Tooltip copy proposals
- **Before**: "Checks conditions before the normal action. The custom behavior can stop or delay it."
- **Replace**: "Use this behavior instead of the normal action. Choose what happens to the quest."
- **Both**: "Run the normal action and this custom action. Review their order and failure handling."
- **Expose to Graph**: "Make this function available as a searchable node in visual scripting."
- **Persistent Variable**: "Saved with this world or quest and restored after the server restarts."
- **Entity Reference**: "A safe reference to an object in the current world. You cannot use it to access another game."
- **Hook Capabilities**: "Choose which game changes this script may request. Server access is restricted."
- **Test**: "Run this behavior in a private test world and inspect the result."
- **Publish**: "Create a validated version for hosting. Saving a draft does not change your running game."
- **Override**: "Change this instance's exposed value without changing every object using the same Blueprint."
These are proposed user-facing strings, not a license to hardcode without localization requirements.

## Touch, keyboard and screen readers
Every hover/right-click action has a labeled tap/keyboard path. Tablet portrait uses bottom drawers, landscape uses collapsible sidebars, canvas stays primary. Larger connection targets, explicit connect mode, pan/pinch separated from node drag, no accidental edit while scrolling. When typing in code, dialogue or tooltip search, central Input Manager suppresses map/global shortcuts. Buttons and ports have accessible names, focus indicators, ordered navigation. Errors announced where appropriate; color never sole meaning. Reduced-motion mode disables animated execution traces.

## Performance requirements
Virtualize large graphs/palettes; memoize node views; editor must not recompute every visible node on every keystroke or flood server with tooltip queries. Debounced validations are cancellation-aware and version-tagged; values measured, not magic timeout. Test with real desktop and tablet viewport/gesture workloads. Agent must not claim visual acceptance from headless DOM snapshots alone.
