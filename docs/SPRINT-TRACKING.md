# MudMaker Sprint Tracker

**Canonical repo-local tracker** · Each sprint has **one detailed specification** under [specs](05-sprints/specs/INDEX.md); the tracker below owns all status and evidence. Phases are purposely **small enough for multiple Builder+Auditor cycles in a typical Claude usage window**, with frequent creator-testable outputs. No giant sprint-sized assignments. `TODO` does **not** mean implemented.

**Current:** S00 (documentation in review); next S00.1 (not dispatched). All remaining work is planned. Research is completed by the owner/documentation work **before** dispatch; missing research/ADR blocks the phase, never becomes a Builder/Auditor investigation.

## Sprint overview

| Sprint | Focus | Verified | Prerequisite | Status |
|---|---|---:|---|---|
| [S00](#s00) | Documentation baseline | **0/4** | — | REVIEW |
| [S01](#s01) | Native decisions | **0/5** | S00 + owner ADRs | PLANNED |
| [S02](#s02) | ECS foundation | **0/7** | S01 | PLANNED |
| [S03](#s03) | Assets and persistence | **0/8** | S02 | PLANNED |
| [S04](#s04) | Spatial containment | **0/6** | S02,S03 | PLANNED |
| [S05](#s05) | Command runtime | **0/10** | S03,S04 | PLANNED |
| [S06](#s06) | World systems | **0/3** | S05 | PLANNED |
| [S06Q](#s06q) | Quests | **0/5** | S03–S05 | PLANNED |
| [S07](#s07) | Transit | **0/3** | S04,S06 | PLANNED |
| [S08](#s08) | Remote player input | **0/12** | S03,S05 | PLANNED |
| [S09](#s09) | Editor and themes | **0/6** | S03 | PLANNED |
| [S10](#s10) | Visual command editor | **0/9** | S03,S05,S09 | PLANNED |
| [S11](#s11) | C# and graphs | **0/12** | S05,S08,S10 | PLANNED |
| [S12](#s12) | World-system editing | **0/4** | S06,S07,S09–S11 | PLANNED |
| [S12Q](#s12q) | Quest editing | **0/5** | S06Q,S09–S11 | PLANNED |
| [S13](#s13) | Self-hosting | **0/11** | S03,S08,S11 | PLANNED |
| [S14](#s14) | Release audit | **0/8** | S05–S13 | PLANNED |

## Agent operating rule
For ONE phase, Lead reads the [matching sprint spec](05-sprints/specs/INDEX.md) and only its declared authoritative contract/file ranges. Builder writes that phase's code, runs targeted tests and provides **a usable demo/test harness**. One different Auditor independently verifies the phase and a negative scenario. Mark `TODO → BUILD → AUDIT → DONE` only after Builder commit, exact test output, user check and Auditor PASS are linked in **Evidence**. `BLOCKED` when no decision/test oracle exists; request owner research rather than looking it up. Full-suite audit only at sprint close when authorized. Do not invent tests or statuses.

**Input classification:** authenticated message kind determines command vs post, **never text length**. `SubmitText` may contain one word; a long moderator command uses an authorized CommandText/InvokeAction grammar. [Input contract](03-contracts/client-input-v1/INDEX.md).

## S00 — Documentation baseline

**Implementation spec:** [S00.md](05-sprints/specs/S00.md) · **Prerequisites:** —

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S00.1 Docs lookup** | Index exact source documents | Find input, ECS and scripting reference | Links resolve | TODO | — |
| **S00.2 Host boundary** | Document editor/host/client ownership | Trace a remote command to host | No player-supplied executable code | TODO | — |
| **S00.3 Decision gates** | List actual undecided prerequisites | Identify next blocked phase | No invented approval | TODO | — |
| **S00.4 Agent handoff** | One-phase builder/auditor instructions | Dispatch scope readable locally | No agent research assignment | TODO | — |

## S01 — Native decisions

**Implementation spec:** [S01.md](05-sprints/specs/S01.md) · **Prerequisites:** S00 + owner ADRs

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S01.1 ECS identities** | Finalize world+generation handle ADR | Build identity fixture | Stale IDs fail | TODO | — |
| **S01.2 Writer model** | Finalize one authoritative writer | Trace two ordered actions | No unsafe parallel mutations | TODO | — |
| **S01.3 Persistence ADR** | Select transaction and outbox implementation | Replay one crash scenario | Atomic durability proven | TODO | — |
| **S01.4 Wire ABI** | Freeze versioned SDK/proto rules | Generate test message roundtrip | Wrong versions rejected | TODO | — |
| **S01.5 Native benchmark** | Baseline ECS hot-path under load | Repeat hardware fixture | Numbers sourced | TODO | — |

## S02 — ECS foundation

**Implementation spec:** [S02.md](05-sprints/specs/S02.md) · **Prerequisites:** S01

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S02.1 Identity allocator** | World scoped entity generations | Create/delete/recreate | Stale ID rejected | TODO | — |
| **S02.2 Component schema** | Typed component registry | Add light component | Invalid field blocked | TODO | — |
| **S02.3 Mutation API** | Writer-only field mutation | Toggle door property | No raw write bypass | TODO | — |
| **S02.4 Query API** | Bounded entity query | Find room occupants | Invalid iteration fails | TODO | — |
| **S02.5 Revision guard** | ExpectedVersion write checks | Competing updates conflict | No lost updates | TODO | — |
| **S02.6 Event commit** | Atomic state plus domain event | Observe one event on change | Rollback emits nothing | TODO | — |
| **S02.7 Core harness** | Lifecycle tests and metrics | Run small ECS sample | Real regression checks | TODO | — |

## S03 — Assets and persistence

**Implementation spec:** [S03.md](05-sprints/specs/S03.md) · **Prerequisites:** S02

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S03.1 Asset registry** | Versioned stable asset GUIDs | Rename without breaking links | Dangling refs blocked | TODO | — |
| **S03.2 Asset serializer** | Typed asset data roundtrip | Save/reopen Blueprint | No type drift | TODO | — |
| **S03.3 Layered overrides** | Default/instance/runtime property values | Set then clear lamp override | Correct precedence | TODO | — |
| **S03.4 Scoped slots** | Persistent world/player state schema | Write separate values | No cross-actor leak | TODO | — |
| **S03.5 World snapshot** | ECS and slot restore | Restart test world | No lost values | TODO | — |
| **S03.6 Outbox ledger** | Durable onceKeys and committed events | Crash and retry action | No duplicate | TODO | — |
| **S03.7 Migration gate** | Schema revision and safe migration | Load older schema | Failure preserves data | TODO | — |
| **S03.8 Release manifest** | Immutable asset hashes and rollback | Publish two releases | Tampered hash rejected | TODO | — |

## S04 — Spatial containment

**Implementation spec:** [S04.md](05-sprints/specs/S04.md) · **Prerequisites:** S02,S03

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S04.1 Parent containment** | Validated parent/child nesting | Put item in chest | No cycle | TODO | — |
| **S04.2 Room membership** | World/region rooms and occupants | Move character between rooms | No cross-world | TODO | — |
| **S04.3 Exit graph** | Directed typed exits | Make one-way route | No implicit return | TODO | — |
| **S04.4 Exit access** | Door and lock conditions | Try locked passage | No unauthorized move | TODO | — |
| **S04.5 Dynamic doors** | Dock-dependent exit activation | Board train only when docked | No stale exit | TODO | — |
| **S04.6 Visibility** | Per-observer target set | Two players see different content | No phase leak | TODO | — |

## S05 — Command runtime

**Implementation spec:** [S05.md](05-sprints/specs/S05.md) · **Prerequisites:** S03,S04

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S05.1 Command assets** | Typed definitions + native defaults | Run look and say | Unknown action rejected | TODO | — |
| **S05.2 Alias matcher** | Longest complete word alias | Use look through window | No prefix/confusable shadow | TODO | — |
| **S05.3 Typed grammar** | Quotes, switches, lhs=rhs | Give "silver key" = "Joe Smith" | Bad token rejected | TODO | — |
| **S05.4 Long arguments** | Multiline, schema-bounded command data | Use long builder command | No length-based type switch | TODO | — |
| **S05.5 Dynamic cmdsets** | Session/actor/room/item/exit scopes | Use lantern after pickup | No stale cache | TODO | — |
| **S05.6 Access rules** | Typed permission predicates | Quest-gated action appears | No auth bypass | TODO | — |
| **S05.7 Ambiguity** | Expiring visible-target selection | Pick second key | No hidden or expired token | TODO | — |
| **S05.8 Single executor** | GUI action and text share validation | Move by both interfaces | Same authorization | TODO | — |
| **S05.9 Event commit** | Idempotent command/outbox | Retry give once | No duplicate write | TODO | — |
| **S05.10 Narration** | Observer-projected committed output | Hear bell in right room | No private leak | TODO | — |

## S06 — World systems

**Implementation spec:** [S06.md](05-sprints/specs/S06.md) · **Prerequisites:** S05

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S06.1 World event state** | Regional/world event definitions and lifecycle | Start, stop, restart weather event in test world | Auditor checks scoped and idempotent state | TODO | — |
| **S06.2 Spawner** | Timed/entity spawning and despawning | Observe spawn rate/cap and restart | Auditor tests duplicates and world isolation | TODO | — |
| **S06.3 World interaction** | Conditional world systems and environmental effects | Trigger weather/region events in player test | Auditor checks access and persistence | TODO | — |

## S06Q — Quests

**Implementation spec:** [S06Q.md](05-sprints/specs/S06Q.md) · **Prerequisites:** S03–S05

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S06Q.1 Quest state** | Per-actor quest attempts, scope and eligibility | Accept Bob quest with Alice but not Pat | Auditor checks wrong actor and preaccept loopholes | TODO | — |
| **S06Q.2 Objective credit** | Evidence-based objective types and chain prerequisites | Finish Bob, start Joe, board train | Auditor checks duplicates and sequence | TODO | — |
| **S06Q.3 Dialogue stages** | Validated dialogue choices, sessions and quiz | Choose branch; quiz correctness server-side | Auditor checks answer spoofing, stale session | TODO | — |
| **S06Q.4 Rewards/phasing** | Atomic claim, bonus roll and phased NPC | Alice sees Joe and gets reward; Pat does not | Auditor checks one-time reward and hidden info | TODO | — |
| **S06Q.5 Quest recovery** | Persist and resume quest/session after restart | Close/relaunch world midquest | Auditor checks missing/duplicate progress | TODO | — |

## S07 — Transit

**Implementation spec:** [S07.md](05-sprints/specs/S07.md) · **Prerequisites:** S04,S06

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S07.1 Transit route** | Route progression with persistent train state | Train departs station and arrives visibly | Auditor checks clock/route timing and restore | TODO | — |
| **S07.2 Moving interiors** | Nested carriage rooms and their passengers/items | Walk between cars during transit | Auditor tests parent changes and teleport | TODO | — |
| **S07.3 Dynamic exits** | Dock-time door to station, closed en route | Board/disembark only when docked | Auditor checks invalid dock and stale references | TODO | — |

## S08 — Remote player input

**Implementation spec:** [S08.md](05-sprints/specs/S08.md) · **Prerequisites:** S03,S05

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S08.1 Frame admission** | TLS/Origin/handshake and message caps | Valid/oversize client connections | No resource preauth flood | TODO | — |
| **S08.2 Session identity** | Authenticate actor and expiry | Two separate clients connect | No actor spoof | TODO | — |
| **S08.3 Typed decoding** | Strict protocol and UTF-8 validation | Command UI and text both work | Unknown kind/invalid enum rejected | TODO | — |
| **S08.4 Short posts** | Explicit SubmitText routing | Post "hi" as RP | Never becomes command | TODO | — |
| **S08.5 Long posts** | Multiline RP with emoji | Save long RP draft | No embedded commands | TODO | — |
| **S08.6 Descriptions** | Authorized persistent bio revision | Edit and reopen description | No stale overwrite | TODO | — |
| **S08.7 Long commands** | Per-command typed long arguments | Run long builder action | Never becomes RP | TODO | — |
| **S08.8 Rate limits** | Principal/action/byte budgets | Flooder cannot starve player | Bounded CPU and memory | TODO | — |
| **S08.9 Backpressure** | Session/world/output queue caps | Slow reader gets resync | No accepted work silently lost | TODO | — |
| **S08.10 Safe output** | GUI/terminal/log encoding | Display HTML and ANSI literal | No XSS/control/log injection | TODO | — |
| **S08.11 Visibility** | Per-actor audience filtering | Hidden Joe invisible to Pat | No guessable target | TODO | — |
| **S08.12 Reconnect** | Resumable receipt and dedupe | Retry post after disconnect | No duplicate post | TODO | — |

## S09 — Editor and themes

**Implementation spec:** [S09.md](05-sprints/specs/S09.md) · **Prerequisites:** S03

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S09.1 Central ThemeManager** | Typed theme schema, one token resolver and shared visual harness | Change typography/color token once; several panes update | Auditor checks no hardcoded consumer styles | TODO | — |
| **S09.2 Theme customization** | Dark default plus save/import/export/preview/rollback | Make custom theme, restart editor and reopen it | Auditor tests malformed imports, persistence, contrast | TODO | — |
| **S09.3 Graph-paper renderer** | Continuous minor/major square grid lines, pan/zoom/snap | Pan/zoom dark graph paper; never dots | Auditor tests transforms, clipping and HiDPI | TODO | — |
| **S09.4 Editor shell/input** | Responsive panels, keyboard/touch/pen/focus management | Use inspector and search on desktop/tablet | Auditor checks focus and accessibility | TODO | — |
| **S09.5 Map authoring** | Real room/cell/region/exit editing with undo and save | Paint and connect rooms, then reopen saved project | Auditor checks asset roundtrip and invalid exits | TODO | — |
| **S09.6 Visual acceptance** | Cross-editor theme consistency + measured UI responsiveness | Creator follows hands-on flow without instructions | Auditor independently checks usability/performance | TODO | — |

## S10 — Visual command editor

**Implementation spec:** [S10.md](05-sprints/specs/S10.md) · **Prerequisites:** S03,S05,S09

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S10.1 Inspector** | Schema-driven component editor | Edit and reopen field | Type/version enforced | TODO | — |
| **S10.2 Blueprints** | Reusable template and overrides | Create two different instances | Migration safe | TODO | — |
| **S10.3 Theme reuse** | S09 graph-paper tokens | Switch theme in Blueprint | No local hardcoded styles | TODO | — |
| **S10.4 Command form** | No-code command name/help/action | Create ring bell | Invalid action rejected | TODO | — |
| **S10.5 Arguments UI** | Typed param/switch/multiline controls | Build give lhs=rhs | Invalid syntax blocked | TODO | — |
| **S10.6 Access UI** | Scope/role/quest rule builder | Bell visible at station only | No lock bypass | TODO | — |
| **S10.7 Alias/help view** | Conflict analysis and generated usage | See colliding alias error | Cannot shadow logout | TODO | — |
| **S10.8 Real test UI** | Use native command harness in editor | Try action as two actors | No fake PASS | TODO | — |
| **S10.9 Command publish** | Versioned release validation | Restart with custom command | Bad manifest blocked | TODO | — |

## S11 — C# and graphs

**Implementation spec:** [S11.md](05-sprints/specs/S11.md) · **Prerequisites:** S05,S08,S10

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S11.1 SDK build** | C#14/.NET10 SDK compile | Build real sample script | Bad signature fails | TODO | — |
| **S11.2 IPC generation** | C++ and C# Protobuf codecs | Roundtrip one hook | Bad wire rejected | TODO | — |
| **S11.3 Hook manifest** | Exact catalog type/mode checks | Bind NPC hook | Unknown binding rejected | TODO | — |
| **S11.4 Command binding** | Host command to C# handler | Run custom salute | Remote client can't send code | TODO | — |
| **S11.5 ECS effects** | Revalidate and commit worker plan | Script unlocks door | Illegal effect denied | TODO | — |
| **S11.6 Worker start** | Load host-published hashed DLL | Worker Ready observed | Hash check enforced | TODO | — |
| **S11.7 Worker failure** | Timeout and crash recovery | Kill during invocation | No partial commit | TODO | — |
| **S11.8 Persistent fields** | Validated ECS/state slot overrides | Restart after lamp change | No stale schema | TODO | — |
| **S11.9 Graph compile** | Typed visual node plan | Run one branch | Invalid port blocked | TODO | — |
| **S11.10 Graph parity** | Same native effect API for code/graph | Compare two executions | Equivalent results | TODO | — |
| **S11.11 Release activation** | Stop/edit/build/publish/restart | New hook active on reboot | No mid-live patch | TODO | — |
| **S11.12 Two-player demo** | Midnight Express gameplay | Alice/Pat complete scenario | Reward/phase correct | TODO | — |

## S12 — World-system editing

**Implementation spec:** [S12.md](05-sprints/specs/S12.md) · **Prerequisites:** S06,S07,S09–S11

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S12.1 Spawner editor** | Visual configure/validate spawner and condition graph | Create and run regional encounter | Auditor checks cap/rate and persistence | TODO | — |
| **S12.2 World event authoring** | Visual weather/event transitions and regional scope | Start, stop and inspect weather event | Auditor checks transaction and scope | TODO | — |
| **S12.3 Transit authoring** | Route/train/doors authoring graph using shared canvas | Build a route and watch departure/arrival | Auditor checks nested room persistence | TODO | — |
| **S12.4 Narration authoring** | Observer template and audience rule editor | Compare player narration at two locations | Auditor checks privacy and localization | TODO | — |

## S12Q — Quest editing

**Implementation spec:** [S12Q.md](05-sprints/specs/S12Q.md) · **Prerequisites:** S06Q,S09–S11

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S12Q.1 Quest authoring** | Build no-code objective definitions and prerequisites | Create Bob → Joe using UI | Auditor checks schema link/progression | TODO | — |
| **S12Q.2 Dialogue graph** | Create all documented dialogue stages with choices | Run two dialogue branches in preview | Auditor checks wrong stage and answer leak | TODO | — |
| **S12Q.3 Rewards/eligibility UI** | Configure rewards, phase/party/instance conditions | Reward Alice and show Joe only to Alice | Auditor checks idempotency and private visibility | TODO | — |
| **S12Q.4 Graph/script binding** | Attach typed C# handler to quest graph and test | Run conductor quiz from graph and C# | Auditor checks effect parity | TODO | — |
| **S12Q.5 Complete creator workflow** | Build, validate and publish full Midnight Express from UI | Creator publishes from scratch and plays with another user | Auditor checks no hidden manual workaround | TODO | — |

## S13 — Self-hosting

**Implementation spec:** [S13.md](05-sprints/specs/S13.md) · **Prerequisites:** S03,S08,S11

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S13.1 GUI launch** | Start pinned host release | Second client joins | Version verified | TODO | — |
| **S13.2 CLI launch** | Headless same release | Remote player joins | No GUI-only behavior | TODO | — |
| **S13.3 Preflight** | Validate hooks/commands/policy before port | Corrupt release fails clearly | No partial startup | TODO | — |
| **S13.4 State restore** | Recover ECS/quests/posts/outbox | Restart during quest | No duplicate action | TODO | — |
| **S13.5 TLS edge** | Certificate and Origin policy | Join from approved origin | Bad origin rejected | TODO | — |
| **S13.6 Proxy rules** | Trusted proxy and firewall guidance | Connect via configured proxy | Forged header ignored | TODO | — |
| **S13.7 Traffic view** | Limits and queue diagnostics | See simulated throttle | Counters accurate | TODO | — |
| **S13.8 Moderation** | Host ban/kick and safe limit controls | Disconnect abusive client | Cannot disable hard ceiling | TODO | — |
| **S13.9 Backup** | World snapshots and restoration | Recover prior save | No lost state | TODO | — |
| **S13.10 Rollback** | Last good release selection | Undo bad script publish | Migration constraints | TODO | — |
| **S13.11 Host walkthrough** | Simple invite and connect flow | Host+friend roleplay and use command | Full scoped negative path | TODO | — |

## S14 — Release audit

**Implementation spec:** [S14.md](05-sprints/specs/S14.md) · **Prerequisites:** S05–S13

| Phase | Deliverable | Hands-on check | Auditor negative case | Status | Evidence |
|---|---|---|---|---|---|
| **S14.1 Platform** | Target OS client/host checks | Play on each supported target | Real environment | TODO | — |
| **S14.2 Accessibility** | Keyboard/touch/contrast/readers | Complete no-code command | No inaccessible control | TODO | — |
| **S14.3 Parser fuzz** | Malformed and Unicode payloads | Run automated fuzz fixture | No crash/second command | TODO | — |
| **S14.4 Flood fairness** | Connection+RP overload | Normal user plays during flood | Memory/p95/p99 measured | TODO | — |
| **S14.5 Privacy** | Log and phase/observer audit | Inspect private Joe/secret filters | No leak | TODO | — |
| **S14.6 Worker sandbox** | Crash/isolation negative cases | See safe error from hostile script | No native corruption | TODO | — |
| **S14.7 Performance** | World+command+RP fanout benchmark | Reproduce report | Actual hardware/timing | TODO | — |
| **S14.8 Release** | Clean install, host, save, restore | Publish and play example | Independent final pass | TODO | — |

## Phase evidence
When a phase is DONE, its Evidence cell links **Builder commit · focused tests · runnable demo or reproduction steps · independent Auditor PASS**. Use [Sprint History](SPRINT-HISTORY.md) for longer discussion, never duplicate phase status in separate files. A 4–5 hour usage reset is a scheduling constraint, not a technical deliverable: size work so **more than one complete phase** can ordinarily be audited per session; split unexpectedly large phases before implementation.
