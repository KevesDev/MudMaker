# S03.3 — Single-writer native world and component mutation

**Status:** IMPLEMENTED / independently VERIFIED for native World library scope, 2026-10-31.
**Owner:** one native world writer owns identity, integrated archetype/sparse storage and all mutation. S03.1/2 passed and pushed af9f0ef/7046706. Owner wants native engine and regular app milestones; S03.4 is the first live inspector, not this internal library phase.
**Binding:** ADR-002 hybrid + S01.5 outcome, ADR-003 single writer; ECS core mutations; system boundaries; production identity/schema contracts. No new technology, library, wire, UI, persistence, events, ExpectedVersion or account/capability system. Those later phases remain required.

## Decisions / authoritative API

- One noncopyable world/writer gateway privately consumes a move-only WorldAllocator and immutable, validated descriptors from a frozen ComponentRegistry. Explicit release bindings identify permitted component IDs/revisions and placement. Capture owning descriptor handles; do not depend on mutable caller metadata or create another schema-registration authority. No mutable allocator/store/cell escapes.
- Bind the world writer to its creating thread. All operations touching live storage, including snapshot construction, check that thread before accessing state; other threads receive a structured WrongWriter error. Returned owned immutable inspection values may cross threads safely. No scheduler/worker thread or command queue is invented here; the later engine host calls this gateway on its owner loop.
- Native operations create/destroy entities, add/remove/replace components and replace typed fields. Validate complete entity world/index/generation, schema ID/revision, component presence, field/type/constraints and live references before commit. Common failures return typed world errors retaining identity/schema diagnostics; no implicit creation/resurrection or silent fallback.
- Field addressing uses stable FieldId through Record paths. Parent absent/null rejects child writes rather than silently constructing it. Scalar/Record/List fields may be replaced atomically as whole typed values. An ID inside a List needs an element context that this API does not invent; caller replaces the enclosing List. Whole-component replacement retains S03.2's Record root and validates all its typed fields; scalar component roots are not part of the existing schema contract. Reuse actual schema validation/normalization; minimal additive field-validation access is allowed in its owner, not a duplicate validator.

## Real hybrid storage

- Integrate both paths inside this one world. Chunked SoA archetypes store co-occurring components. Compile logical schemas to native typed columns: primitive/reference leaves are contiguous typed data, nested Records flatten to leaves with parent state, Text/List leaves own their actual C++ values and correct construction/move/destruction. Distinguish absent/Null/present; do not raw-memcpy owning values or keep maps of whole entity/component values as a second canonical store. Required/non-null leaves need no redundant presence state.
- Sparse components use dense values/entities plus a sparse reverse index; tag/high-churn changes do not move archetype rows. Empty-record tags default to sparse; ordinary data defaults to archetype; explicit release bindings may mark high-churn data sparse. Future hot multi-component query enforcement remains S03.5. Do not implement two alternative worlds.
- World creation requires explicit named storage configuration including chunk target bytes. Derive chunk capacity from checked column/row footprint, at least one row; no copied spike component limits, masks or chunk constants. Use indexed signatures, entity locations, transition caches where actually useful and swap-remove repair. No whole-world scan for field mutation/reference validation.
- Validate and stage required storage/owned copies/index capacity before publication. Create issues an identity only after fallible storage preparation; use the existing allocator's readonly diagnostics to pre-size location/index tables. No identity mutation/refactor is expected; report a concrete need before changing it. Failed commands expose no partial world/component change. Destruction/moves must repair both archetype and sparse locations and destroy owned values correctly.

## Reference and inspection policy

- Validate all nested Entity references against this world's live identity allocator; reject foreign/stale/dead targets. Maintain a derived reverse-reference count/index through the same gateway, not a second truth store. Destroy rejects external inbound references; self references are cleaned with the entity. No implicit cascade/dangling references. This is the minimal core destruction rule; later containment/domain policies remain explicit higher-level commands.
- Asset references retain schema representation checks; actual asset existence is S04. No fake resolver, account authorization or persistence claim.
- Inspection returns owned EntityId/component ID/revision/normalized values with immutable descriptor handles; editing the result cannot mutate storage. Provide bounded live-ID inspection for the upcoming UI using a caller limit/buffer and live dense index, not a general query engine or unbounded whole-world dump. No epoch/event/ExpectedVersion infrastructure added early.

## Acceptance

AC1: real world entity/component lifecycle uses complete identity and one thread-bound gateway; wrong writer/world/stale/unknown/revision/component/field errors change nothing. Destroy/reuse cannot inherit old components.
AC2: actual archetype rows/chunks retain numeric and owned Text/Record/List data through add/remove transitions, chunk growth and swap removal. Sparse tag/high-churn mutations repair their own reverse indices without archetype migration. Test real compiled columns/storage, no mock world.
AC3: typed field and whole-value replacements use schema constraints/defaults; rejected mutations preserve snapshots. Nested live reference rules and indexed destruction policy work without whole-world scans. Snapshots are independent owned values.
AC4: only dedicated Release/ASan world target passes, then independent scoped audit with zero real findings. No performance/scalability, durable state, running sidecar or in-app readiness claim; real app milestone follows S03.4.

## Scope and exact verification

Builder: focused engine/include/mudmaker/ecs/world.h, engine/src/ecs/world.cpp/private storage helpers, engine/tests/world_tests.cpp and necessary CMake/README. Minimal additive schema field validation may reuse its existing implementation; preserve identity behavior/ABI and spike. Lead owns docs/ADR/Git. No general framework, storage alternatives, packages or frontend work. Preserve parked theme files and unrelated .claude/LICENSE/settings.

Builder and independent Auditor use ONLY:

```text
cmake -S engine -B engine/build/s03-world-release -G "Visual Studio 18 2026" -A x64
cmake --build engine/build/s03-world-release --config Release --target mudmaker_world_tests
ctest --test-dir engine/build/s03-world-release -C Release -R "^ecs_world_mutation$" --output-on-failure
cmake -S engine -B engine/build/s03-world-asan -G "Visual Studio 18 2026" -A x64 -DMUDMAKER_ENABLE_ASAN=ON
cmake --build engine/build/s03-world-asan --config Release --target mudmaker_world_tests
ctest --test-dir engine/build/s03-world-asan -C Release -R "^ecs_world_mutation$" --output-on-failure
```

One named checkpoint each; repair reruns limited to this target. No identity/schema/frontend/spike/full CTest or benchmark runs. Any concrete shared-behavior change needing another regression must be reported before scope expands. /W4 /WX and ASan as before; UBSan unavailable. No new toolchain/install/manual UI check for this native library phase.

Reports under25 lines: s03-3-builder.md and s03-3-audit.md under docs/06-quality/reports. Report actual failures/decisions promptly; no speculative cases or polish hunt. Lead commits/pushes after independent PASS before S03.4. Stop/checkpoint around 5% remaining allowance and schedule pickup; do not spend through the threshold.

## Executed evidence

[Builder](../../06-quality/reports/s03-3-builder.md); [independent audit PASS](../../06-quality/reports/s03-3-audit.md), zero findings. All six named native commands passed; Release and ASan each ran eight World cases. Real typed hybrid storage, owned values, staged mutations, thread/ref checks and bounded inspection are verified. Corrected Record-root wording; factory now rejects pre-existing live identities and defers allocator ownership transfer until preparation succeeds, preserving rejected caller state. No extra suites, benchmarks, identity/schema refactor or warnings suppressed. App/sidecar readiness is S03.4, not claimed here.
