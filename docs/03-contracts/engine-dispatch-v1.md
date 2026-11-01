# Native engine bootstrap and dispatch v1

**Status:** Lead-approved S03.4b2 implementation contract, not evidence of implementation. Owns actual native World bootstrap/typed dispatch; b3 owns the paired executable/Windows I/O. ADR002/003/005 remain binding; ADR008 remote protocols/auth and ADR015 default game template stay OPEN. Generic object naming metadata below is not a game template or a persistence implementation.

## One native owner and concrete bootstrap

One native ControlSession owns IdentityDomain, the same frozen ComponentRegistry and one actual World. Construct World on its dispatch thread; cache its issued WorldId before transferring its allocator. No world/component mirror, alternate manager/validator, fake entities or direct storage mutation. All lifecycle/component operations call existing World methods. Initial world is empty. Catalog enumerates the same immutable published handles; no external registration is accepted in this phase.

Register exactly this trusted native component through existing register_builtin, freeze, then create World with one explicit Archetype binding:

| Item | Stable value |
|---|---|
| Component | `efbeba2d-21cd-4df8-a757-d96e53f8380c`, revision1, `mudmaker.core.named`, display `Name`, Persistent (durable-data intent, not implemented storage) |
| Name field | `dea816fc-0ae4-4eac-b02a-a1596450f93a`, name `name`, display `Name`, Text/nonnullable/required, explicit empty Text default |
| Description field | `6b76f067-e60e-49e6-8820-7a9748468de1`, name `description`, display `Description`, Text/nullable/optional, absent default |

No extra inline content constraint or enum; native global validation limits apply. Empty Text is actual stored data, not screen placeholder text. Component root is Record; omitted optional description stays absent, explicit Null stays Null. No allocator/template ID substitution, content fixtures or pre-populated world. No persistence claim from schema metadata. Lead corrected an initial Transient annotation before acceptance: existing state-persistence separates durable component values from ephemeral sockets/caches; names/descriptions belong to durable intent.

Use existing protocol-policy.json unchanged plus new runtime-policy.json. Load configuration once through the native control owner; no dependencies/pins change. Runtime settings are a strict protobuf JSON configuration message (not IPC), using pinned full protobuf's JSON utility; reject missing/zero/unknown/out-of-range/nonfinite settings, oversized configuration, invalid policy or impossible bootstrap rather than defaulting. Config files at most16384bytes each, named configuration-input safety bound. Production library takes explicit paths/config, no hardcoded developer path/default fallback. CMake supplies source paths only to test harnesses.

Runtime policy data: schema_nodes4096, schema_name_bytes256, chunk_target_bytes65536, page_limit256, minimum_control_frame_bytes2048, error_text_bytes128, error_path_bytes256. Positive checked values; page_limit must fit wire.value_nodes, minimum frame must fit configured frame. Registry value_nodes/nesting_depth/text_bytes come from the SAME wire policy, not duplicated settings. These are tunable local diagnostic controls; chunk size is initial allocation granularity, not a measured optimal size; none caps world population. Min control frame reserves bounded small acknowledgments/errors; direct codec smaller-policy support is unchanged. Error text/path settings must remain within these bounded reply guarantees; reject incompatible settings. Global single-text policy plus exactly two fields/one permitted component bounds full production entity inspection copying; reject an oversized encoded inspection with a structured error, never truncate its valid data. More bootstrap schemas require review of that bound before addition.

## Additive binary protocol

Package/major/minor stay mudmaker.engine.v1/1/0. Existing fields/enums/worker imports stay unchanged. Add Envelope body fields15–28 in order below. Request IDs nonzero and strictly increasing for one session; replies echo current request ID. IDs use existing canonical/full-reference adapters. All offsets/totals uint64, limits uint32; checked conversion to native size_t. Positive explicit page limit no greater than configured page_limit; no silent clipping/default. Pages retain b1 live semantics, with optional terminal next_offset. Session's sole paired caller restarts listing after lifecycle changes; no snapshot/replication guarantee.

