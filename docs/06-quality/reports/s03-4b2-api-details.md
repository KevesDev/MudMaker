# S03.4b2 exact native API details

Read-only facts from ecs/{component_schema,identity,world}.h and existing narrow owner helpers; b1 acceptance a76c331 is Lead-provided context. No executable change, test/build/tool check or proposal.

| Metadata type | Exact members/vocabulary |
|---|---|
| FieldKind | `Boolean, Integer, Floating, Text, Entity, Asset, Record, List` |
| PersistenceMode | `Transient, Persistent` |
| FieldConstraints | `optional<int64_t> integer_min, integer_max`; `optional<double> floating_min, floating_max`; `optional<size_t> text_min_bytes, text_max_bytes, list_min_items, list_max_items`; `vector<SchemaValue> enum_values` |
| ValueSchema | `FieldKind kind`; `bool nullable`; `FieldConstraints constraints`; `vector<FieldSchema> fields`; `shared_ptr<const ValueSchema> element` |
| FieldSchema | `FieldId id`; `string name`; `bool required`; `optional<SchemaValue> default_value`; `shared_ptr<const ValueSchema> type`; `string display, description` |
| ComponentDefinition | `ComponentTypeId id`; `string name`; `uint32_t revision=0`; `PersistenceMode persistence=Transient`; `string display, description`; `vector<FieldDefinition> fields` |
| Default/value representation | `optional` absent means no explicit default; present `SchemaValue.data=monostate` means explicit Null. Variant alternatives: `monostate,bool,int64_t,double,string,EntityId,AssetReference,Record,List`; Record is name-keyed map, List is vector. |

| Error enum | Complete exact symbols; diagnostic record |
|---|---|
| IdentityErrorCode | `entropy_failure, namespace_retry_exhausted, world_unavailable, invalid_index, foreign_world, stale_generation, dead_entity, index_capacity_exhausted, resource_exhausted`; IdentityError: `code, string_view message, uint32_t platform_code=0` |
| SchemaErrorCode | `invalid_limits, invalid_id, invalid_name, invalid_revision, invalid_metadata, reserved_name, duplicate_id, duplicate_name, frozen, unknown_component, revision_mismatch, malformed_schema, cyclic_schema, limit_exceeded, invalid_constraints, invalid_default, wrong_type, null_not_allowed, required_field, unknown_field, out_of_range, invalid_utf8, invalid_reference, enum_mismatch, resource_exhausted, not_frozen`; SchemaError: `code, ComponentTypeId component, optional<FieldId> field, string path, string_view reason` |
| WorldErrorCode | `WrongWriter, Unavailable, InvalidConfiguration, Identity, Schema, UnknownComponent, RevisionMismatch, MissingComponent, DuplicateComponent, UnknownField, ParentUnavailable, ListContextRequired, InboundReferences, ResourceExhausted, InvalidArgument`; WorldError: `code, string_view reason, optional<IdentityError> identity, optional<SchemaError> schema` |

| Existing helper/access | Fact |
|---|---|
| Stable error-name helper | No public stable enum-to-name helper in inspected ecs/wire headers/implementations; numeric enum ordinals have no declared stable-name mapping. Existing std::to_string uses format List indices, not error names. |
| Field-by-ID lookup | No public helper. Registry lookup is component ID/name plus revision; immutable FieldSchema vectors expose IDs/types/defaults. World uses a private compiled FieldId path index; codec's private from_wire searches descriptor fields by ID. Neither is a public standalone field lookup. |
