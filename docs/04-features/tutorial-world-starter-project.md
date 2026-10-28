# MudMaker Tutorial World — bundled starter project

**Binding product plan; not yet a shipped world.** Ship one *optional*, offline, openable editable project named **Tutorial World** using the same Creator/Host/Player pipelines as a user's project. New Project offers **Blank World** and **Tutorial World** with plain explanations; Blank does not silently add HP, levels, crafting, PvP or money. Tutorial World is locally installed and cloned into a user's project space on selection; never edits the signed original. It must open with no cloud/server/external DB/manual scripts.

Evennia's [Tutorial World](https://www.evennia.com/docs/latest/Contribs/Contrib-Tutorial-World.html) illustrates inspectable rooms, custom movement, an aggressive patrol, puzzles, a special weapon and heavily documented source intended for deconstruction. MudMaker borrows this **learn by playing and inspecting the implementation** format, not a copy of Evennia's copyrighted locations, text or quests.

## Original MudMaker tutorial route

**Welcome Atrium → Market Lane → Forest Path → Old Workshop → Watchtower Gate → Observatory.** Five primary lessons plus an optional side area. All locations are ordinary ECS entities with exits and conditions.

1. **Welcome Atrium:** LOOK, LOOK AT detail, named exits, actor appearance, accessible command input; first Creator-linked inspector.
2. **Market Lane:** talk, say, whisper, tagged NPC merchant, GET/PUT/GIVE item, optional starter gold typed Character attribute (not mandatory to other projects).
3. **Forest Path:** wandering animal NPC, neutral/passive/aggro toggles, range-limited shout, simple patrol and faction reaction; nonlethal preset and visible combat settings.
4. **Old Workshop:** tutorial **Craft Sword** at workbench with exactly three Wood, two Iron and blacksmithing skill 2 using pure visual graph/atomic crafting; show graph and source links.
5. **Watchtower Gate:** a two-sided shared-state door with key/lock, secret LOOK detail, delayed exit; demonstrate safe failure and cancellation.
6. **Observatory:** quest progress/turn-in, reward and weather/time description; optionally host local two-player world to test party chat and faction visibility.

**Tutorial UI:** in native Player, actionable "How this works" links open the same authored Blueprint, graph, script contract or quest editor in Creator with the selected entity highlighted. In Creator, Tutorial Guide sidebar is a documented **Help/learning route in existing workspace**, not a standalone fake custom editor. Each lesson has expected input, result, asset reference, explanation, editable sample and Reset Lesson action in an isolated project copy. No hidden/privileged state leaks to a remote Player. Standalone external-MUD client does not require Tutorial World.

**Packaging:** source-controlled project manifest with schema version, all pinned template/graph/quest assets, optional C# sample code (never automatically executed from remote sources), deterministic seeds, fixture accounts/characters generated safely for local tests (no default shared password), localization/text fallback and manifest hash. Validate opening, editing, saving, cloning, backing up and version migration through standard project services. End-to-end test completes tutorial in Play Client and inspects same data in Creator; no demo-only hardcoded effects.

**Sprints:** S02 new project chooser reserves Blank vs Tutorial; S04 persists and clones bundled project; S06 starter commands; S08 actual playable tour; S09 Creator inspect/edit lessons; S13 crafting graph/C# parity; S17 offline packaging and host parity; S18 independent full route and two-player verification.
