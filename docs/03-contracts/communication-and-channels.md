# Communication, channels and social messages

**Binding design; runtime pending.** Social speech is **authenticated input → typed command → audience resolution → observer-filtered publication**. It reuses [command pipeline](commands-and-input.md), [narration](narration-and-observers.md), [spatial hearing](../02-architecture/spatial-containment-transit.md) and [session identity](account-character-lifecycle.md), not a separate chat engine.

Evennia's [CmdSay, CmdWhisper and CmdPose](https://www.evennia.com/docs/latest/api/evennia.commands.default.general.html), [default command list](https://www.evennia.com/docs/latest/Components/Default-Commands.html) and channels concept inspire MudMaker's baseline; room speech, whispers, poses and account/channel messages are distinct audience scopes.

## Default commands

| Command | Resolution | Audience |
|---|---|---|
| `say hello`, `'hello` | speech event | Characters eligible to hear in the speaker's location |
| `emote smiles`, `pose smiles`, `:smiles` | pose event | Eligible nearby observers, actor name safely projected |
| `whisper Pat = hello` | targeted private speech | Authorized reachable recipient(s) and speaker only |
| `shout hello` | audible area event | Creator-configured finite room/cell/sound-edge propagation |
| `page Pat = hello`, `tell Pat hello` | direct account/character message, authorization checked | Specific allowed online/offline recipient according to host setting |
| `channels`, `join <channel>`, `leave <channel>`, `channel <name> = text` | channel membership and send | Channel subscribers authorized at publish time |
| `reply text` | last authorized direct conversation | Exact intended correspondent; no guessing based on unrelated incoming text |
| `mute/block <target>` | per-user preference | Suppresses delivery without changing source event |

A creator can rename, replace or disable all gameplay commands with CommandDefinitions and scripts, but native recipient authorization, session identity, spam limits and moderation remain in force. Quoted text is data, never executable command interpolation.

## Typed message and channel model

`CommunicationIntent`: authenticated actor/session, mode, text, optional explicit targets/channel ID, request ID. `CommunicationEvent`: server event ID, sender actor/ref, world, scope, text, moderation status, timestamp, causation. `AudiencePolicy`: LocalRoom, BoundedDistance, SoundEdges, DirectRecipient, Party, Faction, Channel or explicit permission-checked selector; recipient lookup from committed snapshots and phased visibility. `ChannelDefinition`: stable ID/name, owner scope, join/read/send/moderate ACL, visibility, retention, rate limits, membership policy, moderation and archived state. `ChannelMembership` is versioned and durable where configured. Channel membership != physical presence; private whispers != public world narration.

The default says/emotes are **location-scoped**; shouts use authored bounded hearing and barrier policies rather than broadcasting globally. Delivery is individualized; no invisible/secret NPC identity disclosure through speech, logs, auto-complete or recipients. Sender display names are projected per observer. Offline messages are disabled by default, enabled only by an explicit durable mailbox retention policy. Whispers to nonexistent and unauthorized recipients use safe errors. Account-wide channels require Account auth; in-world local speech uses active Character control. `block` does not expose who blocked whom.

Hooks: `communication.message.before`, `communication.message.sent.after`, `communication.message.delivered.after`, `communication.message.rejected.after`, `communication.channel.join.before`, `communication.channel.joined.after`, `communication.channel.left.after`, `communication.channel.moderated.after`. Creator graphs and C# receive sanitized payloads, propose authorized response effects; never alter authenticated sender or force private audiences. Recorder/transcript retention must honor ACL, host settings and explicit moderation access. Chat-client UI, telnet and other clients use the same semantic command and output events.

**Tests:** speak while two players in same room; shout through 20 sound cells with locked sound barrier; whisper without leaking to third player; direct message across rooms; distinct channel scopes; phased NPC hearing; blocked speaker; renamed character and multiple sessions; offline delivery disabled; muted channel; moderation and rate-limit rejections; repeated packet delivered once; reconnect recovers only authorized history; no script forged sender.
