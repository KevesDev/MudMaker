# 01 — Scripting Decisions, Alternatives and Source Evidence

**Date:** 2026-10-28. **Scope:** SCRIPT SDK and trust boundary. **Status:** DECIDED contract; deployment and underlying ECS selections remain conditional where stated.

## Product boundary and adopted selections
MudMaker users create and host **their own games**, and play games hosted by other users. A hosted server loads **only its host's locally created, published scripts**. Remote players send authenticated gameplay commands only, never script content, bytecode or execution instructions. The separate worker is for fault containment and reliable authoritative state; do not describe MudMaker as centrally hosting everyone's games or accepting player-uploaded scripts.

## Adopted selections
| ID | Decision | Why it exists | Required validation |
|---|---|---|---|
| SD-01 | **C# 14 / .NET 10 LTS** for advanced creator scripts; standard C# syntax and Roslyn compiler service | Mature language tooling, static typing, ecosystem; no custom runtime language/`@`, `#` rewrites. Language target/pinned SDK must be consistently build-tested. | Real clean compile/editor diagnostics/reference restriction tests |
| SD-02 | **Separate local C# worker process**, controlled by the hosting game server | Script crashes, runaway execution or bad memory behavior must not take down the authoritative world | Real crash/time/memory isolation tests |
| SD-03 | **Bounded host-local worker privileges and resources**, no direct world DB/net/admin handles | Script changes must travel via validated ECS effects, including persistent field overrides | Each supported host OS tested |
| SD-04 | **Protobuf v1** fixed-number internal worker protocol, versioned envelopes, bounded serialized messages; not arbitrary JSON or raw C++ ABI | Cross-language generated types, evolution checks; fields cannot be reused. | Schema compatibility/negative fuzz tests, negotiation, reconnect |
| SD-05 | **Immutable, capability-filtered read snapshots**; script returns typed `HookDecision` with `Effect` union; C++ engine validates + commits | No raw entity storage or database writes outside world authority. | Stale handles, phase and quest authorization, concurrent writer, transaction rollback |
| SD-06 | **Both code and graph compile to validated effects**; graph does not transpile C# | One semantics / one command executor / common permissions. | Graph/code parity oracle |
| SD-07 | **No creator-controlled unbounded await, raw threads, sockets, raw RNG or background jobs** | A worker call should be bounded, replayable and cancellable by killing worker; long work is durable server scheduler workflow. | Infinite loops, allocation bombs, async escape, retry recovery |
| SD-08 | **Before hook decision is atomic with default action; After hook is separately scheduled** | Can't undo a committed event from after hook. `Replace` must explicitly include reward/state effects; no hidden default. | Normal/replace/deny/defer/both path and failure cases |
| SD-09 | **GUID-backed asset IDs, world-scoped entity generation handles, schema-versioned fields and persistent runtime overrides** | Editor property overrides and live custom state need stable references and restart recovery | Rename/migration/owner tests |
| SD-10 | **Server-controlled deterministic draw + persisted onceKey for rewards**, typed quiz evaluation and durable world-event intent | Prevent double rewards/answer disclosure and retry rerolls. | Duplicate request, crash/recovery, forged client events |
| SD-11 | **Roslyn analyzers/source generators are tooling only; not a trust boundary** | Incremental generators produce metadata/graph node signatures; sandbox must still contain malicious IL. | Crafted reflection/PInvoke and malformed bytecode attempts |

## Implementation prerequisites (not part of creator SDK v1)
- The exact native ECS library, native persistence/journal transaction implementation and worker pool sizing must be benchmarked/proven in their owning ADRs before implementing runtime.
- The Windows/Linux worker sandbox policies must be validated on the host OS before claiming isolation.
- V1 field overrides and state slots are selected features, not a permission for raw C++ memory/DB access; see [04](04-references-and-state.md).

## Primary sources (checked 2026-10-28)
1. Microsoft AssemblyLoadContext: **not a security feature**. https://learn.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext
2. Microsoft Secure coding .NET: CAS/partial trust unsupported; OS/virtualization controls for unknown code. https://learn.microsoft.com/en-us/dotnet/standard/security/secure-coding-guidelines
3. Microsoft .NET 10 LTS support lifecycle. https://dotnet.microsoft.com/en-us/platform/support/policy
4. Roslyn CSharpCompilation API: https://learn.microsoft.com/en-us/dotnet/api/microsoft.codeanalysis.csharp.csharpcompilation.create
5. Microsoft code analysis overview: analyzers inspect source, not OS permissions. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview
6. Microsoft Windows AppContainer model: https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation
7. Protocol Buffers edition guide: field numbers cannot be reassigned, reserve deletions. https://protobuf.dev/programming-guides/editions/
8. Flecs relationships and fragmentation performance considerations: https://www.flecs.dev/flecs/Relationships.html
9. Flecs observers / event ordering: https://www.flecs.dev/flecs/ObserversManual.html
10. Flecs cached/dynamic queries: https://www.flecs.dev/flecs/Queries.html
11. Godot C# runtime platform support (comparison, not chosen engine): https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/index.html

## Build/host trust model
Only the local game creator/host can edit source, compile and publish script modules. Network players never supply scripts; native command validation nevertheless treats gameplay input as untrusted. The host may inspect and repair script failure via structured traces. C# worker isolation protects reliability, while typed field/state effects provide deliberate persistent overrides without corruption.

## Confidence and non-claims
These sources establish documented capabilities or limitations. They **do not** prove MudMaker's implementation secure, low-latency, deterministic, or cross-platform. A prototype, benchmark and external audit are mandatory before declaring those properties verified.
