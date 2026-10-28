# Commands, aliases, scoped command sets and collision resolution

**Binding design contract; runtime pending.** Command aliases are first-class alternate spellings for a single stable `CommandDefinition` and action ID. They must not be confused with **object search aliases**, **exit aliases**, **virtual LOOK-detail aliases**, **channel names**, or **player-local macros**. Those have different owners, permissions and conflict scopes. This contract extends [central commands](commands-and-input.md), [visual command editor](client-input-v1/06-visual-command-editor.md), [LOOK](look-and-perception.md) and [ECS exits](ecs-objects-and-exits.md).

## Evennia findings

[Evennia Commands](https://www.evennia.com/docs/latest/Components/Commands.html) allows a Command to declare a primary key and an `aliases` collection. [Command Sets](https://www.evennia.com/docs/latest/Components/Command-Sets.html) merges available commands from Session, Account, Character, carried objects and current location, using priorities and merge strategies (Union, Intersect, Replace, Remove). **Aliases participate in collisions as strongly as primary command keys**: two commands sharing an alias may replace one another during command-set merging. Its [Extended Room](https://www.evennia.com/docs/latest/Contribs/Contrib-Extended-Room.html) supplies alternate LOOK behavior through a custom command set. MudMaker keeps the scope and composability but does not permit silent alias-shadowing or require replacement command sets to add a LOOK detail.

## Authoring and defaults

A `CommandDefinition` stores immutable `CommandId`, `PrimaryName`, zero or more `Aliases`, parameter grammar, help, authorization, available scopes, typed action and version. Each alias has display spelling, normalized match key and optional deprecation/help note; aliases cannot have independent permissions or effects. Default aliases include `look/l/ls`, `inventory/inv/i`, `get/take`, `emote/pose`, `tell/page`, `go/move`; the normal exit name (e.g. `north`, `n`, `door`) is an **object-provided contextual action** bound to the same `TraverseExitIntent`, not a global new command per exit. Default aliases are editable by world authors; command packs may be disabled or replaced without bypassing native security.

A command may have multiple-word names/aliases (`ring bell`, `pull lever`, `look at`) and symbols (`'` for SAY, `:` for EMOTE) if an explicit grammar permits. Match **longest normalized command key on a whole token boundary**, not substring prefix matching. Unicode NFKC + invariant casefold for command keys, trim outer whitespace and collapse internal whitespace outside quotes; retain original player argument spelling and quoted spans. Reject empty aliases, aliases identical after normalization, control-character keys, forbidden namespace/system-reserved tokens and aliases exceeding 64 Unicode scalar characters. A symbol-prefix shortcut is only recognized in the command-intent context; freeform RP submissions never silently become commands.

## Scopes and deterministic command resolution

Available command catalogs are merged as an **authorized, versioned command view** for the active session/character/world context:

1. Protected host/session protocol and authentication operations (not overridable by world creators).
2. Temporary modal interaction command set (e.g. dialogue/menu) with explicit scope and expiry.
3. Character/actor capability and equipped/carried callable objects.
4. Current location and authorized nearby callable entities, including named exits.
5. World-published default/custom game command set.
6. User-local input shortcuts/macros (expanded **client-side only** to normal command intents and reauthorized, never elevated).

The precedence above orders candidate **scope layers**. Within a layer, exact primary name beats exact alias; if both match across distinct commands, a publish-time explicit conflict rule must select one based on stable CommandId and permission scope. If unresolved, **publication fails** for co-active commands. A narrower scoped object action may override a global command **only via an explicit author-approved shadow rule**; without it, simultaneous candidates yield a safe ambiguity/failure rather than silently executing the wrong action. Protected commands cannot be shadowed. Conditional command sets are activated/deactivated by typed predicates, with no stale cached privileges; membership, location, equipment and mode changes cause relevant command-view invalidation.

When multiple nearby objects offer `ring bell`, the matched command is one contextual verb definition with multiple authorized object targets; the player must choose a target if the grammar does not specify one. Hidden objects never appear in ambiguity or autocomplete. A changed room/phase invalidates stale chosen target revisions. Runtime never picks a random object or silently assigns an authorized action to the first match.

**Search aliases vs command aliases:** `box-2` in `get sword from box-2` is an object name/alias resolved *after* selecting the GET command, not a GET command alias. `2.box` is a numbered authorized object selector. `north` is an exit's local action alias; changing its name does not rename the host-wide GO command. `look at` may be part of LOOK grammar rather than its own CommandDefinition; both routes must resolve to the same `LookMode`.

## Publish-time diagnostics and Creator experience

In the existing **Command Definition Form**, **Name & Aliases** is a token/chip editor with Add Alias, Remove, test input, source scope, normalized match preview, active command-set explanation, conflict severity and **Where This Command Works**. The Problems dock reports collisions listing both stable CommandIds, scope predicates and how to fix them (rename alias, restrict scope, add explicit shadow rule or remove one command). The **Test command** harness parses real examples and reports chosen primary/alias match, competing authorized candidates, selected scope, typed args, permission checks and actual host result.

Expose a searchable **Command Pack** authoring asset in the universal Template Library to group startup commands and change availability by world/region/character, with inherited variations and normal release publishing. Adding a new alias never needs a separate script file. Help and autocomplete show primary name plus authorized aliases, hide unavailable commands and use the same effective command view as actual execution. If an alias is removed, old input gets an ordinary unknown-command response plus optional safe published deprecation help; never retain invisible execution pathways.

## Scripting, protocol and checks

On a matching alias, C#/graph hooks receive the **canonical CommandId, source scope and parsed typed arguments**, plus read-only `MatchedAlias`/original input for diagnostics. They never receive authority from the alias text itself. Hook overrides change behavior through published scoped command policies and validated effects; the client does not choose a command by supplying arbitrary internal CommandId. User macros and local quick-actions submit normal authenticated actions.

Acceptance: primary/alias/symbol/multiword matching; `l` and LOOK result parity; `get` vs `take`; equipment/room-scoped command introduction/removal; two objects exposing same `ring bell`; deliberate shadow rule vs same-scope collision rejection; protected authentication commands; invisible target not in completion; NFKC collisions; quote parsing; item alias `box-2` vs `2.box`; reconnect and zone/phase changes invalidating catalog; per-client text/visual command parity; no duplicate effects when retrying alias requests. No isolated alias parser outside CommandService.
