# MudMaker Sprint Tracker

**Canonical repo-native dashboard.** Sprints are large self-contained milestones, each broken into small independently auditable Builder/Auditor phases. The sprint sections follow dependency order; phase rows within each sprint follow implementation order, even when stable phase IDs are not numerical. Multiple phase handoffs should ordinarily fit a five-hour Claude session. Do not fragment a sprint into separate roadmap waves.

**Current:** S00 documentation review. S00.1–S00.5 are in AUDIT awaiting independent verification; **no S00 phase is DONE**. All implementation remains TODO. Missing research, implementation platform decisions and test oracles go to the owner **before** dispatch, not to Builder/Auditor.

## Evidence levels and first playable gate

| Level | Actual proof | Earliest checkpoint |
|---|---|---|
| **E1 — Native harness** | ECS, rooms, commands, persistence exercised by real focused tests; no graphical Player Client claimed | S02–S05 |
| **E2 — Local playable game** | Real Player Client connects to a running loopback world, moves through rooms, receives real authorized events | **S09C.5**, after S08.7 and S09.1–4 |
| **E3 — Creator/public host** | Owner safely starts a durable hosted world with remote joins and host-facing operational controls | S13.16, after input security, recovery and hosting prerequisites |

**Primary sprint sequence:** S00 → S01 → S02 → S03 → S04 → S05 → S08 → S09 → **S09C (E2 first playable at .5)** → S10 → S06 → S06Q → S07 → S11 → S12 → S12Q → **S13 (E3 public hosting)** → S14. S09.1–4 can start after S03 in parallel with backend work, when Lead confirms exact prerequisites; S09C.1–5 requires S08.7 and S09.1–4. A sprint remains a cohesive milestone, while user-testing checkpoints occur *inside* sprints. Do not confuse E1 native harness, E2 local play, and E3 remotely accessible hosting.

## Sprint overview — in actual work order

