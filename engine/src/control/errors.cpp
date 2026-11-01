#include "mudmaker/control/session.h"
namespace mudmaker::control {
std::string native_code(const ecs::IdentityError& error) {
  switch (error.code) {
    case ecs::IdentityErrorCode::entropy_failure: return "identity.entropy_failure";
    case ecs::IdentityErrorCode::namespace_retry_exhausted: return "identity.namespace_retry_exhausted";
    case ecs::IdentityErrorCode::world_unavailable: return "identity.world_unavailable";
    case ecs::IdentityErrorCode::invalid_index: return "identity.invalid_index";
    case ecs::IdentityErrorCode::foreign_world: return "identity.foreign_world";
    case ecs::IdentityErrorCode::stale_generation: return "identity.stale_generation";
    case ecs::IdentityErrorCode::dead_entity: return "identity.dead_entity";
    case ecs::IdentityErrorCode::index_capacity_exhausted: return "identity.index_capacity_exhausted";
    case ecs::IdentityErrorCode::resource_exhausted: return "identity.resource_exhausted";
  }
  return "control.unknown_native_error";
}
std::string native_code(const ecs::SchemaError& error) {
  switch (error.code) {
    case ecs::SchemaErrorCode::invalid_limits: return "schema.invalid_limits";
    case ecs::SchemaErrorCode::invalid_id: return "schema.invalid_id";
    case ecs::SchemaErrorCode::invalid_name: return "schema.invalid_name";
    case ecs::SchemaErrorCode::invalid_revision: return "schema.invalid_revision";
    case ecs::SchemaErrorCode::invalid_metadata: return "schema.invalid_metadata";
    case ecs::SchemaErrorCode::reserved_name: return "schema.reserved_name";
    case ecs::SchemaErrorCode::duplicate_id: return "schema.duplicate_id";
    case ecs::SchemaErrorCode::duplicate_name: return "schema.duplicate_name";
    case ecs::SchemaErrorCode::frozen: return "schema.frozen";
    case ecs::SchemaErrorCode::unknown_component: return "schema.unknown_component";
    case ecs::SchemaErrorCode::revision_mismatch: return "schema.revision_mismatch";
    case ecs::SchemaErrorCode::malformed_schema: return "schema.malformed_schema";
    case ecs::SchemaErrorCode::cyclic_schema: return "schema.cyclic_schema";
    case ecs::SchemaErrorCode::limit_exceeded: return "schema.limit_exceeded";
    case ecs::SchemaErrorCode::invalid_constraints: return "schema.invalid_constraints";
    case ecs::SchemaErrorCode::invalid_default: return "schema.invalid_default";
    case ecs::SchemaErrorCode::wrong_type: return "schema.wrong_type";
    case ecs::SchemaErrorCode::null_not_allowed: return "schema.null_not_allowed";
    case ecs::SchemaErrorCode::required_field: return "schema.required_field";
    case ecs::SchemaErrorCode::unknown_field: return "schema.unknown_field";
    case ecs::SchemaErrorCode::out_of_range: return "schema.out_of_range";
    case ecs::SchemaErrorCode::invalid_utf8: return "schema.invalid_utf8";
    case ecs::SchemaErrorCode::invalid_reference: return "schema.invalid_reference";
    case ecs::SchemaErrorCode::enum_mismatch: return "schema.enum_mismatch";
    case ecs::SchemaErrorCode::resource_exhausted: return "schema.resource_exhausted";
    case ecs::SchemaErrorCode::not_frozen: return "schema.not_frozen";
  }
  return "control.unknown_native_error";
}
std::string native_code(const ecs::WorldError& error) {
  if (error.code == ecs::WorldErrorCode::Identity && error.identity) return "world.identity/" + native_code(*error.identity);
  if (error.code == ecs::WorldErrorCode::Schema && error.schema) return "world.schema/" + native_code(*error.schema);
  switch (error.code) {
    case ecs::WorldErrorCode::WrongWriter: return "world.wrong_writer";
    case ecs::WorldErrorCode::Unavailable: return "world.unavailable";
    case ecs::WorldErrorCode::InvalidConfiguration: return "world.invalid_configuration";
    case ecs::WorldErrorCode::Identity: return "world.identity";
    case ecs::WorldErrorCode::Schema: return "world.schema";
    case ecs::WorldErrorCode::UnknownComponent: return "world.unknown_component";
    case ecs::WorldErrorCode::RevisionMismatch: return "world.revision_mismatch";
    case ecs::WorldErrorCode::MissingComponent: return "world.missing_component";
    case ecs::WorldErrorCode::DuplicateComponent: return "world.duplicate_component";
    case ecs::WorldErrorCode::UnknownField: return "world.unknown_field";
    case ecs::WorldErrorCode::ParentUnavailable: return "world.parent_unavailable";
    case ecs::WorldErrorCode::ListContextRequired: return "world.list_context_required";
    case ecs::WorldErrorCode::InboundReferences: return "world.inbound_references";
    case ecs::WorldErrorCode::ResourceExhausted: return "world.resource_exhausted";
    case ecs::WorldErrorCode::InvalidArgument: return "world.invalid_argument";
  }
  return "control.unknown_native_error";
}
}  // namespace mudmaker::control
