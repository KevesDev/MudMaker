#include "mudmaker/ecs/world.h"
#include <array>
#include <cstdio>
#include <stdexcept>
#include <thread>

using namespace mudmaker::ecs;
#define CHECK(expression) do { if (!(expression)) throw std::runtime_error(std::string(__FILE__) + ":" + std::to_string(__LINE__) + " " #expression); } while (false)
namespace {
template <typename Id> Id id(std::uint8_t byte) { std::array<std::uint8_t, 16> bytes{}; bytes.back() = byte; return Id(bytes); }
template <typename T> T schema(SchemaResult<T> result) {
  if (const auto error = std::get_if<SchemaError>(&result)) throw std::runtime_error(error->path + ": " + std::string(error->reason));
  return std::move(std::get<T>(result));
}
template <typename T> T take(WorldResult<T> result) {
  if (const auto error = std::get_if<WorldError>(&result)) throw std::runtime_error(std::string(error->reason));
  return std::move(std::get<T>(result));
}
template <typename T> WorldError rejected(const WorldResult<T>& result, WorldErrorCode code) {
  CHECK(std::holds_alternative<WorldError>(result)); const auto& error = std::get<WorldError>(result);
  CHECK(error.code == code); CHECK(!error.reason.empty()); return error;
}
SchemaValue record(SchemaValue::Record value = {}) { return {std::move(value)}; }
SchemaValue list(SchemaValue::List value = {}) { return {std::move(value)}; }
std::shared_ptr<ValueDefinition> type(FieldKind kind, bool nullable = false) { auto value = std::make_shared<ValueDefinition>(); value->kind = kind; value->nullable = nullable; return value; }
FieldDefinition field(std::uint8_t number, std::string name, FieldKind kind, bool required = false) { return {id<FieldId>(number), std::move(name), required, {}, type(kind), {}, {}}; }
ComponentDefinition definition(std::uint8_t number, std::string name) { return {id<ComponentTypeId>(number), std::move(name), 1, PersistenceMode::Transient, {}, {}, {}}; }
struct Fixture {
  std::shared_ptr<ComponentRegistry> registry;
  std::unique_ptr<World> world;
  Fixture() {
    registry = schema(ComponentRegistry::create({128, 512, 12, 1024, 64}));
    auto data = definition(1, "creator.data");
    auto count = field(1, "count", FieldKind::Integer, true); count.default_value = SchemaValue{std::int64_t{1}};
    count.type->constraints.integer_min = 0; count.type->constraints.integer_max = 1000;
    auto name = field(2, "name", FieldKind::Text, true); name.default_value = SchemaValue{std::string("one")};
    auto profile = field(3, "profile", FieldKind::Record); profile.type->nullable = true;
    auto score = field(4, "score", FieldKind::Integer, true); score.default_value = SchemaValue{std::int64_t{3}};
    auto owner = field(11, "owner", FieldKind::Entity); owner.type->nullable = true; profile.type->fields = {score, owner};
    auto items = field(5, "items", FieldKind::List); items.type->element = type(FieldKind::Record);
    items.type->element->fields = {field(6, "label", FieldKind::Text, true)};
    auto links = field(7, "links", FieldKind::List); links.type->element = type(FieldKind::Entity);
    auto ratio = field(8, "ratio", FieldKind::Floating, true); ratio.default_value = SchemaValue{0.5};
    auto enabled = field(9, "enabled", FieldKind::Boolean, true); enabled.default_value = SchemaValue{true};
    data.fields = {count, name, profile, items, links, ratio, enabled, field(10, "asset", FieldKind::Asset)};
    schema(registry->register_creator(data));
    auto extra = definition(2, "creator.extra"); extra.fields = {field(1, "health", FieldKind::Integer)}; schema(registry->register_creator(extra));
    schema(registry->register_builtin(definition(3, "mudmaker.tag")));
    auto churn = definition(4, "creator.churn"); churn.fields = {field(1, "note", FieldKind::Text)}; schema(registry->register_creator(churn));
    registry->freeze();
    IdentityDomain domain; auto issued = domain.create_world(); CHECK(std::holds_alternative<WorldAllocator>(issued));
    const ComponentBinding bindings[] = {{data.id, 1}, {extra.id, 1}, {id<ComponentTypeId>(3), 1}, {churn.id, 1, StoragePlacement::Sparse}};
    // Tiny explicit fixture chunks force real growth/cross-chunk swap removal, not a host budget.
    world = take(World::create(std::move(std::get<WorldAllocator>(issued)), registry, bindings, {64}));
  }
};
ComponentValue component(std::uint8_t number, SchemaValue value = record()) { return {id<ComponentTypeId>(number), 1, std::move(value)}; }
EntityId create(World& world, std::initializer_list<ComponentValue> components = {}) { return take(world.create_entity(std::span(components.begin(), components.size()))); }
SchemaValue data_value(std::int64_t count, std::string name) {
  return record({{"count", {count}}, {"name", {std::move(name)}}, {"profile", record({{"score", {count}}})},
      {"items", list({record({{"label", {std::string("owned list text")}}})})}, {"asset", {AssetReference{id<AssetId>(9), 1}}}});
}
const ComponentInspection& find(const EntityInspection& entity, std::uint8_t number) {
  for (const auto& value : entity.components) if (value.schema->id == id<ComponentTypeId>(number)) return value;
  throw std::runtime_error("Missing inspected component");
}
void lifecycle_and_errors_preserve_world_state() {
  Fixture fixture, foreign; auto& world = *fixture.world;
  const auto entity = create(world, {component(1)}); const auto before = take(world.inspect(entity));
  rejected(world.add_component(entity, component(1)), WorldErrorCode::DuplicateComponent);
  rejected(world.remove_component(entity, id<ComponentTypeId>(2), 1), WorldErrorCode::MissingComponent);
  rejected(world.add_component(entity, component(99)), WorldErrorCode::UnknownComponent);
  auto wrong_revision = component(2); wrong_revision.revision = 2;
  rejected(world.add_component(entity, wrong_revision), WorldErrorCode::RevisionMismatch);
  const auto other = create(*foreign.world);
  CHECK(rejected(world.inspect(other), WorldErrorCode::Identity).identity->code == IdentityErrorCode::foreign_world);
  CHECK(take(world.inspect(entity)) == before);
  const auto live_before = take(world.inspect_live(10));
  rejected(world.create_entity(std::array{component(1, record({{"count", {std::int64_t{-1}}}}))}), WorldErrorCode::Schema);
  CHECK(take(world.inspect_live(10)) == live_before);
  take(world.destroy_entity(entity));
  CHECK(rejected(world.destroy_entity(entity), WorldErrorCode::Identity).identity->code == IdentityErrorCode::stale_generation);
  const auto replacement = create(world);
  CHECK(replacement.index == entity.index && replacement.generation == entity.generation + 1);
  CHECK(take(world.inspect(replacement)).components.empty());
}
void compiled_columns_survive_growth_transitions_and_swap_removal() {
  Fixture fixture; auto& world = *fixture.world;
  std::vector<EntityId> entities; std::vector<SchemaValue> expected;
  for (std::int64_t i = 0; i < 6; ++i) {
    const auto entity = create(world, {component(1, data_value(i, std::string(128, static_cast<char>('a' + i))))});
    entities.push_back(entity); expected.push_back(find(take(world.inspect(entity)), 1).value);
  }
  CHECK(take(world.inspect(entities.back())).chunk > 0);
  take(world.add_component(entities[1], component(2, record({{"health", {std::int64_t{10}}}}))));
  CHECK(find(take(world.inspect(entities[1])), 1).value == expected[1]);
  take(world.remove_component(entities[1], id<ComponentTypeId>(2), 1));
  take(world.destroy_entity(entities[2]));
  for (std::size_t i = 0; i < entities.size(); ++i) if (i != 2) CHECK(find(take(world.inspect(entities[i])), 1).value == expected[i]);
  auto owned = take(world.inspect(entities[0])); std::get<SchemaValue::Record>(owned.components[0].value.data)["name"] = SchemaValue{std::string("edited copy")};
  CHECK(find(take(world.inspect(entities[0])), 1).value == expected[0]);
}
void sparse_churn_never_migrates_archetype_and_repairs_dense_locations() {
  Fixture fixture; auto& world = *fixture.world;
  const auto a = create(world, {component(1)}), b = create(world, {component(1)});
  const auto before = take(world.inspect(a));
  take(world.add_component(a, component(3))); take(world.add_component(a, component(4, record({{"note", {std::string("a")}}}))));
  take(world.add_component(b, component(4, record({{"note", {std::string("b")}}}))));
  auto now = take(world.inspect(a)); CHECK(now.archetype == before.archetype && now.chunk == before.chunk && now.row == before.row);
  CHECK(find(now, 3).placement == StoragePlacement::Sparse && find(now, 4).placement == StoragePlacement::Sparse);
  take(world.remove_component(a, id<ComponentTypeId>(4), 1));
  CHECK(find(take(world.inspect(b)), 4).value == record({{"note", {std::string("b")}}}));
  take(world.destroy_entity(a));
  const auto fresh = create(world); CHECK(fresh.index == a.index && take(world.inspect(fresh)).components.empty());
  CHECK(find(take(world.inspect(b)), 4).value == record({{"note", {std::string("b")}}}));
}
void typed_field_paths_and_whole_replacements_are_atomic() {
  Fixture fixture; auto& world = *fixture.world; const auto entity = create(world, {component(1)});
  auto before = take(world.inspect(entity));
  rejected(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(4), {std::int64_t{5}}), WorldErrorCode::ParentUnavailable);
  rejected(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(6), {std::string("inside list")}), WorldErrorCode::ListContextRequired);
  rejected(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(99), {true}), WorldErrorCode::UnknownField);
  const auto error = rejected(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(1), {std::int64_t{-1}}), WorldErrorCode::Schema);
  CHECK(error.schema->path == "$.count" && error.schema->field == id<FieldId>(1));
  CHECK(take(world.inspect(entity)) == before);
  take(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(3), SchemaValue{}));
  before = take(world.inspect(entity));
  rejected(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(4), {std::int64_t{5}}), WorldErrorCode::ParentUnavailable);
  CHECK(take(world.inspect(entity)) == before);
  take(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(3), record()));
  take(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(4), {std::int64_t{5}}));
  take(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(5), list({record({{"label", {std::string("changed")}}})})));
  take(world.replace_component(entity, component(1, record({{"name", {std::string("whole replacement")}}}))));
  CHECK(find(take(world.inspect(entity)), 1).value == schema(fixture.registry->validate_value(id<ComponentTypeId>(1), 1, record({{"name", {std::string("whole replacement")}}}))));
}
void nested_live_references_and_indexed_destruction_are_consistent() {
  Fixture fixture, foreign; auto& world = *fixture.world;
  const auto target = create(world), other = create(world);
  const auto source = create(world, {component(1, record({{"links", list({{target}, {target}})}, {"profile", record({{"owner", {other}}})}}))});
  const auto before = take(world.inspect(source));
  rejected(world.destroy_entity(target), WorldErrorCode::InboundReferences);
  rejected(world.destroy_entity(other), WorldErrorCode::InboundReferences);
  const auto alien = create(*foreign.world);
  CHECK(rejected(world.replace_field(source, id<ComponentTypeId>(1), 1, id<FieldId>(7), list({{alien}})), WorldErrorCode::Identity).identity->code == IdentityErrorCode::foreign_world);
  CHECK(take(world.inspect(source)) == before);
  take(world.replace_field(source, id<ComponentTypeId>(1), 1, id<FieldId>(7), list({{other}})));
  take(world.destroy_entity(target));
  rejected(world.replace_field(source, id<ComponentTypeId>(1), 1, id<FieldId>(7), list({{target}})), WorldErrorCode::Identity);
  take(world.remove_component(source, id<ComponentTypeId>(1), 1)); take(world.destroy_entity(other));
  take(world.add_component(source, component(1, record({{"links", list({{source}})}}))));
  take(world.destroy_entity(source)); // self references are removed, not treated as external inbound
  CHECK(take(world.inspect_live(10)).empty());
}
void all_live_operations_reject_the_wrong_writer_and_owned_inspection_can_cross_threads() {
  Fixture fixture; auto& world = *fixture.world; const auto entity = create(world, {component(1)}); const auto before = take(world.inspect(entity));
  std::vector<WorldErrorCode> errors;
  std::thread reader([&] {
    errors.push_back(std::get<WorldError>(world.inspect(entity)).code);
    errors.push_back(std::get<WorldError>(world.inspect_live(1)).code);
    errors.push_back(std::get<WorldError>(world.create_entity()).code);
    errors.push_back(std::get<WorldError>(world.destroy_entity(entity)).code);
    errors.push_back(std::get<WorldError>(world.add_component(entity, component(3))).code);
    errors.push_back(std::get<WorldError>(world.remove_component(entity, id<ComponentTypeId>(1), 1)).code);
    errors.push_back(std::get<WorldError>(world.replace_component(entity, component(1))).code);
    errors.push_back(std::get<WorldError>(world.replace_field(entity, id<ComponentTypeId>(1), 1, id<FieldId>(1), {std::int64_t{2}})).code);
    CHECK(!before.components.empty());
  }); reader.join();
  CHECK(errors.size() == 8); for (auto error : errors) CHECK(error == WorldErrorCode::WrongWriter);
  CHECK(take(world.inspect(entity)) == before);
}
void bounded_live_index_survives_swap_removal() {
  Fixture fixture; auto& world = *fixture.world;
  const auto a = create(world), b = create(world), c = create(world);
  CHECK(take(world.inspect_live(0)).empty()); CHECK(take(world.inspect_live(2)).size() == 2);
  take(world.destroy_entity(b)); CHECK(take(world.inspect_live(10)) == (std::vector<EntityId>{a, c}));
  auto copy = take(world.inspect_live(1)); copy[0] = {};
  CHECK(take(world.inspect_live(1))[0] == a);
}
void factory_rejects_identity_without_matching_storage() {
  Fixture fixture;
  IdentityDomain domain;
  auto issued = domain.create_world(); CHECK(std::holds_alternative<WorldAllocator>(issued));
  auto allocator = std::move(std::get<WorldAllocator>(issued));
  const auto identity = allocator.create(); CHECK(std::holds_alternative<EntityId>(identity));
  const auto before = allocator.diagnostics();
  const ComponentBinding binding{id<ComponentTypeId>(1), 1};
  rejected(World::create(std::move(allocator), fixture.registry, std::span(&binding, 1), {64}), WorldErrorCode::InvalidConfiguration);
  CHECK(!allocator.validate(std::get<EntityId>(identity)) && allocator.diagnostics() == before);
}
}  // namespace
int main() {
  const std::pair<const char*, void(*)()> tests[] = {
    {"lifecycle and atomic typed errors", lifecycle_and_errors_preserve_world_state},
    {"typed columns, chunks, transitions and swap removal", compiled_columns_survive_growth_transitions_and_swap_removal},
    {"integrated sparse churn and reverse-index repair", sparse_churn_never_migrates_archetype_and_repairs_dense_locations},
    {"typed Record field paths and whole replacements", typed_field_paths_and_whole_replacements_are_atomic},
    {"nested live references and indexed reject-on-inbound destruction", nested_live_references_and_indexed_destruction_are_consistent},
    {"single writer and independent owned inspection", all_live_operations_reject_the_wrong_writer_and_owned_inspection_can_cross_threads},
    {"bounded live ID index", bounded_live_index_survives_swap_removal},
    {"factory rejects live identities without storage", factory_rejects_identity_without_matching_storage},
  };
  int failures = 0;
  for (const auto& [name, run] : tests) {
    try { run(); std::printf("PASS %s\n", name); }
    catch (const std::exception& error) { ++failures; std::printf("FAIL %s: %s\n", name, error.what()); }
  }
  std::printf("%zu world cases, %d failed\n", std::size(tests), failures); return failures == 0 ? 0 : 1;
}
