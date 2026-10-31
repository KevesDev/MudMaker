#pragma once
#include "mudmaker/ecs/identity.h"
#include <compare>
#include <map>
#include <string>
#include <vector>

namespace mudmaker::ecs {
// Opaque, distinct Guid-compatible values. The asset/native loader supplies stable IDs; this
// registry neither generates IDs nor converts wire representations.
template <typename Tag> class SchemaIdentifier final {
 public:
  SchemaIdentifier() noexcept = default;
  explicit SchemaIdentifier(std::array<std::uint8_t, 16> bytes) noexcept : bytes_(bytes) {}
  const std::array<std::uint8_t, 16>& bytes() const noexcept { return bytes_; }
  friend auto operator<=>(const SchemaIdentifier&, const SchemaIdentifier&) = default;
 private:
  std::array<std::uint8_t, 16> bytes_{};
};
struct ComponentTypeTag; struct FieldTag; struct AssetTag;
using ComponentTypeId = SchemaIdentifier<ComponentTypeTag>;
using FieldId = SchemaIdentifier<FieldTag>;
using AssetId = SchemaIdentifier<AssetTag>;
struct AssetReference {
  AssetId id;
  std::uint32_t revision = 0;
  friend bool operator==(const AssetReference&, const AssetReference&) = default;
};
struct SchemaValue {
  using Record = std::map<std::string, SchemaValue, std::less<>>;
  using List = std::vector<SchemaValue>;
  std::variant<std::monostate, bool, std::int64_t, double, std::string, EntityId, AssetReference, Record, List> data;
  friend bool operator==(const SchemaValue&, const SchemaValue&) = default;
};
enum class FieldKind { Boolean, Integer, Floating, Text, Entity, Asset, Record, List };
enum class PersistenceMode { Transient, Persistent };
struct FieldConstraints {
  std::optional<std::int64_t> integer_min, integer_max;
  std::optional<double> floating_min, floating_max;
  std::optional<std::size_t> text_min_bytes, text_max_bytes, list_min_items, list_max_items;
  std::vector<SchemaValue> enum_values;
};
struct ValueDefinition;
struct FieldDefinition {
  FieldId id;
  std::string name;
  bool required = false;
  std::optional<SchemaValue> default_value;
  std::shared_ptr<ValueDefinition> type;
  std::string display, description;
};
struct ValueDefinition {
  FieldKind kind = FieldKind::Boolean;
  bool nullable = false;
  FieldConstraints constraints;
  std::vector<FieldDefinition> fields;
  std::shared_ptr<ValueDefinition> element;
};
struct ComponentDefinition {
  ComponentTypeId id;
  std::string name;
  std::uint32_t revision = 0;
  PersistenceMode persistence = PersistenceMode::Transient;
  std::string display, description;
  std::vector<FieldDefinition> fields;
};
struct ValueSchema;
struct FieldSchema {
  FieldId id;
  std::string name;
  bool required;
  std::optional<SchemaValue> default_value;
  std::shared_ptr<const ValueSchema> type;
  std::string display, description;
};
struct ValueSchema {
  FieldKind kind;
  bool nullable;
  FieldConstraints constraints;
  std::vector<FieldSchema> fields;
  std::shared_ptr<const ValueSchema> element;
};
struct ComponentSchema {
  ComponentTypeId id;
  std::string name;
  std::uint32_t revision;
  PersistenceMode persistence;
  std::string display, description;
  std::vector<FieldSchema> fields;
};
using ComponentSchemaHandle = std::shared_ptr<const ComponentSchema>;
struct SchemaValidationLimits {
  std::size_t schema_nodes, value_nodes, nesting_depth, text_bytes, name_bytes;
};
enum class SchemaErrorCode {
  invalid_limits, invalid_id, invalid_name, invalid_revision, invalid_metadata, reserved_name,
  duplicate_id, duplicate_name, frozen, unknown_component, revision_mismatch,
  malformed_schema, cyclic_schema, limit_exceeded, invalid_constraints, invalid_default,
  wrong_type, null_not_allowed, required_field, unknown_field, out_of_range,
  invalid_utf8, invalid_reference, enum_mismatch, resource_exhausted
};
struct SchemaError {
  SchemaErrorCode code;
  ComponentTypeId component;
  std::optional<FieldId> field;
  std::string path;
  std::string_view reason;
};
template <typename T> using SchemaResult = std::variant<T, SchemaError>;

/** One logical schema authority. Native loader chooses trusted registration; use on its writer. */
class ComponentRegistry final {
 public:
  static SchemaResult<std::unique_ptr<ComponentRegistry>> create(SchemaValidationLimits limits);
  ComponentRegistry(const ComponentRegistry&) = delete;
  ComponentRegistry& operator=(const ComponentRegistry&) = delete;
  SchemaResult<ComponentSchemaHandle> register_builtin(const ComponentDefinition& definition);
  SchemaResult<ComponentSchemaHandle> register_creator(const ComponentDefinition& definition);
  SchemaResult<ComponentSchemaHandle> lookup(ComponentTypeId id, std::uint32_t revision) const;
  SchemaResult<ComponentSchemaHandle> lookup(std::string_view name, std::uint32_t revision) const;
  SchemaResult<SchemaValue> validate_value(ComponentTypeId id, std::uint32_t revision, const SchemaValue& value) const;
  void freeze() noexcept { frozen_ = true; }
  bool frozen() const noexcept { return frozen_; }
  std::size_t size() const noexcept { return by_id_.size(); }
 private:
  explicit ComponentRegistry(SchemaValidationLimits limits) : limits_(limits) {}
  SchemaResult<ComponentSchemaHandle> publish(const ComponentDefinition& definition, bool builtin);
  SchemaValidationLimits limits_;
  bool frozen_ = false;
  std::map<ComponentTypeId, ComponentSchemaHandle> by_id_;
  std::map<std::string, ComponentSchemaHandle, std::less<>> by_name_;
};
}  // namespace mudmaker::ecs
