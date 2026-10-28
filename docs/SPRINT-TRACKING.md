# MudMaker Sprint Tracker

**Canonical repo-local tracker** · Each sprint has **one detailed specification** under [specs](05-sprints/specs/INDEX.md); the tracker below owns all status and evidence. Phases are small, outcome-oriented deliverables. The Lead defines verification and scoped audit instructions during dispatch; no mandatory hands-on exercise or predetermined negative test per phase. `TODO` does **not** mean implemented.

**Current:** S00 (active documentation architecture). S00.1–S00.3 have source drafts ready for **independent documentation review**, not yet DONE. S00.4 handoff remains in progress; no fictional S00 user-app tests. All implementation phases are planned. Research is completed by the owner/documentation work **before** dispatch; missing research/ADR blocks the phase, never becomes a Builder/Auditor investigation.

## Sprint overview

| Sprint | Focus | Verified | Prerequisite | Status |
|---|---|---:|---|---|
| [S00 spec](05-sprints/specs/S00.md) | Documentation baseline | **0/4** | — | ACTIVE |
| [S01 spec](05-sprints/specs/S01.md) | Native decisions | **0/5** | S00 + owner ADRs | PLANNED |
| [S02 spec](05-sprints/specs/S02.md) | ECS foundation | **0/7** | S01 | PLANNED |
| [S03 spec](05-sprints/specs/S03.md) | Assets and persistence | **0/8** | S02 | PLANNED |
| [S04 spec](05-sprints/specs/S04.md) | Spatial containment | **0/6** | S02,S03 | PLANNED |
| [S05 spec](05-sprints/specs/S05.md) | Command runtime | **0/10** | S03,S04 | PLANNED |
| [S06 spec](05-sprints/specs/S06.md) | World systems | **0/3** | S05 | PLANNED |
| [S06Q spec](05-sprints/specs/S06Q.md) | Quests | **0/5** | S03–S05 | PLANNED |
| [S07 spec](05-sprints/specs/S07.md) | Transit | **0/3** | S04,S06 | PLANNED |
| [S08 spec](05-sprints/specs/S08.md) | Remote player input | **0/12** | S03,S05 | PLANNED |
| [S09 spec](05-sprints/specs/S09.md) | Editor/shared UI foundation | **0/10** | S03 | PLANNED |
| [S09C spec](05-sprints/specs/S09C.md) | Standalone Player Client | **0/15** | S08,S09.1–S09.4 | PLANNED |
| [S10 spec](05-sprints/specs/S10.md) | Visual command editor | **0/9** | S03,S05,S09 | PLANNED |
| [S11 spec](05-sprints/specs/S11.md) | C# and graphs | **0/12** | S05,S08,S10 | PLANNED |
| [S12 spec](05-sprints/specs/S12.md) | World-system editing | **0/4** | S06,S07,S09–S11 | PLANNED |
| [S12Q spec](05-sprints/specs/S12Q.md) | Quest editing | **0/5** | S06Q,S09–S11 | PLANNED |
| [S13 spec](05-sprints/specs/S13.md) | Self-hosting | **0/13** | S03,S08,S09C,S11 | PLANNED |
| [S14 spec](05-sprints/specs/S14.md) | Release audit | **0/8** | S05–S13 incl. S09C | PLANNED |

## Agent operating rule
For implementation phases, the Lead reads the [matching sprint spec](05-sprints/specs/INDEX.md) and only applicable contracts, chooses the specific Builder scope, relevant test/verification method, and independent Auditor scope. **A user-checkable milestone is encouraged when naturally available—not required for every phase.** The Builder reports actual results; the Auditor independently evaluates that dispatched scope against contracts. `TODO → BUILD → AUDIT → DONE` only after the required evidence and independent PASS are recorded. `BLOCKED` if owner research/decisions are missing. No compulsory negative test, demo or whole-suite run for every phase; the Lead decides proportionate verification and authorizes suite checks at sprint close. Never invent results.

**Input classification:** authenticated message kind determines command vs post, **never text length**. `SubmitText` may contain one word; a long moderator command uses an authorized CommandText/InvokeAction grammar. [Input contract](03-contracts/client-input-v1/INDEX.md).

## S00 — Research, design contracts and agent-ready documentation

