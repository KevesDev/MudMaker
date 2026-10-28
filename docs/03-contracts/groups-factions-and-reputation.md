# Groups, parties, factions, allegiances, reputation and ownership

**Binding design; runtime pending.** These are **typed relationships between ordinary ECS entities and identity records**, not entirely new object classes. Evennia [Tags](https://www.evennia.com/docs/latest/Components/Tags.html) can classify faction members and [Locks](https://www.evennia.com/docs/6.x/Components/Locks.html) can gate access; MudMaker adds explicit relationship state and host-owned authorization for membership, roles and balances. Tags are convenient selectors, **not proof of authenticated membership/ownership**.

| Relationship | Authority and meaning |
|---|---|
| Party | World/Character-scoped temporary roster with leader and optional invitations, loot sharing, quest sync, chat; one active party per character by default |
| Guild/organization | Durable membership entity, invite/application rules, roles, scoped permissions and metadata; multiple guild memberships permitted unless game config restricts |
| Faction | Game-defined affiliation/reputation target, NPC disposition and access/quest conditions; multiple factions permitted |
| Reputation | Typed signed/unsigned numeric attribute on Character or relationship record keyed by FactionId; creator-defined ranges, gain/loss modifiers and thresholds |
| NPC allegiance | Typed faction/owner/party relationships and disposition policy; behavior may interpret hostility/friendliness but cannot bypass combat authorization |
| Ownership | Verified `OwnerRef` and access roles for entities, rooms, inventory, plots, vaults and world systems; owner account/character/guild is explicit and stable |
| Alliance/rivalry | Directed typed relationship records with source/target, revision, status and expiration |
| Followers/companions | Actor/entity control relationship with consent, path/roster policy and security checks |

Core `RelationshipRecord`: stable ID, source ref, target ref, relation kind, role, value (if numeric), scope, revision, validity window, creator-defined metadata and provenance. Membership and roles live in relationship service; not inferred from a string tag. `ReputationComponent` may be a typed Character field for simple one-faction games, or keyed persistent relationship values for many factions; both are available through approved typed read/adjust APIs. Changing affiliation and score is an authorized commit with event/outbox and onceKey; scripts may request changes, not forge account ownership.

**Examples:** a guard attacks enemies of its faction after detection; a merchant discounts for reputation >= 50; guild members open a guild vault; two party members share escort objective credit only when the quest explicitly enables party sync. An NPC can belong to two factions and have a separate personal allegiance; precedence is author-defined in faction policy. Default disposition is Neutral, no automatic PvP. Party membership does not grant inventory ownership or quest credit by itself.

**Creators:** create Party/Faction/Guild/Relationship role templates in same Blueprint/Inspector; choose who may invite/leave/kick/lead/promote, reputation names/ranges, standings thresholds, AI dispositions, chat channels and quest access. Graph/C# hooks: On Member Joined/Left, On Reputation Changed, Query Relationship, Request Join/Leave, Request Reputation Adjustment, Check Permission, On Allegiance Changed. Registered source types `SocialRelationshipEvent` and `SocialRelationshipEffect`; implement via validated host service, never raw ECS pointer.

**Tests:** invitation accepted/rejected; member removal race; leader disconnect; faction-dependent NPC aggro; symmetric/asymmetric rivalry; changing reputation unlocks shop but not inventory ACL; guild-only vault; party quest share and revoked membership; renamed character/account ID safety; two concurrent reputation adjustments; restart/restore; hidden membership not disclosed to unauthorized LOOK/chat; client cannot grant itself Owner/Admin.
