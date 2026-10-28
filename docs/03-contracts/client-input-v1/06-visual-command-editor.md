# 06 — Built-In Visual Command Creator (No-Code First)

**DECIDED feature UX; not implemented.** Graph and editor typography/colors use [one ThemeManager](../editor-theme-manager.md) and [dark graph-paper canvas](../scripting-v1/06-graph-parity-and-publishing.md). Command editor consumes [typed definition schema](../../../contracts/input/v1/command-definition.schema.json), [parser](04-command-parser-grammar.md) and [access rules](05-command-registry-and-access.md). The interface is built in S10 after S09 editor shell and S03 asset schema; advanced C# / visual graph hooks integrate in S11.

## Creation UX — user can make a command without code
1. Open **Project > Commands > New Command** or inspector **Add Command** on NPC/room/item/exit/quest.
2. Choose template (Say/Emote, Inspect, Interact, Move/Exit, Give, Use, Toggle Field, Dialogue, Quest Command, World Event, Custom Blank); immediately see editable name, example command, and built-in help.
3. **Name & aliases**: plain-language command (may be multiword), shortcuts, optional /switches, case-insensitive matching and collision warning with nearby/default commands. Editor shows *where* command is available, not raw priority integer by default.
4. **Arguments**: add typed fields with accessible forms (required text, number/range, entity reference with visibility/ownership, item in inventory, enum dropdown, schema-bounded multiline argument composer (including long builder/moderator operations)). Preview examples and parsing behavior (quoted names, `lhs=rhs`, whitespace); show command equivalent for graphical button.
5. **When available**: visual permissions/condition builder (Owner, Role, Quest, Region, Item Held, In Room, Exit Docked, etc.) with AND/OR/group; **never unrestricted access/lock code**. Show effective command providers and conflicts. Advanced priority/merge panels for experienced hosts.
6. **What it does**: no-code action builder selects existing registered `GameEffect`s (ShowDialogue, SetComponentField, ChangeWorldEvent, Move via native action, etc.), combines in transaction with error behavior; or opens shared visual graph; or binds a locally published C# method later. All effects pass central native authorization.
7. **Presentation**: help category, usage, autocomplete examples, description, success/error message templates, moderation and action rate class, RP length class and default command visibility.
8. **Try it**: test console and simulated UI button drive **real isolated ECS test world** (not fake parser) showing parser AST, matched source/alias, arg types, role/phase/target access, effect plan and committed outcome. Invalid input displays helpful diagnostics.
9. Save as draft; **Publish** validates alias conflicts, scope/ACL, argument limits, capabilities, graph and C# bindings and world refs; stop host, publish immutable release, restart to deploy.

## Sample no-code creator task
Host wants `ring bell` when near station bell: name `ring bell`, alias `bell`; scope = NearbyObject (station bell), condition = Actor in room AND Bell visible; args = none; action = `EmitDomainEvent(StationBellRung)` and optional `SetComponentField(Bell.LastRungAt)`; help = “Rings the station bell.” Test two players; only those in the proper room see localized event. **No command script required.**

Host wants custom `give item = person`: selected template "Give"; item selector = `OwnedInventoryItem`, target selector = `VisibleCharacter`; split grammar `lhs=rhs`; native `TransferItem` domain action (NOT arbitrary inventory field override). Engine checks original and destination ownership/capacity at commit. Editor validates and displays `give "red key" = "Joe Smith"` syntax.

## Editor structure
Sidebar project command library; central **Command Definition Form**; optional **Graph** tab, using central ThemeManager graph-paper renderer; right Inspector for availability, sample input/parsed output and conflict diagnostics; bottom real Test/Trace/Problems. Accessibility: no hover-only controls, autocomplete and direct keyboard navigation, touch/pen drag alternatives. Show beginner fields first; advanced precedence, connection and ECS capabilities folded away with clear explanations.

## Versioning, accessibility and safety
- Draft content never becomes a live game command until host local publish. Connected players cannot send `CommandDefinition` assets or override command handler bindings.
- Editor **prevents publish** if unknown action type, unsafe capability, conflicting aliases without explicit precedence, invalid input bounds, unknown owner, missing help or target type, circular graph or incompatible release.
- User theme changes the editor, not game command semantics. Visual editor itself does not duplicate `CommandService` or define a second parser.
- `SubmitText` RP composer and character bio editor are first-class GUI forms; the command editor chooses their entry actions but does not squeeze prose into a tiny console line.
- Include a no-code onboarding walkthrough: "Create a command and invite a second player to test it"; measure completion and drop-off, not only feature checklists.

## Phases
S05: parser/types/registry/permissions in native harness. S08: hardened client ingress. S09: shell/ThemeManager. **S10: default command templates + form editor + visual permissions + command test harness**, then S11 advanced C#/graph binding. S13: real hosted publish/security. [Phase list](../../05-sprints/specs/INDEX.md).
