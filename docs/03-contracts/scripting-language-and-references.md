# Scripting Language Surface, Engine References and Shorthand Syntax

**Status:** owner-required API usability and shortcuts; syntax examples are **PROPOSED**, not committed parser features. **Owner:** Script SDK, Type/Reference Registry, Code Editor Language Service, Graph Node Registry. **Depends:** native engine/worker ADR and [script runtime](scripting-runtime-and-capabilities.md).

## Language vs syntax sugar
There are two distinct choices:
A. **C# as primary code language:** retain valid standard C# grammar. Extend usability through annotations/attributes, editor autocomplete, code snippets, source generators and a *documented opt-in editor preprocessor* (only if necessary). Never imply arbitrary `@`/`#` forms are C# syntax. Prefer ordinary C# features and semantic editor completions rather than creating a second half-language.
B. **Custom MudMaker language:** can reserve special syntax for engine references and compiler directives, but requires specified grammar, tokenizer, parser, AST/IR, types, semantics, escaping, compiler diagnostics, syntax highlighting, debugger and migration. Not chosen merely because shortcut punctuation feels neat.

## Proposed high-level coding model (illustrative, not a compiled public SDK)
```csharp
// Illustrative C# authoring API; exact identifiers not finalized.
[WorldAction("station.ticket-machine")]
public sealed class TicketMachine : IMudInteraction
{
    [Expose, Range(0, 100)]
    public int TicketsRemaining { get; set; } = 20;

    public async ValueTask<InteractionResult> OnInteract(
        InteractionContext context)
    {
        var actor = context.Actor; // safe EntityRef, never ECS pointer
        var room = context.Location; // permission-filtered location reference
        if (TicketsRemaining <= 0) return InteractionResult.Denied("Sold out");
        return InteractionResult.Propose(
            Actions.GrantItem(actor, context.Assets.Item("train.ticket"), 1),
            Actions.PatchScriptState("TicketsRemaining", TicketsRemaining - 1));
    }
}
```
The sample demonstrates concepts, NOT approved syntax, lifecycle or atomicity. Persistent `TicketsRemaining` should be typed, versioned instance state owned by engine (component or script state schema), not arbitrary worker object memory. `async` support is undecided and a hook may not hold an unbounded engine transaction open.

## Engine references: no raw C++ pointers
**EntityRef** is a world/instance-scoped opaque handle with identity + generation/version (exact layout ADR). **AssetRef** is stable versioned blueprint/quest/script/room asset ID. **ComponentTypeRef** resolves a versioned schema. **LocationRef** resolves containment/spatial data through authorized queries. **EventRef** references a typed committed event; **ActorRef** is derived from verified session/event context, not client-supplied identity.
- Ref resolution checks world scope, current existence/generation, correct type, visibility/permissions, and snapshot/world revision. Missing/deleted/migrated/stale refs return typed errors; never dereference invalid memory.
- A creator can reference objects by **asset picker**, stable ID, known alias or scoped query. Display names are not stable identity. Duplicate names yield an ambiguity prompt, never arbitrary first match.
- Editor "Insert Reference" button can search entity/room/Blueprint/quest/event, insert stable typed reference literal or SDK call, maintain dependency graph, and provide hover tooltip showing target and its permissions.
- References may resolve lazy/on interaction to support dynamic train interiors and private instances. Static asset references (definition) vs runtime entity references (specific instance) are different types.
- Cross-world/entity access and hidden quest NPC data are denied unless capability grants explicitly authorize a read.
- Scripts never hold raw native pointers, ECS chunk references, mutable spans or server memory addresses across calls. Host owns lifetime and ref invalidation. If C# worker is restarted, handles are revalidated, not blindly reused.

## Syntax candidate table; decide individually in ADR
| Token | C# existing meaning | Possible MudMaker authoring affordance | Proposed safety/clarity |
|---|---|---|---|
| `@` | C# verbatim identifier, verbatim string prefix and interpolated verbatim strings | In custom language: scoped actor/entity aliases; in C#: **use attributes**, snippets or editor `@-mention` picker that inserts valid C# | Do not reserve or rewrite raw `@` inside normal C#. Pickers are UI, not runtime parser |
| `#` | C# preprocessor directives such as `#if`, `#region` | Editor palette `#` quick reference to a known component/quest/event or action, or custom-DSL directives | Do not collide with C# preprocessor; if UI shortcut, it must expand to valid typed API call before save/compile |
| `{ }` | C# code blocks and interpolation placeholders | Template variables in dialogue/narration, e.g. `{actor.name}`, `{quest.title}`; graph variable chips | Message templating uses separate escaped typed expression parser. Never evaluate arbitrary code in message interpolation |
| `$` | C# interpolated strings | Potential reference/variable insertion key in editor; Godot uses `$` in GDScript node paths | No implicit raw object lookup from string; referent selected and resolved by typed stable ID |
| `%` | C# modulus operator | Godot-like unique reference shortcut in editor if valuable | UI-only completion/insert where appropriate, not C# grammar rewrite |
| `.` | Member/property access | SDK autocomplete of ECS components/available actions | Autocomplete displays only authorized/declared APIs, docs and nullability |
| `[…]` | C# attributes and array/index syntax depending placement | Export-to-inspector properties, range, tooltip, graph callable attributes | Prefer native attributes and source-generated metadata; verify allowed fields and defaults |