| Envelope field | Payload fields (numbers) |
|---|---|
| catalog_request15 | offset:uint64=1, limit:uint32=2 |
| catalog_result16 | schemas:repeated ComponentSchemaInfo=1, total:uint64=2, optional next_offset:uint64=3 |
| list_entities_request17 | offset:uint64=1, limit:uint32=2 |
| list_entities_result18 | entities:repeated shared EntityRef=1, total:uint64=2, optional next_offset:uint64=3 |
| create_entity_request19 | components:repeated existing ComponentValue=1 |
| create_entity_result20 | entity:shared EntityRef=1 |
| destroy_entity_request21 | entity:shared EntityRef=1 |
| add_component_request22 | entity:shared EntityRef=1, component:ComponentValue=2 |
| remove_component_request23 | entity:shared EntityRef=1, component_type_id:string=2, schema_revision:uint32=3 |
| replace_component_request24 | entity:shared EntityRef=1, component:ComponentValue=2 |
| replace_field_request25 | entity:shared EntityRef=1, component_type_id:string=2, schema_revision:uint32=3, field_id:string=4, value:EngineValue=5 |
| mutation_ack26 | entity:shared EntityRef=1 (destroy echoes the destroyed reference, not a live-existence assertion) |
| shutdown_request27 | empty |
| shutdown_ack28 | empty |

Component roots/conversions retain b1's actual descriptor mapping and one aggregate conversion context per message. Add a minimal owned immutable `World::field_type(component ID,revision,FieldId)` read API using its EXISTING compiled FieldId path index; return the existing shared const ValueSchema, enforce writer/binding/revision/unknown/ListContextRequired rules. No new field index/registry/validator. Use that metadata for standalone replacement conversion, then existing replace_field owns all live/parent/type/constraint checks. No enclosing-List element address is invented.

## Lossless bounded schema metadata view

Metadata is serialization of existing handles, not a new schema authority. Use a FLAT per-component type graph so schema depth does not multiply protobuf recursion. Type IDs are local positive uint32 serialization indexes, not persistent FieldIds; unique/reachable/acyclic links, preserved actual field GUIDs, and correct kind shape are wire representation requirements. No repeated native constraint/default validator in the codec. At most wire.value_nodes type nodes across a message; frames bound all metadata bytes. Defaults/enum values across catalog siblings share existing value budget. Oversized catalog replies fail explicitly; do not omit valid metadata silently.

| Message | Fields |
|---|---|
| ComponentSchemaInfo | component_type_id:string1, schema_revision:uint32=2, name:string3, persistence:Persistence4, display:string5, description:string6, fields:repeated FieldInfo7, types:repeated TypeInfo8, placement:Placement9 |
| FieldInfo | field_id:string1, name:string2, required:bool3, default_value:EngineValue4 (message absence means NO default), display:string5, description:string6, type_id:uint32=7 |
| TypeInfo | type_id:uint32=1, kind:ValueKind2, nullable:bool3, constraints:Constraints4, fields:repeated FieldInfo5 (Record only), element_type_id:uint32=6 (List only; zero otherwise) |
| Constraints | optional integer_min:sint64=1, integer_max:sint64=2, floating_min:double3, floating_max:double4, text_min_bytes:uint64=5, text_max_bytes:uint64=6, list_min_items:uint64=7, list_max_items:uint64=8; enum_values:repeated EngineValue9; scalar bounds all have explicit presence |
| RuntimeSettings (configuration only) | schema_nodes:uint32=1, schema_name_bytes:uint32=2, chunk_target_bytes:uint64=3, page_limit:uint32=4, minimum_control_frame_bytes:uint32=5, error_text_bytes:uint32=6, error_path_bytes:uint32=7; required by config validation |

