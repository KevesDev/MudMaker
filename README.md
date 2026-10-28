# MudMaker

MudMaker is an ECS-native, game-agnostic toolkit for visually creating, extending, playing, administering, and hosting persistent multiplayer text-based worlds. Its benchmark is the capability and extensibility of mature MUD frameworks such as Evennia, with a significantly more approachable creator experience. An easy user interface must never imply a restricted engine.

## Current status
**Architecture specification / documentation-first restart.** The repository currently contains a minimal Spring Boot bootstrap, not an implemented MUD engine. Do not claim that features documented below are implemented. Prior Java Swing/socket/SQL prototype code was intentionally removed. This documentation is a proposed, reviewable technical baseline, not a claim of working code.

## Documentation entry points
- [Docs index](docs/INDEX.md): exact subject-to-file map and requirement status.
- [Agent instructions](AGENTS.md): mandatory read sequence, ownership and change rules.
- [Product vision](docs/01-product/vision-and-scenarios.md): required workflows and acceptance stories.
- [Sprint dependency graph](docs/05-sprints/INDEX.md): implementation order and gates.
- [Open architectural decisions](docs/07-decisions/OPEN_DECISIONS.md): unresolved decisions that agents must not decide silently.

## Fundamental commitments
- Real ECS foundation and dynamic custom game mechanics.
- Hierarchical, moving worlds (vehicles with passengers, inventory and exits).
- Visual cell-grid world authoring and Blueprint-style, typed graph editing.
- Extensible event-driven and scheduled world-level systems.
- One-click creator hosting and equivalent documented headless/server CLI.
- Browser/tablet/desktop usability, including touch-first interaction.
- Authoritative multiplayer runtime, protected scripting, durable game state.
- No fake tests, no placeholder releases, no magic numbers or duplicate system owners.

See the individual specifications for exact contracts and constraints. No project source code is changed as part of this documentation update.
