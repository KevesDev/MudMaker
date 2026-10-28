# MudMaker Sprint Tracker

**Canonical repo-native dashboard.** One tracker owns every status; [one focused spec per sprint](05-sprints/specs/INDEX.md) provides engineering contracts. Sprint IDs are stable; this file is arranged in **actual execution order**, which is not alphabetical/numeric. Each phase is small enough for scoped Builder → independent Auditor handoffs and, when possible, multiple phases per Claude usage window.

**Current:** S00 documentation review. S00.1–S00.5 are in AUDIT awaiting independent verification; **no S00 phase is DONE**. All implementation remains TODO. Missing research, implementation platform decisions and test oracles go to the owner **before** dispatch, not to Builder/Auditor.

## Evidence levels and first playable gate

| Level | Actual proof | Earliest checkpoint |
|---|---|---|
| **E1 — Native harness** | ECS, rooms, commands, persistence exercised by real focused tests; no graphical Player Client claimed | S02–S05 |
| **E2 — Local playable game** | Real Player Client connects to a running loopback world, moves through rooms, receives real authorized events | **S09C.5**, after S08.7 and S09.1–4 |
| **E3 — Creator/public host** | Owner safely starts a durable hosted world with remote joins and host-facing operational controls | S13, after input security, recovery and hosting prerequisites |

**Critical path:** S00 → S01 → S02 → S03 → S04 → S05 → S08.1–7 plus parallel S09.1–4 → **S09C.1–5 (FIRST PLAYABLE)** → S06/S06Q/S07 gameplay → Creator feature work → S13 public hosting → S14 release. S09's UI foundations can start after S03 and proceed alongside S04/S05. **Never represent E1 as E2 or E2 as E3.**

## Sprint overview — in actual work order

