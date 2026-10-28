# Scripting Technology Research | C#, Custom Language, Node Graphs

**Status:** source-backed research, not an approved backend decision. **Date:** 2026-10-28. **Owner:** architecture investigator. **Scope:** code scripting, visual editor tooling, runtime integration, cross-platform developer access and security.

## Product requirements driving technology
- Unity-like *workflow*, not Unity dependencies: creators write behavior scripts, attach them to ECS objects, quests, dialogue stages and world systems; configure exposed variables, test, debug and deploy.
- Professional node editor with discoverable search, typed ports, data + flow, groups, breakpoints and no-code authoring for most gameplay mechanics.
- Both paths execute the **same validated gameplay capabilities and domain commands**; neither creates its own ECS mutation store or event scheduler.
- Editor works in browser/desktop/tablet while code executes on the authoritative host, never requires compiling C# on an iPad.
- Creator-written code may be untrusted (shared public hosting), so strong process/OS isolation, CPU/memory quotas and separate tenancy must be evaluated.

## Evidence sources (official)
- [Microsoft Roslyn compiler/Workspaces/scripting API](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/compiler-api-model) describes diagnostics, code completion, compiler object model and C# scripting hosts. C# provides a mature language, package ecosystem and editor tooling.
- [Roslyn scripting API samples](https://github.com/dotnet/roslyn/blob/main/docs/wiki/Scripting-API-Samples.md) document CSharpScript usage; this is proof of scripting API availability, not a demonstration of secure sandboxing.
- [Microsoft native .NET hosting](https://learn.microsoft.com/en-us/dotnet/core/tutorials/netcore-hosting) covers nethost/hostfxr, framework-dependent embedding and single runtime per process limitations; not a plug-and-play replacement for secure Java/.NET interoperability.
- [Microsoft AssemblyLoadContext remarks](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext) explicitly: it **does not provide security features** and loaded code has process permissions.
- [Microsoft secure coding guidelines](https://learn.microsoft.com/en-us/dotnet/standard/security/secure-coding-guidelines) advise OS security mechanisms such as isolation containers/users for unknown-origin code; .NET Code Access Security and partial-trust mechanisms are not supported.
- [Unity Visual Scripting interface](https://docs.unity.cn/Packages/com.unity.visualscripting%401.7/manual/vs-interface-overview.html) uses central Graph Editor, fuzzy node finder, toolbar, inspector and Blackboard; [Unity visual scripting graphs](https://docs.unity.cn/Packages/com.unity.visualscripting%401.8/manual/vs-graph-types.html) distinguish action/flow and state graphs.
- [React Flow](https://reactflow.dev/) offers customizable React node/edge components, pan/zoom/select and [minimap/controls/background](https://reactflow.dev/learn/concepts/built-in-components); its [accessibility guide](https://reactflow.dev/learn/advanced-use/accessibility) documents keyboard and screen reader patterns. A candidate view library, **not** the runtime or a recommendation to use its default styling unchanged.
- [Rete.js](https://retejs.org/docs/concepts/editor/) supports plugin-extensible graph editing and server-side graph data. Candidate to compare for complex typed graphs.
- [Monaco Editor](https://github.com/microsoft/monaco-editor) supports editor models and provider-based completion/hover features; C# language service must be separately integrated, not assumed built-in.
- [Evennia scripts model](https://www.evennia.com/docs/latest/api/evennia.scripts.models.html) differentiates globally scoped and object-attached timers/behaviors. Useful coverage benchmark, not technology direction.

## Alternatives to evaluate (ADR, not unilateral choice)
| Option | Strengths | Real cost and risks |
|---|---|---|
| C# scripts in a .NET engine | One runtime language, Roslyn diagnostics, familiar Unity-style developer workflow | Reconsiders current Java/Spring engine; redesign ECS technology; isolation still mandatory |
| C# scripts in dedicated sandboxed .NET worker, Java ECS core | Modern C# authoring while preserving Java headless engine candidate; isolated execution and narrow typed IPC | Versioned RPC contract, serialization and worker lifecycle, per-event latency, batching, crash/recovery, deployment + memory footprints |
| Custom MudMaker scripting DSL | Potentially simple domain vocabulary and controlled deterministic semantics; custom syntax could suit beginners | Designing/maintaining parser, type system, interpreter/compiler, editor tooling, debugger, docs, migrations, static diagnostics and sandbox; poor ecosystem; major long-term engineering investment |
| Constrained graph IR as *no-code* language + C# code scripts | Beginners work visually without bespoke text language; code path uses known syntax; single capability catalog | Maintain graph compiler + language bridge, cross-path parity tests and versioning; scripting sandbox |
| Python/GraalPy legacy proposal | Familiar to MUD developers; former architecture planned JVM host integration | Verify current compatibility, isolation, performance, distribution and sandbox carefully; cannot assume safe/simple |

**Proposed short-list:** native C# with .NET engine vs C# isolated worker with Java core, and assess Python alternative if creator ergonomics matter. **Do not commit to C# yet.** The user prefers Unity-like ease and is considering C#; decision depends on measured integration and threat model, not fashion or agent preference.

## Required prototype evaluations before ADR approval
1. Representative ECS query + script hook latency, 1-to-1 vs batched (and tail latency) in a real world simulation workload, without making up target numbers.
2. Script compilation/validation throughput, caching, startup, reload and memory footprint across supported deployment targets.
3. Cross-world isolation: malicious script attempts file/network/process/reflection/host access, timeout, infinite loop, huge allocation and unauthorized ECS command.
4. Linux server and desktop packaging, tablet/browser authoring (remote compile), runtime and SDK availability; no C# compiler required on tablet.
5. Editor code diagnostics, completions, API metadata/tooltips, navigation to engine docs; graph custom node interoperability.
6. Multi-tenant worker/process supervision, crash containment, tenant secrets, request correlation and reliable event/command transfer.
7. Versioned API, dependency/package restrictions, save-game compatibility and deterministic test replay.

## UX vs runtime distinction
A polished code editor and modern graph canvas are presentation tools. They do not dictate runtime language, script ABI or ECS storage. Node view components must serialize typed graph assets; the server validates and compiles them. C# code assets must compile/execute through the approved worker/engine and only call the same capability-checked ECS facade.

## Research limitations
Unity editor UX is an inspiration, not a codebase to copy. Roslyn availability is not evidence that every editor feature or sandbox works. React Flow/Rete are candidates and no library selection is approved. Benchmarks and adversarial sandbox tests are mandatory for the technology ADR.
