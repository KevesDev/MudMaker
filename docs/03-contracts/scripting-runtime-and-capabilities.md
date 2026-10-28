# Scripting Runtime Architecture | Code + Graph + One ECS Authority

**Status:** REQUIRED dual authoring model and user-defined scripts; PROPOSED typed runtime contract. **Owner:** Script Asset Registry, Graph Compiler, Script Host, Hook Registry, shared ECS Capability Gateway. **Dependencies:** ecs-core, single mutation owner, events/time, quest hooks, persistence, host/deployment/security.

**Research and safety gate:** [Unity vs Godot, C++/C# research](../08-research/engine-and-scripting-architecture-comparison.md); [native/script memory rules](script-memory-ownership-and-safety.md); [language/shortcuts](script-languages-shortcuts-and-symbols.md). **Editor controls:** [Scripting UX](../04-features/scripting/INDEX.md).

## Architectural diagram in words
**Authoring surfaces**: Code Editor -> Script Asset; Graph Editor -> Graph Asset (including Blueprint entity composition, behavior, quest, dialogue and world-system graph); Inspectors -> Hook/Attach Binding. Both are **draft assets** and are validated before publish.
**Compilation**: Graph validator -> typed Graph IR/ExecutionPlan; code script compiler -> validated script module and metadata; both export compatible **public callable signatures and capability manifests**. These are separate compilation pipelines, not a requirement to transpile one to the other.
**Execution**: Session/World/Event -> Hook Resolver -> Invoke compiled graph or isolated code module -> typed Read/Action APIs -> authoritative ECS command validation/mutation -> committed world events -> per-observer projections -> client. No direct C#/script/graph entity mutations, DB writes, socket/network or separate world clocks.
**Deployment**: immutable project release pins versions/checksums of all scripts, graphs, schemas, callbacks and compilation artifacts. Each WorldInstance binds to release until safe upgrade; tablet clients edit drafts remotely and do not execute game scripts locally.

## Asset contracts
**ScriptAsset**: stable ID, name/path/namespace, language+version, code source, dependencies (allowlisted), version, compiled artifact/hash, public handlers with typed parameters/return, required engine API version, capability manifest, error diagnostics/source map, exposure metadata for inspector/graph nodes, quotas budget reference, tests, migration strategy.
**GraphAsset**: stable ID, graph kind and version, typed nodes/ports/edges + layout metadata, exposed parameters, callback hooks, required engine API version, read/write manifest, validation/compiler diagnostics and versioned intermediate plan.
**AttachBinding**: owner ECS entity/Blueprint/system/quest/action/exit/region, script or graph asset version, entrypoint/hook point, execution mode (before/after/replace/conditional/both), typed parameters, per-instance field overrides, condition, priority, failure policy, enabled state and ownership. A script attached to 500 NPCs is **one shared code artifact** with 500 explicitly configured instance bindings, not 500 copied code strings.
**ExecutionContext**: world/instance/project revision, actor+target entity ref, owner entity, event data+event ID, quest attempt if applicable, location, permission and visibility view, deterministic world clock and RNG facade, correlation ID, cancellation deadline, authorized read handles.
**EffectPlan / HookResult**: typed return data, pending dialogue/choice or validated proposed actions; pending async work uses durable outbox and retry policy. The chosen C# API exact signatures are OPEN.

## ECS-facing API shapes (language-independent proposals)
- `Entities.Get<TComponent>(entity)` and `Entities.Query(component filters, scope)` return permission-filtered snapshots / typed views, **not** raw live ECS registry pointers.
- `Actions.TryMove(actor, exit)`, `Actions.SetComponent(entity, patch)`, `Actions.GrantReward(recipient, rewardSpec)`, `Actions.AdvanceObjective(owner, quest, objective, evidence)`, `Actions.StartWorldEvent(def)`, `Actions.StopWorldEvent(instance)`, `Actions.SendMessage(rule, recipients)` are *proposed capability concepts*, not Java/C# API guarantees. Some operations require batch/transaction semantics; no direct C# setters to mutate world state.
- `Events.RegisterHandler(eventType, callback)` is a versioned hook binding, not permission to spawn arbitrary thread. Worlds use one scheduler and event dispatcher.
- Scripts may declare typed `public` callable functions (e.g. `CheckNamePrefix(context, prefix)`) that appear in node palettes automatically with descriptions, inputs, outputs and declared effects. Validation forbids publishing a node that references removed/changed signature.
- All scalar, enum, entity ref, component schema, collection, optional and result types follow an approved universal type registry. Untyped dynamic JSON is not the only extension mechanism.
- No user script may forge owner/actor/session IDs, private quest flags, hidden targets or world-level administrator grants.

## Execution model, determinism and performance
- World ECS remains authoritative. Code and graph handlers run in ordered, bounded invocation contexts; exact worker/thread/single-writer scheduling decided by ADR.
- **Do not execute untrusted long-running C# inside world writer.** A candidate model: engine passes immutable snapshot/input to supervised isolated code worker (or graph runtime), receives serialized typed effect plan, revalidates against current world revision, commits atomically or rejects stale/precondition changes.
- Inter-process cost must be benchmarked. Avoid one blocking network/IPC call per entity per tick; schedule/batch hooks, run pure graph logic in engine if safe, index subscriptions and only evaluate subscribed entities.
- Async is a durable workflow (pending event/dialogue/world-system task), not fire-and-forget Task/Thread/Timer that disappears after restart. World-clock time vs wall-clock time documented.
- Configurable CPU, memory, instruction/event budget, query/result size and recursion limits; no embedded unexplained magic numbers; metrics emitted per hook and instance.
- Deterministic replay contract requires seed, ordered committed events, script versions and external-effect policy. A script's random call must use an authorized seeded RNG API.
- Versioned graph and code assets may be hot-swapped only after validation at documented safe boundary; failed compile continues last valid release, never silently replaces with a no-op.

## Custom functions exposed to graphs
Creator marks a function "Expose to visual scripting", selects category, label, summary tooltip, typed inputs/defaults, outputs, effects/capabilities and whether function is pure or action. On save:
1. Compiler validates signature and metadata; registrar stores a versioned NodeType.
2. Node palette search discovers it by human name/keywords; node ports match declared type.
3. Graph compilation validates all calls; missing function/version is a publish error.
4. At runtime, graph invokes the same isolated script host / capability gateway; no second script execution model.
5. Editing script signature shows impacted graphs/assets, requires migration or pinned version. No live graph silently breaks.

## Hook semantics
Quest lifecycle, dialogue, NPC/object interactions, train event, exit traversal, weather and spawner events use the same registry. Modes BeforeDefault, AfterCommitted, ReplaceDefault, ConditionalDefault and Both must have explicit ordering/failure/atomicity contracts. Hooks do not override fundamental permissions or the ECS writer. For exact behaviors, see [Quest Hook Specification](../04-features/quests/09-custom-scripts-and-event-hooks.md).

## Errors, inspection and provenance
Diagnostic payload: asset ID/version, handler name, source location or node ID, world/instance/actor/target, event/command correlation, validation or runtime failure category, safe public message, developer trace and stack where permitted, budget exceeded reason, partial-effect state. Player sees a useful game message, never raw exception, source path, secret or stack. Creator may inspect committed event -> hook evaluation -> proposed effect -> validation -> state commit -> observer narration.
An editable draft may have compile errors; published release cannot. No "script executed" toast unless a real hook result or event trace confirms it.

## Deployment/recovery/operational rules
Every published release includes verified script/graph manifests, checksums, API version and dependency allowlist. Host performs preflight compile/security checks, starts supervised workers and records readiness. Crash/timeout doesn't take down other tenants; failed hooks use specified fail-closed behavior and alert admin. Restore resumes durable event/question/dialogue/reward state without repeating grants; world/worker configs allow documented resource limits.
**OPEN before implementation:** C# vs custom DSL, Java-core vs .NET-core vs worker, ABI/IPC, sandbox, execution planner, graph IR, versions/hot reload, tenant isolation and deterministic effect order.
