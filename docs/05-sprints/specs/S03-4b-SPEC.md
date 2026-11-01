# S03.4b — Real native engine process

**Status:** API preflight, S03.4b1 and [b2 bootstrap/typed dispatch](S03-4b2-SPEC.md) independently PASS; b3 paired executable still requires its exact spec/implementation/audit. S03.4a independently passed/pushed d356b93. Parent b owns a real engine executable, bootstrap schemas, one writer loop, paired bounded control and actual World dispatch. c owns the thin Rust lifecycle/bridge; d owns real app Inspector.

| Actual phase | Scope and dependency |
|---|---|
| [S03.4b1 Native control accessors](S03-4b1-SPEC.md) | Owned entity/catalog pages and reuse of typed value conversion; concrete preflight gaps, not a second world/registry/codec |
| S03.4b2 Bootstrap and typed native dispatch | After b1 independent PASS/push: complete additive protobuf operations, stable native error mappings and real frozen bootstrap/World dispatch. Requires its own exact spec before code |
| S03.4b3 Paired executable | After b2 independent PASS/push: actual child process, approved Windows pipe/bootstrap token/handshake, bounded I/O and shutdown; prove through actual executable. Requires its own exact spec before code |

No phase is done by this plan. Parent b remains incomplete until all three independently pass/push. This exposes genuine prerequisites without hiding them in the shell/UI. No new game template, remote protocol, persistence or benchmark decision is made here.

## Bounded Builder preflight

Same medium Builder, read only existing public native identity/schema/World/wire headers and their directly relevant implementation if needed to explain an API. Existing S03.1/2/3 contracts, engine-control-v1 and approved33.6 codec remain binding. Do not re-read UI/whole repo or rerun tests/tool checks.

Report under25 lines in docs/06-quality/reports/s03-4b-api-preflight.md: exact public creation/ownership/lifetime APIs and configuration requirements; frozen schema/catalog/FieldId/type/default metadata access; bounded entity list/inspection and all mutation signatures; structured error detail mapping; actual wire codec entry points/ownership. Identify only concrete missing accessors/ownership conflicts needed by the promised native process, not optional redesign. Source read is allowed; no edits/builds/tests, new library/transport, parallel manager or full project scan. Lead then writes the complete bootstrap/control/process contract and named commands before one Builder implementation and independent Auditor.
