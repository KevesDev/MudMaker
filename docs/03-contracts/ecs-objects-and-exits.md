# Universal ECS objects, exits and traversable doors

**Status:** binding architecture and authoring contract; implementation pending. An **Object** in MudMaker means **any ECS entity**. Room, exit, actor, NPC, character, chair, lever, sword, chest, animal, workstation, moving vehicle and train are not mutually exclusive native class hierarchies. They differ in **attached components and enabled systems**. Reuse the [universal templates](reusable-templates-and-variants.md), [spatial/containment](../02-architecture/spatial-containment-transit.md), [LOOK](look-and-perception.md), [inventory](inventory-and-containers.md), [commands](commands-and-input.md) and [scheduler](../02-architecture/time-events-world-systems.md).

## Evennia comparison and design translation

Evennia [Objects](https://www.evennia.com/docs/latest/Components/Objects.html) defines all game-world things as Objects, specialized via Python typeclasses. Its [Typeclasses](https://www.evennia.com/docs/latest/Components/Typeclasses.html) and [Attributes](https://www.evennia.com/docs/latest/api/evennia.typeclasses.attributes.html) provide extension and persistent properties; [Locks](https://www.evennia.com/docs/6.x/Components/Locks.html) distinguishes search/view/get/traverse. [Exits](https://www.evennia.com/docs/latest/Components/Exits.html) are one-way Objects with a destination and object-local transit command, and document the movement hook ordering. [SimpleDoor](https://www.evennia.com/docs/latest/Contribs/Contrib-Simpledoor.html) synchronizes two sides of a door; [Slow Exit](https://www.evennia.com/docs/latest/Contribs/Contrib-Slow-Exit.html) demonstrates delayed traversal with speed/stop, warning that its sample delayed movement is not restart-durable. These are **upstream behaviors**; the MudMaker rules below are normative adaptations, not claims of identical internal design.

| Evennia feature | MudMaker ECS rule |
|---|---|
| Base Object with identity/location/contents | All world-visible things are ordinary generation-checked EntityRefs; optional containment/location capability and validated single-parent physical relation |
| Typeclass inheritance | Versioned Blueprint/template composition and typed components; child variations are pinned templates, not mandatory class inheritance |
| Persistent Attributes / transient ndb | Typed component fields and versioned persistent/transient state slots, with indexes and schema migration |
| Aliases, Tags | Appearance/search aliases and project/runtime tags; categorization does not change capabilities |
| Locks/search/view/get/traverse | Central capability-specific authorizer, predicate/rule graph and independent visibility, pickup and traversal decisions |
| Object-local Commands / Scripts | Scoped typed action/command bindings, graph/C# hooks and shared event scheduler; no runtime Python class inheritance |
| Objects holding Objects | Inventory/containment authority with an acyclic single physical parent; room/location is a distinct capability |
| Character / NPC | Controllable or autonomous actor capability; a non-humanoid tool may also have autonomous behavior |
| Exit | Ordinary entity with `ExitConnectionComponent` and `TraversalCapability`; no distinct native class |
| SimpleDoor | Door preset is exit plus shared state/lock/interact components; paired one-way exit entities reference one shared DoorState entity |
| SlowExit | Exit with `TraversalDurationPolicy`, persistent traversal operation and cancellation policy, using the existing world scheduler |

**Boundary:** unlike Evennia's recommendation to use Scripts rather than invisible Objects for game systems, MudMaker represents world systems through ECS system registration and versioned scheduling/assets; a creator may use an entity as stateful world anchor, but it is **not** a special mandatory invisible Object subclass and cannot avoid scheduling/event authority.

## Canonical entities and components

`EntityIdentity` and generation-checkable `EntityRef` are universal. Additional capabilities are **opt-in**:

- `AppearanceComponent`: names, aliases, description, LOOK details and observer projection.
- `ContainmentComponent`: one physical parent/child index; a room/vehicle can be a location, and inventory holder can accept objects only via `ContainerCapability` and its permissions.
- `LocationCapability`: traversable destination/occupied location semantics; not every containing bag is a playable room.
- `ExitConnectionComponent`: source LocationRef, static destination or dynamic resolver asset, versioned visibility/availability, aliases, traversal command mapping.
- `TraversalCapability`: range/permission/lock/admission rules, transition events, movement mode, capacity and failure output.
- `DoorStateComponent`: door state `Open`, `Closed`, `Locked`, `Sealed`, `Destroyed`; state transition guards, authorized open/close/lock/unlock/break actions, damage/repair only if creator adds them. `Locked` means closed and locked; close of locked door is idempotent; unlocking returns Closed, not Open. `Destroyed` is nonblocking by default, unless a creator-authored collapsed-obstruction component blocks movement.
- `DoorLinkComponent`: optional shared DoorState EntityRef for two or more exit-side presentations; each side retains its own name/description/visibility/one-way traversal policy. Both sides read and change **one committed shared state**, never replicate locks in two mutable copies.
- `TraversalDurationPolicy`: `Instant` default, or `Delayed` with bounded duration, interrupt rules and allowed movement side effects. Traversal operation stores request/actor/origin/exit/revision/destination policy/pending deadline/cancel token/onceKey.
- `InteractableCapability`: creator-declared typed verbs, arguments, conditions and host-validated effects (lever, switch, chair, tool, machine); it does not create a new root object type.
- `ActorControlCapability`: optionally player-controlled or NPC-controlled, with distinct Account/Session authorization.

A **plain door** is one exit entity whose description refers to a door and whose traversal may be always allowed; if it must open/close, add DoorState and Interactable. A **two-sided physical door** is two directed exit entities referring to one shared DoorState entity. A **portal** is an exit with a special destination resolver/FX/condition. A **window you can inspect but cannot traverse** needs only Appearance/LookDetail and is **not an exit**. A window you can climb through gains exit/traversal components. A chair can be a container-like occupiable thing or an interactive object depending on creator component choices, without becoming a Chair class.

## Exit commands and traversal behavior

Default player verb for an exit is its primary name (for example `north`, `doorway`, `enter hatch`), with authorable aliases; `go <exit>`, `enter <exit>` and clicking the visible exit issue the **same typed `TraverseExitIntent`**, not three movement engines. The command registry resolves scope, exact names, alias collisions and permissions; hidden exits are never exposed in autocomplete, LOOK or ambiguous-result counts. An exit can be examined even when not traversable if its **view** permission permits. A one-way exit is normal; the Creator's **Create Return Exit** action creates a second independent exit, and **Link Shared Door State** is a separate explicit choice. Reciprocal naming/description need not be identical.

Pipeline:
1. Host authenticates actor/session, resolves the current physical Location and the one authorized exit; checks generation/revision and whether the actor has movement capability.
2. Native authorizer validates exit visibility/search, traversal permission, source location, destination availability, dynamic resolver, door state, access/key conditions, combat/quest rules and destination capacity **against one serialized committed snapshot**. A hidden or nonexistent exit has indistinguishable unauthorized response.
3. Run bounded `exit.traverse.before` and native origin/actor movement gates after irrevocable security checks; creators may veto or propose allowed effects, but cannot force a hidden destination or bypass native authority.
4. **Instant:** atomically move actor from source to resolved destination, keep all nested inventory/companions consistent and emit one ordered movement/outbox transaction; then observer-scoped leave/arrive and post-traverse notifications.
5. **Delayed:** atomically register `TraversalOperation` and due deadline through the **existing scheduler**; no immediate relocation. On expiry revalidate actor at origin, destination resolver, lock/state, capacity, rights and world revision, then commit movement once or cancel with authored reason. If creator allows movement during an operation, the default cancellation condition is **actor leaves origin**, unless explicit teleport/vehicle policy overrides. Repeated `stop` cancels idempotently; restart restores operation deadline with at most one completion attempt.
6. Rejected/canceled traversal leaves actor in its previous committed location and never spends a cost unless an explicit validated attempt-cost transaction was published. Hooks cannot directly modify parents/locations.

**Notifications / failure precedence:** successful traverse emits `exit.traverse.after` only after commit; cancellation emits `exit.traverse.cancelled.after`; rejection emits `exit.traverse.denied.after` with safe reason. No raw target ID or secret destination in unauthorized errors. Predicates are checked in this order: identity/source → existence and phase/search → traverse/access → door state → destination/docking/capacity → movement-specific restrictions → explicit author-defined conditions. Any denial may be shown as a less specific safe text, but never as a reason revealing protected facts.

Door actions `open`, `close`, `lock`, `unlock`, `break` (if enabled) are **ordinary object interactions**, not movement. They update shared state transactionally and publish `exit.door.state_changed.after`; both linked sides immediately see the same state and appropriate per-observer descriptions. An open door can remain nontraversable under separate author rules; a locked door might still permit inspection if its viewer-specific visibility allows. On breaking/repairing a door, record policy and event causation; never automatically spawn a duplicate door entity.

## Creator UX and template parity

The existing Map/Exit Inspector provides **Destination**, one-way/return, visible/examinable name/description, aliases, conditional state, traversal permissions, open/close/lock controls, shared door-side link, source/destination preview, delay/speed/cancel policy, messages, triggers, and versioned graph/C# behavior. No standalone Door Editor or separate Tool engine. Presets: Open Passage; One-Way Exit; Locked Door; Shared Two-Way Door; Slow Exit; Conditional Portal; Docked Train Door; Secret Passage; Empty Custom Exit; Interactive Object (not traversable). Each preset is a normal reusable TemplateAsset, savable/variant-manageable in the **same Template Library**.

In-app test: place two locations, add a named door with shared state, lock from one side and see other side update, inspect without traverse, test blocked permission, delay/cancel crossing and durable restart, then change to train docking condition while retaining interior rooms. All validated against actual host state, not fake preview.

## Scripting registry and acceptance

The source-level `ExitTraversalEvent`, `DoorStateEvent`, `TraversalOperationEvent` and `ExitBehaviorEffect` contracts and canonical `exit.*` hooks are registered in `contracts/scripting/v1`. Existing `movement.*` and `entity.move.*` hooks remain generic and must not be duplicated as a second writer. **Before** may veto under native invariants, **After** is a committed observer-filtered fact, and effects are proposals validated by native topology and custody. All entries remain `runtimeImplemented:false` until implemented and audited.

Acceptance includes: one-way and reverse traversal; secret vs locked vs visible-untraversable; LOOK at closed door; two-sided lock/open synchronization; two simultaneous open/close actions; key consumed exactly once only if authored; stop/cancel delayed travel; retry/restart/duplicate packet; actor moves during delayed traversal; changing dynamic train platform while pending; 1000 concurrently delayed traversals without OS-thread-per-exit; character/NPC moving through same API; locked door cannot bypass via `go`, `door`, UI click or C# effect; hidden exit does not leak via map or autocomplete; delete a referenced door/room gives Where Used and safe refusal.