**Sprint spec:** [S00.md](05-sprints/specs/S00.md) · **Prerequisite:** none · **S00 is document review, not implementation testing.** Review scope and approval are selected independently by the Lead. S00 records owner research, settled design, unresolved ADRs and link/consistency verification only.

| Phase | Document deliverable | Status | Evidence |
|---|---|---|---|
| **S00.1 Authority & indexed contracts** | Indexed ECS, scripting, input and UI decisions with exact agent read paths | AUDIT | [Technical index](INDEX.md), [UI index](03-contracts/ui-ux/INDEX.md), [UI catalog](../contracts/ui/v1/INDEX.md); independent docs review pending |
| **S00.2 Workspace/security boundaries** | Separate Editor, Player Client, Host; safe input and concurrent host/view lifetimes | AUDIT | [Ownership](03-contracts/ui-ux/01-workspaces-and-ownership.md), [navigation](03-contracts/ui-ux/00-launch-and-workspace-navigation.md), [remote input](03-contracts/client-input-v1/01-ingress-threat-boundary.md); review pending |
| **S00.3 UI/UX architecture & decision gates** | Central ThemeManager, cataloged controls, Editor/Client workflows, sourced client research and unresolved platform ADRs | AUDIT | [UI contract](03-contracts/ui-ux/INDEX.md), [controls](../contracts/ui/v1/INDEX.md), [client research](03-contracts/ui-ux/09-client-research.md), [open decisions](07-decisions/OPEN_DECISIONS.md); review pending |
| **S00.4 Implementable sprint handoffs** | One tracker, one spec/sprint and phase dependency map with no agent research tasks | BUILD | [Sprint specs](05-sprints/specs/INDEX.md), [agent rules](../CLAUDE.md), [tracker](SPRINT-TRACKING.md); final handoff check pending |

**S00 is active; 0/4 independently closed.** Drafting a contract permits `AUDIT`, not `DONE`; S00 requires an independent document review, not an imaginary app demo. If review finds ambiguity, keep phase open until the owner resolves it. After S00, real Builder/Auditor milestones include actual user-testable builds.

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

**Implementation spec:** [S05.md](05-sprints/specs/S05.md) · **Prerequisites:** S03,S04

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

## S06 — World systems

**Implementation spec:** [S06.md](05-sprints/specs/S06.md) · **Prerequisites:** S05

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S06.1 World event state** | Regional/world event definitions and lifecycle | TODO | — |
| **S06.2 Spawner** | Timed/entity spawning and despawning | TODO | — |
| **S06.3 World interaction** | Conditional world systems and environmental effects | TODO | — |

## S06Q — Quests

**Implementation spec:** [S06Q.md](05-sprints/specs/S06Q.md) · **Prerequisites:** S03–S05

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S06Q.1 Quest state** | Per-actor quest attempts, scope and eligibility | TODO | — |
| **S06Q.2 Objective credit** | Evidence-based objective types and chain prerequisites | TODO | — |
| **S06Q.3 Dialogue stages** | Validated dialogue choices, sessions and quiz | TODO | — |
| **S06Q.4 Rewards/phasing** | Atomic claim, bonus roll and phased NPC | TODO | — |
| **S06Q.5 Quest recovery** | Persist and resume quest/session after restart | TODO | — |

## S07 — Transit

**Implementation spec:** [S07.md](05-sprints/specs/S07.md) · **Prerequisites:** S04,S06

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S07.1 Transit route** | Route progression with persistent train state | TODO | — |
| **S07.2 Moving interiors** | Nested carriage rooms and their passengers/items | TODO | — |
| **S07.3 Dynamic exits** | Dock-time door to station, closed en route | TODO | — |

## S08 — Remote player input

**Implementation spec:** [S08.md](05-sprints/specs/S08.md) · **Prerequisites:** S03,S05

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S08.1 Frame admission** | TLS/Origin/handshake and message caps | TODO | — |
| **S08.2 Session identity** | Authenticate actor and expiry | TODO | — |
| **S08.3 Typed decoding** | Strict protocol and UTF-8 validation | TODO | — |
| **S08.4 Short posts** | Explicit SubmitText routing | TODO | — |
| **S08.5 Long posts** | Multiline RP with emoji | TODO | — |
| **S08.6 Descriptions** | Authorized persistent bio revision | TODO | — |
| **S08.7 Long commands** | Per-command typed long arguments | TODO | — |
| **S08.8 Rate limits** | Principal/action/byte budgets | TODO | — |
| **S08.9 Backpressure** | Session/world/output queue caps | TODO | — |
| **S08.10 Safe output** | GUI/terminal/log encoding | TODO | — |
| **S08.11 Visibility** | Per-actor audience filtering | TODO | — |
| **S08.12 Reconnect** | Resumable receipt and dedupe | TODO | — |

