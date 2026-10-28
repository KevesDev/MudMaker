# Evennia cmdsets → MudMaker hooks

[Parity overview](INDEX.md) · [Full machine-readable map](evennia-hook-map.v1.json) · [MudMaker registered hooks](../../../contracts/scripting/v1/hooks.v1.json)

| Evennia source | MudMaker v1 target | Semantics | Catalog |
|---|---|---|---|
| [`at_cmdset_creation`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/commands/cmdset.py#L749) | `command.set.created.after` | post-commit | SDK contract |

**Status:** Complete source-level SDK target mapping for this category. None is yet implemented in a native hosted MudMaker world; every target needs dispatcher, capability tests and ECS integration.
