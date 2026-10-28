# 04 | Shared Scripting UI Components and Tooltips

**Status:** interaction contract selected; implementation pending. **All typography, surface colors, semantic node/port colors, spacing, elevation, radii, focus, grid and motion values MUST come from [ThemeManager](../../03-contracts/editor-theme-manager.md)**. This page owns **behavior and copy**, never design values. Graph canvas uses dark continuous **graph-paper lines**, not dots.

## Shared editor controls
| Component | Required behavior |
|---|---|
| Script/Graph mode | Code editor and graph editor are explicit modes/assets; changing tabs never silently converts code |
| Add Behavior | Visible and searchable Code / Visual Graph selection from entity/quest/world inspector |
| Hook/asset selector | Versioned, searchable and typed; state why an unavailable binding cannot be chosen |
| Hook phase | Show permitted Before/After/Query for selected registered ID; explain veto/replace/defer, query no effects |
| Inspector fields | Schema-generated typed widgets, valid ranges, references, persistence/override precedence, reset-to-default |
| Help | Focus/hover/tap tooltip: What it does, When it runs, Required capabilities; linked exact SDK docs |
| Problems | Navigable error list with exact source file, line and component, plus safe actionable remediation |
| Save / Validate / Test / Publish | Distinct states: saved local draft, validated, tested in real isolated world, published immutable release |
| Project reference | Breadcrumb, find usages, owner, release binding and component version |
| Hazardous change | Confirmation with exact impacted bindings/instances/schema migrations, no fake silent success |
| Trace footer | Real operator trace, affected ECS fields, persistent state, hooks, onceKeys and observer deliveries |

## Creator and player boundary
Only **local game owner** authors/compiles/publishes executable scripts. Connected players send authenticated gameplay actions and dialogue choices, never scripts. Host stops running game → changes scripts and graph assets → validates/publishes → restarts. No live hot reload is needed for v1.

## Tooltips and error messages
- **Before:** “Run checks before the normal game action. A handler may reject or replace it when allowed.”
- **After:** “Runs after the action is committed. Additional changes are recorded separately.”
- **Query:** “Returns a value or display text without changing world state.”
- **Replace:** “Use the declared custom effects instead of the normal action; include every required effect.”
- **Persistent override:** “Saved game-state value; the engine validates and restores it after restart.”
- **Field conflict:** “This value changed since the script read it. Retry or inspect the latest value.”
- **Publish failure:** Show missing hook, wrong handler type, stale binding, invalid schema or missing permission precisely.
Text strings are localized resources; do not hardcode them in many different screens.

## Acceptance
All essentials accessible without hover, keyboard/touch/pen affordances, type-aware suggestions and human-readable diagnostics. Theming is user-owned, centralized and applied instantly. Tests: [S02](../../05-sprints/specs/S02.md) UI/theme, [S13](../../05-sprints/specs/S13.md) exact language and trace, [S18](../../05-sprints/specs/S18.md) accessibility.
