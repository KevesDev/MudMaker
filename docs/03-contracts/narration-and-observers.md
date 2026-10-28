# Localized Observer Narration, Gameplay Events and Creator-Defined Interactions

**Status:** user-confirmed REQUIRED ability; detailed engine/editor contract PROPOSED. **Owner:** ECS committed event dispatcher + observer projection/narration service; graph and scripting author their rules but do not implement private broadcast buses. **Dependencies:** ECS, spatial/containment/transit, commands/input, world-system event semantics, protocol/security.

## Requirement
When any game actor (player, NPC, machine, world system or scripted object) performs a meaningful action, other relevant players may see a **creator-configured** description of the action. Different observers can see different messages based on their own location, role, senses, permission, knowledge, gameplay state, and actor/target. Examples: a player moving between train cars, a train arriving at a platform, someone disembarking, using a ticket machine, manipulating doors or triggering an arbitrary custom Blueprint. The creator can configure messages and when they appear through visual authoring without programming. Custom scripts use exactly the same event/narration pipeline.

## Crucial distinction: facts vs descriptions
**Domain command** requests action (move, interact, arrive, disembark) -> ECS transaction validates and *commits* state -> **typed domain event** records what actually happened -> **Narration/Observer Projection** determines audiences and composes display payloads -> gateway filters/delivers authorized per-session messages.
- Domain facts are first-class versioned events, **not English text**.
- Narration cannot mutate ECS world state. Optional reaction/trigger handlers may submit separate validated commands via event gateway, with safe ordering and reentrancy budgets.
- A failed/rolled-back command emits no success narration. A local echo is not authoritative.
- NPCs and players use the same event semantics; actor display name is resolved by approved visibility projection, never trusting arbitrary client-provided text.

## Suggested typed event envelope (PROPOSED)
`worldId, worldRevision, eventId, eventTypeId, eventVersion, sequence, committedAtWorldTime, actorEntityId?, subjectEntityId?, sourceLocationId?, destinationLocationId?, eventData (typed), causationId, correlationId, visibilityClass, origin`.
For movement, the event must capture **pre-commit source location** and **post-commit destination**; do not attempt to derive both from post-commit world containment. For train arrival, event records route/direction and station binding in authoritative transit state. Events may be durable for recovery; delivery guarantees (exactly-once vs at-least-once with dedupe) are OPEN and need explicit ADR, but retries must not visibly duplicate one action in a normal session.

## Audience scopes (creator-configurable)
- **ACTOR:** initiator sees second-person confirmation or custom text.
- **SOURCE_LOCATION:** present and eligible in actor's origin room (e.g. occupants in Car A).
- **DESTINATION_LOCATION:** present and eligible in destination room (e.g. occupants in Car B).
- **SAME_LOCATION:** occupants where interaction committed (station platform, train car, shop).
- **CONTAINMENT_SCOPE:** optional eligible child/interior rooms or same enclosing vehicle (e.g. carriage or whole train announcements), with explicitly authored propagation.
- **REGION / WORLD / DIRECT_TARGET / ROLE:** permitted broadcasts, such as weather updates, announcements or private notices.
- Audience definitions must specify actor exclusion, entity type/player session selection, visibility/detection checks, and whether the actor also sees the third-person version. Don't accidentally broadcast private interactions or hidden NPCs globally.
- Membership snapshot timing must be documented: for moves, source observers are evaluated against origin snapshot, destination observers against post-commit destination snapshot; observers who are changing locations simultaneously see a consistent committed order. Prevent actor/spectator duplicates via deduplication.

## Creator-configured narration rules
A versioned **NarrationRule** asset binds eventTypeId or custom Blueprint event, typed predicates, priority, intended audience selector(s), template per audience, enabled/suppressed behavior, locale/fallback policy, and optional channel/category (ambient, movement, combat, system, whisper). Rules can be attached to entity Blueprint, action/interaction, exit, location, region or world system. Precedence between overrides must be resolved and documented in an ADR before implementation; conflicting rules show diagnostics rather than silently sending arbitrary duplicates.
- Visual editor provides a "Messages / Observers" panel for any action/event: select event, add audience, condition builder, message editor, preview from multiple player perspectives, test send with diagnostic trace.
- Template variables are typed and allowlisted: actor's **visible name**, object/target's visible name, origin/destination display labels, direction, resolved train name, approved custom component values. Safe escaping for terminal, ANSI, rich text or web rendering; no leakage of secret component fields or admin-only IDs.
- Each event/action can specify actor/source/destination/other templates, e.g. "{actor} enters from {source}", or suppress a message. Placeholder existence and types validate at design/publish; no arbitrary code eval or direct database queries in string interpolation.
- Custom developer-defined interactions register namespaced, typed events through supported graph/script API (e.g. `ticket.dispensed` or `lever.pulled`), then configure narration, scope and visibility using same interface. Creators are not forced to use only built-in move/arrive events.

