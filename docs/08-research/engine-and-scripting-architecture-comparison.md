# Research | Unity, Godot, Native ECS and Creator Script Runtime

**Status:** Research / architecture recommendation, NOT an approved selection. **Date:** 2026-10-28. **Owner:** architecture investigation. **Source of truth for decisions:** [Open ADRs](../02-architecture/architecture-decisions.md). Read this only when choosing engine/scripting technology, not for ordinary editor work.

## What Unity does, specifically
- C# is compiled by Roslyn to Intermediate Language assemblies. Unity's **IL2CPP** backend can convert **IL -> C++ -> target-native binary at build time**, with cross-platform AOT advantages and higher build/packaging cost. This is NOT an instant, safe hosted-game runtime compiler for arbitrary uploaded scripts.
- Other Unity backends execute managed IL under a .NET runtime (backend selection and supported platforms vary by Unity version).
- Inspector/asset workflows use typed serialized/exported fields, references, editor metadata and recompilation/reload policy. MudMaker may borrow conceptual exposed variables and tested build transitions, not assume Unity serialization is generally suitable for mutable ECS data.
- Official: https://docs.unity.com/en-us/engine/6000.3/manual/programming-environment/scripting-backends/il2cpp/il2cpp-introduction ; https://docs.unity.com/en-us/engine/6000.0/manual/programming-environment/code-reload-serialization/script-serialization/rules

## What Godot does, specifically
- Godot engine is primarily native C++; GDScript is its own scripted language executed through Godot's runtime, **not generally translated to C++**. Godot also offers .NET/C# and a native C API extension bridge (GDExtension).
- Typed/annotated exported script properties become editor inspector controls. `@export` is an annotation; `$ChildPath` is syntax sugar for a scene node lookup; `@onready` concerns initialization timing.
- GDExtension loads native extensions, which is an extensibility mechanism, **not a sandbox for public untrusted scripts**.
- Official: https://github.com/godotengine/godot-docs/blob/master/getting_started/step_by_step/scripting_languages.rst ; https://docs.godotengine.org/en/stable/tutorials/scripting/nodes_and_scene_instances.html ; https://docs.godotengine.org/en/latest/tutorials/scripting/gdscript/gdscript_exports.html ; https://docs.godotengine.org/en/latest/engine_details/engine_api/gdextension/index.html

## What .NET interop actually enables
- C++ may host .NET through `nethost` and `hostfxr`, load managed code and call typed entrypoints. Hosting APIs have deployment/runtime limitations, and same-process managed code receives process privileges.
- `AssemblyLoadContext` handles assembly load/unload, **not security isolation**. For code uploaded by untrusted authors, use OS process/sandbox boundaries and capability-restricted APIs.
- Native AOT is a deployment choice, not a generic hot scripting system: at runtime it cannot generate arbitrary new native code. Do not claim uploaded C# can trivially become safe native code via Unity's IL2CPP or .NET Native AOT.
- Official: https://learn.microsoft.com/en-us/dotnet/core/tutorials/netcore-hosting ; https://learn.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext?view=net-10.0 ; https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/security

## Engine selection matrix (no premature winner)
| Candidate | ECS/performance | Scripting & integration | Operations and risks |
|---|---|---|---|
| Headless C++ ECS + isolated C#/.NET scripting workers | Native data layout, queries, scheduling and memory allocation control; Flecs/EnTT candidates | Typed IPC/ABI, Roslyn diagnostics, modern creator UX, untrusted worker isolation | C++ memory and race bugs, IPC overhead, two toolchains, process supervision and versions |
| Headless C++ ECS + a restricted custom scripting VM/DSL | Native engine plus narrow scripting semantics; possible deterministic/low overhead if designed carefully | Domain-specific syntax, no reflection/direct memory, direct graph integration possible | Owning parser, compiler/VM, debugger, LSP, migrations, type system and ongoing security research |
| C#/.NET engine and C# user scripts in sandboxed workers | ECS possible with .NET frameworks; managed memory and one source language | Fewer engine-script language mismatches, common type tooling | ECS/layout tradeoffs, overhead/isolation still required, no guaranteed performance advantage |
| Legacy Java/Spring core + GraalPy | Existing minimal bootstrap; JVM runtime mature | Python + Java bridging had user-reported complexity | Doesn't meet "retain legacy by default" rule; evaluate only as option |
| Graph-only as scripting | Visual, typed and constrained | Advanced creators cannot express all expected game mechanics with reasonable ergonomics | Not sufficient alone; custom script ability REQUIRED |

## C++ and Flecs note
Flecs provides typed ECS, relationships, hierarchies, prefabs and system scheduling; its `ChildOf` and hierarchy storage are candidate implementation primitives, **not** an automatic safe gameplay containment system. The MudMaker spatial model still needs acyclic ownership rules, stable world-scoped IDs, atomic boarding/transfers and controlled release. Official: https://www.flecs.dev/flecs/Relationships.html ; https://www.flecs.dev/flecs/HierarchiesManual.html

## Proposed reference architecture (ADR-gated)
- **Engine:** C++20/23 candidate, headless executable+portable protocol; ECS/storage benchmark with real MudMaker world models before selection.
- **Scripting:** creator-facing C# and typed visual graphs; consider separately sandboxed .NET workers for untrusted scripts. Worker returns typed actions to ECS command executor; no borrowed C++ pointer, direct database or unmanaged memory.
- **Authoring frontend:** browser-first React/TypeScript for desktop/tablet; optional desktop Tauri as shell; engine is a native server, not embedded into an iPad web view.
- **Runtime update:** validated immutable release, pinned code and graph versions, safe update/migration/rollback. Never assume Unity IL2CPP is usable for hot deployment.

## Decision evidence required
Implement representative bench fixtures, not marketing comparisons: query/mutation latency and allocations, 2+ worlds, nested transit, 1000s of scripted custom components, RPC batch size and latency, worker memory/cold start, ABI round-trip correctness, compile/diagnostic latency, Linux/Windows/macOS deployment, local desktop packaging, tablet remote editing, persistence/replay, script sandbox attack suite and worker crash. Numeric acceptance targets should be approved from product workload, not agent-invented constants.

## Explicit conclusion
C++ is a credible **preferred candidate**, but not yet an approved mandate. C# authoring does not require C++ output; both Unity-style editor exposure and Godot-style succinct syntax can be achieved through a typed scripting facade. Avoid C++ API leakage and memory-unsafe raw native plugins for public creators.
