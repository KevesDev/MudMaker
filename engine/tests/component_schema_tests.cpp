#include "mudmaker/ecs/component_schema.h"
#include <cmath>
#include <cstdio>
#include <limits>
#include <stdexcept>
#include <type_traits>

using namespace mudmaker::ecs;
static_assert(!std::is_same_v<ComponentTypeId, FieldId>);
static_assert(sizeof(ComponentTypeId) == 16 && sizeof(FieldId) == 16);
static_assert(std::is_const_v<ComponentSchemaHandle::element_type>);
static_assert(std::is_const_v<decltype(FieldSchema::type)::element_type>);
#define CHECK(expression) do { if (!(expression)) throw std::runtime_error(std::string(__FILE__) + ":" + std::to_string(__LINE__) + " " #expression); } while (false)

namespace {
// Explicit small test budgets; these are not runtime host defaults or storage-layout limits.
constexpr SchemaValidationLimits limits{128, 256, 12, 512, 64};
template <typename Id> Id id(std::uint8_t byte) { std::array<std::uint8_t, 16> bytes{}; bytes.back() = byte; return Id(bytes); }
template <typename T> T take(SchemaResult<T> result) {
  if (const auto error = std::get_if<SchemaError>(&result)) throw std::runtime_error(error->path + ": " + std::string(error->reason));
  return std::move(std::get<T>(result));
}
template <typename T> SchemaError rejected(const SchemaResult<T>& result, SchemaErrorCode code) {
  CHECK(std::holds_alternative<SchemaError>(result));
  const auto& error = std::get<SchemaError>(result);
  CHECK(error.code == code); CHECK(!error.reason.empty());
  return error;
}
std::shared_ptr<ValueDefinition> type(FieldKind kind, bool nullable = false) {
  auto result = std::make_shared<ValueDefinition>(); result->kind = kind; result->nullable = nullable; return result;
}
FieldDefinition field(std::uint8_t number, std::string name, FieldKind kind, bool required = false) {
  return {id<FieldId>(number), std::move(name), required, {}, type(kind), {}, {}};
}
ComponentDefinition component(std::uint8_t number = 1, std::string name = "creator.stats") {
  return {id<ComponentTypeId>(number), std::move(name), 1, PersistenceMode::Persistent, "Stats", "Logical authored fields", {}};
}
SchemaValue record(SchemaValue::Record value = {}) { return {std::move(value)}; }
SchemaValue list(SchemaValue::List value = {}) { return {std::move(value)}; }

void shared_registration_ownership_lookup_and_freeze() {
  ComponentSchemaHandle retained;
  auto definition = component(1, "mudmaker.stats");
  definition.fields.push_back(field(1, "count", FieldKind::Integer, true));
  definition.fields[0].default_value = SchemaValue{std::int64_t{4}};
  {
    auto registry = take(ComponentRegistry::create(limits));
    rejected(registry->register_creator(definition), SchemaErrorCode::reserved_name);
    retained = take(registry->register_builtin(definition));
    CHECK(take(registry->lookup(definition.id, 1)) == retained);
    CHECK(take(registry->lookup("mudmaker.stats", 1)) == retained);
    auto creator = definition; creator.id = id<ComponentTypeId>(2); creator.name = "creator.stats";
    take(registry->register_creator(creator));
    const auto expected = record({{"count", {std::int64_t{4}}}});
    CHECK(take(registry->validate_value(definition.id, 1, record())) == expected);
    CHECK(take(registry->validate_value(creator.id, 1, record())) == expected);
    definition.fields[0].type->kind = FieldKind::Text;
    definition.fields[0].default_value = SchemaValue{std::string("changed")};
    definition.description = "changed";
    CHECK(retained->fields[0].type->kind == FieldKind::Integer);
    CHECK(std::get<std::int64_t>(retained->fields[0].default_value->data) == 4);
    CHECK(retained->description == "Logical authored fields");
    const auto count = registry->size();
    rejected(registry->register_builtin(creator), SchemaErrorCode::duplicate_id);
    creator.revision = 2;
    rejected(registry->register_creator(creator), SchemaErrorCode::duplicate_id);
    creator.id = id<ComponentTypeId>(3);
    rejected(registry->register_creator(creator), SchemaErrorCode::duplicate_name);
    CHECK(registry->size() == count);
    rejected(registry->lookup(id<ComponentTypeId>(9), 1), SchemaErrorCode::unknown_component);
    rejected(registry->lookup("creator.unknown", 1), SchemaErrorCode::unknown_component);
    rejected(registry->lookup(retained->id, 2), SchemaErrorCode::revision_mismatch);
    registry->freeze(); registry->freeze();
    rejected(registry->register_creator(component(4)), SchemaErrorCode::frozen);
    CHECK(registry->size() == count);
  }
  CHECK(retained->name == "mudmaker.stats" && retained->fields[0].name == "count");
}
void metadata_and_identity_rejection_is_atomic() {
  auto registry = take(ComponentRegistry::create(limits));
  auto definition = component();
  definition.id = {};
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_id);
  definition = component(); definition.revision = 0;
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_revision);
  for (const auto* name : {"one", "Creator.stats", "creator..stats", "creator.1bad"}) {
    definition = component(); definition.name = name;
    rejected(registry->register_creator(definition), SchemaErrorCode::invalid_name);
  }
  definition = component(); definition.fields.push_back(field(1, "bad-name", FieldKind::Boolean));
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_name);
  definition.fields[0].name = "ok"; definition.fields[0].id = {};
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_id);
  definition = component(); definition.persistence = static_cast<PersistenceMode>(99);
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_metadata);
  CHECK(registry->size() == 0);
}
void required_nullable_defaults_nested_records_and_lists() {
  auto registry = take(ComponentRegistry::create(limits));
  auto definition = component();
  auto profile = field(1, "profile", FieldKind::Record, true);
  auto level = field(2, "level", FieldKind::Integer, true);
  level.default_value = SchemaValue{std::int64_t{3}};
  level.type->constraints.integer_min = 1; level.type->constraints.integer_max = 5;
  auto nickname = field(3, "nickname", FieldKind::Text); nickname.type->nullable = true;
  auto tags = field(4, "tags", FieldKind::List);
  tags.type->element = type(FieldKind::Text); tags.type->constraints.list_max_items = 2;
  tags.default_value = list({SchemaValue{std::string("ok")}});
  profile.type->fields = {level, nickname, tags}; profile.default_value = record();
  definition.fields = {profile};
  take(registry->register_creator(definition));
  const auto result = take(registry->validate_value(definition.id, 1, record()));
  CHECK(result == record({{"profile", record({{"level", {std::int64_t{3}}}, {"tags", list({{std::string("ok")}})}})}}));
  const auto explicit_null = record({{"profile", record({{"nickname", {}}})}});
  CHECK(std::holds_alternative<SchemaValue>(registry->validate_value(definition.id, 1, explicit_null)));
  auto error = rejected(registry->validate_value(definition.id, 1, record({{"profile", record({{"level", {}}})}})), SchemaErrorCode::null_not_allowed);
  CHECK(error.path == "$.profile.level" && error.field == level.id && error.component == definition.id);
  error = rejected(registry->validate_value(definition.id, 1, record({{"profile", record({{"extra", {true}}})}})), SchemaErrorCode::unknown_field);
  CHECK(error.path == "$.profile.extra");
  error = rejected(registry->validate_value(definition.id, 1, record({{"profile", record({{"tags", list({{true}})}})}})), SchemaErrorCode::wrong_type);
  CHECK(error.path == "$.profile.tags[0]");
  auto required = component(2, "creator.required"); required.fields.push_back(field(5, "value", FieldKind::Boolean, true));
  take(registry->register_creator(required));
  rejected(registry->validate_value(required.id, 1, record()), SchemaErrorCode::required_field);
}
void primitives_ranges_enums_and_utf8_bytes() {
  auto registry = take(ComponentRegistry::create(limits)); auto definition = component();
  auto integer = field(1, "amount", FieldKind::Integer); integer.type->constraints.integer_min = -2; integer.type->constraints.integer_max = 5;
  integer.type->constraints.enum_values = {{std::int64_t{-2}}, {std::int64_t{5}}};
  auto floating = field(2, "ratio", FieldKind::Floating); floating.type->constraints.floating_min = 0.0; floating.type->constraints.floating_max = 1.0;
  auto text = field(3, "text", FieldKind::Text); text.type->constraints.text_max_bytes = 2;
  definition.fields = {integer, floating, text, field(4, "enabled", FieldKind::Boolean)};
  take(registry->register_creator(definition));
  const auto valid = record({{"amount", {std::int64_t{-2}}}, {"ratio", {1.0}}, {"text", {std::string("\xc3\xa9")}}, {"enabled", {true}}});
  CHECK(take(registry->validate_value(definition.id, 1, valid)) == valid);
  rejected(registry->validate_value(definition.id, 1, record({{"amount", {5.0}}})), SchemaErrorCode::wrong_type);
  rejected(registry->validate_value(definition.id, 1, record({{"amount", {std::int64_t{6}}}})), SchemaErrorCode::out_of_range);
  rejected(registry->validate_value(definition.id, 1, record({{"amount", {std::int64_t{0}}}})), SchemaErrorCode::enum_mismatch);
  rejected(registry->validate_value(definition.id, 1, record({{"ratio", {std::numeric_limits<double>::quiet_NaN()}}})), SchemaErrorCode::out_of_range);
  rejected(registry->validate_value(definition.id, 1, record({{"ratio", {std::numeric_limits<double>::infinity()}}})), SchemaErrorCode::out_of_range);
  rejected(registry->validate_value(definition.id, 1, record({{"text", {std::string("\xc3\xa9x")}}})), SchemaErrorCode::out_of_range);
  rejected(registry->validate_value(definition.id, 1, record({{"text", {std::string("\xc0\xaf")}}})), SchemaErrorCode::invalid_utf8);
}
void schema_constraints_and_defaults_use_the_same_value_rules() {
  auto registry = take(ComponentRegistry::create(limits)); auto definition = component();
  definition.fields.push_back(field(1, "value", FieldKind::Integer));
  auto& item = definition.fields[0];
  item.type->constraints.integer_min = 2; item.type->constraints.integer_max = 1;
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_constraints);
  item.type->constraints.integer_max = 5; item.default_value = SchemaValue{std::int64_t{1}};
  CHECK(rejected(registry->register_creator(definition), SchemaErrorCode::out_of_range).path == "$.value.default");
  item.default_value = {}; item.type->constraints.enum_values = {{std::int64_t{2}}, {std::int64_t{2}}};
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_constraints);
  item.type->constraints.enum_values = {{true}};
  rejected(registry->register_creator(definition), SchemaErrorCode::wrong_type);
  item.type->nullable = true; item.type->constraints.enum_values = {SchemaValue{}};
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_constraints);
  item.type->constraints.enum_values.clear(); item.type->constraints.floating_min = 0.0;
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_constraints);
  item.type->constraints = {}; item.type->kind = FieldKind::Floating; item.type->constraints.floating_max = std::numeric_limits<double>::infinity();
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_constraints);
  CHECK(registry->size() == 0);
}
void references_validate_representation_not_existence_and_disallow_entity_defaults() {
  IdentityDomain domain;
  auto issued = domain.create_world(); CHECK(std::holds_alternative<WorldAllocator>(issued));
  auto world = std::move(std::get<WorldAllocator>(issued));
  auto entity_result = world.create(); CHECK(std::holds_alternative<EntityId>(entity_result));
  const auto entity = std::get<EntityId>(entity_result);
  auto registry = take(ComponentRegistry::create(limits)); auto definition = component();
  auto owner = field(1, "owner", FieldKind::Entity); owner.type->nullable = true;
  const AssetReference asset{id<AssetId>(7), 1};
  auto source = field(2, "source", FieldKind::Asset); source.default_value = SchemaValue{asset};
  definition.fields = {owner, source}; take(registry->register_creator(definition));
  // An unallocated index with valid representation is accepted: this module does not fake lookup.
  auto represented = entity; represented.index = 123;
  CHECK(take(registry->validate_value(definition.id, 1, record({{"owner", {represented}}}))) == record({{"owner", {represented}}, {"source", {asset}}}));
  rejected(registry->validate_value(definition.id, 1, record({{"owner", {EntityId{}}}})), SchemaErrorCode::invalid_reference);
  rejected(registry->validate_value(definition.id, 1, record({{"source", {AssetReference{id<AssetId>(7), 0}}}})), SchemaErrorCode::invalid_reference);
  definition.id = id<ComponentTypeId>(2); definition.name = "creator.default"; definition.fields[0].default_value = SchemaValue{entity};
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_default);
  definition.fields[0].default_value = SchemaValue{};
  take(registry->register_creator(definition));
}
void malformed_and_cyclic_schemas_do_not_publish() {
  auto registry = take(ComponentRegistry::create(limits)); auto definition = component();
  definition.fields.push_back(field(1, "items", FieldKind::List));
  rejected(registry->register_creator(definition), SchemaErrorCode::malformed_schema);
  auto cycle = type(FieldKind::Record); cycle->fields.push_back(field(2, "again", FieldKind::Record)); cycle->fields[0].type = cycle;
  definition.fields[0].type = cycle;
  rejected(registry->register_creator(definition), SchemaErrorCode::cyclic_schema);
  cycle->fields.clear(); // release the intentionally cyclic input fixture
  auto nested = type(FieldKind::Record); nested->fields.push_back(field(1, "duplicate", FieldKind::Boolean));
  definition.fields[0].type = nested;
  rejected(registry->register_creator(definition), SchemaErrorCode::invalid_id);
  definition.fields[0].type.reset();
  rejected(registry->register_creator(definition), SchemaErrorCode::malformed_schema);
  CHECK(registry->size() == 0);
}
void caller_limits_bound_schema_and_actual_default_value_processing() {
  rejected(ComponentRegistry::create({0, 1, 1, 1, 1}), SchemaErrorCode::invalid_limits);
  rejected(ComponentRegistry::create({1, 1, std::numeric_limits<std::size_t>::max(), 1, 1}), SchemaErrorCode::invalid_limits);
  auto registry = take(ComponentRegistry::create({8, 4, 4, 8, 32})); auto definition = component();
  definition.display.clear(); definition.description.clear();
  auto items = field(1, "items", FieldKind::List); items.type->element = type(FieldKind::Integer); definition.fields = {items};
  take(registry->register_creator(definition));
  CHECK(rejected(registry->validate_value(definition.id, 1, record({{"items", list({{std::int64_t{1}}, {std::int64_t{2}}, {std::int64_t{3}}})}})), SchemaErrorCode::limit_exceeded).path == "$.items");
  auto too_big = component(2, "creator.big"); too_big.display.clear(); too_big.description.clear();
  too_big.fields = {field(2, "text", FieldKind::Text)}; too_big.fields[0].default_value = SchemaValue{std::string(9, 'x')};
  rejected(registry->register_creator(too_big), SchemaErrorCode::limit_exceeded);
  too_big.fields.clear(); for (std::uint8_t i = 1; i < 6; ++i) too_big.fields.push_back(field(i, "f" + std::to_string(i), FieldKind::Boolean));
  rejected(registry->register_creator(too_big), SchemaErrorCode::limit_exceeded);
  CHECK(registry->size() == 1);
}
}  // namespace
int main() {
  const std::pair<const char*, void(*)()> tests[] = {
    {"shared registration, immutable ownership, lookup and freeze", shared_registration_ownership_lookup_and_freeze},
    {"metadata and ID rejection is atomic", metadata_and_identity_rejection_is_atomic},
    {"required/null/default nested Record/List validation", required_nullable_defaults_nested_records_and_lists},
    {"primitive ranges/enums and UTF8 bytes", primitives_ranges_enums_and_utf8_bytes},
    {"schema constraints/defaults use actual value rules", schema_constraints_and_defaults_use_the_same_value_rules},
    {"reference representation and world-independent defaults", references_validate_representation_not_existence_and_disallow_entity_defaults},
    {"malformed/cyclic schemas reject", malformed_and_cyclic_schemas_do_not_publish},
    {"explicit caller budgets bound processing", caller_limits_bound_schema_and_actual_default_value_processing},
  };
  int failures = 0;
  for (const auto& [name, run] : tests) {
    try { run(); std::printf("PASS %s\n", name); }
    catch (const std::exception& error) { ++failures; std::printf("FAIL %s: %s\n", name, error.what()); }
  }
  std::printf("%zu schema cases, %d failed\n", std::size(tests), failures);
  return failures == 0 ? 0 : 1;
}
