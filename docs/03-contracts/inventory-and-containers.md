# Inventory, containers, equipment and item custody

**Status: binding product/design contract; runtime not implemented.** This contract extends [spatial containment and transit](../02-architecture/spatial-containment-transit.md), [authoritative scripting](scripting-v1/INDEX.md) and [combat](combat-and-encounters.md). The default user experience is simple inventory and drag/drop; advanced developers can apply the same inventory capability to **any entity**, as in Evennia's object containment model. No parallel inventory ownership table, isolated backpack object system or separate C# inventory engine.

## The core decision: any entity can contain things

Every ECS entity can be an inventory holder **if it has the ContainerCapability component**. The capability can be added through the existing Blueprint/Inspector UI to a player, NPC, chest, drawer, corpse, vehicle, room, animal, moving train, vending machine, tree, machine, bag, item or custom entity. Locations are already capable of spatial containment, but **containment alone does not imply permission to put/get, display an inventory UI, or access contents**. A container has child entities as authoritative contained objects. Contents do not have a second independent owner; each entity has exactly one immediate physical parent or an explicit unplaced state. No cycles, no two containers holding the same unique item, no item stored inside itself. Normal pickup/drop is an authorized **move from container A to container B**.

A **default Character inventory** is its own inventory-bearing entity. For player convenience, the UI shows a top-level "Inventory" tab without explaining containment theory. Clothing/equipment are inventory items plus equip bindings, not copies or second parents; equipping never accidentally duplicates an item. Container-in-container and a moving train's carried chests obey the same acyclic location graph.

## Creator presets and UX

**Quick setup:** select entity → "Can hold items" toggle → choose preset:
- **Basic Bag:** unlimited item count, visible contents to authorized owner, put/get enabled.
- **Chest:** visible container in world; open/close with configurable lock, access and capacity.
- **Character Inventory:** carried items, optional equip slots; get/drop/use via Player Client.
- **Equipment:** user-defined slots with tags/filters (hand, head, ring, custom), equip/unequip rules and passive granted effects.
- **Storage Locker:** shared or account/character/party-owned authorization, optional persistence and auditing.
- **Vendor / Dispenser:** inventory stock with purchase/restock/dispense behavior; selling and trade are separate validated transactions.
- **Hidden Stash:** contents only projected after discovery/permission conditions.
- **Empty Custom:** all rules customizable, identical authority semantics.

The inspector exposes capacity controls (item count, weight, volume, stacks, custom formula, unlimited); discoverability/visibility; ownership and access; open/closed/locked; nested-content access; allowed/denied item types/tags; insertion/removal conditions; transfer behavior; sorting; equipment slots; persistence and audit; default messages and error reasons. *No count/weight limit is imposed by the engine unless configured.* All controls use typed inputs, clear inline explanations, live capacity preview and a one-click "Test with sample items" sandbox in the real Creator shell. No developer must learn containment internals to create a normal bag.

## Data contracts and authority

| Contract | Fields and rules |
|---|---|
| `ContainerCapability` | EntityRef owner, access profile, capacity profile asset, stacking profile, filter policy, visibility policy, state (open/locked), revision |
| `ItemDefinition` | versioned type/tags, default stack policy, weight/volume definitions, attributes, durability, equip/use metadata, visibility |
| `ItemInstance` | unique EntityRef, definition+revision, quantity, per-instance overrides, version, physical parent; unique-instance items cannot silently merge |
| `InventorySlotBinding` | holder, slot key, equipped item, typed filter, occupancy, revision; **not** a second containment edge |
| `InventoryTransferIntent` | authenticated actor, source, destination, item and requested quantity, expected revisions, idempotency key, intent type |
| `InventoryTransferResult` | accepted amount, source/destination revisions, item split/merge refs, projected events, structured reject reason |
| `InventoryAccessSnapshot` | authorized container and visible contents plus computed capacity; never client-supplied truth |
| `TradeEscrow` | server-controlled custody, participants, offer revisions, expiry, onceKey, commit/refund outcome |

**Atomic transfer pipeline:** authenticated intent → resolve actor/session and expected item/container revisions → check object existence/generation and source custody → visibility, distance, access/open/lock, ability/capacity/filter and recursion checks → split/merge plan if needed → single ECS transaction updating parent, quantity, slot bindings, aggregate capacity and event/outbox → observer-scoped narration/UI deltas. Failed transfer commits nothing. Any partial stack split creates a new stable instance exactly once; no overdraw or negative quantity. Transfers into the same parent are defined no-ops unless a reorder is explicitly requested. An item can be equipped only while contained by the eligible holder (or explicitly allowed equipment mount); moving it away unequips as part of the same transaction.

**Nested bags:** the containment graph is acyclic and depth-limited by host settings; the v1 limit is **16 inventory nesting levels**, including contents in an item container. An item with subcontents cannot be placed inside any of its descendants. For capacity, item count means immediate child **item stacks**, not recursive contents; mass/volume include recursively contained physical contents unless a creator-defined capacity profile explicitly excludes them (such an exclusion affects capacity only, not physical existence). Capacity recalculation is incremental along ancestor chain and validated atomically before transfer. Inventory queries are paged and indexed, never full-world scans.

