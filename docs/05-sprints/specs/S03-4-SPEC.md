# S03.4 — Real engine integration and live inspector

**Status:** [S03.4a codec foundation](S03-4a-SPEC.md) and [b actual native process](S03-4b-SPEC.md) independently PASS. c/d require their own concrete specs before code. Parent S03.4 passes only after all four phases independently pass and the actual app workflow is demonstrated.

| Phase | Concrete deliverable | Dependency and gate |
|---|---|---|
| **S03.4a Contract and codec foundation** | Versioned engine-control protobuf contract, pinned compiler/C++/Rust runtime dependencies and real generated-codec interoperability | Review existing ADRs/contracts first; identify approved versus unresolved choices. Lead records decisions and exact scope/commands before one Builder; independent audit requires real build/codec evidence, not documentation alone |
| **S03.4b Native engine process** | Real mudmaker-engine executable, one writer loop, bootstrap schemas/bindings, handshake and bounded protocol dispatch to existing World | Requires 4a PASS; native World remains sole mutation authority; independently prove actual process/API behavior |
| **S03.4c Shell process owner and bridge** | One thin Rust lifecycle/connection owner, typed forwarding, bounded deadlines, shutdown and actual readiness | Requires 4a/b PASS; no shell world mirror; startup readiness becomes blocking only through real successful initialization, not file existence |
| **S03.4d Live ECS inspector** | Registered compact UI bound to actual create/list/inspect/mutate/error flows | Requires 4c PASS; central InputManager/action ownership, accepted UI style, real app demonstration and exact owner click list |

## Mandatory design review before dispatch

- ADR-RECORDS-S01: ADR-005 sidecar, ADR-002/003 ECS/writer, S01.4 wire freeze and S01.6 identities; OPEN_DECISIONS: distinguish local engine control from unresolved remote-hosting choices.
- system-boundaries.md; protocol-and-hosting.md; security-policy.md; existing scripting-v1/01-decisions-and-evidence.md and 05-wire-security-recovery.md for approved protocol constraints. Worker messages are not assumed to be inspector commands; no alternate JSON path or duplicate mutation owner.
- S03.1/2/3 specs and actual native APIs; startup/lifetime and persistence boundaries. No persistence/authorization/performance claims from these prerequisites.
- For 4d: UI02 input/focus, UI10/12/15/16, commands-and-input and relevant machine catalogs. Preserve owner-accepted compact visuals and app-wide Theme ownership.

Each phase gets its own bounded implementation spec/read set, owner/API/dependency decisions, acceptance, exact filtered commands, one Builder and one independent scoped Auditor. Only those named commands run; no extra suites, speculative checks or unassigned prerequisite coding. Report actual errors and decisions; commit/push each passed phase to GitHub working before proceeding. No S03.4 completion from codec docs, executable presence or mocks.

S02.10a/b/c remains required before S03 closes. Usage pickup rule remains around5% remaining; reset confirmed and the consumed one-time pickup removed 2026-10-31.
