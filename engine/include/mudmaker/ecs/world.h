#pragma once
#include "mudmaker/ecs/component_schema.h"

namespace mudmaker::ecs {
enum class StoragePlacement { Automatic, Archetype, Sparse };
struct ComponentBinding {
  ComponentTypeId id;
  std::uint32_t revision;
  StoragePlacement placement = StoragePlacement::Automatic;
};
struct WorldStorageConfig { std::size_t chunk_target_bytes; };
struct ComponentValue { ComponentTypeId id; std::uint32_t revision; SchemaValue value; };
struct ComponentInspection {
  ComponentSchemaHandle schema;
  SchemaValue value;
  StoragePlacement placement;
  friend bool operator==(const ComponentInspection&, const ComponentInspection&) = default;
};
struct EntityInspection {
  EntityId id;
  std::vector<ComponentInspection> components;
  // Immutable diagnostic location, useful for proving sparse churn does not migrate rows.
  std::size_t archetype, chunk, row;
  friend bool operator==(const EntityInspection&, const EntityInspection&) = default;
};
// Live dense order may change between calls; this owns IDs, not a frozen snapshot.
struct LiveEntityPage {
  std::vector<EntityId> entities;
  std::size_t total;
  std::optional<std::size_t> next_offset;
};

enum class WorldErrorCode {
  WrongWriter, Unavailable, InvalidConfiguration, Identity, Schema, UnknownComponent,
  RevisionMismatch, MissingComponent, DuplicateComponent, UnknownField, ParentUnavailable,
  ListContextRequired, InboundReferences, ResourceExhausted, InvalidArgument
};
struct WorldError {
  WorldErrorCode code;
  std::string_view reason;
  std::optional<IdentityError> identity;
  std::optional<SchemaError> schema;
};
template <typename T> using WorldResult = std::variant<T, WorldError>;
using WorldSuccess = std::monostate;
namespace detail { struct WorldState; }
/** The only live mutation gateway. Every live operation is bound to its creating thread. */
class World final {
 public:
  static WorldResult<std::unique_ptr<World>> create(WorldAllocator&& allocator,
      std::shared_ptr<const ComponentRegistry> registry, std::span<const ComponentBinding> bindings,
      WorldStorageConfig configuration);
  ~World();
  World(const World&) = delete;
  World& operator=(const World&) = delete;
  WorldResult<EntityId> create_entity(std::span<const ComponentValue> components = {});
  WorldResult<WorldSuccess> destroy_entity(EntityId id);
  WorldResult<WorldSuccess> add_component(EntityId id, const ComponentValue& component);
  WorldResult<WorldSuccess> remove_component(EntityId id, ComponentTypeId type, std::uint32_t revision);
  WorldResult<WorldSuccess> replace_component(EntityId id, const ComponentValue& component);
  WorldResult<WorldSuccess> replace_field(EntityId id, ComponentTypeId type, std::uint32_t revision,
      FieldId field, const SchemaValue& value);
  WorldResult<std::shared_ptr<const ValueSchema>> field_type(ComponentTypeId type, std::uint32_t revision, FieldId field) const;
  WorldResult<EntityInspection> inspect(EntityId id) const;
  WorldResult<std::vector<EntityId>> inspect_live(std::size_t limit) const;
  WorldResult<LiveEntityPage> inspect_live_page(std::size_t offset, std::size_t limit) const;
 private:
  explicit World(std::unique_ptr<detail::WorldState> state) noexcept;
  std::unique_ptr<detail::WorldState> state_;
};
}  // namespace mudmaker::ecs
