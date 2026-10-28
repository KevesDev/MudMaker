# MudMaker Sprint Tracker

**Canonical sprint order and phase status.** Each sprint owns a cohesive milestone; phases are small Builder/Auditor handoffs. Legacy IDs remain stable because specs and contracts reference them. The section/table order below is the actual execution order.

**Current:** S00 documentation 9/9 DONE; owner architecture decisions remain open. Implementation phases are TODO.

## Real application and testing milestones

**First launchable UI: S02.3**, immediately after S01 platform decisions and before the ECS. Create/Play/Host shell navigation becomes testable in S02.4; S02.6 tests the real editor canvas without claiming a saved world. Native world/command testing is an executable harness (S03–S06), not a fake GUI. S09.16 introduces **real Creator map editing** only after room topology and persistence exist. S08.6 demonstrates real connected play after S07.9. No mock world counts as a gameplay checkpoint.

## Evidence levels and first playable gate

| Level | Actual proof | Earliest checkpoint |
|---|---|---|
| **E1 — Native harness** | ECS, rooms, commands, persistence exercised by real focused tests; no graphical Player Client claimed | S03–S06 |
| **E2 — Local playable game** | Real Player Client connects to a running loopback world, moves through rooms, receives real authorized events | **S08.6**, after authenticated S07.7–17, S07.9, S02 and S08.5 |
| **E3 — Creator/public host** | Owner safely starts a durable hosted world with remote joins and host-facing operational controls | S17.19, after input security, recovery and hosting prerequisites |

## Sprint overview — in actual work order

