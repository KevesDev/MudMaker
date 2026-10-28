# Security, Trust Boundaries and Runtime Resource Limits

**Status:** binding security requirements and threat model; implementation and independent penetration evidence pending. **Owner:** security + runtime + hosting.

## Trust boundaries
Creator project files, public-world scripts, visual graphs, network commands, uploads, user-supplied text, restored save state and plugin packages are untrusted inputs even when submitted through editor UI. A world owner may have broader game-design powers without receiving OS admin access or raw host files.

## Capability model
- Distinct permissions: project owner/editor, game admin/moderator, player, guest, hosting operator. Runtime commands bind to verified session+world context; raw client-provided actor IDs never grant authority.
- Script/graph manifest declares required ECS read scopes, allowed mutation intents, send-message actions, timer schedule and permitted external integrations. Fail closed on undisclosed capability.
- Engine API validation enforces lock, location, ownership and permission checks identically for player commands, graphs, scripts and admin actions.
- World-isolated storage, event subscriptions and queries; reject cross-world refs and schema impersonation.

## Sandboxing
Original concept mentions GraalVM/GraalPy locked-down Context. This is an intention, not evidence of sandbox security. Before supporting third-party untrusted code, choose and prove isolation via threat-modelled architecture (in-process policies, external sandboxed worker, process isolation, OS constraints). Verify file/network/process/host reflection restrictions, CPU/memory/loop limits, recursion, cancellation, termination, module/import policy and escape cases. No unbounded arbitrary user code on authoritative world writer thread.

## Protocol and storage hardening
- Authenticate/authorize every command and editor operation; rate-limit and bound message sizes and payload recursion.
- Use TLS where network-exposed; secrets never stored in plain project exports, script globals or UI logs.
- Prevent path traversal/zip-slip/import bombs on world packages and script assets; validate schemas before deserialization and entity reference use.
- SQL/query injection, event data leakage, XSS/ANSI terminal escape sanitization and unsafe markdown/link rendering are threat-model cases.
- Backup integrity, restore authorization, signed/verified artifacts if threat model requires; protect server admin endpoints.
- Log audit trail with actor, request, result, affected world; redact secrets and sensitive player data.

## Availability and DOS
Budgets for graph nodes per invocation, query result size, script time/memory, event cascade depth, spawn rates, concurrent connections, outbound queues, region tick work, save rate and disk quotas are centrally configured and measurable. On limit, reject or throttle with diagnostic; never freeze main world or silently skip committed actions. Default numeric budgets are OPEN until benchmarks.

## Required adversarial tests
Script attempts file read/network/process/reflection access; graph loops recursively; client submits forged actor/world; unauthorized editor attempts deploy; malicious package contains paths outside workspace; repeated reconnect duplicates request; spawner floods; huge nested component payload; terminal ANSI/script injection; cross-world subscription. Release blocked on critical findings.
