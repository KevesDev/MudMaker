# Project Assets, ECS Persistence, Versioning and Restore

**Status:** PROPOSED. **Owner:** persistence + schema registry. **Dependencies:** ECS, space, event contracts.

## Separate three kinds of data
1. **Project definitions (authoring):** component schemas, entity/room/exit templates, node graphs, world-system definitions, map layout/color/icons, scripts, region topology, hosting manifest. Version-controlled project package, not a live engine registry.
2. **Runtime durable state:** entity IDs, component values, containment relationships, route progress, world clock, schedules, event cursor, player inventories and persistent game variables.
3. **Ephemeral/transient state:** UI selection/focus/panel placement, current sockets, temporary caches and derived query indexes. Must rebuild safely and never masquerade as durable gameplay data.

## Schema requirements
Every data asset has stable ID, version, validation schema, owner/scope and explicit references. Serializer must reject unknown incompatible schema versions or run reviewed migrations; never drop fields silently. Human-readable project formats are desirable, but file format (JSON vs other), binary snapshots, DB implementation and engine language are OPEN. The original v1.1 envisioned JSON + embedded SQLite, while the current Maven pom uses H2: neither is automatically approved.

## Save/restore semantics
- Document transaction/snapshot atomicity and crash recovery, write-order guarantee and idempotent replay boundary.
- Save a *consistent* world epoch including containment, train route/stop, NPC/item state, scheduled actions and event cursor; a half-committed boarding action must never be restored.
- Restore validates entity references, component versions, location parent cycles, exit target bindings and scheduled action owners. On corrupt data, quarantine/read-only diagnostics rather than destructive automatic repair.
- Separate authoring saves from live publish. Editing color/icon should update project map draft; editing a live entity is an authorized admin transaction or controlled deploy.
- Backup/restore includes version compatibility check, integrity status, last known good artifact and retention policy. Do not expose unencrypted secrets in portable project exports.
- Import/export roundtrip must preserve behavior graph, custom schemas and nested entities, not merely visually arranged cells.

## Blueprint versions and instances
Instantiated entities record originating asset/version. Creator changes to blueprint defaults require explicit choice: future instances only, safe migrate existing instances, or deliberate override of selected fields. Override precedence must be defined and inspectable; avoid merging silently. Deleted blueprints may remain referenced by a running published version until migration.

## Migration
Components, node graph schemas, map/exit shape and protocol payloads each use versioning and migrations. Enforce forward/back compatibility policies by a central registry. Migration tests require old real serialized fixtures and actual readback. No migration tests that merely serialize and deserialize the latest schema.

## Multi-world isolation and security
Every durable entity is tied to world instance and project version; account identity is handled through auth/session layer. Access checks on all import/export, backups, admin endpoints. Limits on archive extraction, path traversal and script asset loading are mandatory.

## Failure and performance tests
- Interrupted snapshot commit then restart: all-or-nothing state, no duplication.
- Save while a train moves and player changes cars: restored train at lawful progress, player in same car, item owned by correct carrier.
- Restore a room with a dynamic locked exit and weather controller.
- Schema migrate from a prior fixture; report exact unsupported cases.
- Many entities + frequent state deltas meet measured latency/storage budgets (targets OPEN).
