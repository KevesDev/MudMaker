# MudMaker

**Create worlds. Host your own MUD. Play together.**

MudMaker is a graphical **MUD/game creator, self-hosted multiplayer world server, and standalone player client**. Its design goal is the flexibility of [Evennia](https://www.evennia.com/) with accessible, visual world-building and optional advanced C# and node-graph scripting. Players can join MudMaker-hosted games, and the Player Client is also designed to connect to unrelated MUD servers.

## Project status

**Documentation-first design; not yet a working game engine or released editor.** This repository contains extensive product specifications, versioned UI and scripting contracts, source-level DTOs, technical examples, test scenarios and a phased implementation tracker. A hook appearing in a JSON registry or C# SDK does **not** mean the native host dispatches it yet. Published design decisions are distinguished from implementation evidence, and selected architecture and its verification gates are recorded in [Architecture Decisions](docs/02-architecture/architecture-decisions.md).

The planned runtime uses a **native authoritative ECS host**, a separate bounded **C# 14 / .NET 10 scripting worker**, and a typed graphical node system. The v1 architecture selections are documented in [Architecture Decisions](docs/02-architecture/architecture-decisions.md); actual build, integration and benchmark evidence remains incomplete. Remote players can send authenticated commands, text and actions—not executable scripts. Host-authored scripts are built and published locally against versioned contracts; the hosting workflow uses stop → validate/publish → restart, without mandatory hot reload.

## What MudMaker is designed to support

| Area | Planned experience | Specification |
|---|---|---|
| **Creator Studio** | Map editor, Blueprint/Inspector, node graphs, C# code editor, searchable project data, test/preview and publishing in one consistent workspace | [Editor workspace](docs/03-contracts/ui-ux/04-editor-workspace.md) · [UI catalog](contracts/ui/v1/INDEX.md) |
| **Universal Template Library** | Save **any authorable asset** as a reusable template; create variations, search, folders/tags, favorites, rename, archive/delete safely, compare revisions and persist in the project | [Template Library](docs/03-contracts/reusable-templates-and-variants.md) |
| **Worlds and movement** | Rooms, exits, regions, nested spaces and moving vehicles (including trains with walkable interiors); custom spatial and visibility rules | [Spatial/containment](docs/02-architecture/spatial-containment-transit.md) |
| **NPCs** | Easy templates for wanderers, patrols, enemies, quest contacts, merchants, traders, bankers, auctioneers and fully custom ECS/C# actors | [NPCs](docs/03-contracts/npc-templates-and-behaviors.md) |
| **Combat** | Configurable turn-based, real-time, hybrid, tactical and classic MUD combat; independent encounters, aggro, pursuit, escape, custom stats, C# managers and reconnect policies | [Combat](docs/03-contracts/combat-and-encounters.md) |
| **Inventory** | Any entity can be a container; bags, chests, stock, equipment, stacks, nested inventories, secure trade and customizable access | [Inventory](docs/03-contracts/inventory-and-containers.md) |
| **LOOK and perception** | LOOK / LOOK AT / LOOK IN / EXAMINE, virtual details, contextual descriptions, viewer-specific detection and interactive inspection | [LOOK](docs/03-contracts/look-and-perception.md) |
| **Quests and dialogue** | Branching quests, conditional NPC interactions, phasing/parties, objectives, rewards and visual authoring | [Quest documentation](docs/04-features/quests/INDEX.md) |
| **Time and world systems** | Shared WorldClock with many independent scheduling domains, weather, spawners, scripted events, patrols and encounter timers | [World systems](docs/02-architecture/time-events-world-systems.md) |
| **Optional local NPC dialogue** | CPU-first, offline NPC speech, disabled by default; host-filtered context, bounded shared inference worker and deterministic fallback | [Local NPC dialogue](docs/03-contracts/optional-local-npc-dialogue.md) |
| **Player and Host** | Native Player UI, third-party MUD connections, independently scoped game sessions, self-hosting and headless host support | [Player UI](docs/03-contracts/ui-ux/05-player-client-workspace.md) · [Host](docs/04-features/hosting-and-admin.md) |

No feature above should be reported as implemented until its actual code, live UI/host behavior and independent verification have passed.

## How the interface fits together

MudMaker has three deliberately separate workspaces: **Create**, **Play** and **Host**. In Creator, all authoring uses a shared **Asset Explorer → central editor/graph → Inspector → validation/test** flow. The Template Library is an **Assets / Templates view in that existing explorer**, not an extra unrelated panel. Authors can save and reuse rooms, NPCs, items, world systems or custom ECS assets from wherever they create them, then manage variants, metadata and dependencies in one place.

A novice should be able to use built-in templates and contextual controls without writing code. Advanced creators get typed components, custom schemas, the same visual graph and safe C# extensions. Every user input route—text commands, native UI, graphs and authorized scripts—must converge on the host's authoritative validation and transaction services.

## Start here

| Goal | Entry point |
|---|---|
| Find the current subsystem authority | [Documentation index](docs/INDEX.md) |
| Follow the planned order and status | [Canonical sprint tracker](docs/SPRINT-TRACKING.md) |
| Implement one tightly scoped phase | [Per-sprint specifications](docs/05-sprints/specs/INDEX.md) |
| Understand the UI and named controls | [UI/UX index](docs/03-contracts/ui-ux/INDEX.md) · [UI control and action catalog](contracts/ui/v1/INDEX.md) |
| Build visual or C# scripting integration | [Scripting v1](docs/03-contracts/scripting-v1/INDEX.md) |
| Read end-to-end technical examples | [Scripting examples index](docs/04-features/scripting/INDEX.md) |
| Work as Lead, Builder or Auditor | [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md) |
| Check architectural decisions before implementation | [Architecture Decisions](docs/02-architecture/architecture-decisions.md) |

## Engineering commitments

- **One authoritative ECS world**, one validated command/effect gateway, observer-specific visibility and durable project/world state; no parallel gameplay truth stored in UI or scripts.
- **No required external services** for basic authoring/hosting: the database and ordinary runtime dependencies must ship managed by the application; optional CPU NPC inference remains off by default.
- **No invented implementation:** source contracts, illustrative example code, mocked displays and design docs are never substitutes for working native/UI integration.
- **Early hands-on acceptance:** real application controls and playable world checkpoints are scheduled alongside the systems they exercise.
- **Strict multiplayer isolation:** account, character and session remain separate; creators own published scripts; remote users never inject executable code.
- **Incremental, independently audited implementation:** one scoped Builder and one independent Auditor per phase; unresolved ADRs must be decided explicitly before the affected implementation phase.

This is currently a **specification and planning repository**. See [Sprint Tracking](docs/SPRINT-TRACKING.md) for phase-level status rather than assuming the README describes a shippable product.

**Target platform distinction:** v1 desktop/local host is engineered for Windows 11 x64 and Linux x86-64; macOS Apple Silicon is a target gated on a complete native build and isolation test suite. Tablets use remote browser Creator/Player. The exact status of supported vs targeted binaries is determined by S17/S18 release evidence, not this design document. See [architecture decisions](docs/02-architecture/architecture-decisions.md).