**Quantities:** default non-stackable (quantity 1); stackable definitions permit positive bounded integer quantities with a stack maximum, merge only when same definition revision and all required instance-affecting attributes match (quality, durability, enchantments, provenance constraints). Unique quest objects, equipment with instance durability, containers with contents and items with per-instance effects default to unstackable. Split/merge and transfer have deterministic IDs/idempotency records and preserve audit provenance. Infinite or virtual currency is **not** represented as an endlessly copied physical item: ledger/quest currencies use a separate authoritative resource record. This does not stop creators from making coin objects.

## Gameplay systems built from the same primitives

- **Characters/NPCs:** get, put, drop, give, take (permission-gated), equip, unequip, use, inspect; inventory stays with the ECS entity through movement and reconnect.
- **Rooms/ships/housing:** objects can hold objects, including transportable containers; permissions can be player, party, faction, owner, role, public, quest state or custom graph/C#.
- **Wearables/tools/weapons:** equipment slots are optional; slot conflicts resolved by rules, weapon durability decremented only on committed use outcomes; equipping an item doesn't create phantom inventory copies.
- **Trade:** two-party offer and confirmation with escrow, cancellation, timeout, disconnect/refund and no one-sided theft; use transactions and event onceKeys.
- **Loot:** defeated actor can retain goods, spawn a corpse container, put into a party chest or award a direct transfer depending on the game's custom loot policy.
- **Crafting:** recipe consumes authorized items and produces outputs atomically, with capacity/overflow policy configured beforehand; interrupted crafting remains durable.
- **NPC merchants:** stock is real inventory or an explicit replenishing catalog; buying never mints unlimited copies unless publisher selected that behavior.
- **Mail/warehouses/banks:** use container permissions + explicit delivery/escrow state; never use another account's ID as an authority bypass.
- **Large shared worlds:** indexed queries by parent/type/tag, pagination, controlled projections and bounded subtree operations.
- **Custom rules:** a world may remove ordinary get/drop entirely; all inventory actions are creator-selected capabilities and commands.

## Canonical inventory hooks and graph actions

Source-level hooks use `inventory.<action>.<phase>`. `inventory.transfer.before` and `.after` are the general ingress/commit hooks; specialized interactions include `inventory.container.open.before/after`, `inventory.container.close.before/after`, `inventory.item.get.before/after`, `inventory.item.put.before/after`, `inventory.item.drop.before/after`, `inventory.item.give.before/after`, `inventory.item.use.before/after`, `inventory.equipment.equip.before/after`, `inventory.equipment.unequip.before/after`, `inventory.stack.split.after`, `inventory.stack.merge.after`, `inventory.trade.offer.after`, `inventory.trade.commit.after`, and `inventory.trade.cancel.after`. All use typed event families carrying event ID, actor (authorized only), item, source/destination, quantity, container and revision, denial reason when applicable; **before** hooks may veto/propose permitted changes only if native security permits; **after** callbacks do not roll back committed state, can only queue bounded validated follow-ups.

Graph nodes: On Item Added/Removed, On Inventory Transfer Requested/Committed/Rejected, Check Container Access/Capacity, Filter Item, Split Stack, Request Transfer, Open/Close, Equip/Unequip, Use Item, Begin/Confirm/Cancel Trade, Grant/Consume Item, Count Items, For Each Paged Item, Choose Overflow Destination. Each graph node uses the same typed SDK and native authority as advanced C#.

**C# authoring contract:** `InventoryTransferEvent`, `InventoryContainerEvent`, `InventoryEquipmentEvent`, `InventoryTradeEvent`, `InventoryMutationEffect`, `InventoryOpenCloseEffect`, `InventoryEquipEffect` and `InventoryTradeEffect`; no raw ECS pointer, direct SQL or client-chosen AccountId. Custom C# code creates effects; it never directly changes physical parent fields or invents durable quantities.

## In-app testing and adversarial acceptance

Creator selects a player, bag, locked chest and NPC, uses drag/drop and command text equivalent in the real app, opens nested bag, equips two-handed weapon and tries conflicting gloves/rings, splits/merges stacks, traverses rooms with bag, trades between two live clients, restarts host and checks persistent state. The UI displays the authoritative item count and storage remaining; all errors have actionable reasons.

Auditor tests inaccessible/hidden/locked/remote containers, a bag inside itself, a bag inside a descendant, over-capacity nested transfers, cycle attempts with multiple concurrent sessions, two players grabbing last item simultaneously, split+merge retry, duplicate packet, reconnect midtrade, process crash midtransfer, trading equipped items, inventory of a moving train, unsupported item type, negative/overflow quantities, malformed UUIDs, outbox replay and huge inventories. Result must be exactly one valid custody owner or unchanged world on failure. Confirm UI and text commands call identical host actions.

## Evennia context

Evennia's default inventory is object containment inside a character, and its equipment tutorial layers an EquipmentHandler over that rather than creating a separate object ontology. Its container contribution uses capacity and separate pre-get/pre-put hooks; clothing, storage and barter are optional specialist systems. MudMaker keeps that broad composability while **turning the common cases into one-click Creator presets and a visual inspector**, avoiding Python-style inheritance or knowing a container's lock syntax. References: [Equipment](https://www.evennia.com/docs/latest/Howtos/Beginner-Tutorial/Part3/Beginner-Tutorial-Equipment.html), [Containers](https://www.evennia.com/docs/latest/Contribs/Contrib-Containers.html), [Contribs](https://www.evennia.com/docs/latest/Contribs/Contribs-Overview.html).
