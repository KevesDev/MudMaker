# Internet Client Input & Visual Commands v1 — Agent Index

**Status: DECIDED TECHNICAL SPEC / NOT IMPLEMENTED.** MudMaker players connect to a game **hosted by another user**; each host loads **only its locally authored published commands/graphs/C#**. A connected player can send typed gameplay actions, text commands and bounded user-generated text, but **never executable scripts, command definitions, or editor/deployment operations**. Native ECS owns authorization, mutation and persistence.

| Exact agent task | Open only |
|---|---|
| Understand network boundaries and trust | [01 — Threat / processing pipeline](01-ingress-threat-boundary.md) |
| Implement transport limits, login, sessions, queue protection | [02 — Protocol, admission and quotas](02-admission-limits-and-backpressure.md) + [policy JSON](../../../contracts/input/v1/default-policy.json) |
| Implement long RP posts, descriptions, multilingual text | [03 — Typed text, Unicode and rendering](03-text-and-multiline.md) |
| Implement deterministic command parsing | [04 — Parser grammar and selection](04-command-parser-grammar.md) |
| Implement dynamic cmdsets / permissions / help | [05 — Command resolution and permissions](05-command-registry-and-access.md) |
| Build default commands and visual editor | [06 — Visual command creator](06-visual-command-editor.md) + [command schema](../../../contracts/input/v1/command-definition.schema.json) |
| Operate anti-spam/DoS logging and host controls | [07 — Abuse, defense and diagnostics](07-abuse-security-operations.md) |
| Compare exact Evennia features and adapt safely | [08 — Evennia source study](08-evennia-research-crosswalk.md) |
| Independently test input, parser, graph and clients | [09 — Threat and acceptance test matrix](09-tests-and-evidence.md) |
| Real hosted-game command assets | [sample command pack](../../../contracts/input/v1/sample-game-commands.json) |

**Build order:** S06 defines bounded *semantic* command parse/authorization (no network prerequisite), S07 provides hardened authenticated network ingress before two-player play, S02 provides shared editor shell, S09 creates a **basic visual command editor for data-backed native effects**, S13 binds advanced typed graph/C# command behaviors, S17 enforces host-exposed internet edge/ops, S18 adversarial audits. Exact checkable phases: [sprint index](../../05-sprints/specs/INDEX.md).

## Ownership and non-negotiables
- `NetworkGateway` limits/prevalidates frames; `SessionService` establishes actor/session; `InputDecoder` performs bounded typed decoding; `CommandResolver` matches available immutable command definitions; `CommandService` checks argument type, access, cooldown, target and current world state; `WorldActor/ECS` validates and commits; `ObserverProjector` renders only committed authorized output.
- `TextSubmissionService` owns RP prose and character descriptions as **data**. Line breaks, leading slash/punctuation, and quotation marks **never cause secondary commands to execute**. Rich clients send structured action types; text-only adapters intentionally select command mode vs multiline composition mode.
- Host may set *stricter or more generous gameplay limits* within hard built-in protective ceilings. Transport size, auth controls and memory ceilings cannot be disabled by a game script or remote player.
- Command editor saves local `CommandDefinition` assets and publishes them with the local host release. It does **not** compile client text or accept player-uploaded definitions.
- A local host can run behind a reverse proxy/CDN or direct port forwarding. Per-process controls cannot guarantee protection from volumetric DDoS; configure upstream network mitigation separately.
- Built-in rule editor expresses **typed access predicates**, not an eval'd Python/C#/SQL lock expression.

**Implementation proof:** none of these files constitutes a tested network stack or working visual editor; each relevant phase requires one Builder, one scoped Auditor and hands-on negative tests.
