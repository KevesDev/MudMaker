# Product Vision, User Roles and Reference Workflows

**Status:** REQUIRED goals, PROPOSED acceptance elaboration. **Owner:** product requirements. **Depends on:** none.

## Vision
MudMaker is an ECS-native, game-agnostic MUD construction, runtime and hosting platform. It must be approachable to a creator without coding knowledge while exposing advanced extensibility comparable in breadth to mature MUD frameworks. The visual creator should not limit mechanics to combat, fixed room types or a predefined inventory model. A game can model moving trains, populated vessels, complex doors and locks, dynamic environment, economies, item behavior, world weather, spawners, and custom interactions.

## Personas and access
- **New creator:** uses presets, drag/drop cells, palettes, entity inspector, component forms, visual logic, play-test and one-click host. Error messages explain what to fix in plain language.
- **Power creator:** authors custom component schemas, reusable blueprints, typed graph logic, parameterized systems and scripts; can inspect events and execution traces.
- **World administrator:** oversees roles, live sessions, server health, moderation, backups, deploy versions and rollback.
- **Player:** uses a text-first client with optional map, inventory, status and accessible controls; may use browser, tablet or desktop app.
- **Headless operator:** deploys game runtime to Linux/cloud via command and configuration; does not need a graphical shell.

## REQUIRED user stories
**P-01 World creation:** From new project to a world containing visually named and described rooms, mapped cells, connections, occupants and interactive objects; save, close, reopen unchanged.
**P-02 Map authoring:** Select colored/iconed cell, inspect all contents, search/filter a palette of entity types and blueprint instances, create/remove/move content, customize description and exit behavior without code.
**P-03 ECS blueprints:** Define custom components and typed fields; assemble a reusable entity template with editor panels / node graph; configure overrides on instances; attach visual logic or custom scripts.
**P-04 Moving train:** Create station, tracks, train with interior locations, boarding exits, passengers, NPCs, items; train progresses through route; people interact and move within train while in transit; embark/disembark only when legal. See train reference.
**P-05 Interactive systems:** Objects can hold persistent data, expose actions, emit/receive events, contain items, use permissions/locks and trigger scripted or graph behaviors.
**P-06 World systems:** Creators configure weather, cycles, population and resource spawners by region, schedule and condition; effects are discoverable and testable.
**P-07 Multiplayer hosting:** Creator can host using a clear button or launch the same game via documented CLI on cloud/Linux; players join by a discoverable address; runtime lifecycle, recovery and errors are manageable.
**P-08 Extensibility:** Advanced users can build mechanics not anticipated by the engine designers without forking engine core.
**P-09 Portability:** Editor and player workflows remain usable on desktop and tablets; hosting model is independent of creator device.

**P-10 Full quests and chains:** escort, discover, collect by loot/purchase/pickup, defeat, talk, class/level milestone, custom scripts, branching/repeatable quests, eight dialogue stages, configurable rewards/rarity, per-player phasing and private instances. See [quest specs](../04-features/quests/INDEX.md).
**P-11 Observer narration:** other players see creator-authored messages from real committed interactions, movement and train events. See [narration](../03-contracts/narration-and-observers.md).

## Product-level acceptance
- Every REQUIRED story has a narrated editor journey, saved asset schema, runtime contract, explicit failed-path UI, and end-to-end evidence in its owning documents.
- Visual operations result in the same authoritative world mutations as scripted/admin operations.
- Complex behavior uses reusable components, not hardcoded special entity classes such as Train or WeatherManager.
- A sample world demonstrates P-01 through P-07 together and can be exported/imported and hosted.
- Nontechnical flows do not require editing JSON, Java, Python, server configs or ports unless the user opts into advanced mode.

## Not yet decided
Service business model, first-release OS coverage, local offline server support on mobile, external protocol breadth, scripting language, and performance targets are OPEN. See open-decisions; never infer them from the old technical document.
