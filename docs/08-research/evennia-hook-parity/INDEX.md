# Evennia hook comparison — indexed research and extension contract

**Evidence:** upstream Evennia implementation from [Evennia GitHub](https://github.com/evennia/evennia) (main branch inspected 2026-10-28) and [official documentation](https://www.evennia.com/docs/latest/). **Coverage:** 108 unique methods, objects: 50; accounts: 22; scripts: 12; channels: 15; commands: 4; cmdsets: 1; sessions: 4. One entry for every found public hook or author-overridable method in seven core modules (excludes internal `at_idmapper_flush`, inheritance duplicates collapsed per module). No claim of covering every possible Evennia contrib or third-party custom hook.

**Canonical detailed mapping:** [evennia-hook-map.v1.json](evennia-hook-map.v1.json). Each row has the Evennia module/method and source-line link, exact MudMaker target ID, dispatch mode, current registered status and a flag for lifecycle adaptations.

**Pinned upstream source:** https://github.com/evennia/evennia/tree/98b9df21c91b111dda7c51c8ab62f42faf4d9dae (2026-10-24). 108 Evennia methods map to 89 distinct counterpart IDs in MudMaker. Every counterpart has a declared SDK hook ID; **none is yet proven callable through the C++ game server**.

## Module-specific narrow indexes
- [objects](./objects.md)
- [accounts](./accounts.md)
- [scripts](./scripts.md)
- [channels](./channels.md)
- [commands](./commands.md)
- [cmdsets](./cmdsets.md)
- [sessions](./sessions.md)

## Scope and decisions
- **SDK v1 catalog** means the ID and CLR event/return contract exist in [hooks.v1.json](../../../contracts/scripting/v1/hooks.v1.json). It does **not** mean implemented in a running server.
- **Source-level contract only** is the status of all 89 counterpart IDs: native engine dispatch, tests and supported host binding are still required.
- **pure-query** hooks return validated display/permission/availability values **without effects**; **intercept** hooks validate and may veto/replace transactions; **post-commit** hooks receive committed facts and may enqueue durable effects. Format hooks never mutate ECS.
- Evennia's `at_init` is an object-cache/typeclass event. MudMaker `*.hydrated.after` denotes *loaded persistent game state after restart*; the two are intentionally not byte-for-byte equivalent. `at_first_save` maps to durable creation, not arbitrary database save. `func` and `parse` are overridable methods rather than technically `at_*` hooks; included because they are important extensibility points. `at_server_reload` maps to explicit controlled restart, not live assembly hot replacement.
- Evennia's public API itself evolves. The machine map records exact upstream source URLs, and new releases require a source-level drift audit.
