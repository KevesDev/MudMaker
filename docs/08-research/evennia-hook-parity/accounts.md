# Evennia accounts → MudMaker hooks

[Parity overview](INDEX.md) · [Full machine-readable map](evennia-hook-map.v1.json) · [MudMaker registered hooks](../../../contracts/scripting/v1/hooks.v1.json)

| Evennia source | MudMaker v1 target | Semantics | Catalog |
|---|---|---|---|
| [`at_post_add_character`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L378) | `account.character.assigned.after` | post-commit | SDK contract |
| [`at_post_remove_character`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L389) | `account.character.unassigned.after` | post-commit | Extension specified |
| [`at_post_create_character`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L979) | `character.created.after` | post-commit | Extension specified |
| [`at_pre_channel_msg`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1266) | `channel.recipient.before` | intercept | Extension specified |
| [`at_post_channel_msg`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1333) | `channel.recipient.after` | post-commit | Extension specified |
| [`at_account_creation`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1499) | `account.created.after` | post-commit | Extension specified |
| [`at_init`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1512) | `account.hydrated.after` | post-commit (adapted) | Extension specified |
| [`at_first_save`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1531) | `account.created.after` | post-commit (adapted) | Extension specified |
| [`at_access`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1577) | `access.checked.after` | post-commit | Extension specified |
| [`at_cmdset_get`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1602) | `command.available.query` | pure-query | Extension specified |
| [`at_first_login`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1633) | `account.first_login.after` | post-commit | Extension specified |
| [`at_password_change`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1648) | `account.credentials.changed.after` | post-commit | Extension specified |
| [`at_pre_login`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1659) | `account.login.before` | intercept | Extension specified |
| [`at_post_login`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1710) | `account.login.after` | post-commit | Extension specified |
| [`at_failed_login`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1749) | `account.login.failed.after` | post-commit | Extension specified |
| [`at_disconnect`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1762) | `account.disconnect.before` | intercept | Extension specified |
| [`at_post_disconnect`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1779) | `account.disconnect.after` | post-commit | Extension specified |
| [`at_msg_receive`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1794) | `message.receive.before` | intercept | Extension specified |
| [`at_msg_send`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1824) | `message.send.before` | intercept | Extension specified |
| [`at_server_reload`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1844) | `host.stopping.before` | intercept (adapted) | Extension specified |
| [`at_server_shutdown`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1853) | `host.stopping.before` | intercept | Extension specified |
| [`at_look`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/accounts/accounts.py#L1878) | `entity.look.after` | post-commit | Extension specified |

**Status:** Complete source-level SDK target mapping for this category. None is yet implemented in a native hosted MudMaker world; every target needs dispatcher, capability tests and ECS integration.
