# Evennia scripts → MudMaker hooks

[Parity overview](INDEX.md) · [Full machine-readable map](evennia-hook-map.v1.json) · [MudMaker registered hooks](../../../contracts/scripting/v1/hooks.v1.json)

| Evennia source | MudMaker v1 target | Semantics | Catalog |
|---|---|---|---|
| [`at_first_save`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L401) | `scheduler.job.created.after` | post-commit (adapted) | SDK contract |
| [`at_init`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L499) | `scheduler.job.hydrated.after` | post-commit (adapted) | Extension specified |
| [`at_script_creation`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L507) | `scheduler.job.created.after` | post-commit | Extension specified |
| [`at_script_delete`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L514) | `scheduler.job.delete.before` | intercept | Extension specified |
| [`is_valid`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L524) | `scheduler.job.validity.query` | pure-query | Extension specified |
| [`at_repeat`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L531) | `timer.fired.after` | post-commit | SDK contract |
| [`at_start`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L543) | `scheduler.job.started.after` | post-commit | Extension specified |
| [`at_pause`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L546) | `scheduler.job.paused.after` | post-commit | Extension specified |
| [`at_stop`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L549) | `scheduler.job.stopped.after` | post-commit | Extension specified |
| [`at_server_reload`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L866) | `host.stopping.before` | intercept (adapted) | Extension specified |
| [`at_server_shutdown`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L875) | `host.stopping.before` | intercept | Extension specified |
| [`at_server_start`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/scripts/scripts.py#L882) | `host.started.after` | post-commit | Extension specified |

**Status:** Complete source-level SDK target mapping for this category. None is yet implemented in a native hosted MudMaker world; every target needs dispatcher, capability tests and ECS integration.