## S09 — Editor and shared UI foundation

**Implementation spec:** [S09.md](05-sprints/specs/S09.md) · **Prerequisites:** S03

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

## S09C — Standalone Player Client (native + external MUDs)

**Implementation spec:** [S09C.md](05-sprints/specs/S09C.md) · **Prerequisites:** S08 and S09.1–S09.4 (shared UI, native protocol)

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S09C.1 Player shell** | Build independent Play workspace with world tabs, transcript and composer | TODO | — |
| **S09C.2 World profiles** | Save server/character profiles, protocol selection and secure settings | TODO | — |
| **S09C.3 Telnet transport** | Connect to third-party MUDs using bounded text Telnet adapter | TODO | — |
| **S09C.4 Navigation retention** | Keep or disconnect Client connections when using Go To; retain drafts and unread output | TODO | — |
| **S09C.5 Text rendering** | Decode ANSI/UTF-8 safely into bounded terminal display spans | TODO | — |
| **S09C.6 MudMaker protocol** | Connect native Player Client to authenticated MudMaker game server | TODO | — |
| **S09C.7 Transcript tools** | Provide scrollback, copy/search, timestamps, wrapping and follow control | TODO | — |
| **S09C.8 Composer** | Add explicit input mode, multiline drafts, history, send and pending state | TODO | — |
| **S09C.9 Player appearance** | Use independent Client theme, font/ANSI mapping and persistence | TODO | — |
| **S09C.10 Layouts and shortcuts** | Save per-world docking, hotkeys and customizable buttons | TODO | — |
| **S09C.11 Aliases and triggers** | Create declarative local alias/highlight/routing rules without code | TODO | — |
| **S09C.12 Timers and safety** | Support bounded timers, approvals and local macro management | TODO | — |
| **S09C.13 Mini mapper** | Create private room/exit graph, manual notes and confidence indicators | TODO | — |
| **S09C.14 Structured metadata** | Decode optional GMCP, charset/window metadata and map hints | TODO | — |
| **S09C.15 Navigation tools** | Offer opt-in sequential pathing, stop controls and accessible map presentation | TODO | — |

## S10 — Visual command editor

**Implementation spec:** [S10.md](05-sprints/specs/S10.md) · **Prerequisites:** S03,S05,S09

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

**Implementation spec:** [S11.md](05-sprints/specs/S11.md) · **Prerequisites:** S05,S08,S10

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

**Implementation spec:** [S12.md](05-sprints/specs/S12.md) · **Prerequisites:** S06,S07,S09–S11

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S12.1 Spawner editor** | Visual configure/validate spawner and condition graph | TODO | — |
| **S12.2 World event authoring** | Visual weather/event transitions and regional scope | TODO | — |
| **S12.3 Transit authoring** | Route/train/doors authoring graph using shared canvas | TODO | — |
| **S12.4 Narration authoring** | Observer template and audience rule editor | TODO | — |

## S12Q — Quest editing

**Implementation spec:** [S12Q.md](05-sprints/specs/S12Q.md) · **Prerequisites:** S06Q,S09–S11

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| **S12Q.1 Quest authoring** | Build no-code objective definitions and prerequisites | TODO | — |
| **S12Q.2 Dialogue graph** | Create all documented dialogue stages with choices | TODO | — |
| **S12Q.3 Rewards/eligibility UI** | Configure rewards, phase/party/instance conditions | TODO | — |
| **S12Q.4 Graph/script binding** | Attach typed C# handler to quest graph and test | TODO | — |
| **S12Q.5 Complete creator workflow** | Build, validate and publish full Midnight Express from UI | TODO | — |

## S13 — Self-hosting

**Implementation spec:** [S13.md](05-sprints/specs/S13.md) · **Prerequisites:** S03,S08,S11

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

**Implementation spec:** [S14.md](05-sprints/specs/S14.md) · **Prerequisites:** S05–S13

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
