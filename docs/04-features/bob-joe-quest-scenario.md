# Canonical Quest Acceptance World — Talk to Bob, Find Joe

**Status:** owner user story REQUIRED; exact cases PROPOSED. **Purpose:** cross-sprint quest and phasing integration fixture. **Owner:** Quest + Condition + Projection + Dialogue + ECS command + Networking.

## Definitions and baseline
World has room A (Bob NPC) and adjacent room B (Joe NPC candidate). Character A/P1 and B/P2 may occupy room B simultaneously. Quest Q1 = “Talk to Bob”; Q2 = “Find Joe”. Q1 may be offered by trigger or NPC; Q1 complete grants Q2. Bob has generic line pool when Q1 not active and quest dialogue when Q1 active. Joe visibility/interaction is tied to Q2 state (author-configured). All actions use authoritative game events. Other players can still see standard movement/interactions only when the observer can lawfully perceive the subject (narration contract).

## Core cases
- **Q-01 Absent Q1:** talk to Bob -> generic creator-selected line from valid pool, no Q1 progression, no Q2; second interaction respects configured random/no-repeat rules.
- **Q-02 Active Q1:** talk to Bob -> quest-specific dialogue; complete after exact creator-selected condition; Q1 transitions once and Q2 granted exactly once.
- **Q-03 Conversation interrupted:** leave/disconnect midway -> no premature Q1 completion unless configured to finish on first Talk event; no duplicated rewards when reconnect.
- **Q-04 Before Q2:** enter room B -> Joe absent from look/list/map, search, examine, target and interactions, not simply visually hidden. Other ordinary room entities still visible.
- **Q-05 Q2 active:** Joe visible and interactive; dialogue/objective response matches active quest.
- **Q-06 Q2 completed:** creator chooses post-completion policy: hidden OR visible with generic line OR visible with reminder/next quest OR replacement NPC variant. Each choice works as documented and remains saved/persistent.
- **Q-07 Simultaneous players:** P1 Q2-active and P2 Q2-absent share room B; P1 sees/targets Joe, P2 does not. P1's interactions do not leak Joe's name or dialogue to P2 unless creator-authorized visibility rule explicitly permits.
- **Q-08 Party mismatch:** P1/P2 group with different quest states; policy selected: separate phases, shared compatible view, synced replay, or private instance. No accidental grant or phase override. Explicitly reject unsupported policy at authoring.
- **Q-09 Server authority:** P2 guesses Joe's ID or sends raw interact request -> denied, no state mutation, no secret NPC leak.
- **Q-10 Quest chain branch:** Q1 completion can branch to Q2 or Q3 by condition/choice; mutually exclusive branch suppresses incompatible next step, reconvergence can work without double reward.
- **Q-11 Nested objectives:** AND/OR/ordered objectives update only from valid committed events with authorized actor and objective matching, not arbitrary client claims.
- **Q-12 Timed/repeatable:** expiry/failure/reset behavior follows creator-configured world clock, per-attempt ID and reward period. Restart does not restart timer, mis-credit counter or reissue one-time reward.
- **Q-13 Failed action:** unavailable Bob option, Joe phase interaction, bad item delivery or denied quest action -> structured error, no partial progression, no success narration.
- **Q-14 Visibility invalidation:** Q1 completing and Q2 starting updates phase/interest lists in same relevant revision; no stale cached invisible Joe when entering room B.
- **Q-15 Dialogue independence:** P1 and P2 speak with Bob concurrently; their cursors, random pool state, flags, rewards and branch choices remain separate unless explicitly shared.
- **Q-16 Entity lifecycle:** delete/replace Joe or alter Bob graph in editor -> validation displays affected quest references, published version pinned until migration.
- **Q-17 Save/restart:** Q1 complete / Q2 active, Joe visibility, branch state, timers and rewards restore exactly after process restart.
- **Q-18 Private instancing:** creator configures a separate quest encounter: P1 enters private copy of room/encounter with distinct instance IDs; P2 stays in shared room and cannot access private NPC/entity state.
- **Q-19 Progress sharing:** party quest-sharing option never grants rewards or progress outside configured eligibility/participation; replay never duplicates irreversible rewards.
- **Q-20 Visual authoring:** creator builds Q1/Q2, generic line pool, conditional visibility and Q2 post-completion policy using cell inspector / quest branch/dialogue graphs without any source code.
- **Q-21 Custom quest triggers:** dev-created event from item/lever/spawner/train arrives with typed payload and advances custom objective only when matching eligibility, using same event gateway.
- **Q-22 Narrative projection:** when Bob speaks about Joe to P1, only intended participants see message; external observers do not learn hidden quest identity. Narration of a successful action follows committed state, not speculative client action.

## Acceptance matrix
| Player state | Bob talk | Joe in room B | Joe interact | Optional followup |
|---|---|---|---|---|
| No Q1 and no Q2 | Generic pool | Hidden | Denied | None unless defined |
| Q1 active | Quest dialogue | Hidden by default | Denied | Q2 after actual Q1 completion |
| Q1 completed, Q2 active | Completed/reminder text | Visible | Q2 dialogue | Q2 completion |
| Q2 completed | Creator-selected | Creator-selected hidden/visible/alternate | Creator-selected | Next-chain reminder or new quest |
| Q2 failed/abandoned | Creator-selected | Explicit retry/visibility policy | Explicit denial/redo | Reset or abandon |
| Two players different states | Independent conversations | Per-player projection | Independent authority | Party policy governs shared progress |

## Independent test oracles
Assert raw ECS `QuestProgress` owner and attempt/version, typed events and source, visibility projection for each observer, full interaction authorization, rendered/narration events for permitted audience, and durable restore. Re-running an action must not double reward. Mocking `visible=true` from the frontend or checking only terminal output is unacceptable.
