# ECS attributes, basic currency and inventory commands

**Binding design; runtime pending.** Evennia's [Attributes](https://www.evennia.com/docs/3.x/Components/Attributes.html) distinguish persistent and nonpersistent per-object values, and [Tags](https://www.evennia.com/docs/latest/Components/Tags.html) classify objects without values. MudMaker supports the same expressiveness through **typed extensible ECS component fields and durable/transient state slots**. No fixed "Money" inheritance class required.

## Money is an attribute unless game requirements warrant a ledger

A simple game can define `WalletComponent { gold: int64, silver: int64 }` on a Character/merchant/bank entity or a custom `CurrencyBalance` field. Template default is 0. Values are **host validated**, with min 0 and configured upper bound. General `GetField`, `SetField` and `AdjustField` effects use expected revision and capability checks. Never allow clients to directly write these values. For one-character money, a versioned field suffices. **Transfers** debit and credit both owners atomically, with one idempotency key and audit event; two disconnected writes are not acceptable. For banks, auctions, multi-account currencies, transaction history or complex holds, use the existing **durable ledger/escrow service** built on the same typed resource/transaction mechanism, not coins copied as inventory objects. Physical currency is optionally real item stacks.

## Default inventory commands

Evennia's [CmdGet/CmdDrop/CmdGive](https://www.evennia.com/docs/latest/api/evennia.commands.default.general.html) resolve scope, check object hooks and move objects between containers. MudMaker does the same via [one authoritative inventory transfer service](inventory-and-containers.md), independent of text-vs-UI input.

| Input | Exact baseline semantic intent |
|---|---|
| `inventory`, `inv`, `i` | Authorized paged contained items |
| `get sword`, `take sword` | Take visible/reachable sword from current location |
| `get sword from box-2` | Resolve `box-2` as authorized container alias/name, then item strictly in that container |
| `get 3 wood from crate` | Transfer three units from accessible stack(s) after server-resolved disambiguation |
| `get all from box-2` | Enumerate authorized items only, bounded batch with exact selected items; never silent partial success |
| `put sword in box-2` | Transfer from actor inventory to authorized container |
| `drop sword` | Transfer from inventory to current location |
| `give sword to Pat`, `give sword = Pat` | Transfer to visible eligible recipient with consent policy |
| `equip sword`, `unequip sword`, `use sword` | Invoke item/equipment capabilities, revalidating possession and slot rules |
| `look in box-2` | Read authorized contents only; no pickup |

Parser is case-insensitive for verbs and matches aliases using authoritative indexed target resolution; **literal names retain case and spaces**. Quoted names disambiguate; `2.sword` chooses a stable visible match. `box-2` is an **author-defined alias/name**, not automatically the second instance of `box`; numbered target selectors use `2.box`. Parsing `from`, `in`, `to`, `=` respects quoted spans and the longest authorized source/target. Multiple candidate boxes prompt selection without leaking hidden objects.

Source-target preconditions: visibility, phase, reach/range, open/locked container, custody, quantity/stack rules, capacity, equipment state, permissions, revisions and onceKey. All are checked atomically on final commit. Default GIVE succeeds on eligible reachable recipients unless author enables accept/decline; explicit two-sided trade remains its own escrow transaction. Invalid use of `all` and over-capacity batch fails atomically; no hidden partial transfers. Repeated command ID never duplicates a stack or spend.

Creator can override the command definition/graph/C# handler or add syntax while reusing native effects. The default is installed as a **starter command pack**; projects can disable it. Test two identically named containers, concurrent GET, trade while moving train, disconnected recipient, item ownership, multiple sessions, negative quantity, quoted target names, cap overflow and source lost between parse/commit.