## Train reference sequence (observable, role-specific)
Assume Joe is a player inside Car A, Pat is in Car A, Sam is in Car B, Mira stands at Harbor platform:
1. **Car movement:** Joe moves Car A -> Car B during InTransit. Joe: "You enter Car B." Pat: "Joe leaves for Car B." Sam: **"Joe enters from Car A."** Station bystanders receive nothing.
2. **Train arrival:** Train transitions to Docked at Harbor, arriving from north. Mira (and other eligible Harbor platform players): **"A train appears from the north."** Train passengers may see an author-configured different line ("The train slows to a stop at Harbor.") rather than the platform narration.
3. **Disembark:** Joe uses now-available train door to enter Harbor platform. Mira: **"Joe departs a train."** Joe sees second-person disembark confirmation. Remaining passengers in Car B may see "Joe leaves the train." Previous Northgate bystanders receive nothing.
4. **Custom interaction:** Sam activates train alarm or ticket machine during motion. Game author's interaction Blueprint emits committed typed `alarm.activated` / `ticket.dispensed`; only eligible users in configured vehicle/location audience see the chosen message. If script/action fails (no stock, no permissions), only the denied actor gets appropriate failure feedback; no success broadcast.

The narration strings above are **illustrative defaults**, not hardcoded logic. Authors may edit descriptions, change audiences, make actions silent, localize them or bind contextual rules.

## Visibility, ordering and delivery
- Apply game-defined visibility, line-of-sight/senses/stealth/access and role redaction before template interpolation and before delivery. Hidden actors may need an anonymous template or no message; never leak true identities via string variables.
- Local delivery is based on location/containment graph and subscriptions, not pixel/grid adjacency.
- Events and narration preserve committed order (e.g. `TrainDocked` platform arrival before `Disembarked` movement messages). Define behavior for late join, reconnect and replay (history vs live feed). Use bounded per-client queues/backpressure and do not drop gameplay state consistency to save narration cost.
- No duplicate deliveries when an actor is in multiple selected audiences. An actor gets exactly configured actor messages, not one personal plus unrequested spectator echo.
- Ensure proper escaping and client semantic message types for accessible text clients; transport is presentation adapter, not event narrator.

## Validation and integration tests
NAR-01 Car A source audience receives Joe-leaves, Car B destination receives Joe-enters, Joe receives actor confirmation, station receives none.
NAR-02 Harbor sees train appearing from north on actual Docked event, not merely proximity/rendering; Northgate gets no message.
NAR-03 Harbor sees Joe-departs-train only after legal disembark; illegal boarding, locked exit and failed interaction do not broadcast success.
NAR-04 Multiple clients in same room each receive one message, replays/reconnect don't create unintended duplicates; ordering respects event sequence.
NAR-05 Custom Blueprint/script interaction with own event schema uses configurable narration; actor vs room vs vehicle vs region audience.
NAR-06 Visibility/permissions hide true identity and private actions; hidden object fields not accessible in template. Invalid variable reports design-time error.
NAR-07 Change narration and audience in visual editor, save/reopen/publish/host, verify observed output in real two-client session.
NAR-08 Save/restart train while in motion; events after restart narrate from correct resolved location, no phantom arrival.
Required test oracle: read and assert committed ECS state and emitted structured event separately from projected messages; a test that only checks a printed line is insufficient. Logs and event traces must explain suppressed/blocked delivery to authors without leaking private information to players.

## Open decisions
Delivery guarantee, localization/fallback, rule precedence/conflict handling, historical transcript retention, spatial visibility model and high-volume event coalescing/queuing budgets require ADRs. No agent picks behavior silently.
