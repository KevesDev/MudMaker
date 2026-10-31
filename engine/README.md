# Native engine — identity foundation

The production `mudmaker_engine_core` C++20 library currently implements only ECS identity. It is not a running sidecar/world, component store or persistence layer. Windows/MSVC is the current supported build. The disposable storage spike and recorded benchmarks stay separate and unchanged.

One explicitly owned `IdentityDomain` issues opaque 16-byte `WorldId` values through Windows `BCryptGenRandom`. It keeps all issued namespaces, including destroyed worlds, for the shared domain state's lifetime. Eight zero/duplicate attempts fail explicitly rather than hanging or falling back. Domain facades and world allocators are move-only; allocators retain their domain state. Use them on the owning world/lifecycle writer, not concurrently. There is no restart/restore or namespace injection API. The injectable entropy interface is the OS boundary for controlled failure tests; normal construction always uses system cryptographic entropy.

`EntityId` contains the complete WorldId, uint32 index and uint32 generation (24 bytes). New slots start at generation zero; an intrusive LIFO free list provides deterministic reuse without allocation during release. Maximum-generation releases retire permanently. UINT32_MAX is reserved as the invalid index. Validation/release returns typed errors for foreign, invalid, stale or dead references and changes nothing on rejection. Allocation failures are structured errors; a namespace inserted before a world-storage allocation failure stays burned. Diagnostic counts are returned by value. Private pure production decisions cover unreachable-in-small-tests generation/index limits without a state-forcing API.

From the repository root:

```text
cmake -S engine -B engine/build/s03-release -G "Visual Studio 18 2026" -A x64
cmake --build engine/build/s03-release --config Release --target mudmaker_identity_tests
ctest --test-dir engine/build/s03-release -C Release -R "^ecs_identity_allocator$" --output-on-failure
cmake -S engine -B engine/build/s03-asan -G "Visual Studio 18 2026" -A x64 -DMUDMAKER_ENABLE_ASAN=ON
cmake --build engine/build/s03-asan --config Release --target mudmaker_identity_tests
ctest --test-dir engine/build/s03-asan -C Release -R "^ecs_identity_allocator$" --output-on-failure
```

CTest prepends the selected compiler runtime directory to PATH. Both the library and test executable are ASan-instrumented in the ASan build. No third-party packages, UI, Rust changes, codecs or benchmark claims. UBSan is unavailable on this MSVC toolchain.

## Logical component schemas

`ComponentRegistry` is the single logical schema catalog; it does not allocate component storage or mutate live entities. The native loader chooses trusted built-in or creator registration, both using the same validation path. IDs are distinct opaque 128-bit component/field values supplied by the loader; readable canonical names do not replace identity. Only native built-ins may register `mudmaker.` names. A release has one revision per component ID; freeze is one-way. Lookup returns typed unknown/revision errors. Published const owning handles deeply own nested schemas/defaults and survive later registration or registry destruction.

Call `ComponentRegistry::create` with explicit positive `SchemaValidationLimits` for schema nodes, value nodes, depth, text bytes and name bytes. Limits are caller configuration, not inherited spike caps or performance budgets; invalid/path-overflow configurations reject. Definitions are bounded and validated before cloning/publication. Schemas support Boolean, signed64 Integer, finite Floating, UTF-8 Text, Entity/Asset references, Record and List. Nullability lives on each value type, including list elements; enums contain unique values of the declared primitive kind, while nullable Null remains a separate state. Inclusive typed ranges and text/list byte/item bounds are enforced. Names use ASCII rules; text/display/description use valid UTF-8. Persistence mode and display/description are metadata, not implemented storage/editor/migration operations.

`validate_value` validates a component Record and returns independently owned normalized data: required fields use explicit defaults or reject, optional absent fields stay absent, unknown fields reject, nested defaults fill recursively. Defaults use the same validator. Non-null Entity values cannot be world-independent defaults; nullable Null can. Runtime references are checked for representation only, without fake existence/capability/asset resolution. Physical layout, component instances, wire codecs and durable behavior remain outside this slice.

The dedicated schema gate uses `engine/build/s03-schema-release` / `engine/build/s03-schema-asan` with the same configure flags above, build target `mudmaker_component_schema_tests` and exact CTest filter `^ecs_component_schema$`. It does not run the identity/spike/frontend suites.

## Single-writer world and hybrid storage

`World` privately consumes an issued allocator with no pre-existing live identities, a frozen registry and explicit release bindings. The factory takes an rvalue reference and moves ownership only after all fallible preparation succeeds; rejected input leaves the prior allocator owner intact. Bindings fix each permitted schema revision and placement: empty Record tags default to sparse, ordinary data to archetype, and explicit high-churn data may use sparse. Every live API checks the creating thread first; no mutable allocator/store/cell escapes. Record-root component replacement and scalar/Record/List field replacement reuse the existing whole-component validator. Stable FieldId paths descend through Records only; absent/Null parents reject child writes, and fields inside Lists require replacing the enclosing List.

Archetypes own chunked typed columns, not maps of whole component/entity values. Nested Records compile into flattened leaves with parent presence state; required non-null leaves need no state vector. Boolean lanes use contiguous bytes; integer/double/reference lanes use their native types. Text and List lanes own real strings/vectors and move/destroy them normally. Optional absent, Null and present remain distinct. Chunk capacity derives from checked typed row footprint and the caller's positive target bytes, with at least one row; dynamic Text/List payloads remain owned outside the fixed lane footprint. Sparse columns use dense entities and a sparse reverse index; their churn does not migrate archetype rows. Swap removals repair entity and sparse locations.

Commands validate and stage owned values, typed cells, index capacity, destination rows and derived reference updates before publishing. Creation issues identity only after fallible preparation; commit moves into reserved columns. Signatures index reusable archetypes without fixed component masks. No general query engine or benchmark performance claim is included.

All nested Entity references must be live in this world. Derived per-source reference lists and indexed inbound counts update through the same gateway; destroy rejects external inbound references while cleaning self references. Asset existence remains outside this module. `inspect` returns independent owned values and immutable schema handles; `inspect_live(limit)` copies at most the requested number from a live dense index. These are not epoch/event, wire, persistence, authorization or UI facilities.

The dedicated world gate uses `engine/build/s03-world-release` / `engine/build/s03-world-asan`, target `mudmaker_world_tests`, and exact CTest filter `^ecs_world_mutation$`, with the same CMake/ASan flags above. S03.4 owns actual app integration; this native library/test executable is not an app-ready sidecar.