Enums use unique prefixed protobuf symbols: ValueKind zero invalid, BOOLEAN1/INTEGER2/FLOATING3/TEXT4/ENTITY5/ASSET6/RECORD7/LIST8; Persistence zero invalid, TRANSIENT1/PERSISTENT2; Placement zero invalid, ARCHETYPE1/SPARSE2. Never use native enum ordinals as wire values. Native exact shape/error vocabulary is recorded in s03-4b2-api-details.md. Preserve finite floating values, signed64 exactness, absent/default/Null, nested fields/list elements, enum values and placement. Frozen descriptor remains the accepted a baseline in this phase; compatibility against fresh descriptors must accept only additive changes, still reject a mutated existing field and verify these newly added shapes directly. Freeze new shapes after phase acceptance in a later reviewed refresh; no stale-baseline pass is proof of their implementation.

## Session, errors and outcome semantics

**Approved codec integration:** expose a bounded structural frame parse and explicit envelope validation from the SAME existing codec, with existing decode delegating both and retaining its full validation behavior. A structurally parsed Envelope is untrusted: control validates canonical nonzero request/connection correlation before an error reply; complete representation/version/pairing validation still precedes any World operation. This permits correlated unsupported-version/semantic failures without guessing headers, not a second protobuf parser or validation bypass. Expose parse_policy(text) through the SAME existing policy parser/guards so control reads each config file within its bound once, avoiding unbounded re-read or a duplicate policy parser. Regression proof retains existing malformed/version/budget rejection in decode.

Native service creation succeeds only after actual schema validation/freeze and World creation; no HelloAck after failed bootstrap. Session starts AwaitHello. Caller supplies exactly32 pairing bytes obtained from inherited bootstrap by b3, not argv/environment/webview. For b2 tests only, known non-secret fixture bytes are allowed. Validate application Hello/token/minor before latching its connection GUID; bind all later frames to that GUID/version and increasing request IDs. Compare the complete token without early byte mismatch return, erase it after handshake. Wrong token/connection/replay/server-only client body or request before Hello cannot access/mutate World. Return a bounded correlated error only when decoding supplied trusted correlation; malformed frames/messages with no valid correlation close without a guessed reply. No retry/replay.

Ready requests run sequentially on the same thread that created World. Catalog/list/inspect read existing owners; mutations use the sole gateway and its atomic failure behavior. Successful mutations return compact acknowledgments, not an unconditional full entity copy. Shutdown acknowledges once then marks Closing; b3 flushes final reply and exits. No operation after Closing mutates. No transport, PID, timeouts or shell implementation here; b3 supplies those actual OS gates.

Protocol ErrorCode stays existing: malformed representation uses MALFORMED_MESSAGE/FRAME when safely correlated; unsupported version UNSUPPORTED_PROTOCOL; pairing/connection UNAUTHORIZED; illegal request/replay/limit/conversion INVALID_REQUEST; Unavailable NOT_READY; wrong writer/internal implementation failures INTERNAL_FAILURE; normal native gateway rejection WORLD_FAILURE; Closing SHUTTING_DOWN. Static bounded diagnostics never contain token/raw payload. native_code uses explicit stable strings, never enum integer/reflection: Identity and Schema are `identity.<exact lower-case symbol>` and `schema.<exact lower-case symbol>` from the complete API packet. World codes explicitly map to `world.wrong_writer`, `unavailable`, `invalid_configuration`, `identity`, `schema`, `unknown_component`, `revision_mismatch`, `missing_component`, `duplicate_component`, `unknown_field`, `parent_unavailable`, `list_context_required`, `inbound_references`, `resource_exhausted`, `invalid_argument` (every suffix has world. prefix). For nested identity/schema failures use `world.identity/identity.<symbol>` or `world.schema/schema.<symbol>`, retaining the domain cause.

Enrich errors with validated target world/entity/component/revision and actual leaf FieldId when known. Human reason/path text is UTF-8-safely bounded by policy; no raw request/value/secret. Oversized valid reply yields `INVALID_REQUEST`/`control.response_too_large` before sending; valid data is not truncated. If even bounded error cannot encode, close and retain a bounded local diagnostic. A successful gateway mutation followed by encoding/allocation/I/O failure has UNKNOWN client outcome: close, no fabricated atomic-failure claim and no automatic replay. b3/c must preserve this distinction. No persistent log/event stream/performance/failover claim.
