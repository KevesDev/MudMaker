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