| Sprint | Focus | Verified | Depends on | Status |
|---|---|---:|---|---|
| [S00](#s00) | Documents and decisions | **0/5** | — | ACTIVE |
| [S01](#s01) | Architecture gates | **0/5** | S00 + owner ADRs | PLANNED |
| [S02](#s02) | Native ECS | **0/7** | S01 | PLANNED |
| [S03](#s03) | Assets and persistence | **0/8** | S02 | PLANNED |
| [S04](#s04) | Rooms and exits | **0/6** | S02,S03 | PLANNED |
| [S05](#s05) | Command harness | **0/10** | S03,S04 | PLANNED |
| [S09](#s09) | Shared UI foundation | **0/10** | S03 | PLANNED |
| [S08](#s08) | Loopback host and secure input | **0/14** | S03,S05 | PLANNED |
| [S09C](#s09c) | Playable client and toolkit | **0/16** | S08.7,S09.1–4 | PLANNED |
| [S06](#s06) | World events | **0/3** | S09C.5 | PLANNED |
| [S06Q](#s06q) | Quests | **0/5** | S09C.5 | PLANNED |
| [S07](#s07) | Transit | **0/3** | S06,S09C.5 | PLANNED |
| [S10](#s10) | Creator command/Blueprint UI | **0/9** | S05,S09 | PLANNED |
| [S11](#s11) | Scripts and graphs | **0/12** | S08,S09C.5,S10 | PLANNED |
| [S12](#s12) | World authoring | **0/4** | S06,S07,S11 | PLANNED |
| [S12Q](#s12q) | Quest authoring | **0/5** | S06Q,S11 | PLANNED |
| [S13](#s13) | Public hosting | **0/13** | S08,S09C,S11 | PLANNED |
| [S14](#s14) | Release audit | **0/8** | All preceding | PLANNED |

## Agent process
Lead selects one phase from this table and its one sprint spec. One Builder implements the bounded deliverable and runs approved focused checks; one different scoped Auditor reviews real implementation and evidence. `TODO → BUILD → AUDIT → DONE` only with independent PASS, not merely a documented proposal. Record test command, build commit, audit result and any real user demo in **Evidence**. No agent research tasks or broad test-suite loops. `BLOCKED` means the owner must resolve the missing decision. Full suite at sprint closure only by explicit Lead approval.

**Input is explicit:** command/action versus RP/description is identified by authenticated message kind, **never text length**.

## S00 — Research, design contracts and agent-ready documentation

**Sprint spec:** [S00.md](05-sprints/specs/S00.md) · **Prerequisite:** none · **S00 is document review, not implementation testing.** Review scope and approval are selected independently by the Lead. S00 records owner research, settled design, unresolved ADRs and link/consistency verification only.

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

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S01.1 ECS identities** | Finalize world+generation handle ADR | TODO | — |
| **S01.2 Writer model** | Finalize one authoritative writer | TODO | — |
| **S01.3 Persistence ADR** | Select transaction and outbox implementation | TODO | — |
| **S01.4 Wire ABI** | Freeze versioned SDK/proto rules | TODO | — |
| **S01.5 Native benchmark** | Baseline ECS hot-path under load | TODO | — |

## S02 — ECS foundation

**Implementation spec:** [S02.md](05-sprints/specs/S02.md) · **Prerequisites:** S01

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

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S03.1 Asset registry** | Versioned stable asset GUIDs | TODO | — |
| **S03.2 Asset serializer** | Typed asset data roundtrip | TODO | — |
| **S03.3 Layered overrides** | Default/instance/runtime property values | TODO | — |
| **S03.4 Scoped slots** | Persistent world/player state schema | TODO | — |
| **S03.5 World snapshot** | ECS and slot restore | TODO | — |
| **S03.6 Outbox ledger** | Durable onceKeys and committed events | TODO | — |
| **S03.7 Migration gate** | Schema revision and safe migration | TODO | — |
| **S03.8 Release manifest** | Immutable asset hashes and rollback | TODO | — |

## S04 — Spatial containment

**Implementation spec:** [S04.md](05-sprints/specs/S04.md) · **Prerequisites:** S02,S03

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S04.1 Parent containment** | Validated parent/child nesting | TODO | — |
| **S04.2 Room membership** | World/region rooms and occupants | TODO | — |
| **S04.3 Exit graph** | Directed typed exits | TODO | — |
| **S04.4 Exit access** | Door and lock conditions | TODO | — |
| **S04.5 Dynamic doors** | Dock-dependent exit activation | TODO | — |
| **S04.6 Visibility** | Per-observer target set | TODO | — |

## S05 — Command runtime

**Spec:** [S05](05-sprints/specs/S05.md) · **Requires:** S03,S04

**Proof:** E1 only: native command harness, not a playable MUD.

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

## S09 — Editor and shared UI foundation

**Spec:** [S09](05-sprints/specs/S09.md) · **Requires:** S03; S09.1–4 may proceed before S08

**Proof:** S09.1–4 enable first Player Client; later Editor work can proceed independently.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S09.1 UI primitives** | Implement shared accessible, themed UI primitives and typed action descriptors | TODO | — |
| **S09.2 Loading and splash** | Validate startup then display MudMaker name/version, Create, Play and Host | TODO | — |
| **S09.3 Workspace navigation** | Implement Go To menu and transition guard; retain Editor drafts across switches | TODO | — |
| **S09.4 ThemeManager** | Resolve independent Editor/Client themes from one shared token schema | TODO | — |
| **S09.5 Theme preferences** | Provide user themes, preview, import/export, persistence and safe fallback | TODO | — |
| **S09.6 Editor shell** | Implement Creator tabs, inspectors, focus handling and draft undo ownership | TODO | — |
| **S09.7 Graph paper** | Render reusable continuous dark minor/major grid with pan/zoom/snap | TODO | — |
| **S09.8 Map editing** | Add selectable/editable cells, rooms, exits and inspector/save integration | TODO | — |
| **S09.9 Responsive inputs** | Support tablet/pen/touch and keyboard workspace navigation | TODO | — |
| **S09.10 Control registration** | Bind implemented Editor widgets to UI catalog, action ownership and accessible states | TODO | — |

## S08 — Remote player input

**Spec:** [S08](05-sprints/specs/S08.md) · **Requires:** S03–S05, approved ingress and identity contracts

**E1→E2 bridge:** loopback developer host only; no public exposure or production hosting. S08.7 proves the engine can receive and reply to an authenticated test client.

| Phase | Small deliverable | Status | Evidence |
|---|---|---|---|
| **S08.1 Frame admission** | Bounded handshake, origin rules, framing and timeouts | TODO | — |
| **S08.2 Session identity** | Authenticate and bind actor; revoke stale sessions | TODO | — |
| **S08.3 Typed decoding** | Versioned envelope, strict UTF-8, explicit message kind | TODO | — |
| **S08.4 Local test host** | Boot actual world on loopback only for connected development testing | TODO | — |
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

## S09C — Standalone Player Client (native + external MUDs)

**Spec:** [S09C](05-sprints/specs/S09C.md) · **Requires:** S08.7 + S09.1–4

**E2 FIRST PLAYABLE is S09C.5:** genuine interactive client connected to real game host, not a simulated terminal. Public hosting and full protections are later milestones.

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

## S06 — World systems

**Spec:** [S06](05-sprints/specs/S06.md) · **Requires:** S05, S08.7, S09C.5

**Proof:** Real Player Client interaction is required to verify actual event gameplay; engine-only tests alone are insufficient.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S06.1 World event state** | Regional/world event definitions and lifecycle | TODO | — |
| **S06.2 Spawner** | Timed/entity spawning and despawning | TODO | — |
| **S06.3 World interaction** | Conditional world systems and environmental effects | TODO | — |

## S06Q — Quests

**Spec:** [S06Q](05-sprints/specs/S06Q.md) · **Requires:** S03–S05, S08.7, S09C.5

**Proof:** Player-connected quest acceptance, dialogue, reward and observer tests are required in addition to native unit tests.

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

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S07.1 Transit route** | Route progression with persistent train state | TODO | — |
| **S07.2 Moving interiors** | Nested carriage rooms and their passengers/items | TODO | — |
| **S07.3 Dynamic exits** | Dock-time door to station, closed en route | TODO | — |

## S10 — Visual command editor

**Spec:** [S10](05-sprints/specs/S10.md) · **Requires:** S03,S05,S09

**Proof:** Visual command editor reuses native gameplay command service. First-playable S09C.5 is available for user tests.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S10.1 Inspector** | Schema-driven component editor | TODO | — |
| **S10.2 Blueprints** | Reusable template and overrides | TODO | — |
| **S10.3 Theme reuse** | S09 graph-paper tokens | TODO | — |
| **S10.4 Command form** | No-code command name/help/action | TODO | — |
| **S10.5 Arguments UI** | Typed param/switch/multiline controls | TODO | — |
| **S10.6 Access UI** | Scope/role/quest rule builder | TODO | — |
| **S10.7 Alias/help view** | Conflict analysis and generated usage | TODO | — |
| **S10.8 Real test UI** | Use native command harness in editor | TODO | — |
| **S10.9 Command publish** | Versioned release validation | TODO | — |

## S11 — C# and graphs

**Spec:** [S11](05-sprints/specs/S11.md) · **Requires:** S05,S08,S09C.5,S10

**Proof:** C# and graph runtime must execute inside real playable host/client integration.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S11.1 SDK build** | C#14/.NET10 SDK compile | TODO | — |
| **S11.2 IPC generation** | C++ and C# Protobuf codecs | TODO | — |
| **S11.3 Hook manifest** | Exact catalog type/mode checks | TODO | — |
| **S11.4 Command binding** | Host command to C# handler | TODO | — |
| **S11.5 ECS effects** | Revalidate and commit worker plan | TODO | — |
| **S11.6 Worker start** | Load host-published hashed DLL | TODO | — |
| **S11.7 Worker failure** | Timeout and crash recovery | TODO | — |
| **S11.8 Persistent fields** | Validated ECS/state slot overrides | TODO | — |
| **S11.9 Graph compile** | Typed visual node plan | TODO | — |
| **S11.10 Graph parity** | Same native effect API for code/graph | TODO | — |
| **S11.11 Release activation** | Stop/edit/build/publish/restart | TODO | — |
| **S11.12 Two-player demo** | Midnight Express gameplay | TODO | — |

## S12 — World-system editing

**Spec:** [S12](05-sprints/specs/S12.md) · **Requires:** S06,S07,S09,S10,S11

**Proof:** The visual authoring test must result in playable world-system output.

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S12.1 Spawner editor** | Visual configure/validate spawner and condition graph | TODO | — |
| **S12.2 World event authoring** | Visual weather/event transitions and regional scope | TODO | — |
| **S12.3 Transit authoring** | Route/train/doors authoring graph using shared canvas | TODO | — |
| **S12.4 Narration authoring** | Observer template and audience rule editor | TODO | — |

## S12Q — Quest editing

**Spec:** [S12Q](05-sprints/specs/S12Q.md) · **Requires:** S06Q,S09,S10,S11

**Proof:** Verify no-code quests through Player Client, not only an editor-only graph preview.

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

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S13.1 Hosting lease** | Enforce one active hosted project per application supervisor | TODO | — |
| **S13.2 GUI hosting** | Start a validated immutable release from Host workspace | TODO | — |
| **S13.3 Background host navigation** | Keep host A running when switching to Create, Play or Splash; guarded stop | TODO | — |
| **S13.4 Headless hosting** | Start same release using CLI under identical single-host rule | TODO | — |
| **S13.5 Startup preflight** | Validate scripts, command assets, schema and limits before player port opens | TODO | — |
| **S13.6 State recovery** | Restore ECS, quests, posts, timers and outbox after restart | TODO | — |
| **S13.7 Secure transport** | Configure server TLS and browser Origin restrictions where appropriate | TODO | — |
| **S13.8 Proxy and firewall** | Implement trusted proxy policy and connectivity diagnostics | TODO | — |
| **S13.9 Traffic metrics** | Expose bounded rate, queue, rejection and latency status | TODO | — |
| **S13.10 Moderation controls** | Provide role-checked kick/ban and protective rate settings | TODO | — |
| **S13.11 Backups** | Save and restore compatible durable world snapshots | TODO | — |
| **S13.12 Release rollback** | Select prior validated immutable release safely | TODO | — |
| **S13.13 Host onboarding** | Guide self-hosting, friend connection and playing from independent Client | TODO | — |

## S14 — Release audit

**Spec:** [S14](05-sprints/specs/S14.md) · **Requires:** All sprints

**Proof:** Final security/accessibility/performance on real supported configurations.

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

## Phase evidence
When a phase is DONE, its Evidence cell links the **Builder change, the verification chosen by Lead for that phase, and the independent Auditor PASS**. Add a user exercise when applicable, not as a universal requirement. Use [Sprint History](SPRINT-HISTORY.md) for longer discussion, never duplicate phase status in separate files. A 4–5 hour usage reset is a scheduling constraint, not a technical deliverable: size work so multiple complete phases can ordinarily be handled per session; split unexpectedly large phases before implementation.