| Sprint | Focus | Verified | Depends on | Status |
|---|---|---:|---|---|
| [S00](#s00) | Documents and decisions | **0/5** | — | ACTIVE |
| [S01](#s01) | Architecture gates | **0/5** | S00 + owner ADRs | PLANNED |
| [S02](#s02) | Native ECS | **0/7** | S01 | PLANNED |
| [S03](#s03) | Assets and persistence | **0/12** | S02 | PLANNED |
| [S04](#s04) | Rooms and exits | **0/7** | S02,S03 | PLANNED |
| [S05](#s05) | Command harness | **0/11** | S03,S04 | PLANNED |
| [S08](#s08) | Loopback host and secure input | **0/15** | S03,S05 | PLANNED |
| [S09](#s09) | Shared UI foundation | **0/12** | S03 | PLANNED |
| [S09C](#s09c) | Playable client and toolkit | **0/18** | S08.7,S09.1–4 | PLANNED |
| [S10](#s10) | Creator command/Blueprint UI | **0/14** | S05,S09 | PLANNED |
| [S06](#s06) | World events | **0/3** | S09C.5 | PLANNED |
| [S06Q](#s06q) | Quests | **0/5** | S09C.5 | PLANNED |
| [S07](#s07) | Transit | **0/3** | S06,S09C.5 | PLANNED |
| [S11](#s11) | Scripts and graphs | **0/12** | S08,S09C.5,S10 | PLANNED |
| [S12](#s12) | World authoring | **0/4** | S06,S07,S11 | PLANNED |
| [S12Q](#s12q) | Quest authoring | **0/5** | S06Q,S11 | PLANNED |
| [S13](#s13) | Public hosting | **0/17** | S08,S09C,S11 | PLANNED |
| [S14](#s14) | Release audit | **0/10** | All preceding | PLANNED |

## Agent process
Lead selects one phase from this table and its one sprint spec. One Builder implements the bounded deliverable and runs approved focused checks; one different scoped Auditor reviews real implementation and evidence. `TODO → BUILD → AUDIT → DONE` only with independent PASS, not merely a documented proposal. Record test command, build commit, audit result and any real user demo in **Evidence**. No agent research tasks or broad test-suite loops. `BLOCKED` means the owner must resolve the missing decision. Full suite at sprint closure only by explicit Lead approval.

**Prompt and mapping contract:** [Evennia-inspired server prompt, status HUD, authoritative map projections and Creator/Player customization](03-contracts/prompt-and-world-map.md). Map fields and status snapshots are per-observer and permission-filtered; client personalization never becomes world authority.

**Input is explicit:** command/action versus RP/description is identified by authenticated message kind, **never text length**.

## S00 — Research, design contracts and agent-ready documentation

**Sprint spec:** [S00.md](05-sprints/specs/S00.md) · **Prerequisite:** none · **S00 is document review, not implementation testing.** Review scope and approval are selected independently by the Lead. S00 records owner research, settled design, unresolved ADRs and link/consistency verification only.


**Checkpoints:** Independently audit documents, no application test claimed.

| Phase | Document deliverable | Status | Evidence |
|---|---|---|---|
| **S00.1 Authority & indexed contracts** | Indexed ECS, scripting, input and UI decisions with exact agent read paths | AUDIT | [Technical index](INDEX.md), [UI index](03-contracts/ui-ux/INDEX.md), [UI catalog](../contracts/ui/v1/INDEX.md); independent docs review pending |
| **S00.2 Workspace/security boundaries** | Separate Editor, Player Client, Host; safe input and concurrent host/view lifetimes | AUDIT | [Ownership](03-contracts/ui-ux/01-workspaces-and-ownership.md), [navigation](03-contracts/ui-ux/00-launch-and-workspace-navigation.md), [remote input](03-contracts/client-input-v1/01-ingress-threat-boundary.md); review pending |
| **S00.3 UI/UX architecture & decision gates** | Central ThemeManager, cataloged controls, Editor/Client workflows, sourced client research and unresolved platform ADRs | AUDIT | [UI contract](03-contracts/ui-ux/INDEX.md), [controls](../contracts/ui/v1/INDEX.md), [client research](03-contracts/ui-ux/09-client-research.md), [open decisions](07-decisions/OPEN_DECISIONS.md); review pending |
| **S00.4 Implementable sprint handoffs** | One tracker, one spec/sprint and phase dependency map with no agent research tasks | AUDIT | [Sprint specs](05-sprints/specs/INDEX.md), [agent rules](../CLAUDE.md), [tracker](SPRINT-TRACKING.md); final handoff check pending |
| **S00.5 First-playable dependency review** | Verify engine-only, local-play and public-host gates, plus phased sprint prerequisites | AUDIT | [Tracker](SPRINT-TRACKING.md), [roadmap](05-sprints/INDEX.md); independent review pending |

**S00 remains active; no independent documentation audit has passed.** Drafting a contract permits `AUDIT`, not `DONE`; S00 requires an independent document review, not an imaginary app demo. If review finds ambiguity, keep phase open until the owner resolves it. After S00, real Builder/Auditor milestones include actual user-testable builds.

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

## S02 — ECS foundation

**Implementation spec:** [S02.md](05-sprints/specs/S02.md) · **Prerequisites:** S01


**Checkpoints:** After S02.3 run entity creation/mutation tests; after S02.7 exercise the full native ECS harness.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S02.1 Identity allocator** | World scoped entity generations | TODO | — |
| **S02.2 Component schema** | Typed component registry | TODO | — |
| **S02.3 Mutation API** | Writer-only field mutation | TODO | — |
| **S02.4 Query API** | Bounded entity query | TODO | — |
| **S02.5 Revision guard** | ExpectedVersion write checks | TODO | — |
| **S02.6 Event commit** | Atomic state plus domain event | TODO | — |
| **S02.7 Core harness** | Lifecycle tests and metrics | TODO | — |

## S03 — Assets and persistence

**Implementation spec:** [S03.md](05-sprints/specs/S03.md) · **Prerequisites:** S02


**Checkpoints:** After S03.5 save/reopen a real test world; after S03.8 verify asset revisions and rollback.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S03.1 Asset registry** | Versioned stable asset GUIDs | TODO | — |
| **S03.2 Asset serializer** | Typed asset data roundtrip with indexed searchable records | TODO | — |
| **S03.3 Layered overrides** | Default/instance/runtime property values | TODO | — |
| **S03.4 Scoped slots** | Persistent world/player state schema | TODO | — |
| **S03.5 Automatic local DB bootstrap and durable world snapshot** | Create/configure local project database automatically; ECS and slot save/restore | TODO | — |
| **S03.6 Outbox ledger** | Durable onceKeys and committed events | TODO | — |
| **S03.7 Schema migration and integrity gate** | App-run versioned schema migration, safety checkpoint and corruption/incompatible-store detection | TODO | — |
| **S03.8 Release and storage manifest** | Immutable asset hashes, database version compatibility and rollback | TODO | — |
| **S03.9 Local storage service** | Local-only authenticated storage access, project writer lease, permissions and health API | TODO | — |
| **S03.10 Data service API** | Typed, paginated, indexed List/Get/Create/Update/Delete, schema and revision/authorization tests | TODO | — |
| **S03.11 Safe backup primitives** | Consistent live DB snapshot, manifest/checksum, staged validation and non-destructive restore harness | TODO | — |
| **S03.12 Presentation assets** | Persist versioned map display metadata, prompt presets and typed field bindings | TODO | — |

## S04 — Spatial containment

**Implementation spec:** [S04.md](05-sprints/specs/S04.md) · **Prerequisites:** S02,S03


**Checkpoints:** After S04.3 traverse room/exits in the native harness; after S04.6 test lock/visibility rules.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S04.1 Parent containment** | Validated parent/child nesting | TODO | — |
| **S04.2 Room membership** | World/region rooms and occupants | TODO | — |
| **S04.3 Exit graph** | Directed typed exits | TODO | — |
| **S04.4 Exit access** | Door and lock conditions | TODO | — |
| **S04.5 Dynamic doors** | Dock-dependent exit activation | TODO | — |
| **S04.6 Visibility** | Per-observer target set | TODO | — |
| **S04.7 Map projection contract** | Authorized room/exit discovery projections incl. dynamic transit and private locations | TODO | — |

## S05 — Command runtime

**Spec:** [S05](05-sprints/specs/S05.md) · **Requires:** S03,S04

**Proof:** E1 only: native command harness, not a playable MUD.


**Checkpoints:** **E1:** after S05.8 run look/move through the actual command service; after S05.10 inspect committed observer-specific output. This is not a graphical game.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S05.1 Command assets** | Typed definitions + native defaults | TODO | — |
| **S05.2 Alias matcher** | Longest complete word alias | TODO | — |
| **S05.3 Typed grammar** | Quotes, switches, lhs=rhs | TODO | — |
| **S05.4 Long arguments** | Multiline, schema-bounded command data | TODO | — |
| **S05.5 Dynamic cmdsets** | Session/actor/room/item/exit scopes | TODO | — |
| **S05.6 Access rules** | Typed permission predicates | TODO | — |
| **S05.7 Ambiguity** | Expiring visible-target selection | TODO | — |
| **S05.8 Single executor** | GUI action and text share validation | TODO | — |
| **S05.9 Event commit** | Idempotent command/outbox | TODO | — |
| **S05.10 Narration** | Observer-projected committed output | TODO | — |
| **S05.11 Prompt updates** | Committed movement/status events produce scoped text prompt fallback without extra mutation path | TODO | — |

## S08 — Remote player input

**Spec:** [S08](05-sprints/specs/S08.md) · **Requires:** S03–S05, approved ingress and identity contracts

**E1→E2 bridge:** loopback developer host only; no public exposure or production hosting. S08.7 proves the engine can receive and reply to an authenticated test client.


**Checkpoints:** After S08.7 exercise look/move on the real loopback host; after S08.11 test RP versus command intent, then quotas and reconnect at S08.14. Do not expose loopback test hosting publicly.

| Phase | Small deliverable | Status | Evidence |
|---|---|---|---|
| **S08.4 Local test host** | Boot actual world on loopback only for connected development testing | TODO | — |
| **S08.1 Frame admission** | Bounded handshake, origin rules, framing and timeouts | TODO | — |
| **S08.2 Session identity** | Authenticate and bind actor; revoke stale sessions | TODO | — |
| **S08.3 Typed decoding** | Versioned envelope, strict UTF-8, explicit message kind | TODO | — |
| **S08.5 Safe output** | Encode actual committed text and errors without control injection | TODO | — |
| **S08.6 Actor visibility** | Deliver only authorized room/event output | TODO | — |
| **S08.7 Loopback roundtrip** | Test client sends look and move, host commits and replies | TODO | — |
| **S08.8 Short RP** | One-word SubmitText handled as post, never command | TODO | — |
| **S08.9 Long RP** | Bounded multiline Unicode prose submission | TODO | — |
| **S08.10 Descriptions** | Owner-authenticated character text revision | TODO | — |
| **S08.11 Long commands** | Authorized multiline command args remain commands | TODO | — |
| **S08.12 Rate limits** | Per-actor, action and byte budgets | TODO | — |
| **S08.13 Backpressure** | Bounded fair input and output queues | TODO | — |
| **S08.14 Reconnect** | Dedupe receipts and restore session safely | TODO | — |
| **S08.15 Status/location protocol** | Authenticated scoped Status/Location snapshots, deltas, revision and reconnect semantics | TODO | — |

## S09 — Editor and shared UI foundation

**Spec:** [S09](05-sprints/specs/S09.md) · **Requires:** S03; S09.1–4 may proceed before S08

**Proof:** S09.1–4 enable first Player Client; later Editor work can proceed independently.


**Checkpoints:** User tests after S09.3 (launch and navigate), S09.8 (edit and save a map), and S09.10 (responsive/focus controls); S09.5 finalizes theme preferences.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S09.4 ThemeManager** | Resolve independent Editor/Client themes from one shared token schema | TODO | — |
| **S09.1 UI primitives** | Implement shared accessible, themed UI primitives and typed action descriptors | TODO | — |
| **S09.2 Loading and splash** | Validate startup then display MudMaker name/version, Create, Play and Host | TODO | — |
| **S09.3 Workspace navigation** | Implement Go To menu and transition guard; retain Editor drafts across switches | TODO | — |
| **S09.6 Editor shell** | Implement Creator tabs, inspectors, focus handling and draft undo ownership | TODO | — |
| **S09.7 Graph paper** | Render reusable continuous dark minor/major grid with pan/zoom/snap | TODO | — |
| **S09.8 Map editing** | Add selectable/editable cells, rooms, exits and inspector/save integration | TODO | — |
| **S09.9 Responsive inputs** | Support tablet/pen/touch and keyboard workspace navigation | TODO | — |
| **S09.10 Control registration** | Bind implemented Editor widgets to UI catalog, action ownership and accessible states | TODO | — |
| **S09.5 Theme preferences** | Provide user themes, preview, import/export, persistence and safe fallback | TODO | — |
| **S09.11 Data Manager shell** | World Data navigation, collections, statuses, searchable paginated/virtualized results | TODO | — |
| **S09.12 Creator map metadata** | Add room icons, layers, coordinate hints, visibility settings and as-player preview | TODO | — |

## S09C — Standalone Player Client (native + external MUDs)

**Spec:** [S09C](05-sprints/specs/S09C.md) · **Requires:** S08.7 + S09.1–4

**E2 FIRST PLAYABLE is S09C.5:** genuine interactive client connected to real game host, not a simulated terminal. Public hosting and full protections are later milestones.


**Checkpoints:** **E2 first playable at S09C.5:** two standalone Player Client sessions connect to a real local world, move and receive scoped output. Further user tests at S09C.9 (client appearance), S09C.10 (third-party connection) and S09C.14 (mapper).

| Phase | Small deliverable | Status | Evidence |
|---|---|---|---|
| **S09C.1 Player shell** | Separate Play workspace, transcript, composer and tabs | TODO | — |
| **S09C.2 World profiles** | Save native/third-party connection profiles | TODO | — |
| **S09C.3 Native adapter** | Connect to real S08 loopback game host | TODO | — |
| **S09C.4 Basic composer** | Send explicit action/command and display response | TODO | — |
| **S09C.5 FIRST PLAYABLE** | Two real players can look, move and receive scoped output | TODO | — |
| **S09C.6 Navigation retention** | Keep session and drafts on safe workspace switch | TODO | — |
| **S09C.7 Text rendering** | Bounded ANSI/UTF-8 spans and safe output | TODO | — |
| **S09C.8 Transcript tools** | Scrollback, search, copy, timestamps and wrapping | TODO | — |
| **S09C.9 Appearance** | Independent Client theme and font settings | TODO | — |
| **S09C.10 Telnet adapter** | Connect to unrelated MUD with bounded Telnet | TODO | — |
| **S09C.11 Layouts and hotkeys** | Save per-world panes and quick commands | TODO | — |
| **S09C.12 Aliases and triggers** | Declarative profile-local command and output rules | TODO | — |
| **S09C.13 Timers** | Bounded timers and explicitly trusted automation | TODO | — |
| **S09C.14 Mini mapper** | Personal rooms/exits, notes and source confidence | TODO | — |
| **S09C.15 Metadata** | Optional GMCP/CHARSET/NAWS and mapping hints | TODO | — |
| **S09C.16 Autowalk** | Opt-in one-step navigation and accessible route list | TODO | — |
| **S09C.17 Live HUD** | Pinned per-profile prompt/vitals/exits bar using real scoped native fields or external fallback | TODO | — |
| **S09C.18 Native mini map** | Render authorized room/exits from host topology, preserve client notes, handle unknown/dynamic paths | TODO | — |

## S10 — Visual command editor

**Spec:** [S10](05-sprints/specs/S10.md) · **Requires:** S03,S05,S09

**Proof:** Visual command editor reuses native gameplay command service. First-playable S09C.5 is available for user tests.


**Checkpoints:** User tests after S10.2 (edit Blueprint), S10.8 (run new command from creator UI) and S10.9 (publish and use command in the real Player Client).

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S10.1 Inspector** | Schema-driven component editor with local data API | TODO | — |
| **S10.2 Blueprints** | Reusable templates and overrides with searchable data catalog | TODO | — |
| **S10.3 Theme reuse** | S09 graph-paper tokens | TODO | — |
| **S10.4 Command form** | No-code command name/help/action | TODO | — |
| **S10.5 Arguments UI** | Typed param/switch/multiline controls | TODO | — |
| **S10.6 Access UI** | Scope/role/quest rule builder | TODO | — |
| **S10.7 Alias/help view** | Conflict analysis and generated usage | TODO | — |
| **S10.8 Real test UI** | Use native command harness in editor | TODO | — |
| **S10.9 Command publish** | Versioned release validation | TODO | — |
| **S10.10 Record explorer** | Fast filters, server paging, stable identifiers and relationships across thousands of entities | TODO | — |
| **S10.11 Safe data editing** | Inspector CRUD, changes preview, conflict feedback and reversible draft edit via existing authority | TODO | — |
| **S10.12 Bulk data operations** | Scoped selection, where-used, batch previews/validation, safe deletion and progress feedback | TODO | — |
| **S10.13 Prompt designer** | No-code Host/Creator prompt and resource/status widget bindings, presets and preview | TODO | — |
| **S10.14 Map presentation settings** | Publish region/map icon defaults, discoverability and safe map projection policies | TODO | — |

## S06 — World systems

**Spec:** [S06](05-sprints/specs/S06.md) · **Requires:** S05, S08.7, S09C.5

**Proof:** Real Player Client interaction is required to verify actual event gameplay; engine-only tests alone are insufficient.


**Checkpoints:** User tests after S06.1 (trigger regional event) and S06.3 (spawn/conditional world interaction).

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S06.1 World event state** | Regional/world event definitions and lifecycle | TODO | — |
| **S06.2 Spawner** | Timed/entity spawning and despawning | TODO | — |
| **S06.3 World interaction** | Conditional world systems and environmental effects | TODO | — |

## S06Q — Quests

**Spec:** [S06Q](05-sprints/specs/S06Q.md) · **Requires:** S03–S05, S08.7, S09C.5

**Proof:** Player-connected quest acceptance, dialogue, reward and observer tests are required in addition to native unit tests.


**Checkpoints:** User tests after S06Q.3 (accept/progress quest through dialogue) and S06Q.5 (reward plus restart persistence).

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S06Q.1 Quest state** | Per-actor quest attempts, scope and eligibility | TODO | — |
| **S06Q.2 Objective credit** | Evidence-based objective types and chain prerequisites | TODO | — |
| **S06Q.3 Dialogue stages** | Validated dialogue choices, sessions and quiz | TODO | — |
| **S06Q.4 Rewards/phasing** | Atomic claim, bonus roll and phased NPC | TODO | — |
| **S06Q.5 Quest recovery** | Persist and resume quest/session after restart | TODO | — |

## S07 — Transit

**Spec:** [S07](05-sprints/specs/S07.md) · **Requires:** S04, S06, S09C.5

**Proof:** Board, travel and exit from a real Player Client; mocked command traces cannot close gameplay acceptance.


**Checkpoints:** User tests after S07.2 (ride train within nested rooms) and S07.3 (dock and disembark only when exits are available).

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S07.1 Transit route** | Route progression with persistent train state | TODO | — |
| **S07.2 Moving interiors** | Nested carriage rooms and their passengers/items | TODO | — |
| **S07.3 Dynamic exits** | Dock-time door to station, closed en route | TODO | — |

## S11 — C# and graphs

**Spec:** [S11](05-sprints/specs/S11.md) · **Requires:** S05,S08,S09C.5,S10

**Proof:** C# and graph runtime must execute inside real playable host/client integration.


**Checkpoints:** After S11.5, test real compiled C# through ECS authority; after S11.10, code/graph parity; after S11.12, two-player scripted gameplay.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S11.1 SDK build** | C#14/.NET10 SDK compile | TODO | — |
| **S11.2 IPC generation** | C++ and C# Protobuf codecs | TODO | — |
| **S11.3 Hook manifest** | Exact catalog type/mode checks | TODO | — |
| **S11.6 Worker start** | Load host-published hashed DLL | TODO | — |
| **S11.4 Command binding** | Host command to C# handler | TODO | — |
| **S11.5 ECS effects** | Revalidate and commit worker plan | TODO | — |
| **S11.7 Worker failure** | Timeout and crash recovery | TODO | — |
| **S11.8 Persistent fields** | Validated ECS/state slot overrides | TODO | — |
| **S11.9 Graph compile** | Typed visual node plan | TODO | — |
| **S11.10 Graph parity** | Same native effect API for code/graph | TODO | — |
| **S11.11 Release activation** | Stop/edit/build/publish/restart | TODO | — |
| **S11.12 Two-player demo** | Midnight Express gameplay | TODO | — |

## S12 — World-system editing

**Spec:** [S12](05-sprints/specs/S12.md) · **Requires:** S06,S07,S09,S10,S11

**Proof:** The visual authoring test must result in playable world-system output.


**Checkpoints:** User tests after S12.2 (author and play a world event) and S12.4 (published transit/narration).

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S12.1 Spawner editor** | Visual configure/validate spawner and condition graph | TODO | — |
| **S12.2 World event authoring** | Visual weather/event transitions and regional scope | TODO | — |
| **S12.3 Transit authoring** | Route/train/doors authoring graph using shared canvas | TODO | — |
| **S12.4 Narration authoring** | Observer template and audience rule editor | TODO | — |

## S12Q — Quest editing

**Spec:** [S12Q](05-sprints/specs/S12Q.md) · **Requires:** S06Q,S09,S10,S11

**Proof:** Verify no-code quests through Player Client, not only an editor-only graph preview.


**Checkpoints:** User tests after S12Q.2 (edit dialogue) and S12Q.5 (publish and play a complete quest).

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S12Q.1 Quest authoring** | Build no-code objective definitions and prerequisites | TODO | — |
| **S12Q.2 Dialogue graph** | Create all documented dialogue stages with choices | TODO | — |
| **S12Q.3 Rewards/eligibility UI** | Configure rewards, phase/party/instance conditions | TODO | — |
| **S12Q.4 Graph/script binding** | Attach typed C# handler to quest graph and test | TODO | — |
| **S12Q.5 Complete creator workflow** | Build, validate and publish full Midnight Express from UI | TODO | — |

## S13 — Self-hosting

**Spec:** [S13](05-sprints/specs/S13.md) · **Requires:** S03,S08,S09C,S11

**Proof:** E3 public/creator hosting: host startup, recovery, external joins and operations. Different from S08 loopback developer host.


**Checkpoints:** Test GUI/headless local release startup after S13.4, recovery after S13.6; **E3** only after S13.16 verifies real remote joins and protective host operations.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S13.1 Hosting and database lease** | Enforce one active host/project database writer, local-only store handles and runtime ownership | TODO | — |
| **S13.5 Storage and host preflight** | Automatically open/check local database and validate scripts, schema, permissions and limits before player port opens | TODO | — |
| **S13.2 GUI hosting** | Start a validated immutable release from Host workspace | TODO | — |
| **S13.3 Background host navigation** | Keep host A running when switching to Create, Play or Splash; guarded stop | TODO | — |
| **S13.4 Headless hosting** | Start same release using CLI under identical single-host rule | TODO | — |
| **S13.6 Database and world recovery** | Restore ECS, quests, posts, timers and outbox; detect corrupt storage without silent rollback | TODO | — |
| **S13.7 Secure transport** | Configure server TLS and browser Origin restrictions where appropriate | TODO | — |
| **S13.8 Proxy and firewall** | Implement trusted proxy policy and connectivity diagnostics | TODO | — |
| **S13.9 Traffic metrics** | Expose bounded rate, queue, rejection and latency status | TODO | — |
| **S13.10 Moderation controls** | Provide role-checked kick/ban and protective rate settings | TODO | — |
| **S13.11 Backups** | Optional manual/scheduled consistent database backups, manifest validation and in-app selection | TODO | — |
| **S13.12 Release rollback** | Restore selected verified backup or prior compatible release via staging, safety snapshot and failure rollback | TODO | — |
| **S13.13 Host onboarding** | Guide self-hosting, friend connection and playing from independent Client | TODO | — |
| **S13.14 Backup preferences UI** | Opt-in manual/scheduled backup, destinations, retention and verification status | TODO | — |
| **S13.15 In-app restore UX** | Choose verified backup; restore as copy or staged replacement with consent and failure fallback | TODO | — |
| **S13.16 Database operations UI** | Accessible database health, storage usage, maintenance and actionable recovery errors | TODO | — |
| **S13.17 Presentation publish compatibility** | Host publishes valid prompt/map schemas with restart/reconnect recovery and UI preview | TODO | — |

## S14 — Release audit

**Spec:** [S14](05-sprints/specs/S14.md) · **Requires:** All sprints

**Proof:** Final security/accessibility/performance on real supported configurations.


**Checkpoints:** Test supported platforms and accessibility, then security/performance; finish with clean install → host → play → save → restore.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S14.1 Platform** | Target OS client/host checks | TODO | — |
| **S14.2 Accessibility** | Keyboard/touch/contrast/readers | TODO | — |
| **S14.3 Parser fuzz** | Malformed and Unicode payloads | TODO | — |
| **S14.4 Flood fairness** | Connection+RP overload | TODO | — |
| **S14.5 Privacy** | Log and phase/observer audit | TODO | — |
| **S14.6 Worker sandbox** | Crash/isolation negative cases | TODO | — |
| **S14.7 Performance** | World+command+RP fanout benchmark | TODO | — |
| **S14.8 Release** | Clean install, host, save, restore | TODO | — |
| **S14.9 Storage disaster tests** | Cross-platform fresh bootstrap, privacy, large-data pagination, corruption/migration, active backup and restore-failure audits | TODO | — |
| **S14.10 Prompt/map safety audit** | Test hidden exits, status permissions, stale reconnects, moving trains, 10k-room pagination, accessibility | TODO | — |

## Phase evidence
When a phase is DONE, its Evidence cell links the **Builder change, the verification chosen by Lead for that phase, and the independent Auditor PASS**. Add a user exercise when applicable, not as a universal requirement. Use [Sprint History](SPRINT-HISTORY.md) for longer discussion, never duplicate phase status in separate files. A 4–5 hour usage reset is a scheduling constraint, not a technical deliverable: size work so multiple complete phases can ordinarily be handled per session; split unexpectedly large phases before implementation.
