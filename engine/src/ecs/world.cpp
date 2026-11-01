#include "mudmaker/ecs/world.h"
#include "ecs/world_storage.h"
#include <thread>

namespace mudmaker::ecs {
namespace detail {
constexpr auto no_row = std::numeric_limits<std::size_t>::max();
using Signature = std::vector<std::size_t>;
using References = std::map<std::size_t, std::vector<EntityId>>;
struct Failure { WorldError error; };
[[noreturn]] void fail(WorldErrorCode code, std::string_view reason) { throw Failure{{code, reason, {}, {}}}; }
[[noreturn]] void identity_failure(IdentityError error) { throw Failure{{WorldErrorCode::Identity, error.message, error, {}}}; }
[[noreturn]] void schema_failure(SchemaError error) { throw Failure{{WorldErrorCode::Schema, error.reason, {}, std::move(error)}}; }
struct Sparse {
  explicit Sparse(const Layout& layout) : columns(make_columns(layout)) {}
  Columns columns;
  std::vector<EntityId> ids;
  std::vector<std::size_t> reverse;
  bool has(std::uint32_t index) const { return index < reverse.size() && reverse[index] != no_row; }
  void prepare(std::size_t slots) {
    if (reverse.size() < slots) reverse.resize(slots, no_row);
    ids.reserve(ids.size() + 1);
    for (auto& column : columns) column.reserve(ids.size() + 1);
  }
  void append(EntityId id, std::vector<Cell>& cells) noexcept {
    reverse[id.index] = ids.size(); ids.push_back(id); push(columns, cells);
  }
  void erase(std::uint32_t index) noexcept {
    const auto row = reverse[index], last = ids.size() - 1;
    swap_pop(columns, row, columns, last);
    if (row != last) { ids[row] = ids[last]; reverse[ids[row].index] = row; }
    ids.pop_back(); reverse[index] = no_row;
  }
};
struct Binding {
  ComponentSchemaHandle schema;
  StoragePlacement placement;
  Layout layout;
  std::unique_ptr<Sparse> sparse;
};
struct Chunk {
  std::vector<EntityId> ids;
  std::vector<Columns> components;
  Chunk(const Signature& signature, const std::vector<Binding>& bindings, std::size_t capacity) {
    ids.reserve(capacity); components.reserve(signature.size());
    for (auto index : signature) {
      auto columns = make_columns(bindings[index].layout);
      for (auto& column : columns) column.reserve(capacity);
      components.push_back(std::move(columns));
    }
  }
};
struct Archetype {
  std::size_t id, capacity, rows = 0;
  Signature signature;
  std::vector<std::unique_ptr<Chunk>> chunks;
  Archetype(std::size_t number, Signature types, const std::vector<Binding>& bindings, std::size_t bytes)
      : id(number), capacity(1), signature(std::move(types)) {
    std::size_t footprint = sizeof(EntityId);
    for (auto index : signature) for (const auto& node : bindings[index].layout.nodes) {
      const auto size = Column(node).footprint();
      if (size > std::numeric_limits<std::size_t>::max() - footprint) fail(WorldErrorCode::InvalidConfiguration, "Archetype row footprint overflow.");
      footprint += size;
    }
    capacity = std::max<std::size_t>(1, bytes / footprint);
  }
};
struct Location {
  Archetype* archetype = nullptr;
  std::size_t row = 0, dense = no_row;
  References outgoing;  // Derived from canonical columns, never a second component-value store.
};
using Archetypes = std::map<Signature, std::unique_ptr<Archetype>>;
struct WorldState {
  std::optional<WorldAllocator> allocator;
  std::shared_ptr<const ComponentRegistry> registry;
  const std::thread::id writer = std::this_thread::get_id();
  WorldStorageConfig config;
  std::vector<Binding> bindings;
  std::map<ComponentTypeId, std::size_t> binding_index;
  Archetypes archetypes;
  std::vector<Location> locations;
  std::vector<std::size_t> incoming;
  std::vector<EntityId> live;
  explicit WorldState(std::shared_ptr<const ComponentRegistry> schemas, WorldStorageConfig configuration)
      : registry(std::move(schemas)), config(configuration) {}
  void entity(EntityId id) const { if (auto error = allocator->validate(id)) identity_failure(*error); }
  std::size_t binding(ComponentTypeId id, std::uint32_t revision) const {
    const auto found = binding_index.find(id);
    if (found == binding_index.end()) fail(WorldErrorCode::UnknownComponent, "Component is not bound to this release.");
    if (bindings[found->second].schema->revision != revision) fail(WorldErrorCode::RevisionMismatch, "Component revision differs from the release binding.");
    return found->second;
  }
  bool has(EntityId id, std::size_t index) const {
    const auto& bound = bindings[index];
    if (bound.sparse) return bound.sparse->has(id.index);
    const auto& signature = locations[id.index].archetype->signature;
    return std::binary_search(signature.begin(), signature.end(), index);
  }
  SchemaValue value(EntityId id, std::size_t index) const {
    const auto& bound = bindings[index];
    if (bound.sparse) return read(bound.layout, bound.sparse->columns, bound.sparse->reverse[id.index]);
    const auto& location = locations[id.index]; const auto& arch = *location.archetype;
    const auto column = static_cast<std::size_t>(std::lower_bound(arch.signature.begin(), arch.signature.end(), index) - arch.signature.begin());
    return read(bound.layout, arch.chunks[location.row / arch.capacity]->components[column], location.row % arch.capacity);
  }
  SchemaValue normalized(std::size_t index, const SchemaValue& value) const {
    const auto& schema = bindings[index].schema;
    auto checked = registry->validate_value(schema->id, schema->revision, value);
    if (const auto error = std::get_if<SchemaError>(&checked)) schema_failure(*error);
    return std::move(std::get<SchemaValue>(checked));
  }
  void collect(const SchemaValue& value, std::vector<EntityId>& refs) const {
    if (const auto entity_id = std::get_if<EntityId>(&value.data)) { entity(*entity_id); refs.push_back(*entity_id); }
    else if (const auto record = std::get_if<SchemaValue::Record>(&value.data)) for (const auto& entry : *record) collect(entry.second, refs);
    else if (const auto list = std::get_if<SchemaValue::List>(&value.data)) for (const auto& child : *list) collect(child, refs);
  }
  void pop(Archetype& arch, std::size_t row) noexcept {
    const auto last = arch.rows - 1;
    auto& destination = *arch.chunks[row / arch.capacity]; auto& source = *arch.chunks[last / arch.capacity];
    for (std::size_t i = 0; i < arch.signature.size(); ++i) swap_pop(destination.components[i], row % arch.capacity, source.components[i], last % arch.capacity);
    if (row != last) { const auto moved = source.ids[last % arch.capacity]; destination.ids[row % arch.capacity] = moved; locations[moved.index].row = row; }
    source.ids.pop_back(); --arch.rows;
    if (source.ids.empty()) arch.chunks.pop_back();
  }
};
template <typename T, typename Function> WorldResult<T> run(WorldState* state, Function&& function) {
  if (!state) return WorldError{WorldErrorCode::Unavailable, "World is unavailable.", {}, {}};
  if (state->writer != std::this_thread::get_id()) return WorldError{WorldErrorCode::WrongWriter, "Live world operations require the creating writer thread.", {}, {}};
  try { return function(); }
  catch (const Failure& failure) { return failure.error; }
  catch (const std::bad_alloc&) { return WorldError{WorldErrorCode::ResourceExhausted, "World storage allocation failed.", {}, {}}; }
  catch (const std::length_error&) { return WorldError{WorldErrorCode::ResourceExhausted, "World storage capacity is not representable.", {}, {}}; }
}
struct ReferenceStage {
  References outgoing;
  std::vector<std::pair<std::uint32_t, std::size_t>> updates;
  ReferenceStage(const WorldState& state, const References& old, References next) : outgoing(std::move(next)) {
    std::map<std::uint32_t, std::pair<std::size_t, std::size_t>> counts;
    for (const auto& entry : old) for (const auto id : entry.second) ++counts[id.index].first;
    for (const auto& entry : outgoing) for (const auto id : entry.second) ++counts[id.index].second;
    for (const auto& [index, delta] : counts) {
      const auto base = state.incoming[index] - delta.first;
      if (delta.second > std::numeric_limits<std::size_t>::max() - base) fail(WorldErrorCode::ResourceExhausted, "Reverse reference count overflow.");
      updates.emplace_back(index, base + delta.second);
    }
  }
  void commit(WorldState& state, Location& location) noexcept {
    for (const auto& [index, count] : updates) state.incoming[index] = count;
    location.outgoing.swap(outgoing);
  }
};
struct RowStage {
  Archetypes::node_type pending;
  Archetype* target;
  std::unique_ptr<Chunk> chunk;
  std::vector<std::vector<Cell>> cells;
  RowStage(WorldState& state, Signature signature, std::vector<SchemaValue> values) {
    const auto found = state.archetypes.find(signature);
    if (found == state.archetypes.end()) {
      Archetypes temporary;
      auto arch = std::make_unique<Archetype>(state.archetypes.size(), signature, state.bindings, state.config.chunk_target_bytes);
      target = arch.get(); temporary.emplace(std::move(signature), std::move(arch)); pending = temporary.extract(temporary.begin());
    } else target = found->second.get();
    cells.reserve(values.size());
    for (std::size_t i = 0; i < values.size(); ++i) cells.push_back(flatten(state.bindings[target->signature[i]].layout, values[i]));
    if (target->rows % target->capacity == 0) {
      chunk = std::make_unique<Chunk>(target->signature, state.bindings, target->capacity);
      target->chunks.reserve(target->chunks.size() + 1);
    }
  }
  std::size_t commit(WorldState& state, EntityId id) noexcept {
    if (!pending.empty()) state.archetypes.insert(std::move(pending));
    if (chunk) target->chunks.push_back(std::move(chunk));
    auto& into = *target->chunks.back();
    into.ids.push_back(id);
    for (std::size_t i = 0; i < cells.size(); ++i) push(into.components[i], cells[i]);
    return target->rows++;
  }
};
enum class Change { Add, Remove, Replace };
WorldSuccess change(WorldState& state, EntityId id, std::size_t index, Change operation, const SchemaValue* input) {
  state.entity(id);
  const bool present = state.has(id, index);
  if (operation == Change::Add && present) fail(WorldErrorCode::DuplicateComponent, "Entity already has this component.");
  if (operation != Change::Add && !present) fail(WorldErrorCode::MissingComponent, "Entity does not have this component.");
  auto& location = state.locations[id.index]; auto& bound = state.bindings[index];
  SchemaValue value;
  auto outgoing = location.outgoing;
  if (input) {
    value = state.normalized(index, *input);
    std::vector<EntityId> refs; state.collect(value, refs);
    if (refs.empty()) outgoing.erase(index); else outgoing[index] = std::move(refs);
  } else outgoing.erase(index);
  ReferenceStage references(state, location.outgoing, std::move(outgoing));
  if (bound.sparse) {
    auto cells = input ? flatten(bound.layout, value) : std::vector<Cell>{};
    if (operation == Change::Add) bound.sparse->prepare(state.locations.size());
    if (operation == Change::Add) bound.sparse->append(id, cells);
    else if (operation == Change::Remove) bound.sparse->erase(id.index);
    else replace(bound.sparse->columns, bound.sparse->reverse[id.index], cells);
  } else if (operation == Change::Replace) {
    auto cells = flatten(bound.layout, value);
    auto& arch = *location.archetype;
    const auto position = static_cast<std::size_t>(std::lower_bound(arch.signature.begin(), arch.signature.end(), index) - arch.signature.begin());
    replace(arch.chunks[location.row / arch.capacity]->components[position], location.row % arch.capacity, cells);
  } else {
    auto signature = location.archetype->signature;
    if (operation == Change::Add) signature.insert(std::lower_bound(signature.begin(), signature.end(), index), index);
    else signature.erase(std::lower_bound(signature.begin(), signature.end(), index));
    std::vector<SchemaValue> values; values.reserve(signature.size());
    for (auto type : signature) values.push_back(type == index ? std::move(value) : state.value(id, type));
    RowStage stage(state, std::move(signature), std::move(values));
    auto* source = location.archetype; const auto old_row = location.row;
    const auto row = stage.commit(state, id);
    state.pop(*source, old_row);
    location.archetype = stage.target; location.row = row;
  }
  references.commit(state, location);
  return {};
}
}  // namespace detail

World::World(std::unique_ptr<detail::WorldState> state) noexcept : state_(std::move(state)) {}
World::~World() = default;
WorldResult<std::unique_ptr<World>> World::create(WorldAllocator&& allocator, std::shared_ptr<const ComponentRegistry> registry,
    std::span<const ComponentBinding> bindings, WorldStorageConfig configuration) {
  if (!registry || !registry->frozen() || !configuration.chunk_target_bytes || bindings.size() > registry->size()) return WorldError{WorldErrorCode::InvalidConfiguration, "World needs a frozen registry, permitted bindings and a positive chunk target.", {}, {}};
  if (allocator.world_id() == WorldId{}) return WorldError{WorldErrorCode::InvalidConfiguration, "World needs an issued allocator.", {}, {}};
  if (allocator.diagnostics().live != 0) return WorldError{WorldErrorCode::InvalidConfiguration, "World cannot consume live identities without component storage.", {}, {}};
  try {
    auto state = std::make_unique<detail::WorldState>(std::move(registry), configuration);
    state->bindings.reserve(bindings.size());
    for (const auto& binding : bindings) {
      if (state->binding_index.contains(binding.id)) detail::fail(WorldErrorCode::InvalidConfiguration, "Duplicate release component binding.");
      auto schema = state->registry->lookup(binding.id, binding.revision);
      if (const auto error = std::get_if<SchemaError>(&schema)) detail::schema_failure(*error);
      auto descriptor = std::get<ComponentSchemaHandle>(schema);
      const auto placement = binding.placement == StoragePlacement::Automatic ? (descriptor->fields.empty() ? StoragePlacement::Sparse : StoragePlacement::Archetype) : binding.placement;
      if (placement != StoragePlacement::Archetype && placement != StoragePlacement::Sparse) detail::fail(WorldErrorCode::InvalidConfiguration, "Unknown storage placement.");
      auto layout = detail::compile_layout(*descriptor);
      auto sparse = placement == StoragePlacement::Sparse ? std::make_unique<detail::Sparse>(layout) : nullptr;
      state->binding_index.emplace(binding.id, state->bindings.size());
      state->bindings.push_back({std::move(descriptor), placement, std::move(layout), std::move(sparse)});
    }
    auto world = std::unique_ptr<World>(new World(std::move(state)));
    // All fallible preparation is complete. Invalid factory input leaves the original owner intact.
    world->state_->allocator.emplace(std::move(allocator));
    return world;
  } catch (const detail::Failure& failure) { return failure.error; }
  catch (const std::bad_alloc&) { return WorldError{WorldErrorCode::ResourceExhausted, "World construction allocation failed.", {}, {}}; }
  catch (const std::length_error&) { return WorldError{WorldErrorCode::ResourceExhausted, "World construction capacity is not representable.", {}, {}}; }
}
WorldResult<EntityId> World::create_entity(std::span<const ComponentValue> components) {
  return detail::run<EntityId>(state_.get(), [&] {
    auto& state = *state_;
    if (components.size() > state.bindings.size()) detail::fail(WorldErrorCode::DuplicateComponent, "Too many initial components for this release.");
    std::map<std::size_t, SchemaValue> normalized;
    detail::References outgoing;
    for (const auto& component : components) {
      const auto index = state.binding(component.id, component.revision);
      if (normalized.contains(index)) detail::fail(WorldErrorCode::DuplicateComponent, "Duplicate initial component.");
      auto value = state.normalized(index, component.value);
      std::vector<EntityId> refs; state.collect(value, refs);
      if (!refs.empty()) outgoing.emplace(index, std::move(refs));
      normalized.emplace(index, std::move(value));
    }
    detail::ReferenceStage references(state, {}, std::move(outgoing));
    detail::Signature signature; std::vector<SchemaValue> values;
    std::map<std::size_t, std::vector<detail::Cell>> sparse_cells;
    const auto slots = state.allocator->diagnostics().slots + 1;
    for (auto& [index, value] : normalized) {
      auto& bound = state.bindings[index];
      if (bound.sparse) { sparse_cells.emplace(index, detail::flatten(bound.layout, value)); bound.sparse->prepare(slots); }
      else { signature.push_back(index); values.push_back(std::move(value)); }
    }
    detail::RowStage row(state, std::move(signature), std::move(values));
    state.locations.resize(std::max(state.locations.size(), slots)); state.incoming.resize(std::max(state.incoming.size(), slots), 0);
    state.live.reserve(state.live.size() + 1);
    auto identity = state.allocator->create();
    if (const auto error = std::get_if<IdentityError>(&identity)) detail::identity_failure(*error);
    const auto id = std::get<EntityId>(identity);
    auto& location = state.locations[id.index];
    location.archetype = row.target; location.row = row.commit(state, id);
    for (auto& [index, cells] : sparse_cells) state.bindings[index].sparse->append(id, cells);
    location.dense = state.live.size(); state.live.push_back(id);
    references.commit(state, location);
    return id;
  });
}
WorldResult<WorldSuccess> World::destroy_entity(EntityId id) {
  return detail::run<WorldSuccess>(state_.get(), [&] {
    auto& state = *state_; state.entity(id); auto& location = state.locations[id.index];
    std::size_t self = 0; for (const auto& entry : location.outgoing) for (const auto target : entry.second) if (target == id) ++self;
    if (state.incoming[id.index] > self) detail::fail(WorldErrorCode::InboundReferences, "Entity has external inbound references.");
    detail::ReferenceStage references(state, location.outgoing, {});
    if (const auto error = state.allocator->release(id)) detail::identity_failure(*error);
    for (auto& bound : state.bindings) if (bound.sparse && bound.sparse->has(id.index)) bound.sparse->erase(id.index);
    state.pop(*location.archetype, location.row);
    const auto last = state.live.back();
    if (location.dense != state.live.size() - 1) { state.live[location.dense] = last; state.locations[last.index].dense = location.dense; }
    state.live.pop_back(); references.commit(state, location);
    location.archetype = nullptr; location.dense = detail::no_row;
    return WorldSuccess{};
  });
}
WorldResult<WorldSuccess> World::add_component(EntityId id, const ComponentValue& component) {
  return detail::run<WorldSuccess>(state_.get(), [&] { state_->entity(id); return detail::change(*state_, id, state_->binding(component.id, component.revision), detail::Change::Add, &component.value); });
}
WorldResult<WorldSuccess> World::remove_component(EntityId id, ComponentTypeId type, std::uint32_t revision) {
  return detail::run<WorldSuccess>(state_.get(), [&] { state_->entity(id); return detail::change(*state_, id, state_->binding(type, revision), detail::Change::Remove, nullptr); });
}
WorldResult<WorldSuccess> World::replace_component(EntityId id, const ComponentValue& component) {
  return detail::run<WorldSuccess>(state_.get(), [&] { state_->entity(id); return detail::change(*state_, id, state_->binding(component.id, component.revision), detail::Change::Replace, &component.value); });
}
WorldResult<WorldSuccess> World::replace_field(EntityId id, ComponentTypeId type, std::uint32_t revision, FieldId field, const SchemaValue& replacement) {
  return detail::run<WorldSuccess>(state_.get(), [&] {
    auto& state = *state_; state.entity(id); const auto index = state.binding(type, revision);
    if (!state.has(id, index)) detail::fail(WorldErrorCode::MissingComponent, "Entity does not have this component.");
    const auto& layout = state.bindings[index].layout; const auto found = layout.fields.find(field);
    if (found == layout.fields.end()) detail::fail(layout.list_fields.contains(field) ? WorldErrorCode::ListContextRequired : WorldErrorCode::UnknownField, "Field is unknown or requires a List element context; replace the enclosing List.");
    auto value = state.value(id, index);
    auto* record = std::get_if<SchemaValue::Record>(&value.data);
    const auto& path = found->second;
    for (std::size_t i = 0; i + 1 < path.size(); ++i) {
      auto parent = record->find(path[i]);
      if (parent == record->end() || !(record = std::get_if<SchemaValue::Record>(&parent->second.data))) detail::fail(WorldErrorCode::ParentUnavailable, "Record parent is absent or Null.");
    }
    (*record)[path.back()] = replacement;
    return detail::change(state, id, index, detail::Change::Replace, &value);
  });
}
WorldResult<std::shared_ptr<const ValueSchema>> World::field_type(ComponentTypeId type, std::uint32_t revision, FieldId field) const {
  return detail::run<std::shared_ptr<const ValueSchema>>(state_.get(), [&] {
    const auto index = state_->binding(type, revision); const auto& bound = state_->bindings[index];
    const auto found = bound.layout.fields.find(field);
    if (found == bound.layout.fields.end()) detail::fail(bound.layout.list_fields.contains(field) ? WorldErrorCode::ListContextRequired : WorldErrorCode::UnknownField, "Field is unknown or needs List element context.");
    const auto* fields = &bound.schema->fields; std::shared_ptr<const ValueSchema> result;
    for (const auto& name : found->second) {
      const auto member = std::find_if(fields->begin(), fields->end(), [&](const auto& candidate) { return candidate.name == name; });
      if (member == fields->end()) detail::fail(WorldErrorCode::Unavailable, "Compiled field metadata is unavailable.");
      result = member->type; fields = &result->fields;
    }
    return result;
  });
}
WorldResult<EntityInspection> World::inspect(EntityId id) const {
  return detail::run<EntityInspection>(state_.get(), [&] {
    const auto& state = *state_; state.entity(id); const auto& location = state.locations[id.index]; const auto& arch = *location.archetype;
    EntityInspection result{id, {}, arch.id, location.row / arch.capacity, location.row % arch.capacity};
    for (std::size_t i = 0; i < state.bindings.size(); ++i) if (state.has(id, i)) result.components.push_back({state.bindings[i].schema, state.value(id, i), state.bindings[i].placement});
    return result;
  });
}
WorldResult<std::vector<EntityId>> World::inspect_live(std::size_t limit) const {
  return detail::run<std::vector<EntityId>>(state_.get(), [&] {
    const auto count = std::min(limit, state_->live.size());
    return std::vector<EntityId>(state_->live.begin(), state_->live.begin() + static_cast<std::ptrdiff_t>(count));
  });
}
WorldResult<LiveEntityPage> World::inspect_live_page(std::size_t offset, std::size_t limit) const {
  return detail::run<LiveEntityPage>(state_.get(), [&] {
    if (!limit) detail::fail(WorldErrorCode::InvalidArgument, "Live page limit must be positive.");
    const auto total = state_->live.size();
    if (offset >= total) return LiveEntityPage{{}, total, {}};
    const auto count = std::min(limit, total - offset);
    const auto end = offset + count;  // Both operands are bounded by the remaining live sequence.
    return LiveEntityPage{std::vector<EntityId>(state_->live.begin() + static_cast<std::ptrdiff_t>(offset),
        state_->live.begin() + static_cast<std::ptrdiff_t>(end)), total,
        end < total ? std::optional<std::size_t>{end} : std::nullopt};
  });
}
}  // namespace mudmaker::ecs
