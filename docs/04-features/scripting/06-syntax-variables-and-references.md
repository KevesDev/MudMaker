# 06 | Script Syntax, Variables and Engine References — Creator Experience

**Status:** C#14 syntax, SDK reference and persistence semantics DECIDED; UI implementation pending. **Owner:** code editor + Script SDK / Type Registry. **Authoritative semantics:** [C# and references contract](../../03-contracts/scripting-language-and-references.md), [exact typed SDK](../../03-contracts/scripting-v1/02-code-sdk.md).

## UI placements
Code Editor **Insert** dropdown: **Entity Reference**, **Asset**, **Component**, **Quest**, **Room**, **Event**, **World System**, **Script Variable**, **Message Variable**. Search modal with filters, preview, typed stable reference and Insert button. Tooltip shows result shape and ownership, not raw runtime pointer.
Code Editor **Variables** panel: Local (read-only auto-discovered), Exposed to Inspector, Instance State, World/Region (permissioned), Script Parameters, Event Inputs and Secrets (reference only). New Variable dialog: Name, Type dropdown, Default, Scope, Save between sessions toggle if supported by type, Show in Inspector toggle, Read-only toggle, Validation, Tooltip. Choosing instance-persistent state creates a versioned schema; no hidden RAM-only field.
Script **Bindings** inspector: attached object(s), hook type dropdown, before/after/replace/both segmented control, condition builder, handler entrypoint searchable dropdown, capability badges, failure policy dropdown, status/compile errors. A script may be reused by many entities with unique field overrides.
**Docs** tab lists typed engine APIs by category (Entities, Components, Locations/Exits, Quests, World Events, Messages, Players/Permissions, Time/RNG, Assets). Search, example, insert code, show expected result, warnings and allowed capabilities.
Code Editor hover over reference/SDK method shows concise description, parameters and return type, available only for declared scope, and link "View examples" to expandable popover (no walls of inline text).

## Selected editor-only shortcuts (never C# syntax rewriting)
- Typing `@` in a **reference insertion/search field** shows contextual entity picker; in raw C# code `@` remains normal C# syntax.
- Typing `#` in message/quest graph builder opens registered event/component/quest picker; in C# code `#` remains preprocessor syntax.
- Typing `{` inside dialogue/message template opens typed variable list (actor, target, quest, source room, train, condition-approved fields); closes with `}`. The content is escaped data, not code execution.
- Typing `.` after a typed SDK reference shows member completion, docs tooltip and risk/permission warning.
- All shortcuts have toolbar/button/picker equivalents; avoid hidden syntax-only essential features, especially on tablets.
- Disambiguation: the same punctuation may have different meaning in code source, dialogue template and editor search. Explicit per-editor context prevents accidental rewriting of C# strings or comments.
- Before adding a token alias, test collisions, accessibility, syntax clarity and whether an inline completion popup would be more intuitive.

## Example author journeys
**Reference a train door:** Open station entity -> Attach Script -> open editor -> Insert > Entity Reference -> search Train Door -> choose Blueprint slot (design-time) vs running Entity instance (debug-only) -> insert typed reference; tooltip explains dynamic docking validation. Code never stores native pointer.
**Custom A-prefix reward:** Select Quest > Rewards > When this happens -> If character display name starts with A -> Reward plan; optional script uses authorized actor name snapshot and returns validated typed reward grant. Preview anonymized sample profiles, exact when/why grant. No access to private account name by default.
**Dialogue quiz:** NPC > Dialogue > stage > Ask a Question -> author multiple choices and mark private correct answer -> optional script for grading -> test with two player profiles. Graph and C# route to same verified answer action, not direct UI.
**World event:** Quest turn-in > After or Replace -> Start/Stop World Event dropdown -> select existing event asset -> configure scope, lifecycle behavior and whether normal quest completion/reward proceeds. Debug trace shows committed action and result; failed hook never displays fake success.

## Visual language
Clean modern editor: left asset/variables rail, central syntax-highlighted code, right inspector/context, bottom diagnostics/trace. Compact toolbar (New Script, Save, Validate, Test, Attach, Publish; advanced actions in overflow). Tooltips on icons, helper text in popovers rather than verbose panels, discoverable disabled-action reasons. Search and keyboard shortcuts with focus protection; touch control parity. All colors, typography, spacing, interaction sizes and graph-paper grid tokens come from [central ThemeManager](../../03-contracts/editor-theme-manager.md); no arbitrary feature-local styling.

## Acceptance
Typed ref chosen by picker survives project save, rename/version change triggers correct dependency warning; old/deleted runtime ref cannot cause native crash; two worlds cannot share accidental script state; exposed persistent variable retains value after actual restart; hidden NPC and secret variable not available to unprivileged script; character prefix Unicode/case handling matches creator setting; `@/#/{}` in C# strings/comments aren't silently modified; curly braces in user text escaped safely; tablet user can invoke all pickers without typing special symbols; script/graph equivalence under same ECS state.
