# MudMaker Scripting Contract v1 — Agent Index

**Status:** DECIDED specification / NOT IMPLEMENTED. This is the source of truth for creator scripting API v1. It supersedes earlier illustrative SDK names in the Midnight Express case study and broad scripting proposals wherever they conflict. Implementation must not be claimed until executable integration/security tests pass. Underlying ECS storage and deployment host remain separate ADR gates.

| Task | Read ONLY | Product |
|---|---|---|
| Architecture choices, sources, remaining gates | [01 Decisions](01-decisions-and-evidence.md) | Versioned architecture record |
| Define/code C# public interface and event payload | [02 Code SDK](02-code-sdk.md) + [actual C# contract](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs) | SDK surface |
| Add/change event hook, interception mode, dispatch | [03 Hooks](03-hook-registry.md) | Hook ID and event kind registry |
| Reference entity, assets, quest state, custom fields | [04 References](04-references-and-state.md) | Snapshot/handle/variable semantics |
| Implement C++↔C# calls, sandbox, persistence | [05 Wire/Security](05-wire-security-recovery.md) + [wire schema](../../../contracts/scripting/v1/mudmaker_scripting_v1.proto) | IPC and risk controls |
| Understand local host script loading vs remote player input | [08 Host Integration](08-local-host-integration.md) | Nonnegotiable host/player protocol boundary |
| Implement graph editor/compiler and exposure | [06 Graph parity](06-graph-parity-and-publishing.md) | Typed flow execution |
| Design negative/abuse/runtime integration tests | [07 Verification](07-verification-gates.md) | Acceptance/risks |
| Build actual source-level examples and persistent overrides | [SDK and example projects](../../../contracts/scripting/v1/README.md) | Compile checks (not yet run) |
| See actual C# host compile → publish → restart → player dispatch | [09 Start flow](09-build-publish-restart-run.md) | Owner-managed deploy, no hot reload |
| Look up Evennia hook-by-hook source comparison | [Evennia hook index](../../08-research/evennia-hook-parity/INDEX.md) | 108 distinct upstream methods / 89 counterparts |
| Browse attributed C# methods for entire hook registry | [Hook source catalog](../../../examples/scripting/hook-catalog/INDEX.md) | One typed method per contract ID; runtime not verified |
| Review full complicated scripted example | [Midnight Express](../../04-features/scripting/07-midnight-express-technical-case-study.md) + [v1 C# source](../../../examples/scripting/MidnightExpressHooks.cs) | Example, not running engine |

## Deliverables and handoff
- [Exact deliverables, paths and verification status](DELIVERABLES.md). This is the owner/agent checklist; do not infer implementation from source files.

## Authority rules
- Code types, signatures and semantics live in `contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs`; the wire format lives in `contracts/scripting/v1/mudmaker_scripting_v1.proto`. Prose explains those sources and records decisions, but must not invent alternative names. Changing either requires a compatible version bump or new major namespace with migration evidence.
- Hook IDs, eligible event types, phase and routing constraints live in [03](03-hook-registry.md); `[MudHook]` attribute strings must match that catalog exactly.
- `MudMaker.Scripting.V1` is an SDK **contract**, not a functioning ECS or hosting implementation. No placeholder simulator or fake integration is permitted as proof of runtime readiness.
- Graph nodes call the same `Effect` union. No graph-only mutation, timer, RNG, query, scripting bypass.
- Older [scripting runtime proposal](../scripting-runtime-and-capabilities.md), [language proposal](../script-languages-shortcuts-and-symbols.md), and [memory proposal](../script-memory-ownership-and-safety.md) are design history for any detail contradicted by this versioned contract. Avoid loading them unless researching a migration.

## Account and character lifecycle hooks

[Account/character/permissions design and versioned hook extensions](../account-character-lifecycle.md) documents Evennia's account and puppet events, durable AccountId, graph continuation, secure before/after restrictions, and tests. It is **not** an additional SDK authority: proposed IDs/signatures must first pass reviewed registry + CLR + Protobuf parity (S13.14–14) before compiled owner scripts can bind them. [Current exact registered IDs](03-hook-registry.md) retain precedence.
