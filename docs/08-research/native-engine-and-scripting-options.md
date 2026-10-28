# Native C++ Engine and User Scripting — Technology Decision Research

**Status:** RESEARCH + recommendation for ADR; **not approved**. Date 2026-10-28. **Owner:** technical architect. Scope: native engine, ECS, C# or custom scripting language, editor/hosting, memory safety and portability.

## Confirmed product constraints
- MudMaker is an independent professional MUD engine, NOT a Unity or Godot application. ECS, data-defined content, reusable Blueprints, persistent multiplayer, nested locations, custom world systems and live creator-defined events are essential.
- Nontechnical users can develop using visual nodes, while advanced creators can write custom scripts. Scripts attach to entities, Blueprints, quest/dialogue stages, interactive objects, exits, and world systems.
- Server hosting must work headless on supported Linux/cloud machines. Browser/tablet is an editor/player *client* and need not execute the authoritative native binary locally.
- Prior Java + Python integration experienced friction. Current Spring Boot scaffold is not proof the old architecture should be kept.
- Design for maintainability, performance, bounded concurrency and untrusted creator code; avoid unverified claims that C++ alone makes multitasking faster or that managed code cannot be performant.

## What existing engines actually do
**Unity:** Its IL2CPP AOT pipeline runs Roslyn compilation of C# to managed IL, stripping, IL-to-C++ conversion, then a native compiler. This is a **build pipeline for target applications**, not a general-purpose per-user live hot-reload compiler service. Unity also supports managed runtime back ends; copying IL2CPP is not a sensible default project scope.
Sources: [Unity IL2CPP introduction](https://docs.unity.com/en-us/engine/6000.0/manual/programming-environment/scripting-backends/il2cpp/il2cpp-introduction), [Scripting backends](https://docs.unity.com/en-us/engine/7000.0/manual/programming-environment/scripting-backends).
**Godot:** GDScript is an engine-specific language, C# executes with modern .NET, and C++ runs through native engine/GDExtension interfaces rather than all user scripts being translated into C++. Godot's @export annotations expose fields in inspector; scene-unique %node is editor-friendly reference syntax. These are workflow precedents, not MudMaker syntax decisions.
Sources: [Godot scripting languages](https://docs.godotengine.org/en/4.4/getting_started/step_by_step/scripting_languages.html), [GDScript exports](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_exports.html), [Scene unique nodes](https://docs.godotengine.org/en/stable/tutorials/scripting/scene_unique_nodes.html), [GDExtension](https://docs.godotengine.org/en/latest/engine_details/engine_api/gdextension/index.html).
**C++ hosting .NET:** Supported by Microsoft's hostfxr/native hosting interfaces, but **hosting runtime** does not make C# modules secure by itself. AssemblyLoadContext allows assembly isolation/unload and does NOT grant a security boundary. Full-trust assemblies run with process permissions.
Sources: [Microsoft native .NET host](https://learn.microsoft.com/en-us/dotnet/core/tutorials/netcore-hosting), [AssemblyLoadContext](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext).

## Proposed architecture, pending comparative prototypes
**Preferred candidate for evaluation:** native C++ world engine using a proven ECS (Flecs or EnTT evaluated objectively) + language-neutral typed gameplay ABI + supervised **out-of-process C# worker(s)** for author-defined code + native validated typed graph runtime + React browser-first editor/optional Tauri desktop shell. This is a candidate, NOT approved.
- ECS storage and native scheduling optimize engine hot paths; use dependency-aware system read/write sets and world-owned authoritative transactions. Raw script code must NOT acquire pointers or execute arbitrary mutations on simulation threads.
- C# gives recognizable tooling, typed APIs, mature debugging and garbage-collected user script objects. It does not make arbitrary C# code safe on a shared host.
- Native editor/browser protocol and worker ABI can use versioned request/response/event schemas and opaque handles; benchmarking must quantify IPC overhead and batching.
- Native C++ server can ship multiple platform-specific builds, but "platform agnostic" means architecture and supported binaries, not one binary for all operating systems.
- Tauri is a **UI shell**, not a magic native runtime portability solution. A tablet accesses remotely hosted world/editor; headless server has no UI dependency.

## Compare before locking ADR
| Candidate | ECS/server fit | Script-language integration | Security approach | Key cost |
|---|---|---|---|---|
| C++ ECS + out-of-process C# | Native data-oriented hot path; scalable host possible | Versioned serialized ABI, typed script facade | OS worker/container/resource limits and capability checks | IPC tail latency, worker supervision, compiler deployment, memory per tenant |
| C++ ECS + in-process hosted .NET | Native core and tight calls | hostfxr handles managed/native bridge | NOT appropriate for untrusted public scripts solely via AssemblyLoadContext | Native/managed lifetime and crash/security coupling |
| C++ ECS + custom DSL/bytecode | Native runtime tailored to game | Custom parser, typechecker, VM, debugger, language service | Could sandbox through interpreter limits if carefully designed | Huge long-term language/ecosystem/tooling cost |
| .NET/C# engine + C# scripts | Strong language/tooling alignment, managed engine | Single runtime/language | Still requires process isolation for untrusted code | Native ECS/performance choices differ; need benchmarks |
| Existing Java core + GraalPy | Reuses starter | Previous integration issues, Python/Java boundary | Polyglot access policies + stronger isolation when untrusted | Compatibility, instrumentation and bridging complexity |

## Prototypes and gates
1. Representative ECS world: nested train rooms, moving passengers, 1000s of dynamic entities and custom schemas; benchmark query, mutation, event and persistence behavior on real hardware. Entity/connection numbers are *workload scenarios*, not promised release targets.
2. C++ to C# worker calls: single/small/batched events, high-frequency handlers and long-running/timed hooks; p50/p95/p99 latency, allocations, CPU and memory per world/worker.
3. C# code compiles against a **strict MudMaker SDK** with safe entity references and never links or mutates raw C++ ECS data. Test stale entity handles, cross-world access, cancellation and version compatibility.
4. Public hosting attack tests: arbitrary script attempts filesystem/network/native PInvoke/reflection/process/thread escape, memory exhaustion, infinite loops, secrets access and neighbor-world access. Worker isolation must actually block it.
5. C++ engine crash tests and data races: TSAN/ASAN where supported, fuzz malformed component/script/IPC payloads, test transaction rollback, restore and world concurrency.
6. Deployment: Windows/macOS/Linux desktop/client where supported, Linux headless service, browser/tablet authoring remotely, optional Tauri wrapper with no requirement for native executable on mobile.
7. Compare build iteration, debugger quality, custom API binding and live script updates. Do not choose by initial implementation convenience, benchmarks alone or popularity.

## Decisions still OPEN
C++ engine lock, Flecs vs EnTT vs custom, writer/scheduling model, runtime language and ABI, C# worker topology (per world/per tenant/pool), reflection/metadata strategy, scripting syntax shortcuts, secure host policy, user package dependencies, code hot reload, persistence semantics and minimum OS matrix. An approved ADR must include measurements and a rollback strategy before replacing the Java scaffold.
