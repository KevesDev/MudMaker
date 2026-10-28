# 06 | Visual Graph Runtime and Script Binding

**Status:** v1 semantics decided. Graph compiler/host not implemented. All code and graphs use the same `HookDecision` and `GameEffect` contract, plus host-authored local release manifest.

## Exact graph model
A graph is a versioned asset with stable graph UUID, typed node type/version, typed port IDs, edges, layout, exposed fields, declared capability manifest, authoring diagnostics and compiled plan. Its compiler verifies event-hook compatibility, type/port connections, world/asset refs, cycle/recursion budgets, handler exposure, graph dependencies and version compatibility. Runtime executes fixed graph IR/plan; no dynamic eval of arbitrary text or code sent by players.

Graph nodes are grouped by **Events** (each registered hook in [03](03-hook-registry.md)), **Reads** (actor/world/component/slot snapshots from [04](04-references-and-state.md)), **Conditions** (typed boolean/number/string/quest predicates), **Effects** (the exact GameEffect union), **Control** (Continue/Append/Replace/Veto/Defer/EnqueueAfter) and **Code Node** (validated `[MudGraphCallable]` signature). Return effect plans to the same authoritative ECS action validator. Never give graph a secondary persistence or event bus.

`[MudGraphCallable("stable.node-id")]` exposes a code function in the local project's node registry with pinned assembly/asset hash, signature, input/output port schema, read/effect capability set, tooltip and source mapping. The graph cannot invoke an arbitrary C# method via reflection. A signature migration either retains old pinned module until migration or blocks publish with actionable dependent-graph references.

## Creator publish control
Save = local draft; Validate = compiler errors and schema checks; Test = isolated local ECS world; STOP hosted server; Publish = immutable host-owned world release; START host via GUI/headless = same release. **v1 does not require hot reload**; editing scripts means shut down, publish, then start the world again. Published releases are immutable. A hosted game's players receive filtered state and responses, never the creator's local source code or graph executable payloads as player-input transport.

## Graph/code equivalence acceptance
The Midnight Express conductor quiz graph and scripted handler must produce identical outcome, world state and error for identical server snapshot/events. On wrong answer: no objective credit. On correct answer: exactly-once credit, no player-supplied answer truth. On failed commit: no client narration. On script/graph timeout: structured failure without partial state. A graph SetComponentField node and C# SetComponentField effect both use the same mutation handler and persistence.
