# S03.2 — Typed native component schema registry

**Status:** IMPLEMENTED / independently VERIFIED for logical schema/value scope, 2026-10-31.
**Owner:** one production native component schema registry, linked into mudmaker_engine_core. One Builder and independent scoped Auditor. S03.1 identity is independently passed and pushed af9f0ef.
**Binding:** S03 sprint scope; ADR-002 descriptor-driven runtime schemas/freeze and ADR-003 writer boundary; ECS core schema requirements; scripting-v1/02-code-sdk.md stable component/field Guid identities and value vocabulary. No new library/technology, UI, storage backend or wire change. ADR-014's editor/Blueprint choices do not block this native schema catalog.

## Lead decisions / public contract

- Stable `ComponentTypeId` and `FieldId` are distinct opaque 16-byte identifiers, compatible with existing Guid/string identities; zero is invalid. No ID generation or user-facing naming service here. Names are readable/indexed metadata, not identity. Namespaced component names use lower-case ASCII segments (`a-z`, digits/underscore after initial letter, dot-separated, at least two segments). Field names use ASCII identifier syntax and are case-sensitive. `mudmaker.` component names are reserved to trusted native built-in registration; creator registration cannot claim them. Registration origin is determined by native loader, never trusted from remote/user metadata.
- A schema has stable ID, canonical name, positive uint32 revision and ordered typed fields. Each field has stable nonzero ID, name, required/nullable flags, optional explicit default and applicable constraints. Field IDs are unique throughout one component's nested structure. Native kinds: Boolean, signed64 Integer, finite double Floating, UTF-8 Text, Entity reference, Asset reference, Record and List. Null is explicit value state permitted only by nullable. Structured values are native schema data, not a claim of completed script wire codecs.
- Component fields support nested record fields and list element schemas, with well-formed acyclic definitions. Required-with-default fills the missing value; required-without-default rejects; optional-without-default stays absent. Explicit Null requires nullable. Defaults use the same actual value validator. No implicit raw-zero defaults or memcpy of owned strings/structured values. Unknown record fields reject.
- Integer/floating ranges are inclusive and correctly typed; invalid min/max rejects schema. Floating NaN/infinity reject. Text constraints count UTF-8 bytes with valid encoding, not locale-dependent character counts. Finite primitive enum sets are typed, unique and validated against applicable constraints. Record/List constraints and defaults must be validated recursively without silent truncation.
- References remain typed values: Entity uses complete EntityId; Asset uses opaque 16-byte ID plus positive revision. Schema validation checks representation only; live world existence/capability checks belong to the later writer, and asset lookup to asset service. Non-null runtime Entity references cannot be schema defaults for a world-independent frozen release. Do not implement a fake resolver or claim referential authorization here.
- Registration takes an explicit named validation-limits configuration (schema/value node count, nesting depth, text/name bytes as needed), with invalid configuration rejected. No spike limits (64 components/1024-byte layout/alignment64) carried over. No guessed performance/host budgets. Tests supply small explicit fixtures. Bounds and arithmetic must reject before unbounded traversal/copy/allocation.
- Registry validates completely before publication. Duplicate ID/name, invalid metadata/defaults or frozen state leaves existing registrations unchanged. Exactly one revision per component ID in a release; replacing/upgrading a revision requires a new release registry, not mutation of a frozen catalog. Lookup by ID/name/revision returns typed unknown/version errors. Registration does not return mutable aliases to caller-owned definitions.
- Published descriptors are immutable, deeply owned and remain valid through later registration/freeze (and through registry destruction if the API returns owning descriptor handles). Freeze is one-way; no unfreeze/remove/edit API. Built-ins and creator types share the same descriptor/value validation path. Expose schema revision, persistence mode and plain display/description metadata for future serialization/editor/migration consumers; do not add stub serialization, editor or migration methods.
- This slice is logical schemas and value/default validation. Native physical component storage/layout, live instances and mutation are not implemented or claimed here; they consume these descriptors in the next assigned slice. No raw byte-copy storage abstraction or speculative universal framework.

## Acceptance

AC1: real native built-in and creator schemas share registration/lookup and stable typed IDs; duplicates, reserved-name misuse, bad IDs/revisions/names and freeze reject without changing the catalog. Handles remain immutable and lifetime-safe.
AC2: actual schema/value/default validation covers the distinct kinds, required/nullable/default behavior, ranges/enums, nested record/list paths, invalid UTF-8 and typed reference representation; exact errors identify component/field/path/reason. Unknown/malformed/cyclic/out-of-budget definitions reject boundedly without partial publication.
AC3: existing identity source/ABI and benchmark spike stay unchanged; no second ECS state/mutation owner, no UI/wire/storage/persistence/performance claim. Test direct production behavior, not mocked registry results.
AC4: dedicated Release and ASan schema targets pass, then independent scoped audit passes with zero unresolved real findings. One meaningful assertion group per distinct risk, no redundant stress cases or adjacent feature hunts.

## Scope and only authorized commands

Builder owns engine/include/mudmaker/ecs/component_schema.h, matching engine/src/ecs implementation/private helpers, dedicated engine/tests/component_schema_tests.cpp, necessary engine/CMakeLists.txt and README updates. No identity implementation refactor; use existing EntityId public value type. Lead owns specs/ADR/index/tracker/history/Git. Preserve _parked and unrelated agent/LICENSE/settings. No commits/push, packages, frontend or spike changes.

```text
cmake -S engine -B engine/build/s03-schema-release -G "Visual Studio 18 2026" -A x64
cmake --build engine/build/s03-schema-release --config Release --target mudmaker_component_schema_tests
ctest --test-dir engine/build/s03-schema-release -C Release -R "^ecs_component_schema$" --output-on-failure
cmake -S engine -B engine/build/s03-schema-asan -G "Visual Studio 18 2026" -A x64 -DMUDMAKER_ENABLE_ASAN=ON
cmake --build engine/build/s03-schema-asan --config Release --target mudmaker_component_schema_tests
ctest --test-dir engine/build/s03-schema-asan -C Release -R "^ecs_component_schema$" --output-on-failure
```

Builder and Auditor use only these six commands, one named checkpoint each. Repair reruns stay on this target. No full suite, identity regression rerun, benchmark, frontend check, toolchain install or UI demo. If scope needs a shared identity change or another command, report the concrete dependency before expanding. /W4 /WX and ASan stay enabled as in S03.1; UBSan unavailable, no claim.

Reports under25 lines: docs/06-quality/reports/s03-2-builder.md and s03-2-audit.md. Report actual compile/test failures and material decisions promptly; preserve failed-run evidence and do not conceal warning suppression. After independent PASS, Lead commits/pushes GitHub working before the next phase. Do not label metadata/value validation a live component store/world.

## Executed evidence

[Builder](../../06-quality/reports/s03-2-builder.md); [independent audit PASS](../../06-quality/reports/s03-2-audit.md), zero findings. All six named configure/build/filtered CTest commands passed; Release and ASan each ran the same eight assertion-bearing cases. Self-review corrected Null entering primitive enum definitions; nullability remains separate and a regression covers the correction. No compile warnings/errors, warning suppression or extra suites. No live component storage/world, resolver/authorization, wire, persistence or performance claim. Next S03.3 writer/mutation preflight.
