# MudMaker

MudMaker is a graphical **game creator, self-hostable multiplayer game server, and player client** for extensible text-based worlds. Every user can create and host their own games or connect to games hosted by others. Its goal is Evennia-class flexibility with approachable no-code authoring and optional advanced scripting.

## Repository status

**Design and source-level contracts — not yet a running game engine.** The obsolete Spring Boot/Maven/Java bootstrap has been removed. The intended platform is a native authoritative ECS host with C# 14/.NET 10 scripts in a **host-local worker**, plus typed visual graphs. Those source-level C# examples exist, but C++ integration, networking, persistence and complete runtime tests are not yet implemented or verified. Do not mistake SDK examples or design documents for a functional hosted game.

Remote players send **authenticated gameplay commands, actions and bounded text**; they do not send executable scripts or graph definitions. Host owners edit local project scripts, stop their server, publish a validated release and restart the hosted game.

## Start here

| Task | Read |
|---|---|
| Find the technical authority for a subsystem | [Documentation index](docs/INDEX.md) |
| Track small, testable implementation phases | [Single sprint tracker](docs/SPRINT-TRACKING.md) |
| Implement a specific sprint | [One focused spec per sprint](docs/05-sprints/specs/INDEX.md) |
| Work as Lead, Builder or Auditor | [Agent rules](AGENTS.md) and [Claude instructions](CLAUDE.md) |
| Implement secure client input, typed commands and long RP text | [Client-input v1 index](docs/03-contracts/client-input-v1/INDEX.md) |
| Implement C# / visual scripting and the host worker | [Scripting v1 index](docs/03-contracts/scripting-v1/INDEX.md) |
| Research / decisions requiring owner review | [Decision gates](docs/07-decisions/OPEN_DECISIONS.md) |

## Project commitments

- Native ECS authority, type-checked command/effect execution and persistent world state.
- World rooms, moving nested locations, trains, exits, quests, phased NPCs and events.
- Out-of-box commands and **a built-in visual command editor**, with typed advanced C#/graph hooks.
- Roleplay posts and character descriptions treated as **explicit text submissions**, not inferred from input length. Long moderator commands remain commands when declared by the host.
- User-customizable ThemeManager and a subtle dark graph-paper canvas across editors.
- Validated local script publishing and real self-hosted multiplayer security.
- Small checkable phases, one Builder and one scoped independent Auditor per phase; research and open decisions belong to the owner before dispatch.

The repo contains specifications, schemas, C# examples and developer/agent instructions. Build and verification must be completed before features can be called functional.
