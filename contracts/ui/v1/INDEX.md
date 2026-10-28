# UI Catalog v1 — Every Planned Visible Element

**Status: SPECIFICATION ONLY — NOT IMPLEMENTED.** Four scoped machine-readable files: [Splash/Home](home-controls.v1.json), [Creator Editor](editor-controls.v1.json), [Player Client](client-controls.v1.json), [Host Operations](host-controls.v1.json). **365 visible elements** across the four catalogs and **283 distinct semantic actions**, each with stable ID, label, tooltip/help, active view, state owner, action (or explicit passive status), permission, visible/enabled condition and test ID. This is a *planning inventory*, extended by each implementation phase; not proof these widgets exist.

| Workspace | Items | Primary owner |
|---|---:|---|
| home | 40 | HomeIntentRouter |
| editor | 146 | EditorIntentRouter |
| client | 116 | ClientIntentRouter |
| host | 63 | HostAdminIntentRouter |

**Navigation is cross-workspace**: `ui.nav.*` actions belong **only to [WorkspaceNavigator](../../../docs/03-contracts/ui-ux/00-launch-and-workspace-navigation.md)**, not duplicated in each workspace. App startup → loading → Splash → Create/Play/Host. Every workspace's Go To menu uses the same navigation actions and guards; active host remains running if user chooses Keep Hosting; second hosted project is rejected by HostSupervisor.

## Agent lookup (do not load all)
1. Pick exactly one catalog file for the relevant workspace and `rg -n '"surface": "host.navigation"' contracts/ui/v1/host-controls.v1.json` for a particular surface.
2. Read `id`, `actionId`, labels/help, state, availability, test ID and [action registry](actions.v1.json), whose `owner` is sole router. No remote server may define these actions.
3. [Shared component states and focus](../../../docs/03-contracts/ui-ux/02-interaction-state-and-accessibility.md) and [ThemeManager](../../../docs/03-contracts/ui-ux/03-theme-and-preferences.md) define display behavior. [S00 document acceptance](../../../docs/05-sprints/specs/S00.md) is **not** a fake UI runtime test.
4. Implementation phase must render/bind/test the relevant registered controls, not all 365. If it introduces another visible element it must add it to the scoped catalog and action table in the same phase, including keyboard/touch/failure evidence.

## Static audit
Exactly one action owner per ActionId, catalog IDs unique, every interactive control has action + accessible label + help + relevant failure states, every passive status shows owner/safe value, all four catalog payloads validate with [control schema](ui-control.schema.json). No duplicate ThemeManager, service-bound UI primitive, unauthorized Actor/Host actions, or cross-workspace shortcut. An exhaustive live UI audit happens in **S18**, not S00.
