# Visual Graph and Script Execution Contract

**Status:** REQUIRED visual Blueprints + custom scripts + world systems; PROPOSED compiler/runtime semantics. Exact language/compiler/engine choice OPEN; see [native engine research](../08-research/engine-and-scripting-architecture-comparison.md). **Owner:** graph compiler/runtime + script adapter + ECS command gateway.

## Design stance
Creators may build complete gameplay mechanics without programming, and advanced creators may attach custom scripts. Graphs and scripts are two frontends to the **same registered engine capabilities** and authority checks. A script is not allowed a second unvalidated ECS mutation route. Graphs are not "just decorative" connections: every node is typed, has execution semantics, errors and tests.

## Three graph categories (distinct editor contexts)
1. **Entity Blueprint composition graph:** entity root, components, configured field values, child slots, references, instance overrides, exposed parameters and template inheritance/composition policy. Data/authoring graph, not necessarily runtime execution.
2. **Behavior/event graph:** hooks (OnInteract, OnEnter, OnLeave, OnTick, OnWeatherChanged, OnArrive, OnDepart, OnSpawn), typed condition/data nodes and action/flow nodes that execute through command gateway.
3. **Quest / Dialogue graph:** typed objective sequences and branches, player choices, conditional NPC visibility, conversation and reward actions, quest prerequisites and followups, replay state, custom typed quest events. Reuse the same Condition Registry and ECS mutation gateway; no second quest runtime. See [quest contract](quest-conditions-and-dialogue.md).
4. **World System graph:** global/region scope, query selectors, scheduling rules, state transitions, spawn/weather control, triggers and cross-system events. Registration is centralized, not a private timer per node.

## Graph schema
Every graph asset MUST have stable graphId, graphKind, formatVersion, owning asset/system ID, named inputs/outputs, nodes, edges, exposed parameters, dependencies, permission/capability manifest, validation diagnostics and dependency version pins.
Every node MUST have stable nodeId, registered nodeTypeId + version, typed ports, configuration values, editor position (nonfunctional metadata), purity classification, access/read/write sets where relevant, and execution failure contract.
Every edge MUST reference existing node+port IDs; compatible type/flow connections; deterministic fan-out ordering. Referential integrity and type compatibility checked on save, import and publish. Editor may display invalid drafts but must not publish them.

## Node classes and execution
- **Data/constant:** pure typed values, entity references, component reads and deterministic calculations. No hidden mutation.
- **Flow/conditions:** branch, sequence, early return, bounded iteration, event filters, failure paths.
- **Actions:** request atomic operations (move, set component, spawn, emit event, unlock, send message). They do not write registry directly.
- **Query:** select entities by components/region/containment; iteration semantics and bounded result budget.
- **State/timers:** explicitly stored on owner entity or world system, not free-floating in-memory closure that vanishes on restart.
- **Custom scripts:** typed entrypoints bound to events/actions and explicit capabilities, equivalent to registered nodes.

The graph runtime must determine deterministic execution order for flows and define failure propagation, reentrancy, recursion depth, infinite loop limits, cancellation and timeouts. Execution budgets are configured, measured and observable. Compile validated graph to IR/plan for runtime; JSON editor layout is not itself executable semantics. Exact AST/bytecode strategy is OPEN.

## Blueprint composition and instantiation
A reusable Entity Blueprint can consist of nested components plus linked child blueprint slots (e.g. a train contains two car-interior locations and doors). Exposed parameters have type, validation, defaults and editor widget metadata. Instantiation resolves version-pinned references and produces unique entity IDs and a traceable origin. Child references use named slots resolved on instantiate. Cycles in child-instance ownership are invalid; reusable reference cycles that do not imply ownership may be legal by explicit rules.

## Custom scripting
For the authoritative host/API, memory/ownership and editor design, consult [scripting runtime](scripting-runtime-and-capabilities.md), [script language/syntax](script-languages-shortcuts-and-symbols.md), [memory boundary](script-memory-ownership-and-safety.md) and [Scripting UX index](../04-features/scripting/INDEX.md). The generic graph compiler does not own raw C++ entity pointers or script process isolation.
Original document proposed Python via GraalVM/GraalPy, stateless event callbacks, WatchService hot-reload and a Java annotation bridge. These are **historical proposals, not yet validated**. A headless C++ ECS engine with a typed graph runtime and isolated C# code scripting is now a preferred candidate to investigate, but is not approved; never assume Unity's IL2CPP is a generic runtime transpiler. Scripting language, sandbox isolation and runtime strategy are OPEN.
Regardless of language:
- Scripts may read approved ECS queries and submit authorized actions only through capability gateway.
- Scripts must have resource/time limits, no default file/network/host process access, and explicit allowlist for sensitive APIs.
- Script exceptions cannot tear down world simulation, corrupt transactions, or expose secrets.
- Hot reload validates, compiles in isolation, swaps only at safe boundary, preserves existing good version on failure and records migration/state compatibility.
- Script-triggered world changes are debuggable and attributable to graph/node/script, actor, transaction and event.
- Game authors can write custom logic; complex semantics cannot be reduced to only built-in if/else nodes.

## Cross-interface equivalence
Given a graph and text script performing the same approved action under the same actor/world snapshot, they must apply the same validation, permission, component schema and event semantics. For example, both attempts to unlock a door need the same permission checks and a failed attempt cannot mutate the lock.

## Diagnostics, safety and versioning
Invalid node type, missing template, broken port, schema mismatch, prohibited capability, recursive run-away and missing event handler produce typed diagnostics at authoring and runtime. Deprecated node versions need migration paths or clear refusal. No "success with no-op" placeholders. Run behavior graph tests in deterministic isolated world, with event trace and state assertions.

See [quest and dialogue editor](../04-features/quest-and-dialogue-editor.md) and [quest runtime](../02-architecture/quest-progression-and-phasing.md).

See [blueprint editor](../04-features/blueprint-editor.md), [world systems](../02-architecture/time-events-world-systems.md), [security](../06-quality/security-policy.md).
