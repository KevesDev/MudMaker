# Evennia objects → MudMaker hooks

[Parity overview](INDEX.md) · [Full machine-readable map](evennia-hook-map.v1.json) · [MudMaker registered hooks](../../../contracts/scripting/v1/hooks.v1.json)

| Evennia source | MudMaker v1 target | Semantics | Catalog |
|---|---|---|---|
| [`at_object_post_copy`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1527) | `entity.copied.after` | post-commit | SDK contract |
| [`format_appearance`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1864) | `entity.appearance.format.query` | pure-query | Extension specified |
| [`return_appearance`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1878) | `entity.appearance.resolve.query` | pure-query | Extension specified |
| [`at_first_save`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1929) | `entity.created.after` | post-commit (adapted) | Extension specified |
| [`at_object_creation`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2042) | `entity.created.after` | post-commit | Extension specified |
| [`at_object_post_creation`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2050) | `entity.initialized.after` | post-commit | Extension specified |
| [`at_object_delete`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2059) | `entity.delete.before` | intercept | Extension specified |
| [`at_object_post_spawn`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2068) | `entity.prototype.applied.after` | post-commit | Extension specified |
| [`at_init`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2078) | `entity.hydrated.after` | post-commit (adapted) | Extension specified |
| [`at_cmdset_get`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2089) | `command.available.query` | pure-query | Extension specified |
| [`at_pre_puppet`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2120) | `character.control.before` | intercept | Extension specified |
| [`at_post_puppet`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2134) | `character.control.after` | post-commit | Extension specified |
| [`at_pre_unpuppet`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2151) | `character.release.before` | intercept | Extension specified |
| [`at_post_unpuppet`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2168) | `character.release.after` | post-commit | Extension specified |
| [`at_server_reload`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2185) | `host.stopping.before` | intercept (adapted) | Extension specified |
| [`at_server_shutdown`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2194) | `host.stopping.before` | intercept | Extension specified |
| [`at_access`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2202) | `access.checked.after` | post-commit | Extension specified |
| [`at_pre_move`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2221) | `entity.move.before` | intercept | Extension specified |
| [`at_pre_object_leave`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2245) | `container.leave.before` | intercept | Extension specified |
| [`at_pre_object_receive`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2266) | `container.receive.before` | intercept | Extension specified |
| [`announce_move_from`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2293) | `narration.move.origin.query` | pure-query | Extension specified |
| [`announce_move_to`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2349) | `narration.move.destination.query` | pure-query | Extension specified |
| [`at_post_move`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2422) | `entity.move.after` | post-commit | SDK contract |
| [`at_object_leave`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2443) | `container.leave.after` | post-commit | Extension specified |
| [`at_object_receive`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2460) | `container.receive.after` | post-commit | Extension specified |
| [`at_traverse`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2478) | `exit.traverse.before` | intercept | Registered |
| [`at_post_traverse`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2497) | `exit.traverse.after` | post-commit | Registered |
| [`at_failed_traverse`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2517) | `exit.traverse.failed.after` | post-commit | Extension specified |
| [`at_msg_receive`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2535) | `message.receive.before` | intercept | Extension specified |
| [`at_msg_send`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2563) | `message.send.before` | intercept | Extension specified |
| [`at_look`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2657) | `entity.look.after` | post-commit | Extension specified |
| [`at_desc`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2692) | `entity.description.query` | pure-query | Extension specified |
| [`at_pre_get`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2704) | `item.pickup.before` | intercept | Registered |
| [`at_get`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2726) | `item.pickup.after` | post-commit | Registered |
| [`at_pre_give`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2743) | `item.transfer.before` | intercept | Registered |
| [`at_give`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2767) | `item.transfer.after` | post-commit | Registered |
| [`at_pre_drop`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2785) | `item.drop.before` | intercept | Extension specified |
| [`at_drop`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2814) | `item.drop.after` | post-commit | Extension specified |
| [`at_pre_say`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2831) | `chat.say.before` | intercept | Extension specified |
| [`at_say`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2859) | `chat.say.after` | post-commit | Extension specified |
| [`at_rename`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L2999) | `entity.renamed.after` | post-commit | Extension specified |
| [`func`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L3475) | `exit.traverse.before` | intercept (adapted) | Registered |

| [`get_display_name`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1639) | `entity.appearance.name.query` | pure-query | Extension specified |
| [`get_numbered_name`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1677) | `entity.appearance.numbered_name.query` | pure-query | Extension specified |
| [`get_display_header`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1738) | `entity.appearance.header.query` | pure-query | Extension specified |
| [`get_display_desc`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1751) | `entity.appearance.desc.query` | pure-query | Extension specified |
| [`get_display_exits`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1764) | `entity.appearance.exits.query` | pure-query | Extension specified |
| [`get_display_characters`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1803) | `entity.appearance.characters.query` | pure-query | Extension specified |
| [`get_display_things`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1823) | `entity.appearance.things.query` | pure-query | Extension specified |
| [`get_display_footer`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/objects/objects.py#L1851) | `entity.appearance.footer.query` | pure-query | Extension specified |

**Status:** Complete source-level SDK target mapping for this category. None is yet implemented in a native hosted MudMaker world; every target needs dispatcher, capability tests and ECS integration.
