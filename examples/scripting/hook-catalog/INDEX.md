# Hook-by-hook C# catalog — all 121 registered v1 callbacks

Every registered `hooks.v1.json` ID has an exact attributed C# method and matching declared event/result DTO. The examples are **opt-in**, not automatically installed on a game. Host must explicitly bind selected method to owner entity/quest/channel/command and expose any required persistent state slots.

Before methods demonstrate fail-closed or pass-through validation. Query methods return typed `HookQueryResult` without ECS mutation. After methods demonstrate durable idempotent **per-hook invocation counters** in host-declared `HookMetricsSchema`. These counters are technically useful for inspecting when a hook fires but should **not** all be enabled in a production game: they add one persistent write per event. For richer use cases read [hand-authored family examples](../hook-families/README.md) and [Midnight Express](../MidnightExpressHooks.cs).

**Not an implemented game engine:** .NET compilation/runtime tests have not run; the host C++ dispatcher, field registration and transaction system are still prerequisites.

| Hook family | Source file | Hook methods |
|---|---|---:|
| npc | [NpcHooks.cs](NpcHooks.cs) | 2 |
| dialogue | [DialogueHooks.cs](DialogueHooks.cs) | 2 |
| quiz | [QuizHooks.cs](QuizHooks.cs) | 2 |
| quest | [QuestHooks.cs](QuestHooks.cs) | 16 |
| exit | [ExitHooks.cs](ExitHooks.cs) | 3 |
| entity | [EntityHooks.cs](EntityHooks.cs) | 23 |
| transit | [TransitHooks.cs](TransitHooks.cs) | 2 |
| world_event | [World_eventHooks.cs](World_eventHooks.cs) | 2 |
| item | [ItemHooks.cs](ItemHooks.cs) | 8 |
| timer | [TimerHooks.cs](TimerHooks.cs) | 1 |
| player | [PlayerHooks.cs](PlayerHooks.cs) | 2 |
| command | [CommandHooks.cs](CommandHooks.cs) | 5 |
| character | [CharacterHooks.cs](CharacterHooks.cs) | 5 |
| host | [HostHooks.cs](HostHooks.cs) | 2 |
| access | [AccessHooks.cs](AccessHooks.cs) | 1 |
| container | [ContainerHooks.cs](ContainerHooks.cs) | 4 |
| narration | [NarrationHooks.cs](NarrationHooks.cs) | 2 |
| message | [MessageHooks.cs](MessageHooks.cs) | 2 |
| chat | [ChatHooks.cs](ChatHooks.cs) | 2 |
| account | [AccountHooks.cs](AccountHooks.cs) | 11 |
| channel | [ChannelHooks.cs](ChannelHooks.cs) | 14 |
| scheduler | [SchedulerHooks.cs](SchedulerHooks.cs) | 7 |
| session | [SessionHooks.cs](SessionHooks.cs) | 3 |

**Binding rule:** `[MudHook("exact.hook.id")]` plus `public HookDecision Name(HookContext, TEvent)` for Before/After, or `public HookQueryResult Name(HookContext,TEvent)` for Query. The manifest pins binding UUID, owner, event/result type, capabilities, module and assembly hash. All names must match [the canonical machine-readable registry](../../../contracts/scripting/v1/hooks.v1.json).

Each sample is one independently selectable method. A host script may implement an individual callback without copying an entire catalog class.
