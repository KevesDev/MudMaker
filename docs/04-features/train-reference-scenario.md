# Canonical End-to-End Scenario — Moving Train and Station

**Status:** user example CONFIRMED; scenario criteria PROPOSED. **Purpose:** integration oracle binding ECS, map editor, transit, exits, commands, scripting, persistence and hosting.

## Author a world using UI only
Create stations **Northgate** and **Harbor** as two Location entities with separate colored/iconed map cells and descriptions. Create a track graph with Station/Platform bindings, segments and an ordered route Northgate -> Harbor -> Northgate. Create a **Train** Blueprint with a RouteFollower, MotionState, door bindings, child compartment Locations **Car A** and **Car B**, connected by internal east/west exits. Add an NPC **Conductor** inside Car A, an Item **Ticket** inside a carriage, a player character at Northgate platform, and an interactive **Ticket Dispenser** whose persistent stock and event trigger are configurable. All assets and behaviors are created in map/Blueprint editors without Java code.

## Actor workflows and state oracles
**T-01 Docked boarding.** Train is Docked at Northgate, door open. Player chooses Board. Authorized command atomically moves player from Northgate platform into Car A. Player's immediate parent is Car A; Car A's parent resolves to Train; Train's dock is Northgate. One success and one matching committed location event are emitted.
**T-02 Departure.** Engine advances train to InTransit. Northgate platform's boarding exit no longer resolves as traversable. Player stays in Car A without their containment parent being rewritten.
**T-03 Internal movement.** While InTransit, player uses exit to Car B. Player parent changes from Car A to Car B; train progress is unaffected. Conductor remains in Car A and can execute scripted behavior.
**T-04 Item interaction.** Player picks up Ticket; it becomes contained by character/inventory without losing persistent component data. Player drops it in Car B; it remains there as the train moves.
**T-05 Runtime trigger.** Ticket Dispenser interaction checks stock and actor permission, emits typed event and updates only authorized fields. Invalid stock/permission leaves world unchanged.
**T-06 Harbor arrival.** Train transitions Approaching -> Docked at Harbor; dynamic door resolves to Harbor platform, not Northgate. Player disembarks; NPCs/items remaining aboard stay in their stable car locations.
**T-07 Locks/exit detail.** Change door description, lock predicate and visibility policy via exit editor. Test authorized/unauthorized traverse, hidden vs visible locked message, and denied attempts not moving actor.
**T-08 Time/world effects.** Attach regional rain weather and resource spawner to Harbor region via world-system graph. State changes occur on one world scheduler with visible event trace; weather description is shown only where scoped.
**T-09 Persistence.** Save while train in transit with passenger in Car B and Ticket in inventory; restart headless engine; restore identity, clock, train segment/progress, dynamic exit bindings, NPC state, item owner and spawn schedule.
**T-10 Race condition.** Simultaneously submit player boarding and departure; observed result is either boarded then departed or denied because departed—never half-boarded, double-contained or moved to a station the train left.
**T-11 Editor roundtrip.** Rearrange station grid cells, change color/icons, add a third station and route; playtest/publish. Existing stable location IDs, route references and runtime data remain correct unless explicit migration.
**T-12 Two-client deployment.** Start same published package by Host button and equivalent headless CLI. Two players move/interact; changes persist; session reconnect does not duplicate pickup or transfer.

## Observer narration acceptance
Joe moves Car A -> Car B: Car A spectators see him leave; Car B occupants see "Joe enters from Car A."; Joe receives second-person confirmation; station spectators see nothing. When the train docks at Harbor from the north, Harbor spectators see "A train appears from the north."; when Joe disembarks, they see "Joe departs a train." Developer-selected templates, visibility and audience conditions determine these messages. They follow *committed ECS events*, not text guesses. See [narration](../03-contracts/narration-and-observers.md).

## Failure paths
Invalid track link, unbound platform, missing destination, circular containment, capacity reached, locked door, route edit midtransit, script exception, unauthorized admin command and corrupted save each produce structured error with unchanged committed world (or documented quarantine/recovery), not silent success.

## Test quality
For every scenario: assert initial ECS state -> issue real command/event -> assert final ECS state, resulting events, persistence/replay where relevant, and player-visible output. At least one deliberately invalid action. Smoke tests that merely start application cannot substitute for these integration oracles.

This scenario is the cross-sprint acceptance fixture. It is intentionally complex enough to expose duplicate ownership and false implementations.
