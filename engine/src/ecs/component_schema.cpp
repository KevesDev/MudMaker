#include "mudmaker/ecs/component_schema.h"
#include <algorithm>
#include <cmath>
#include <new>
#include <set>

namespace mudmaker::ecs {
namespace {
template <typename Id> bool zero(const Id& id) {
  return std::all_of(id.bytes().begin(), id.bytes().end(), [](auto byte) { return byte == 0; });
}
bool letter(char c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }
bool digit(char c) { return c >= '0' && c <= '9'; }
bool field_name(std::string_view name) {
  if (name.empty() || (!letter(name.front()) && name.front() != '_')) return false;
  return std::all_of(name.begin(), name.end(), [](char c) { return letter(c) || digit(c) || c == '_'; });
}
bool component_name(std::string_view name) {
  bool start = true, dotted = false;
  for (char c : name) {
    if (start) { if (c < 'a' || c > 'z') return false; start = false; }
    else if (c == '.') { start = true; dotted = true; }
    else if ((c < 'a' || c > 'z') && !digit(c) && c != '_') return false;
  }
  return dotted && !start;
}
bool utf8(std::string_view text) {
  for (std::size_t i = 0; i < text.size();) {
    const auto first = static_cast<unsigned char>(text[i]);
    if (first < 0x80) { ++i; continue; }
    const std::size_t length = first >= 0xc2 && first <= 0xdf ? 2 : first >= 0xe0 && first <= 0xef ? 3 : first >= 0xf0 && first <= 0xf4 ? 4 : 0;
    if (length == 0 || length > text.size() - i) return false;
    for (std::size_t n = 1; n < length; ++n) {
      const auto byte = static_cast<unsigned char>(text[i + n]);
      if (byte < 0x80 || byte > 0xbf) return false;
    }
    const auto second = static_cast<unsigned char>(text[i + 1]);
    if ((first == 0xe0 && second < 0xa0) || (first == 0xed && second > 0x9f) ||
        (first == 0xf0 && second < 0x90) || (first == 0xf4 && second > 0x8f)) return false;
    i += length;
  }
  return true;
}
struct Context {
  SchemaValidationLimits limits;
  ComponentTypeId component;
  std::size_t schema_nodes = 0, value_nodes = 0;
  std::set<FieldId> fields;
  std::set<const ValueDefinition*> active;
  SchemaError fail(SchemaErrorCode code, std::string path, std::string_view reason, std::optional<FieldId> field = {}) const {
    return {code, component, field, std::move(path), reason};
  }
  std::optional<SchemaError> node(bool schema, std::size_t depth, const std::string& path, std::optional<FieldId> field) {
    auto& count = schema ? schema_nodes : value_nodes;
    if (depth > limits.nesting_depth || count >= (schema ? limits.schema_nodes : limits.value_nodes)) return fail(SchemaErrorCode::limit_exceeded, path, "Validation node/depth limit exceeded.", field);
    ++count;
    return {};
  }
  std::optional<SchemaError> text(std::string_view value, const std::string& path, std::optional<FieldId> field = {}) const {
    if (value.size() > limits.text_bytes) return fail(SchemaErrorCode::limit_exceeded, path, "Text byte limit exceeded.", field);
    if (!utf8(value)) return fail(SchemaErrorCode::invalid_utf8, path, "Text must be valid UTF-8.", field);
    return {};
  }
};
using Failure = std::optional<SchemaError>;
template <typename Type> Failure check_value(const Type&, const SchemaValue&, Context&, std::size_t, const std::string&, std::optional<FieldId>, bool, bool = false);

template <typename Fields> Failure check_record(const Fields& fields, const SchemaValue::Record& record, Context& ctx, std::size_t depth, const std::string& path, std::optional<FieldId> parent, bool defaults) {
  if (record.size() > ctx.limits.value_nodes - ctx.value_nodes) return ctx.fail(SchemaErrorCode::limit_exceeded, path, "Record exceeds the remaining value-node budget.", parent);
  for (const auto& [name, value] : record) {
    (void)value;
    if (name.size() > ctx.limits.name_bytes) return ctx.fail(SchemaErrorCode::limit_exceeded, path, "Record field name byte limit exceeded.", parent);
    if (!utf8(name)) return ctx.fail(SchemaErrorCode::invalid_utf8, path, "Record field name must be UTF-8.", parent);
    if (std::none_of(fields.begin(), fields.end(), [&](const auto& field) { return field.name == name; })) return ctx.fail(SchemaErrorCode::unknown_field, path + "." + name, "Unknown record field.", parent);
  }
  for (const auto& field : fields) {
    const auto child_path = path + "." + field.name;
    const auto found = record.find(field.name);
    if (found != record.end()) {
      if (auto error = check_value(*field.type, found->second, ctx, depth + 1, child_path, field.id, defaults)) return error;
    } else if (field.default_value) {
      if (auto error = check_value(*field.type, *field.default_value, ctx, depth + 1, child_path, field.id, defaults)) return error;
    } else if (field.required) return ctx.fail(SchemaErrorCode::required_field, child_path, "Required field has no value or default.", field.id);
  }
  return {};
}

template <typename Type> Failure check_value(const Type& type, const SchemaValue& value, Context& ctx, std::size_t depth, const std::string& path, std::optional<FieldId> field, bool defaults, bool skip_enum) {
  if (auto error = ctx.node(false, depth, path, field)) return error;
  if (std::holds_alternative<std::monostate>(value.data)) return type.nullable ? Failure{} : ctx.fail(SchemaErrorCode::null_not_allowed, path, "Null requires a nullable schema.", field);
  const auto wrong = [&] { return ctx.fail(SchemaErrorCode::wrong_type, path, "Value does not match its declared field kind.", field); };
  const auto range = [&] { return ctx.fail(SchemaErrorCode::out_of_range, path, "Value is outside its inclusive constraints.", field); };
  const auto& c = type.constraints;
  switch (type.kind) {
    case FieldKind::Boolean: if (!std::holds_alternative<bool>(value.data)) return wrong(); break;
    case FieldKind::Integer: {
      const auto v = std::get_if<std::int64_t>(&value.data); if (!v) return wrong();
      if ((c.integer_min && *v < *c.integer_min) || (c.integer_max && *v > *c.integer_max)) return range();
      break;
    }
    case FieldKind::Floating: {
      const auto v = std::get_if<double>(&value.data); if (!v) return wrong();
      if (!std::isfinite(*v) || (c.floating_min && *v < *c.floating_min) || (c.floating_max && *v > *c.floating_max)) return range();
      break;
    }
    case FieldKind::Text: {
      const auto v = std::get_if<std::string>(&value.data); if (!v) return wrong();
      if (auto error = ctx.text(*v, path, field)) return error;
      if ((c.text_min_bytes && v->size() < *c.text_min_bytes) || (c.text_max_bytes && v->size() > *c.text_max_bytes)) return range();
      break;
    }
    case FieldKind::Entity: {
      const auto v = std::get_if<EntityId>(&value.data); if (!v) return wrong();
      if (defaults) return ctx.fail(SchemaErrorCode::invalid_default, path, "World-bound Entity references cannot be release-schema defaults.", field);
      if (zero(v->world) || v->index == kInvalidEntityIndex) return ctx.fail(SchemaErrorCode::invalid_reference, path, "Entity reference needs a nonzero world and valid index representation.", field);
      break;
    }
    case FieldKind::Asset: {
      const auto v = std::get_if<AssetReference>(&value.data); if (!v) return wrong();
      if (zero(v->id) || v->revision == 0) return ctx.fail(SchemaErrorCode::invalid_reference, path, "Asset reference needs a nonzero ID and positive revision.", field);
      break;
    }
    case FieldKind::Record: {
      const auto v = std::get_if<SchemaValue::Record>(&value.data); if (!v) return wrong();
      return check_record(type.fields, *v, ctx, depth, path, field, defaults);
    }
    case FieldKind::List: {
      const auto v = std::get_if<SchemaValue::List>(&value.data); if (!v) return wrong();
      if ((c.list_min_items && v->size() < *c.list_min_items) || (c.list_max_items && v->size() > *c.list_max_items)) return range();
      if (v->size() > ctx.limits.value_nodes - ctx.value_nodes) return ctx.fail(SchemaErrorCode::limit_exceeded, path, "List exceeds the remaining value-node budget.", field);
      for (std::size_t i = 0; i < v->size(); ++i) if (auto error = check_value(*type.element, (*v)[i], ctx, depth + 1, path + "[" + std::to_string(i) + "]", field, defaults)) return error;
      return {};
    }
  }
  if (!skip_enum && !c.enum_values.empty() && std::find(c.enum_values.begin(), c.enum_values.end(), value) == c.enum_values.end()) return ctx.fail(SchemaErrorCode::enum_mismatch, path, "Value is not in the declared enum set.", field);
  return {};
}

Failure check_fields(const std::vector<FieldDefinition>&, Context&, std::size_t, const std::string&);
Failure check_type(const std::shared_ptr<ValueDefinition>& pointer, Context& ctx, std::size_t depth, const std::string& path, FieldId field) {
  if (!pointer) return ctx.fail(SchemaErrorCode::malformed_schema, path, "A field/list element needs a type schema.", field);
  if (auto error = ctx.node(true, depth, path, field)) return error;
  if (!ctx.active.insert(pointer.get()).second) return ctx.fail(SchemaErrorCode::cyclic_schema, path, "Schema definition contains a cycle.", field);
  struct Leave { Context& ctx; const ValueDefinition* pointer; ~Leave() { ctx.active.erase(pointer); } } leave{ctx, pointer.get()};
  const auto& type = *pointer;
  const auto& c = type.constraints;
  if (type.kind < FieldKind::Boolean || type.kind > FieldKind::List) return ctx.fail(SchemaErrorCode::malformed_schema, path, "Unknown field kind.", field);
  const bool integer = c.integer_min || c.integer_max, floating = c.floating_min || c.floating_max;
  const bool text = c.text_min_bytes || c.text_max_bytes, list = c.list_min_items || c.list_max_items;
  if ((integer && type.kind != FieldKind::Integer) || (floating && type.kind != FieldKind::Floating) || (text && type.kind != FieldKind::Text) || (list && type.kind != FieldKind::List)) return ctx.fail(SchemaErrorCode::invalid_constraints, path, "Constraint kind does not match field kind.", field);
  if ((c.integer_min && c.integer_max && *c.integer_min > *c.integer_max) ||
      (c.floating_min && !std::isfinite(*c.floating_min)) || (c.floating_max && !std::isfinite(*c.floating_max)) ||
      (c.floating_min && c.floating_max && *c.floating_min > *c.floating_max) ||
      (c.text_min_bytes && c.text_max_bytes && *c.text_min_bytes > *c.text_max_bytes) ||
      (c.list_min_items && c.list_max_items && *c.list_min_items > *c.list_max_items)) return ctx.fail(SchemaErrorCode::invalid_constraints, path, "Constraint bounds must be finite, ordered and inclusive.", field);
  if ((!type.fields.empty() && type.kind != FieldKind::Record) || (type.element && type.kind != FieldKind::List)) return ctx.fail(SchemaErrorCode::malformed_schema, path, "Only Records have fields; only Lists have element schemas.", field);
  if (type.kind == FieldKind::Record) { if (auto error = check_fields(type.fields, ctx, depth + 1, path)) return error; }
  if (type.kind == FieldKind::List) { if (auto error = check_type(type.element, ctx, depth + 1, path + "[]", field)) return error; }
  if (!c.enum_values.empty() && type.kind != FieldKind::Boolean && type.kind != FieldKind::Integer && type.kind != FieldKind::Floating && type.kind != FieldKind::Text) return ctx.fail(SchemaErrorCode::invalid_constraints, path, "Enums are supported only on primitive Boolean/Integer/Floating/Text fields.", field);
  if (c.enum_values.size() > ctx.limits.value_nodes - ctx.value_nodes) return ctx.fail(SchemaErrorCode::limit_exceeded, path, "Enum exceeds remaining value-node budget.", field);
  for (std::size_t i = 0; i < c.enum_values.size(); ++i) {
    const auto& entry = c.enum_values[i];
    if (std::holds_alternative<std::monostate>(entry.data)) return ctx.fail(SchemaErrorCode::invalid_constraints, path, "Enum entries require the declared primitive kind; nullability is a separate rule.", field);
    if (auto error = check_value(type, entry, ctx, 1, path + ".enum[" + std::to_string(i) + "]", field, true, true)) return error;
    if (std::find(c.enum_values.begin(), c.enum_values.begin() + static_cast<std::ptrdiff_t>(i), entry) != c.enum_values.begin() + static_cast<std::ptrdiff_t>(i)) return ctx.fail(SchemaErrorCode::invalid_constraints, path, "Enum values must be unique.", field);
  }
  return {};
}
Failure check_fields(const std::vector<FieldDefinition>& fields, Context& ctx, std::size_t depth, const std::string& path) {
  if (fields.size() > ctx.limits.schema_nodes - ctx.schema_nodes) return ctx.fail(SchemaErrorCode::limit_exceeded, path, "Fields exceed remaining schema-node budget.");
  std::set<std::string, std::less<>> names;
  for (const auto& field : fields) {
    if (auto error = ctx.node(true, depth, path, field.id)) return error;
    if (zero(field.id) || !ctx.fields.insert(field.id).second) return ctx.fail(SchemaErrorCode::invalid_id, path, "Field IDs must be nonzero and unique throughout the component.", field.id);
    if (field.name.size() > ctx.limits.name_bytes) return ctx.fail(SchemaErrorCode::limit_exceeded, path, "Field name byte limit exceeded.", field.id);
    if (!field_name(field.name)) return ctx.fail(SchemaErrorCode::invalid_name, path, "Field name must be an ASCII identifier.", field.id);
    const auto child = path + "." + field.name;
    if (!names.insert(field.name).second) return ctx.fail(SchemaErrorCode::duplicate_name, child, "Record field names must be unique.", field.id);
    if (auto error = ctx.text(field.display, child + ".display", field.id)) return error;
    if (auto error = ctx.text(field.description, child + ".description", field.id)) return error;
    if (auto error = check_type(field.type, ctx, depth, child, field.id)) return error;
    if (field.default_value) if (auto error = check_value(*field.type, *field.default_value, ctx, 1, child + ".default", field.id, true)) return error;
  }
  return {};
}

std::vector<FieldSchema> own_fields(const std::vector<FieldDefinition>&);
std::shared_ptr<const ValueSchema> own_type(const ValueDefinition& type) {
  return std::make_shared<const ValueSchema>(ValueSchema{type.kind, type.nullable, type.constraints, own_fields(type.fields), type.element ? own_type(*type.element) : nullptr});
}
std::vector<FieldSchema> own_fields(const std::vector<FieldDefinition>& fields) {
  std::vector<FieldSchema> owned;
  owned.reserve(fields.size());
  for (const auto& field : fields) owned.push_back({field.id, field.name, field.required, field.default_value, own_type(*field.type), field.display, field.description});
  return owned;
}
SchemaValue normalized(const ValueSchema&, const SchemaValue&);
SchemaValue normalized_record(const std::vector<FieldSchema>& fields, const SchemaValue::Record& record) {
  SchemaValue::Record result;
  for (const auto& field : fields) {
    const auto found = record.find(field.name);
    if (found != record.end()) result.emplace(field.name, normalized(*field.type, found->second));
    else if (field.default_value) result.emplace(field.name, normalized(*field.type, *field.default_value));
  }
  return {std::move(result)};
}
SchemaValue normalized(const ValueSchema& type, const SchemaValue& value) {
  if (std::holds_alternative<std::monostate>(value.data)) return {};
  if (type.kind == FieldKind::Record) return normalized_record(type.fields, std::get<SchemaValue::Record>(value.data));
  if (type.kind == FieldKind::List) {
    SchemaValue::List result;
    const auto& values = std::get<SchemaValue::List>(value.data);
    result.reserve(values.size());
    for (const auto& child : values) result.push_back(normalized(*type.element, child));
    return {std::move(result)};
  }
  return value;
}
SchemaError exhausted(ComponentTypeId id) { return {SchemaErrorCode::resource_exhausted, id, {}, {}, "Schema validation/storage allocation failed."}; }
}  // namespace

SchemaResult<std::unique_ptr<ComponentRegistry>> ComponentRegistry::create(SchemaValidationLimits limits) {
  // Bound path arithmetic as well as traversal. List indices add at most size_t's decimal digits.
  constexpr auto index_path_bytes = std::numeric_limits<std::size_t>::digits10 + 3u;
  const auto maximum = std::numeric_limits<std::size_t>::max();
  if (!limits.schema_nodes || !limits.value_nodes || !limits.nesting_depth || !limits.text_bytes || !limits.name_bytes ||
      limits.name_bytes > maximum - index_path_bytes || limits.nesting_depth > maximum / (limits.name_bytes + index_path_bytes)) return SchemaError{SchemaErrorCode::invalid_limits, {}, {}, "limits", "Validation limits must be positive and permit bounded path arithmetic."};
  try { return std::unique_ptr<ComponentRegistry>(new ComponentRegistry(limits)); }
  catch (const std::bad_alloc&) { return exhausted({}); }
}
SchemaResult<ComponentSchemaHandle> ComponentRegistry::register_builtin(const ComponentDefinition& definition) { return publish(definition, true); }
SchemaResult<ComponentSchemaHandle> ComponentRegistry::register_creator(const ComponentDefinition& definition) { return publish(definition, false); }
SchemaResult<ComponentSchemaHandle> ComponentRegistry::publish(const ComponentDefinition& definition, bool builtin) {
  Context ctx{limits_, definition.id};
  try {
    if (frozen_) return ctx.fail(SchemaErrorCode::frozen, "$", "The release registry is frozen.");
    if (zero(definition.id)) return ctx.fail(SchemaErrorCode::invalid_id, "id", "Component ID must be nonzero.");
    if (definition.name.size() > limits_.name_bytes) return ctx.fail(SchemaErrorCode::limit_exceeded, "name", "Component name byte limit exceeded.");
    if (!component_name(definition.name)) return ctx.fail(SchemaErrorCode::invalid_name, "name", "Component name requires two or more lowercase ASCII namespace segments.");
    if (!builtin && definition.name.starts_with("mudmaker.")) return ctx.fail(SchemaErrorCode::reserved_name, "name", "The mudmaker namespace is reserved to trusted built-in registration.");
    if (!definition.revision) return ctx.fail(SchemaErrorCode::invalid_revision, "revision", "Schema revision must be positive.");
    if (definition.persistence != PersistenceMode::Transient && definition.persistence != PersistenceMode::Persistent) return ctx.fail(SchemaErrorCode::invalid_metadata, "persistence", "Unknown persistence mode.");
    if (by_id_.contains(definition.id)) return ctx.fail(SchemaErrorCode::duplicate_id, "id", "Only one revision per component ID may be registered in a release.");
    if (by_name_.contains(definition.name)) return ctx.fail(SchemaErrorCode::duplicate_name, "name", "Component name is already registered.");
    if (auto error = ctx.text(definition.display, "display")) return *error;
    if (auto error = ctx.text(definition.description, "description")) return *error;
    if (auto error = ctx.node(true, 1, "$", {})) return *error;
    if (auto error = check_fields(definition.fields, ctx, 2, "$")) return *error;
    auto descriptor = std::make_shared<const ComponentSchema>(ComponentSchema{definition.id, definition.name, definition.revision, definition.persistence, definition.display, definition.description, own_fields(definition.fields)});
    by_id_.emplace(definition.id, descriptor);
    try { by_name_.emplace(definition.name, descriptor); }
    catch (...) { by_id_.erase(definition.id); throw; }
    return descriptor;
  } catch (const std::bad_alloc&) { return exhausted(definition.id); }
}
SchemaResult<ComponentSchemaHandle> ComponentRegistry::lookup(ComponentTypeId id, std::uint32_t revision) const {
  const auto found = by_id_.find(id);
  if (found == by_id_.end()) return SchemaError{SchemaErrorCode::unknown_component, id, {}, "$", "Component ID is not registered."};
  if (found->second->revision != revision) return SchemaError{SchemaErrorCode::revision_mismatch, id, {}, "revision", "Requested revision is not registered in this release."};
  return found->second;
}
SchemaResult<ComponentSchemaHandle> ComponentRegistry::lookup(std::string_view name, std::uint32_t revision) const {
  if (name.size() > limits_.name_bytes) return SchemaError{SchemaErrorCode::limit_exceeded, {}, {}, "name", "Lookup name exceeds byte limit."};
  const auto found = by_name_.find(name);
  if (found == by_name_.end()) return SchemaError{SchemaErrorCode::unknown_component, {}, {}, "name", "Component name is not registered."};
  return lookup(found->second->id, revision);
}
SchemaResult<SchemaValue> ComponentRegistry::validate_value(ComponentTypeId id, std::uint32_t revision, const SchemaValue& value) const {
  const auto found = lookup(id, revision);
  if (const auto error = std::get_if<SchemaError>(&found)) return *error;
  Context ctx{limits_, id};
  try {
    if (auto error = ctx.node(false, 1, "$", {})) return *error;
    const auto record = std::get_if<SchemaValue::Record>(&value.data);
    if (!record) return ctx.fail(SchemaErrorCode::wrong_type, "$", "A component value must be a Record.");
    const auto& descriptor = *std::get<ComponentSchemaHandle>(found);
    if (auto error = check_record(descriptor.fields, *record, ctx, 1, "$", {}, false)) return *error;
    return normalized_record(descriptor.fields, *record);
  } catch (const std::bad_alloc&) { return exhausted(id); }
}
}  // namespace mudmaker::ecs