**Principle:** shortcut tokens are conveniences built on versioned typed APIs, not secret alternative mutation pathways. We should not adopt all symbols. Test discoverability vs collision risk with real users.

## Variables and state categories
1. **Local:** temporary within a single hook call; not saved across calls.
2. **Script instance (persistent):** per attached instance/owner ECS data: numbers, strings, bools, enums, vetted collections, typed asset/entity refs; schema version, default, migration, limits and inspector visibility. Must not be stored solely as .NET object fields if the worker may restart.
3. **Blueprint parameters:** reusable template defaults + per-instance overrides; editor-exposed, validated and versioned.
4. **Quest/conversation:** per-player or group-owned quest progress and dialogue session state; scripts read/write via quest commands, not duplicate storage.
5. **World/region:** world-system ECS state with authority and scope; never global static C# variable across worlds.
6. **Computed/read-only:** query result, observer context, derived state; read snapshot not durable value.
7. **Secret/server-only:** private flags, correct quiz answer, reward seed, credentials; never serialized into public client payload or untrusted tooltips.
8. **Event-scope:** immutable typed fields from committed event; may be consumed after hook but not mutated retroactively.
No hidden fallback state. Explicit ownership, persistence, replication, default, validation and access rights in each schema.

## Overrides and hooks
Creators can attach handler to **OnInteract, OnEnter, OnExit, OnQuestOffer, OnQuestAccepted, OnQuestTurnIn, OnCompleted, OnRewardClaimed, OnEventStarted/Stopped**, custom typed events, world/system hooks. Each binding declares mode: BeforeDefault, AfterCommitted, ReplaceDefault, Conditional or Both; effects are proposed to canonical ECS executor. Only approved extension slots may be overriden; cannot override auth, storage invariants, scheduler consistency, permission checks, data encryption or hidden entity visibility.
Pre-hook may veto/defer and propose atomic effects. Post-hook runs after commit and can request additional durable effects, but cannot rewrite the past. Script failure policy must say whether to abort default, fallback for cosmetic only, or defer and retry. See [Quest Hooks](../04-features/quests/09-custom-scripts-and-event-hooks.md).

## Inspector export model
[Expose] field/property: caption, help tooltip, type, default, min/max/step, units, required/readonly, security visibility, picker kind (entity/asset/quest/region/event), valid instance scope, serialization policy. Editor reflects schema to render proper control. No exposing private raw C# object references, arbitrary System.Type, unmanaged pointers, thread handles, streams, delegates, host file paths or runtime reflection handles in user-persisted data.
A component/field rename triggers dependency analysis and version/migration, not silent data loss.

## Type safety and memory safety
At native boundary use versioned explicit value types, validated lengths and ranges, immutable IPC messages, opaque handles, RAII-managed engine resources, checked UTF-8/Unicode conversion and no direct user-memory pointers. The C++ engine owns its allocations, ECS entity destruction, command queue lifetime and write scheduling. C# worker GC owns managed allocations but cannot free native ECS memory. On worker crash/restart all in-flight requests are reconciled by correlation/idempotency keys. Serialization bounds prevent oversized payloads and recursive bombs.
Untrusted C# process isolation with OS permissions/resource quotas is mandatory; `AssemblyLoadContext` isn't a sandbox. Strongly restrict arbitrary native P/Invoke, assembly loading, subprocess/files/network and unsafe code; *restriction in compiler alone is insufficient without process containment*. Test actual attacks and data races.

## Error and debugging behavior
Unknown `@/#/{}` literal: code editor explains whether C# syntax vs a message template vs UI command; no silent interpretation. Missing ref: hover error with "Entity was deleted or moved; pick a replacement" and source location. Invalid export type: inspector validation. Stale handle: typed error. Missing permission: safe error. On hover over engine ref show type, stable asset ID, source/owner world, tooltip, where used; no leak of hidden data.

## Decision gates
C# vs custom language, language version and supported libraries, identifier shortcuts vs editor snippets, type serialization and ref notation, code SDK name, custom event names and naming scopes, script-state persistence, static vs live references, target resolution, memory/worker isolation, source generator API stability and hot reload. Agents MUST NOT treat example C# as implementation instruction without approved ADR.