| Sprint | Focus | Verified | Depends on | Status |
|---|---|---:|---|---|
| [S00](#s00) | Documents and decisions | **9/9** | — | ACTIVE — owner decisions outstanding |
| [S01](#s01) | Architecture gates | **0/6** | S00 + owner ADRs | PLANNED |
| [S02](#s02) | Launchable application shell and shared UI | **0/9** | S01 UI/platform choice | PLANNED |
| [S03](#s03) | Native ECS | **0/9** | S01 | PLANNED |
| [S04](#s04) | Assets and persistence | **0/15** | S03 | PLANNED |
| [S05](#s05) | Rooms and exits | **0/9** | S03,S04 | PLANNED |
| [S06](#s06) | Command harness | **0/13** | S04,S05 | PLANNED |
| [S07](#s07) | Loopback host and secure input | **0/18** | S04,S06 | PLANNED |
| [S08](#s08) | Playable client and toolkit | **0/19** | S07.9,S02.2–4 | PLANNED |
| [S09](#s09) | Creator tools, real map and Data Manager | **0/18** | S04–S06,S02 | PLANNED |
| [S10](#s10) | World events | **0/4** | S08.6 | PLANNED |
| [S11](#s11) | Quests | **0/6** | S08.6 | PLANNED |
| [S12](#s12) | Transit | **0/4** | S10,S08.6 | PLANNED |
| [S13](#s13) | Scripts and graphs | **0/15** | S07,S08.6,S09 | PLANNED |
| [S14](#s14) | Account/character Creator workflows | **0/9** | S04,S07,S08,S09,S13 | PLANNED |
| [S15](#s15) | World authoring | **0/5** | S10,S12,S13 | PLANNED |
| [S16](#s16) | Quest authoring | **0/6** | S11,S13 | PLANNED |
| [S17](#s17) | Public hosting | **0/19** | S07,S08,S13 | PLANNED |
| [S18](#s18) | Release audit | **0/12** | All preceding | PLANNED |
## S00 — Research, design contracts and agent-ready documentation

**Spec:** [S00.md](05-sprints/specs/S00.md) · [Open decisions](07-decisions/OPEN_DECISIONS.md)

| Phase | Document deliverable | Status | Evidence |
|---|---|---|---|
| **S00.1 Authority & indexed contracts** | Indexed ECS, scripting, input and UI decisions with exact agent read paths | DONE | [Technical index](INDEX.md), [UI index](03-contracts/ui-ux/INDEX.md), [UI catalog](../contracts/ui/v1/INDEX.md) |
| **S00.2 Workspace/security boundaries** | Separate Editor, Player Client, Host; safe input and concurrent host/view lifetimes | DONE | [Ownership](03-contracts/ui-ux/01-workspaces-and-ownership.md), [navigation](03-contracts/ui-ux/00-launch-and-workspace-navigation.md), [remote input](03-contracts/client-input-v1/01-ingress-threat-boundary.md) |
| **S00.3 UI/UX architecture & decision gates** | ThemeManager, cataloged controls, Creator/Client workflows and open platform ADRs | DONE | [UI contract](03-contracts/ui-ux/INDEX.md), [controls](../contracts/ui/v1/INDEX.md), [client research](03-contracts/ui-ux/09-client-research.md), [open decisions](07-decisions/OPEN_DECISIONS.md) |
| **S00.4 Implementable sprint handoffs** | One tracker, one spec/sprint and phase dependency map | DONE | [Sprint specs](05-sprints/specs/INDEX.md), [agent rules](../CLAUDE.md), [tracker](SPRINT-TRACKING.md) |
| **S00.5 First-playable dependency review** | Distinguish engine harness, local playable and public host gates, and phase prerequisites | DONE | [Tracker](SPRINT-TRACKING.md), [roadmap](05-sprints/INDEX.md) |
| **S00.6 Local databases and data management** | Automatic local provisioning, authenticated data API, searchable large-world records, optional backups, staged restoration and host operations | DONE | [Database/Data Manager](03-contracts/local-database-and-data-manager.md), [S04](05-sprints/specs/S05.md), [S17](05-sprints/specs/S17.md) |
| **S00.7 Prompt, status HUD and mapping** | Evennia-inspired prompt/status updates, Creator/Host map support, Player mini map and customizable layouts | DONE | [Prompt and map](03-contracts/prompt-and-world-map.md), [Player Client](03-contracts/ui-ux/05-player-client-workspace.md), [mapper](03-contracts/ui-ux/07-mapper-and-automation.md) |
| **S00.8 Account, character and security lifecycle** | AccountId vs SessionId vs CharacterId, registration, login/logout, character ownership, Telnet credential security, custom roles and visual character-creation workflows | DONE | [Account/character contract](03-contracts/account-character-lifecycle.md), [Account & Character Studio](05-sprints/specs/S18.md), [S07](05-sprints/specs/S12.md) |
| **S00.9 C# lifecycle scripting hooks and sprint integration** | Document versioned account/character/creation hook extensions, graph integration and cross-sprint prerequisites without claiming unregistered hooks work | DONE | [Scripting v1 index](03-contracts/scripting-v1/INDEX.md), [hook registry](03-contracts/scripting-v1/03-hook-registry.md), [S13](05-sprints/specs/S17.md), [tracker](SPRINT-TRACKING.md) |

## S01 — Native decisions

**Implementation spec:** [S01.md](05-sprints/specs/S01.md) · **Prerequisites:** S00 + owner ADRs


**Checkpoints:** Verify approved architectural decisions and a real native benchmark before implementation.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S01.1 ECS identities** | Finalize world+generation handle ADR | TODO | — |
| **S01.2 Writer model** | Finalize one authoritative writer | TODO | — |
| **S01.3 Persistence ADR** | Approve embedded local DB engine, isolation/locking, transaction/outbox, migration, recovery and backup ADR | TODO | — |
| **S01.4 Wire ABI** | Freeze versioned SDK/proto rules | TODO | — |
| **S01.5 Native benchmark** | Baseline ECS hot-path under load | TODO | — |
| **S01.6 Account identity ADR** | Approve immutable world-scoped AccountId, session and character identity, lifecycle and retention rules | TODO | — |

## S02 — Editor and shared UI foundation

**Spec:** [S02](05-sprints/specs/S03.md) · **Requires:** S01 UI/platform decision; application shell starts before ECS implementation

**Proof:** MudMaker launches with real Create/Play/Host workspace shells, ThemeManager, navigation, responsive controls and persistent preferences; no fake ECS/editor data.


**User checkpoints:** S02.3 splash/window visible; S02.4 switch between Create, Play and Host without losing drafts; S02.6 pan/zoom graph-paper canvas and S02.7 keyboard/touch navigation. Back-end world editing begins in S09.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S02.1 ThemeManager** | Resolve independent Editor/Client themes from one shared token schema | TODO | — |
| **S02.2 UI primitives** | Implement shared accessible, themed UI primitives and typed action descriptors | TODO | — |
| **S02.3 Loading and splash** | Boot the real app window, verify installed build/UI health, display name/version and Create/Play/Host; show unavailable engine services honestly | TODO | — |
| **S02.4 Workspace navigation** | Switch real Create/Play/Host shells and retain unsaved UI drafts; host/session retention integrates when those services exist | TODO | — |
| **S02.5 Editor shell** | Implement Creator tabs, inspectors, focus handling and draft undo ownership | TODO | — |
| **S02.6 Graph paper** | Render reusable continuous dark minor/major grid with pan/zoom/snap | TODO | — |
| **S02.7 Responsive inputs** | Support tablet/pen/touch and keyboard workspace navigation | TODO | — |
| **S02.8 Control registration** | Bind implemented Editor widgets to UI catalog, action ownership and accessible states | TODO | — |
| **S02.9 Theme preferences** | Provide user themes, preview, import/export, persistence and safe fallback | TODO | — |

## S03 — ECS foundation

**Implementation spec:** [S04.md](05-sprints/specs/S04.md) · **Prerequisites:** S01


**Checkpoints:** After S03.3 run entity creation/mutation tests; after S03.8 exercise the full native ECS harness. **Hands-on:** S03.4 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S03.1 Identity allocator** | World scoped entity generations | TODO | — |
| **S03.2 Component schema** | Typed component registry | TODO | — |
| **S03.3 Mutation API** | Writer-only field mutation | TODO | — |
| **S03.4 ECS live inspector** | Shell panel to create/list ECS entities, inspect typed components and test authorized mutations using real native API | TODO | — |
| **S03.5 Query API** | Bounded entity query | TODO | — |
| **S03.6 Revision guard** | ExpectedVersion write checks | TODO | — |
| **S03.7 Event commit** | Atomic state plus domain event | TODO | — |
| **S03.8 Core harness** | Lifecycle tests and metrics | TODO | — |
| **S03.9 Authorization primitives** | Typed Account/Character/Session references, scoped capability checks and deny-safe evaluator | TODO | — |

## S04 — Assets and persistence

**Implementation spec:** [S05.md](05-sprints/specs/S05.md) · **Prerequisites:** S03


**Checkpoints:** After S04.5 save/reopen a real test world; after S04.9 verify asset revisions and rollback. **Hands-on:** S04.6 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S04.1 Asset registry** | Versioned stable asset GUIDs | TODO | — |
| **S04.2 Asset serializer** | Typed asset data roundtrip with indexed searchable records | TODO | — |
| **S04.3 Layered overrides** | Default/instance/runtime property values | TODO | — |
| **S04.4 Scoped slots** | Persistent world/player state schema | TODO | — |
| **S04.5 Automatic local DB bootstrap and durable world snapshot** | Create/configure local project database automatically; ECS and slot save/restore | TODO | — |
| **S04.6 Storage explorer** | Shell project-data view to create/open a world, inspect persisted entities, restart and verify saved state | TODO | — |
| **S04.7 Outbox ledger** | Durable onceKeys and committed events | TODO | — |
| **S04.8 Schema migration and integrity gate** | App-run versioned schema migration, safety checkpoint and corruption/incompatible-store detection | TODO | — |
| **S04.9 Release and storage manifest** | Immutable asset hashes, database version compatibility and rollback | TODO | — |
| **S04.10 Local storage service** | Local-only authenticated storage access, project writer lease, permissions and health API | TODO | — |
| **S04.11 Data service API** | Typed, paginated, indexed List/Get/Create/Update/Delete, schema and revision/authorization tests | TODO | — |
| **S04.12 Safe backup primitives** | Consistent live DB snapshot, manifest/checksum, staged validation and non-destructive restore harness | TODO | — |
| **S04.13 Presentation assets** | Persist versioned map display metadata, prompt presets and typed field bindings | TODO | — |
| **S04.14 Account store** | Durable opaque AccountId, credential/identity fields, account migration, ownership relations | TODO | — |
| **S04.15 Character roster state** | Durable character slots, account links and creation-graph cursors/approval state | TODO | — |

## S05 — Spatial containment

**Implementation spec:** [S06.md](05-sprints/specs/S06.md) · **Prerequisites:** S03,S04


**Checkpoints:** After S05.3 traverse room/exits in the native harness; after S05.7 test lock/visibility rules. **Hands-on:** S05.4 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S05.1 Parent containment** | Validated parent/child nesting | TODO | — |
| **S05.2 Room membership** | World/region rooms and occupants | TODO | — |
| **S05.3 Exit graph** | Directed typed exits | TODO | — |
| **S05.4 Room traversal preview** | Shell room/exit viewer to create linked test rooms, walk actor, inspect visibility and locks | TODO | — |
| **S05.5 Exit access** | Door and lock conditions | TODO | — |
| **S05.6 Dynamic doors** | Dock-dependent exit activation | TODO | — |
| **S05.7 Visibility** | Per-observer target set | TODO | — |
| **S05.8 Map projection contract** | Authorized room/exit discovery projections incl. dynamic transit and private locations | TODO | — |
| **S05.9 Safe character entry** | Validated last room/spawn fallback, character ownership and location continuity | TODO | — |

## S06 — Command runtime

**Spec:** [S06](05-sprints/specs/S10.md) · **Requires:** S04,S05

**Proof:** E1 only: native command harness, not a playable MUD.


**Checkpoints:** **E1:** after S06.8 run look/move through the actual command service; after S06.11 inspect committed observer-specific output. This is not a graphical game. **Hands-on:** S06.9 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S06.1 Command assets** | Typed definitions + native defaults | TODO | — |
| **S06.2 Alias matcher** | Longest complete word alias | TODO | — |
| **S06.3 Typed grammar** | Quotes, switches, lhs=rhs | TODO | — |
| **S06.4 Long arguments** | Multiline, schema-bounded command data | TODO | — |
| **S06.5 Dynamic cmdsets** | Session/actor/room/item/exit scopes | TODO | — |
| **S06.6 Access rules** | Typed permission predicates | TODO | — |
| **S06.7 Ambiguity** | Expiring visible-target selection | TODO | — |
| **S06.8 Single executor** | GUI action and text share validation | TODO | — |
| **S06.9 Command console** | Shell command input/output panel using one real executor; test look/move, errors, permissions and narration | TODO | — |
| **S06.10 Event commit** | Idempotent command/outbox | TODO | — |
| **S06.11 Narration** | Observer-projected committed output | TODO | — |
| **S06.12 Prompt updates** | Committed movement/status events produce scoped text prompt fallback without extra mutation path | TODO | — |
| **S06.13 Account command authority** | Owner/role/region permission checks for character and builder/moderation commands | TODO | — |

## S07 — Remote player input

**Spec:** [S07](05-sprints/specs/S12.md) · **Requires:** S04–S06, approved ingress and identity contracts

**E1→E2 bridge:** loopback developer host only; no public exposure or production hosting. S07.9 proves the engine can receive and reply to an authenticated test client.


**Checkpoints:** After S07.9 exercise look/move on the real loopback host; after S07.14 test RP versus command intent, then quotas and reconnect at S07.17. Do not expose loopback test hosting publicly. **Hands-on:** S07.10 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Small deliverable | Status | Evidence |
|---|---|---|---|
| **S07.1 Local test host** | Boot actual world on loopback only for connected development testing | TODO | — |
| **S07.2 Frame admission** | Bounded handshake, origin rules, framing and timeouts | TODO | — |
| **S07.3 Session identity** | Authenticate and bind actor; revoke stale sessions | TODO | — |
| **S07.4 Typed decoding** | Versioned envelope, strict UTF-8, explicit message kind | TODO | — |
| **S07.5 Safe output** | Encode actual committed text and errors without control injection | TODO | — |
| **S07.6 Actor visibility** | Deliver only authorized room/event output | TODO | — |
| **S07.7 Account authentication** | Registration, verification, hashed credentials, login denial and lockout without script bypass | TODO | — |
| **S07.8 Session puppeting** | Session-bound AccountId, character selection/attachment, revocation and simultaneous-session policy | TODO | — |
| **S07.9 Loopback roundtrip** | Test client sends look and move, host commits and replies | TODO | — |
| **S07.10 Loopback connection panel** | Shell local host/session status and connect test with authenticated actor, real network receipts and errors | TODO | — |
| **S07.11 Short RP** | One-word SubmitText handled as post, never command | TODO | — |
| **S07.12 Long RP** | Bounded multiline Unicode prose submission | TODO | — |
| **S07.13 Descriptions** | Owner-authenticated character text revision | TODO | — |
| **S07.14 Long commands** | Authorized multiline command args remain commands | TODO | — |
| **S07.15 Rate limits** | Per-actor, action and byte budgets | TODO | — |
| **S07.16 Backpressure** | Bounded fair input and output queues | TODO | — |
| **S07.17 Reconnect** | Dedupe receipts and restore session safely | TODO | — |
| **S07.18 Status/location protocol** | Authenticated scoped Status/Location snapshots, deltas, revision and reconnect semantics | TODO | — |

## S08 — Standalone Player Client (native + external MUDs)

**Spec:** [S08](05-sprints/specs/S07.md) · **Requires:** S07.9 + S02.2–4

**E2 FIRST PLAYABLE is S08.6:** genuine interactive client connected to real game host, not a simulated terminal. Public hosting and full protections are later milestones.


**Checkpoints:** **E2 first playable at S08.6:** two standalone Player Client sessions connect to a real local world, move and receive scoped output. Further user tests at S08.10 (client appearance), S08.11 (third-party connection) and S08.15 (mapper).

| Phase | Small deliverable | Status | Evidence |
|---|---|---|---|
| **S08.1 Player shell** | Separate Play workspace, transcript, composer and tabs | TODO | — |
| **S08.2 World profiles** | Save native/third-party connection profiles | TODO | — |
| **S08.3 Native adapter** | Connect to real S07 loopback game host | TODO | — |
| **S08.4 Basic composer** | Send explicit action/command and display response | TODO | — |
| **S08.5 Account lobby** | Login, registration, auto-enter or character roster with valid session attachment and text fallback | TODO | — |
| **S08.6 FIRST PLAYABLE** | Two real players can look, move and receive scoped output | TODO | — |
| **S08.7 Navigation retention** | Keep session and drafts on safe workspace switch | TODO | — |
| **S08.8 Text rendering** | Bounded ANSI/UTF-8 spans and safe output | TODO | — |
| **S08.9 Transcript tools** | Scrollback, search, copy, timestamps and wrapping | TODO | — |
| **S08.10 Appearance** | Independent Client theme and font settings | TODO | — |
| **S08.11 Telnet adapter** | Connect to unrelated MUD with bounded Telnet | TODO | — |
| **S08.12 Layouts and hotkeys** | Save per-world panes and quick commands | TODO | — |
| **S08.13 Aliases and triggers** | Declarative profile-local command and output rules | TODO | — |
| **S08.14 Timers** | Bounded timers and explicitly trusted automation | TODO | — |
| **S08.15 Mini mapper** | Personal rooms/exits, notes and source confidence | TODO | — |
| **S08.16 Metadata** | Optional GMCP/CHARSET/NAWS and mapping hints | TODO | — |
| **S08.17 Autowalk** | Opt-in one-step navigation and accessible route list | TODO | — |
| **S08.18 Live HUD** | Pinned per-profile prompt/vitals/exits bar using real scoped native fields or external fallback | TODO | — |
| **S08.19 Native mini map** | Render authorized room/exits from host topology, preserve client notes, handle unknown/dynamic paths | TODO | — |

## S09 — Visual command editor

**Spec:** [S09](05-sprints/specs/S02.md) · **Requires:** S04,S06,S02

**Proof:** Visual command editor reuses native gameplay command service. First-playable S08.6 is available for user tests.


**User checkpoints:** S09.2 reusable Blueprint inspector; S09.8 create and run a command; S09.16 edit and save actual linked rooms in the running shell; S09.18 browse thousands of records; S09.9 publish and execute through Player.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S09.1 Inspector** | Schema-driven component editor with local data API | TODO | — |
| **S09.2 Blueprints** | Reusable templates and overrides with searchable data catalog | TODO | — |
| **S09.3 Theme reuse** | S02 graph-paper tokens | TODO | — |
| **S09.4 Command form** | No-code command name/help/action | TODO | — |
| **S09.5 Arguments UI** | Typed param/switch/multiline controls | TODO | — |
| **S09.6 Access UI** | Scope/role/quest rule builder | TODO | — |
| **S09.7 Alias/help view** | Conflict analysis and generated usage | TODO | — |
| **S09.8 Real test UI** | Use native command harness in editor | TODO | — |
| **S09.9 Command publish** | Versioned release validation | TODO | — |
| **S09.10 Record explorer** | Fast filters, server paging, stable identifiers and relationships across thousands of entities | TODO | — |
| **S09.11 Safe data editing** | Inspector CRUD, changes preview, conflict feedback and reversible draft edit via existing authority | TODO | — |
| **S09.12 Bulk data operations** | Scoped selection, where-used, batch previews/validation, safe deletion and progress feedback | TODO | — |
| **S09.13 Prompt designer** | No-code Host/Creator prompt and resource/status widget bindings, presets and preview | TODO | — |
| **S09.14 Map presentation settings** | Publish region/map icon defaults, discoverability and safe map projection policies | TODO | — |
| **S09.15 Role editor** | Creator-friendly custom roles, scoped grants/denials and effective-permission preview | TODO | — 
| **S09.16 World map editing** | Connect Creator's cell/room/exit editor to real S05 topology and S04 persistence; human maps two rooms | TODO | — |
| **S09.17 Map presentation metadata** | Author room icons, layers, coordinate hints and visibility rules; preview player projection | TODO | — |
| **S09.18 Data Manager shell** | Real indexed collections, paginated/virtualized records, scoped search and detail navigation using S04 API | TODO | — ||

## S10 — World systems

**Spec:** [S10](05-sprints/specs/S09.md) · **Requires:** S06, S07.9, S08.6

**Proof:** Real Player Client interaction is required to verify actual event gameplay; engine-only tests alone are insufficient.


**Checkpoints:** User tests after S10.1 (trigger regional event) and S10.4 (spawn/conditional world interaction). **Hands-on:** S10.2 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S10.1 World event state** | Regional/world event definitions and lifecycle | TODO | — |
| **S10.2 World-event testing panel** | In-app event trigger/status panel for region state and spawn results through actual world commands | TODO | — |
| **S10.3 Spawner** | Timed/entity spawning and despawning | TODO | — |
| **S10.4 World interaction** | Conditional world systems and environmental effects | TODO | — |

## S11 — Quests

**Spec:** [S11](05-sprints/specs/S13.md) · **Requires:** S04–S06, S07.9, S08.6

**Proof:** Player-connected quest acceptance, dialogue, reward and observer tests are required in addition to native unit tests.


**Checkpoints:** User tests after S11.3 (accept/progress quest through dialogue) and S11.6 (reward plus restart persistence). **Hands-on:** S11.4 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S11.1 Quest state** | Per-actor quest attempts, scope and eligibility | TODO | — |
| **S11.2 Objective credit** | Evidence-based objective types and chain prerequisites | TODO | — |
| **S11.3 Dialogue stages** | Validated dialogue choices, sessions and quiz | TODO | — |
| **S11.4 Quest testing panel** | In-app quest accept/dialogue/objective/reward view using real character and live quest service | TODO | — |
| **S11.5 Rewards/phasing** | Atomic claim, bonus roll and phased NPC | TODO | — |
| **S11.6 Quest recovery** | Persist and resume quest/session after restart | TODO | — |

## S12 — Transit

**Spec:** [S12](05-sprints/specs/S15.md) · **Requires:** S05, S10, S08.6

**Proof:** Board, travel and exit from a real Player Client; mocked command traces cannot close gameplay acceptance.


**Checkpoints:** User tests after S12.2 (ride train within nested rooms) and S12.4 (dock and disembark only when exits are available). **Hands-on:** S12.3 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S12.1 Transit route** | Route progression with persistent train state | TODO | — |
| **S12.2 Moving interiors** | Nested carriage rooms and their passengers/items | TODO | — |
| **S12.3 Transit testing view** | In-app carriage/route/exit view with board/ride/dock and actual movement controls | TODO | — |
| **S12.4 Dynamic exits** | Dock-time door to station, closed en route | TODO | — |

## S13 — C# and graphs

**Spec:** [S13](05-sprints/specs/S17.md) · **Requires:** S06,S07,S08.6,S09

**Proof:** C# and graph runtime must execute inside real playable host/client integration.


**Checkpoints:** After S13.6, test real compiled C# through ECS authority; after S13.11, code/graph parity; after S13.13, two-player scripted gameplay. **Hands-on:** S13.7 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S13.1 SDK build** | C#14/.NET10 SDK compile | TODO | — |
| **S13.2 IPC generation** | C++ and C# Protobuf codecs | TODO | — |
| **S13.3 Hook manifest** | Exact catalog type/mode checks | TODO | — |
| **S13.4 Worker start** | Load host-published hashed DLL | TODO | — |
| **S13.5 Command binding** | Host command to C# handler | TODO | — |
| **S13.6 ECS effects** | Revalidate and commit worker plan | TODO | — |
| **S13.7 Script authoring workspace** | In-app C# editor compile diagnostics, hook binding and test-run output before advanced graph parity | TODO | — |
| **S13.8 Worker failure** | Timeout and crash recovery | TODO | — |
| **S13.9 Persistent fields** | Validated ECS/state slot overrides | TODO | — |
| **S13.10 Graph compile** | Typed visual node plan | TODO | — |
| **S13.11 Graph parity** | Same native effect API for code/graph | TODO | — |
| **S13.12 Release activation** | Stop/edit/build/publish/restart | TODO | — |
| **S13.13 Two-player demo** | Midnight Express gameplay | TODO | — |
| **S13.14 Account/character hook ABI** | Versioned registry/CLR/proto parity for typed lifecycle and security-safe events | TODO | — |
| **S13.15 Workflow hook effects** | Durable graph continuation and approved C# effects for creation steps, approval and world events | TODO | — |

## S14 — Account & Character Studio

**Spec:** [S14](05-sprints/specs/S18.md) · **Requires:** S04 account/character state, S07 authenticated sessions, S08.6 playable client, S09 Creator UI and S13 typed graph/worker foundation. **One visual graph editor**, not a second form designer. The early identity/login functionality belongs to its prerequisite sprints; this sprint finishes sophisticated creator-facing workflows.

**Checkpoints:** Preview auto-enter and multiple character selection; then test a roleplay application/approval and in-world sword-or-staff class selection in two real sessions. Independently audit permission scope and persistence. **Hands-on:** S14.3 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S14.1 Creator account policies** | Choose registration, auto-entry, roster, slots, guest and simultaneous-session policies from clear presets | TODO | — |
| **S14.2 Creation graph templates** | One shared visual graph: instant, menu, point-buy, reroll, staff-review and in-world templates | TODO | — |
| **S14.3 Creation preview workspace** | Preview/test workflow graph as real test account/character with persisted cursor and reset | TODO | — |
| **S14.4 Typed creation interactions** | Player graphical/text choice rendering, validation and point/roll budgets | TODO | — |
| **S14.5 World event continuation** | Durable room/item/NPC and dialogue triggers that resume real character creation once | TODO | — |
| **S14.6 Approval and roster UX** | Staff review/revise/approve, prebuilt character claims, multi-character selection and recovery | TODO | — |
| **S14.7 Creator permissions UX** | Scope-limited Builder/Moderator capabilities, custom roles, explain/dry-run and safe audits | TODO | — |
| **S14.8 Custom C# integration** | Graph hooks, persistent typed effects and owner-published script extension with no security bypass | TODO | — |
| **S14.9 End-to-end creator playtest** | Publish and play several differing creation styles; verify AccountId, resume, login/logout and two sessions | TODO | — |

## S15 — World-system editing

**Spec:** [S15](05-sprints/specs/S15.md) · **Requires:** S10,S12,S02,S09,S13

**Proof:** The visual authoring test must result in playable world-system output.


**Checkpoints:** User tests after S15.2 (author and play a world event) and S15.5 (published transit/narration). **Hands-on:** S15.3 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S15.1 Spawner editor** | Visual configure/validate spawner and condition graph | TODO | — |
| **S15.2 World event authoring** | Visual weather/event transitions and regional scope | TODO | — |
| **S15.3 World test preview** | In-app author-and-play event, spawner and transit preview of published world definitions | TODO | — |
| **S15.4 Transit authoring** | Route/train/doors authoring graph using shared canvas | TODO | — |
| **S15.5 Narration authoring** | Observer template and audience rule editor | TODO | — |

## S16 — Quest editing

**Spec:** [S16](05-sprints/specs/S16.md) · **Requires:** S11,S02,S09,S13

**Proof:** Verify no-code quests through Player Client, not only an editor-only graph preview.


**Checkpoints:** User tests after S16.2 (edit dialogue) and S16.6 (publish and play a complete quest). **Hands-on:** S16.3 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S16.1 Quest authoring** | Build no-code objective definitions and prerequisites | TODO | — |
| **S16.2 Dialogue graph** | Create all documented dialogue stages with choices | TODO | — |
| **S16.3 Quest test preview** | In-app live quest graph/condition preview from player and staff perspectives | TODO | — |
| **S16.4 Rewards/eligibility UI** | Configure rewards, phase/party/instance conditions | TODO | — |
| **S16.5 Graph/script binding** | Attach typed C# handler to quest graph and test | TODO | — |
| **S16.6 Complete creator workflow** | Build, validate and publish full Midnight Express from UI | TODO | — |

## S17 — Self-hosting

**Spec:** [S17](05-sprints/specs/S17.md) · **Requires:** S04,S07,S08,S13

**Proof:** E3 public/creator hosting: host startup, recovery, external joins and operations. Different from S07 loopback developer host.


**Checkpoints:** Test GUI/headless local release startup after S17.5, recovery after S17.7; **E3** only after S17.17 verifies real remote joins and protective host operations. **Hands-on:** S17.6 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S17.1 Hosting and database lease** | Enforce one active host/project database writer, local-only store handles and runtime ownership | TODO | — |
| **S17.2 Storage and host preflight** | Automatically open/check local database and validate scripts, schema, permissions and limits before player port opens | TODO | — |
| **S17.3 GUI hosting** | Start a validated immutable release from Host workspace | TODO | — |
| **S17.4 Background host navigation** | Keep host A running when switching to Create, Play or Splash; guarded stop | TODO | — |
| **S17.5 Headless hosting** | Start same release using CLI under identical single-host rule | TODO | — |
| **S17.6 Host operations dashboard** | In-app startup, health, sessions, backup/restore and safe server-stop controls | TODO | — |
| **S17.7 Database and world recovery** | Restore ECS, quests, posts, timers and outbox; detect corrupt storage without silent rollback | TODO | — |
| **S17.8 Secure transport** | Configure server TLS and browser Origin restrictions where appropriate | TODO | — |
| **S17.9 Proxy and firewall** | Implement trusted proxy policy and connectivity diagnostics | TODO | — |
| **S17.10 Traffic metrics** | Expose bounded rate, queue, rejection and latency status | TODO | — |
| **S17.11 Moderation controls** | Provide role-checked kick/ban and protective rate settings | TODO | — |
| **S17.12 Backups** | Optional manual/scheduled consistent database backups, manifest validation and in-app selection | TODO | — |
| **S17.13 Release rollback** | Restore selected verified backup or prior compatible release via staging, safety snapshot and failure rollback | TODO | — |
| **S17.14 Host onboarding** | Guide self-hosting, friend connection and playing from independent Client | TODO | — |
| **S17.15 Backup preferences UI** | Opt-in manual/scheduled backup, destinations, retention and verification status | TODO | — |
| **S17.16 In-app restore UX** | Choose verified backup; restore as copy or staged replacement with consent and failure fallback | TODO | — |
| **S17.17 Database operations UI** | Accessible database health, storage usage, maintenance and actionable recovery errors | TODO | — |
| **S17.18 Presentation publish compatibility** | Host publishes valid prompt/map schemas with restart/reconnect recovery and UI preview | TODO | — |
| **S17.19 Account operations** | Host account search, revoke/ban/recovery and session audit without raw DB access | TODO | — |

## S18 — Release audit

**Spec:** [S18](05-sprints/specs/S18.md) · **Requires:** All sprints

**Proof:** Final security/accessibility/performance on real supported configurations.


**Checkpoints:** Test supported platforms and accessibility, then security/performance; finish with clean install → host → play → save → restore. **Hands-on:** S18.9 runs in the existing S02 shell with actual engine results, not mocks.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S18.1 Platform** | Target OS client/host checks | TODO | — |
| **S18.2 Accessibility** | Keyboard/touch/contrast/readers | TODO | — |
| **S18.3 Parser fuzz** | Malformed and Unicode payloads | TODO | — |
| **S18.4 Flood fairness** | Connection+RP overload | TODO | — |
| **S18.5 Privacy** | Log and phase/observer audit | TODO | — |
| **S18.6 Worker sandbox** | Crash/isolation negative cases | TODO | — |
| **S18.7 Performance** | World+command+RP fanout benchmark | TODO | — |
| **S18.8 Release** | Clean install, host, save, restore | TODO | — |
| **S18.9 Release walkthrough UI** | Clean-install app walkthrough capturing real Create/Play/Host accessibility, session and recovery results | TODO | — |
| **S18.10 Storage disaster tests** | Cross-platform fresh bootstrap, privacy, large-data pagination, corruption/migration, active backup and restore-failure audits | TODO | — |
| **S18.11 Prompt/map safety audit** | Test hidden exits, status permissions, stale reconnects, moving trains, 10k-room pagination, accessibility | TODO | — |
| **S18.12 Identity and workflow audit** | ID non-reuse, login/logout ordering, puppet races, malicious hooks and multi-session recovery | TODO | — |

## Phase evidence
Record implementation commit, focused test and Auditor PASS in the phase Evidence cell; a user exercise when applicable. Longer discussions: [Sprint History](SPRINT-HISTORY.md).
