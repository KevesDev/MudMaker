# 03 | From Code or Graph to Live ECS Gameplay

**Status:** selected v1 code/graph hosting workflow; implementation and testing pending. **Owner:** Asset Registry, Hook Registry, Script/Graph Host, ECS Executor and Hosting Supervisor.

## Single authoritative pipeline
Script or Graph draft -> Save -> Validate schema/API/capabilities -> Compile host-local C# 14 with Roslyn / Graph typed plan -> Attach versioned binding -> Test inside isolated *real* ECS world -> Publish immutable release -> Host/update running world -> Runtime receives committed event -> Resolves binding and permissions -> Worker/graph evaluates -> Returns typed effect proposal -> ECS executor validates and commits -> Narration per observer -> Event Trace, audit and persistence.
Saving source is **not** compiling. Compiling is **not** testing. Testing is **not** publishing. Publishing is **not** automatically changing a live world. UI states must reflect each distinct step and failure.

## Where attachments happen
- **Entity/Blueprint:** select NPC, item, room, train, door, spawner or component template -> **Behavior** tab -> **Add Behavior** -> **Code Script / Visual Graph / New** -> supported hook/event and condition. Script code is shared; bindings/parameter overrides belong to Blueprint or entity instance. Same script asset can be reused in many objects.
- **Quest:** **Before / Offer / Confirm / In Progress / Reminder / Turn-In / Complete / After** or objective/reward/chain edge -> **When this happens** -> **Use normal / Before / After / Replace / Conditional / Both** -> script/graph asset picker -> capability and error behavior; a quest-active NPC can invoke custom actions; no direct quest state mutation.
- **World:** select Region or Global -> **Systems** -> **Add System** / Weather / NPC spawner / Custom Event -> event/tick subscription and script/graph. World event lifecycle persistent and controlled by scheduler.
- **Map cell/exit:** select -> **Behaviors** -> action hook or optional narrative text rules; references a shared script/graph/condition asset, not embedded duplicate source code.
- **Custom node:** Code Editor function with **Expose to Graph** generates typed palette node from approved metadata; version change prompts dependent graph diagnostics and migration.

## Exact attachment UI
Compact binding card: name/icon, asset/version, enabled toggle, event dropdown, **Run** mode segmented selector, **Only if…** rule builder, editable exposed parameter controls, audience selector, execution order, on-failure policy, capability permissions, **Test Hook**, **Open Script/Graph**, **Find Usages**, **Detach** with reference impact. Contextual tooltip for each complex field, not paragraphs of instructions.

## Runtime truth and failure handling
- The browser/tablet never executes arbitrary game scripts; clients send authenticated commands, receive authorized state projections and narration.
- The script or graph's event context is a **snapshot** and stable typed handles; returned effect plan may be stale and revalidated. One mutation authority in engine.
- Hook missing/wrong version/compile failure => no release; required hook failed at runtime => explicit error/pending recovery, not silent success; optional cosmetic fallback configurable. Worker crash cannot corrupt ECS or claim a reward happened when it did not.
- Hot update must verify ABI, script instances, quest attempts, dialogue sessions, persisted variables and event subscriptions; safe world transaction boundary or controlled restart. Last known-good release remains available on failure.
- World publish includes script/graph code hash, versions, dependencies, constraints, sandbox permissions, migrations and deterministic seeds as appropriate. Headless CLI and GUI load exactly same package.
- Multiplayer: same NPC script may handle each player separately; messages delivered based on phase/visibility and audience, not raw script broadcast to all.

## Test World / Preview experience
Header **Test ▾** offers Run in Test World, Debug, Select Test Character, Quest State, Region/Event. Inspector shows before/after component state, proposed effects, commit/reject reason, player-visible messages for actor/nearby observer, and current script/graph line/node trace. Debug is isolated; live public server cannot be paused by a creator clicking a breakpoint unless special operational mode is approved.
Real tests: stock dispenser, quest dialogue quiz, name-based reward, turn-in start/stop world event, train narration and persistent restart. No test can pass by checking only console output or a mocked action result.

## Platform distinction
Tauri is optional desktop packaging. Windows/macOS/Linux desktop app may control local native headless server where supported, but web and tablets connect to hosted/headless server. A remote C# compiler runs in service, not as a native iPad process. Public reachability, TLS and local vs managed hosting promises must be explicit and tested.

## End-to-end visual diagrams
[Read three editable Mermaid diagrams: code/graph authoring to hosting, live gameplay event sequence, and exposing code as graph nodes](00-end-to-end-lifecycle.md). Use [Code Scripting](code/INDEX.md) or [Visual Scripting](visual/INDEX.md) for precise per-screen actions.

## Selected publish and restart sequence
Owner stops game; edits locally authored C# and graph assets; Roslyn compiles C# 14 and typed graph compiler validates IR; manifest validates exact [hook registry](../../contracts/scripting/v1/hooks.v1.json) and [effect registry](../../contracts/scripting/v1/effects.v1.json); owner publishes immutable version with checksums; GUI/headless supervisor starts selected release and isolated worker, restores authoritative world and admits players only after readiness. **No live hot reload is required.** Remote clients never send scripts. [Runnable-shape source and sequence](../../03-contracts/scripting-v1/09-build-publish-restart-run.md). Required [S11](../../05-sprints/specs/S11.md) and [S13](../../05-sprints/specs/S13.md) deliverables track actual implementation.
