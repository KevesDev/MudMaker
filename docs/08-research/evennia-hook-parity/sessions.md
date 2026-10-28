# Evennia sessions → MudMaker hooks

[Parity overview](INDEX.md) · [Full machine-readable map](evennia-hook-map.v1.json) · [MudMaker registered hooks](../../../contracts/scripting/v1/hooks.v1.json)

| Evennia source | MudMaker v1 target | Semantics | Catalog |
|---|---|---|---|
| [`at_sync`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/server/serversession.py#L97) | `session.synchronized.after` | post-commit | SDK contract |
| [`at_login`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/server/serversession.py#L131) | `session.login.after` | post-commit | Extension specified |
| [`at_disconnect`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/server/serversession.py#L155) | `session.disconnect.after` | post-commit | Extension specified |
| [`at_cmdset_get`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/server/serversession.py#L400) | `command.available.query` | pure-query | Extension specified |

**Status:** Complete source-level SDK target mapping for this category. None is yet implemented in a native hosted MudMaker world; every target needs dispatcher, capability tests and ECS integration.
