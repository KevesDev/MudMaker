# Evennia channels → MudMaker hooks

[Parity overview](INDEX.md) · [Full machine-readable map](evennia-hook-map.v1.json) · [MudMaker registered hooks](../../../contracts/scripting/v1/hooks.v1.json)

| Evennia source | MudMaker v1 target | Semantics | Catalog |
|---|---|---|---|
| [`at_first_save`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L138) | `channel.created.after` | post-commit (adapted) | SDK contract |
| [`at_channel_creation`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L179) | `channel.created.after` | post-commit | Extension specified |
| [`channel_prefix`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L509) | `channel.prefix.query` | pure-query | Extension specified |
| [`at_pre_msg`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L590) | `channel.message.before` | intercept | Extension specified |
| [`at_post_msg`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L671) | `channel.message.after` | post-commit | Extension specified |
| [`pre_join_channel`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L689) | `channel.member.join.before` | intercept | Extension specified |
| [`post_join_channel`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L705) | `channel.member.join.after` | post-commit | Extension specified |
| [`pre_leave_channel`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L722) | `channel.member.leave.before` | intercept | Extension specified |
| [`post_leave_channel`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L738) | `channel.member.leave.after` | post-commit | Extension specified |
| [`at_init`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L755) | `channel.hydrated.after` | post-commit (adapted) | Extension specified |
| [`format_senders`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L934) | `channel.senders.format.query` | pure-query | Extension specified |
| [`format_external`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L946) | `channel.external.format.query` | pure-query | Extension specified |
| [`format_message`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L952) | `channel.message.format.query` | pure-query | Extension specified |
| [`pre_send_message`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L958) | `channel.message.before` | intercept | Extension specified |
| [`post_send_message`](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/comms/comms.py#L961) | `channel.message.after` | post-commit | Extension specified |

**Status:** Complete source-level SDK target mapping for this category. None is yet implemented in a native hosted MudMaker world; every target needs dispatcher, capability tests and ECS integration.
