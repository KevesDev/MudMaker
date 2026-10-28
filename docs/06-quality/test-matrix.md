# Test Matrix — Observable Requirements, Not Superficial Green Checks

**Status:** PROPOSED test policy. **Owner:** QA + subsystem owners. **Dependencies:** each architecture and feature contract.

## Levels
- **Unit:** real ECS identity, component schema, graph parser, lock evaluator and scheduler functions; use known input + meaningful assertions.
- **Contract:** versioned protocol/schema, graph node ports, script gateway, command envelopes and persistence asset format.
- **Integration:** actual engine/runtime commands and storage/network adapters; mocks only for truly external resources. Assert world state, emitted events and visible response.
- **E2E:** editor creates world assets, saves, starts host, two real clients interact, restart world, rejoin.
- **Property/invariant:** generated containments never cycle; unique occupancy; atomic updates; identical seed+actions deterministic.
- **Security:** untrusted script cannot reach filesystem/network/host, exfiltrate secrets, exhaust budget, forge admin identity or modify foreign world.
- **Performance:** quantifiable benchmarks with workload, hardware and budgets; threshold values defined in approved ADR/quality plan, not guessed.

## Matrix
| Requirement ID | Positive proof | Failure / adversarial proof |
|---|---|---|
| ECS-01 dynamic schemas | Creator field attached, queried, saved and restored | Bad type/version rejects without mutation |
| ECS-02 lifecycle | Create/nest/move/delete per explicit policy | Cyclic parent, missing target, orphan prevention |
| ECS-03 isolation | Two worlds run simultaneously, distinct state | Cross-world reference rejected |
| SP-01 stable moving interior | Train moves and passenger remains in same car | No per-passenger position rewrite/double occupancy |
| SP-02 exits | Internal exit during transit, dynamic station exit on dock | Boarding between stations denied; locked/hidden policy |
| SP-03 concurrency | Boarding then departure ordered atomically | Simultaneous requests never produce split state |
| CM-01 command centralization | UI text, touch action and network route same command | Duplicate request/unauthorized/unknown action rejected |
| GR-01 typed graphs | Graph executes validated event->action | Broken port, loop, nonexistent schema and invalid write rejected |
| SC-01 script parity | Script action passes same engine validation as graph | Script cannot bypass locks, sandbox or resource budgets |
| WS-01 time | Weather schedule persists/replays | Pause/crash/restart no duplicate time event |
| WS-02 spawn | NPC/resource spawn matches region and cap | Duplicate/spatially invalid/no-eligible-location behavior |
| NAR-01 room observers | Car A sees Joe leave; Car B sees Joe enter | Station does not see inside-train action; failed move has no message |
| NAR-02 arrival observers | Harbor sees train arrive north, then disembark | Northgate no phantom updates; unauthorized actor redaction |
| QUEST-01 lifecycle | Q1 active -> Bob dialogue -> Q1 completed, Q2 granted once | No quest -> generic only; invalid choice no progress |
| QUEST-02 phasing | Q2-active sees/targets Joe in shared room | Q2-absent cannot look/examine/target/interact; guessed ID denied |
| QUEST-03 post-completion | Show/remind/hide/replace obeys author rule | No stale phase cache, no contradictory simultaneous state |
| QUEST-04 group/instance | Party policy and private copied encounter isolate progress | No wrong-party reward, wrong-instance leakage or duplicate objects |
| QUEST-05 branching/rewards | AND/OR/ordered/time/repeat/choice work and survive restart | Invalid branch, double reward, stale version or loop rejected |
| QUEST-06 visual editor | Author Bob -> Joe with graph and room inspector no code | Invalid references/softlock warning; touch alternatives |
| UX-01 map | Cell selection, palette, color/icon, exit inspector | Undo/redo, deletion impact, save failure truthful |
| UX-02 tablets | Tap/edit/drag/pan and keyboard alternatives | No hover-only or unintended scroll-as-edit |
| PS-01 persistence | Actual restart with train+inventory+script state | Corrupt/mismatched schema refuses unsafe restore |
| NW-01 sessions | Two real clients and reconnect | Unauthorized subscribe, duplicate replay, overload |
| HO-01 GUI/CLI parity | Same world package starts in both paths | Bad port/schema, failed rollout, safe rollback |

## Required train oracle
Use [T-01 through T-12](../04-features/train-reference-scenario.md) as shared end-to-end fixture. Tests must assert concrete component states, events and runtime output after each command and restart. A dummy command that prints "train moved" cannot pass unless authoritative RouteFollower/MotionState, dynamic exit visibility and containment are correct.

## Cross-feature quest oracle
Use [Q-01 through Q-22](../04-features/bob-joe-quest-scenario.md): independent state/visibility/interact/narration assertions across two players, quest versions and actual restart. A printed line or frontend-hidden component is not proof. See [quest design research](../08-research/quest-design-research.md) for sourced feature categories.

## Cost guardrails
Builder **never** runs the unfiltered full suite. Auditor may run it once at actual full sprint close only when Lead explicitly names it. Prefer relevant exact test filters; repeat only for real nondeterminism; regression checks only where shared behavior is modified. Use runtime structured errors/diagnostics instead of padding tests, while preserving tests for silent wrong ECS state or information leaks. On re-audit, check repaired diff and directly impacted tests. See [token policy](token-and-dispatch-policy.md).

## Quest-specific verification
Use the [Quest System's full objective/chain/dialogue/reward matrix](../04-features/quests/08-quest-verification-matrix.md) rather than a giant duplicated test catalog here. Bob/Joe is one cross-feature oracle, not a substitute for escort, loot provenance, level milestones, reward choice/randomness, or party/instance rules.

## Explicit no-fake-test verification
- Tests initially fail against absent/malformed behavior; provide at least one behavior mutation proving specific test catches regression.
- The Spring Boot starter contextLoads smoke test is retained only as startup check, NEVER counted as ECS, editor, networking or persistence proof.
- Coverage percentage alone is not a quality gate; require scenario relevance, assertion quality and production pathway.
- Every test report states skipped/disabled, environment, count, and reproducible command.
- Fuzzing and stress tests isolate nondeterminism by captured seeds, timing assumptions and failure reproduction.

## Performance benchmark template
World size and entity count, number/type components, queries/sec, scheduled actions, active sessions, train count, graph steps, database size, test hardware/OS/build, p50/p95/p99 tick/command latency, CPU, RSS, allocation/GC, cold/warm start, save/restore duration, dropped events, and backpressure. *Acceptance limits remain OPEN* until measured/approved.

## Release rule
A checklist entry is not verified by documentation or agent narrative. It is verified by recorded result against production path, independent review and any necessary reproducible artifact.
