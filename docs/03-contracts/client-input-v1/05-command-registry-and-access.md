# 05 — Default Commands, Dynamic Command Sets, Locks and Help

**DECIDED command availability semantics.** The source of available commands is an immutable local-host published `CommandRegistry` of typed [CommandDefinition](../../../contracts/input/v1/command-definition.schema.json) assets, not dynamic raw text or client-chosen script classes. Runtime effective command sets are per actor/world and re-evaluated on gameplay state transitions.

## Evennia feature adapted directly
[Evennia Command Sets](https://www.evennia.com/docs/latest/Components/Command-Sets.html) gather and merge commands from session/account/character/inventory/current location/objects/exits/channels with priorities and merge operations; [Locks](https://www.evennia.com/docs/latest/Components/Locks.html) provide access predicates; [Default Commands](https://www.evennia.com/docs/latest/Components/Default-Commands.html) provide out-of-box behavior. MudMaker includes equivalent **typed capabilities** without forcing creators to learn Python classes, lockstring syntax or matching algorithms.

## Effective command stack
| Scope | Capability | Read/write/auth guard |
|---|---|---|
| `SystemProtected` | auth/session/logout/accessibility/help and safety | Never bypass auth, cannot be shadowed by room commands; system-owned |
| `Session` | context help, active menu/composer, optional contextual commands | authenticated session state |
| `Account` | account-level settings and channels | owner/role and session policy |
| `Character` | look, move, say, inventory, use, skills | verified puppet/character, gameplay permissions |
| `Equipment/Inventory` | use a held tool, inspect/toggle wearable | actually owned/held/visible and component capability |
| `Location` | world commands available in room or region | verified spatial containment and phase |
| `NearbyObjects` | `open window`, `press button` | visibility, `call`/exposure permission, bounded candidate query |
| `Exits` | `north`, `board train`, `leave` | actual dynamic exit topology, dock/door capacity/visibility |
| `Channels` | send/read channel under membership permission | joined and unblocked channel |

Each layer can add/disable/replace commands with explicit `CommandSetBinding` policy (`Union`, `ReplaceScoped`, `Intersect`, `RemoveScoped`) and named priority/owner. **SystemProtected** entries and auth/security invariants are immutable. Conflict policy: if alias collision exists after allowed scope precedence, require an explicit host-authored override relation and audit log; unresolved ties fail publish/produce safe runtime ambiguity. A room's `look through window` is not allowed to override account `logout`. Role/quest/region conditions are typed predicate trees; not executable code.

## AccessRule and locking contract
Access rules are a declarative AST of `All`/`Any`/`Not` and allowlisted predicates: `roleAtLeast`, `isActor`, `owns`, `hasComponent`, `hasItem`, `currentRoom`, `withinRegion`, `exitTraversable`, `questState`, `levelRange`, `worldFlagEquals`, `channelMember`, `cooldownReady`. `Not` cannot invert engine-critical auth/ownership/visibility protections. No arbitrary `eval`, SQL fragments, dynamic Python lockfunc names or regex-defined security predicates. Allow is always: **verified session + base engine policy + entity visibility + specific CommandDefinition AccessRule + ECS commit preconditions**. In particular, `AccessRule` cannot make a hidden phased NPC targetable.

## Out-of-box templates (small but extensible)
`look/examine`; `move/go` + exits; `say`, `emote` + **long RP composer**; `whisper`, `channel`; `inventory`, `get/take`, `drop`, `give`, `use`; `interact`; `help`, `commands`, `who`, `profile/description`, `quit/logout`. These are system/published content commands, not universal privilege to edit game state. Host may disable gameplay defaults in a game template but may **not disable protected logout/auth/security controls**. Code/Graph custom behaviors are bound later through the same action/effect validation gateway.

`CommandDefinition` includes GUID ID, names/aliases, arguments, availability scopes, condition graph, rate class, help/usage/category, owner/visibility, execution effect binding and optional C# handler/graph asset. Help and autocomplete generated directly from **current actor-authorized commands**; unavailable commands can optionally show an **opted-in** vague reason without revealing hidden content.

## Editing behavior & caching
Owner edits local command definitions while server stopped, validates collisions and target schemas, publishes immutable release and starts hosted game. Runtime condition changes dynamically adjust effective command sets; recompiling the game is not required when **existing** command eligibility changes. Per-actor cache keyed by releaseId, room/inventory/quest/role/phase revisions with invalidation on committed domain events. Never use cached positive permission at commit; reauthorize.

## Host integration and resource controls
A new custom `/dance` command in UI is an asset, not new source code. Creator chooses arguments, permission, a native effect (e.g. `ShowDialogue`, `EmitDomainEvent`) and optional existing graph/C# hook. The engine validates and executes it via the same world actor. No duplicated client-side grammar/permission, no automatic string-to-script compilation. Search hints, command catalog enumeration and help all have scan/fanout budgets.

## Tests
Window room command becomes available only when window visible; same alias in room/character requires explicit precedence; exit `north` disappears when train is undocked/closed; carrying item exposes `use lantern`; default say works without code; all input surfaces resolve same action; separate accounts/characters have different allowed commands; stale cache cannot grant unauthorized action. Repeat with two characters phased differently.
