#include "mudmaker/wire/codec.h"
#include <google/protobuf/io/coded_stream.h>
#include <google/protobuf/struct.pb.h>
#include <google/protobuf/util/json_util.h>
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iterator>
#include <limits>
#include <set>
#include <new>
#include <stdexcept>

namespace mudmaker::wire {
namespace {
namespace shared = ::mudmaker::scripting::v1;
struct Rejected { Error error; };
[[noreturn]] void fail(ErrorCode code, std::string path, std::string reason) { throw Rejected{{code, std::move(path), std::move(reason)}}; }
template <typename T, typename F> Result<T> attempt(F&& action) {
  try { return action(); }
  catch (const Rejected& error) { return error.error; }
}
void policy_ok(const Policy& p) {
  if (!p.frame_bytes || p.frame_bytes > static_cast<std::size_t>(std::numeric_limits<int>::max()) || p.protobuf_recursion != 100 ||
      !p.value_depth || p.value_depth > 32 || !p.value_nodes || !p.text_bytes) fail(ErrorCode::Policy, "policy", "Positive bounds, logical depth1..32 and fixed protobuf recursion100 are required.");
}
bool utf8(std::string_view text) {
  for (std::size_t i = 0; i < text.size();) {
    const auto first = static_cast<unsigned char>(text[i]);
    if (first < 0x80) { ++i; continue; }
    const std::size_t length = first >= 0xc2 && first <= 0xdf ? 2 : first >= 0xe0 && first <= 0xef ? 3 : first >= 0xf0 && first <= 0xf4 ? 4 : 0;
    if (!length || length > text.size() - i) return false;
    for (std::size_t n = 1; n < length; ++n) { const auto c = static_cast<unsigned char>(text[i + n]); if (c < 0x80 || c > 0xbf) return false; }
    const auto second = static_cast<unsigned char>(text[i + 1]);
    if ((first == 0xe0 && second < 0xa0) || (first == 0xed && second > 0x9f) || (first == 0xf0 && second < 0x90) || (first == 0xf4 && second > 0x8f)) return false;
    i += length;
  }
  return true;
}
std::array<std::uint8_t, 16> guid_bytes(std::string_view text, const std::string& path) {
  if (text.size() != 36) fail(ErrorCode::Identity, path, "GUID needs canonical lowercase8-4-4-4-12 text.");
  std::array<std::uint8_t, 16> bytes{}; std::size_t output = 0; int high = -1;
  for (std::size_t i = 0; i < text.size(); ++i) {
    if (i == 8 || i == 13 || i == 18 || i == 23) { if (text[i] != '-') fail(ErrorCode::Identity, path, "GUID separator is invalid."); continue; }
    const char c = text[i]; const int nibble = c >= '0' && c <= '9' ? c - '0' : c >= 'a' && c <= 'f' ? c - 'a' + 10 : -1;
    if (nibble < 0) fail(ErrorCode::Identity, path, "GUID must use lowercase hexadecimal.");
    if (high < 0) high = nibble;
    else { bytes[output++] = static_cast<std::uint8_t>(high * 16 + nibble); high = -1; }
  }
  if (std::all_of(bytes.begin(), bytes.end(), [](auto byte) { return byte == 0; })) fail(ErrorCode::Identity, path, "Zero GUID is invalid.");
  return bytes;
}
ecs::EntityId entity(const shared::EntityRef& value, const std::string& path) {
  const auto world = guid_bytes(value.world_id(), path + ".world_id");
  if (value.entity_id() >= std::numeric_limits<std::uint32_t>::max()) fail(ErrorCode::Identity, path + ".entity_id", "Entity index must fit below UINT32_MAX.");
  return {ecs::WorldId::from_bytes(world), static_cast<std::uint32_t>(value.entity_id()), value.generation()};
}
struct Budget {
  const Policy& policy;
  std::size_t nodes = 0, bytes = 0;
  void enter(std::size_t depth, const std::string& path) {
    if (depth > policy.value_depth || nodes >= policy.value_nodes) fail(ErrorCode::Limit, path, "Logical value depth/node limit exceeded.");
    ++nodes;
  }
  void text(std::string_view value, const std::string& path) {
    if (value.size() > policy.text_bytes || value.size() > policy.frame_bytes - std::min(bytes, policy.frame_bytes)) fail(ErrorCode::Limit, path, "Text/frame byte budget exceeded.");
    if (!utf8(value)) fail(ErrorCode::Value, path, "Text is not valid UTF-8.");
    bytes += value.size();
  }
};
void primitive(const shared::PropertyValue& value, Budget& budget, const std::string& path) {
  switch (value.value_case()) {
    case shared::PropertyValue::kBooleanValue: case shared::PropertyValue::kIntegerValue: break;
    case shared::PropertyValue::kFloatingValue: if (!std::isfinite(value.floating_value())) fail(ErrorCode::Value, path, "Floating value must be finite."); break;
    case shared::PropertyValue::kTextValue: budget.text(value.text_value(), path); break;
    case shared::PropertyValue::kEntityValue: entity(value.entity_value(), path); break;
    case shared::PropertyValue::kAssetValue:
      guid_bytes(value.asset_value().id(), path + ".id");
      if (!value.asset_value().revision()) fail(ErrorCode::Identity, path, "Asset revision must be positive."); break;
    case shared::PropertyValue::kExplicitNull: if (!value.explicit_null()) fail(ErrorCode::Value, path, "Explicit Null must carry true."); break;
    default: fail(ErrorCode::Value, path, "Missing/unknown primitive kind.");
  }
}
void value_ok(const pb::EngineValue& value, Budget& budget, std::size_t depth, const std::string& path) {
  budget.enter(depth, path);
  switch (value.value_case()) {
    case pb::EngineValue::kPrimitive: primitive(value.primitive(), budget, path); break;
    case pb::EngineValue::kRecord: {
      if (static_cast<std::size_t>(value.record().fields_size()) > budget.policy.value_nodes - budget.nodes) fail(ErrorCode::Limit, path, "Record exceeds remaining node budget.");
      std::set<std::array<std::uint8_t, 16>> fields;
      for (const auto& field : value.record().fields()) {
        const auto id = guid_bytes(field.field_id(), path + ".field_id");
        if (!fields.insert(id).second) fail(ErrorCode::Value, path, "Duplicate FieldId.");
        if (!field.has_value()) fail(ErrorCode::Value, path, "Record field has no typed value.");
        value_ok(field.value(), budget, depth + 1, path + "." + field.field_id());
      }
      break;
    }
    case pb::EngineValue::kList:
      if (static_cast<std::size_t>(value.list().values_size()) > budget.policy.value_nodes - budget.nodes) fail(ErrorCode::Limit, path, "List exceeds remaining node budget.");
      for (int i = 0; i < value.list().values_size(); ++i) value_ok(value.list().values(i), budget, depth + 1, path + "[" + std::to_string(i) + "]");
      break;
    default: fail(ErrorCode::Value, path, "Missing/unknown EngineValue kind.");
  }
}
std::array<std::uint8_t, 16> component_header(const pb::ComponentValue& component) {
  auto id = guid_bytes(component.component_type_id(), "component_type_id");
  if (!component.schema_revision()) fail(ErrorCode::Value, "schema_revision", "Schema revision must be positive.");
  if (!component.has_value() || !component.value().has_record()) fail(ErrorCode::Value, "components", "Component root must be a present Record.");
  return id;
}
void inspection_ok(const pb::EntityInspection& inspection, Budget& budget) {
  if (!inspection.has_entity()) fail(ErrorCode::Identity, "entity", "Inspection entity is missing.");
  entity(inspection.entity(), "entity");
  std::set<std::array<std::uint8_t, 16>> components;
  for (const auto& component : inspection.components()) {
    const auto id = component_header(component);
    if (!components.insert(id).second) fail(ErrorCode::Value, "components", "Duplicate component ID.");
    value_ok(component.value(), budget, 1, component.component_type_id());
  }
}
void envelope_ok(const pb::Envelope& envelope, const Policy& policy) {
  policy_ok(policy);
  if (!envelope.has_protocol() || envelope.protocol().major() != 1 || envelope.protocol().minor() != 0) fail(ErrorCode::Version, "protocol", "Only engine-control1.0 is supported.");
  if (!envelope.request_id()) fail(ErrorCode::Envelope, "request_id", "Request ID must be nonzero.");
  guid_bytes(envelope.connection_id(), "connection_id");
  Budget budget{policy};
  switch (envelope.body_case()) {
    case pb::Envelope::kHello:
      if (envelope.hello().pairing_token().size() != 32 || envelope.hello().min_minor() != 0 || envelope.hello().max_minor() < envelope.hello().min_minor()) fail(ErrorCode::Envelope, "hello", "Hello needs32 token bytes and a minor interval containing0.");
      break;
    case pb::Envelope::kHelloAck:
      if (envelope.hello_ack().selected_minor() != 0 || envelope.hello_ack().engine_version().empty()) fail(ErrorCode::Envelope, "hello_ack", "Invalid selected minor/engine version.");
      guid_bytes(envelope.hello_ack().world_id(), "hello_ack.world_id"); budget.text(envelope.hello_ack().engine_version(), "engine_version"); break;
    case pb::Envelope::kInspectEntity:
      if (!envelope.inspect_entity().has_entity()) fail(ErrorCode::Identity, "inspect_entity", "Entity reference missing.");
      entity(envelope.inspect_entity().entity(), "inspect_entity.entity"); break;
    case pb::Envelope::kEntityInspection: inspection_ok(envelope.entity_inspection(), budget); break;
    case pb::Envelope::kError: {
      const auto& error = envelope.error();
      if (error.code() < pb::MALFORMED_FRAME || error.code() > pb::INTERNAL_FAILURE) fail(ErrorCode::Envelope, "error.code", "Unknown/unspecified error kind.");
      budget.text(error.message(), "error.message"); budget.text(error.native_code(), "error.native_code");
      if (error.has_world_id()) guid_bytes(error.world_id(), "error.world_id");
      if (error.has_entity()) entity(error.entity(), "error.entity");
      if (error.has_component_type_id()) guid_bytes(error.component_type_id(), "error.component_type_id");
      if (error.has_schema_revision() && !error.schema_revision()) fail(ErrorCode::Value, "error.schema_revision", "Schema revision must be positive.");
      for (const auto& path : error.field_path()) budget.text(path, "error.field_path");
      break;
    }
    default: fail(ErrorCode::Envelope, "body", "Missing/unknown envelope body.");
  }
}
struct View { ecs::FieldKind kind; const std::vector<ecs::FieldSchema>* fields; const ecs::ValueSchema* element; };
View view(const ecs::ValueSchema& type) { return {type.kind, &type.fields, type.element.get()}; }
pb::EngineValue to_wire(const ecs::SchemaValue& value, View type, Budget& budget, std::size_t depth) {
  budget.enter(depth, "value"); pb::EngineValue out;
  std::visit([&](const auto& data) {
    using T = std::decay_t<decltype(data)>;
    if constexpr (std::is_same_v<T, ecs::SchemaValue::Record>) {
      if (type.kind != ecs::FieldKind::Record || !type.fields) fail(ErrorCode::Value, "record", "Record descriptor mapping is missing.");
      if (data.size() > budget.policy.value_nodes - budget.nodes) fail(ErrorCode::Limit, "record", "Record exceeds remaining node budget.");
      auto* record = out.mutable_record();
      for (const auto& [name, child] : data) {
        const auto field = std::find_if(type.fields->begin(), type.fields->end(), [&](const auto& candidate) { return candidate.name == name; });
        if (field == type.fields->end()) fail(ErrorCode::Value, "record", "Native field has no stable descriptor FieldId.");
        auto converted = to_wire(child, view(*field->type), budget, depth + 1);
        auto* output = record->add_fields(); output->set_field_id(guid(field->id.bytes())); *output->mutable_value() = std::move(converted);
      }
    } else if constexpr (std::is_same_v<T, ecs::SchemaValue::List>) {
      if (type.kind != ecs::FieldKind::List || !type.element) fail(ErrorCode::Value, "list", "List element descriptor is missing.");
      if (data.size() > budget.policy.value_nodes - budget.nodes) fail(ErrorCode::Limit, "list", "List exceeds remaining node budget.");
      auto* list = out.mutable_list(); for (const auto& child : data) *list->add_values() = to_wire(child, view(*type.element), budget, depth + 1);
    } else {
      auto* primitive = out.mutable_primitive();
      if constexpr (std::is_same_v<T, std::monostate>) primitive->set_explicit_null(true);
      else if constexpr (std::is_same_v<T, bool>) primitive->set_boolean_value(data);
      else if constexpr (std::is_same_v<T, std::int64_t>) primitive->set_integer_value(data);
      else if constexpr (std::is_same_v<T, double>) { if (!std::isfinite(data)) fail(ErrorCode::Value, "floating", "Floating value must be finite."); primitive->set_floating_value(data); }
      else if constexpr (std::is_same_v<T, std::string>) { budget.text(data, "text"); primitive->set_text_value(data); }
      else if constexpr (std::is_same_v<T, ecs::EntityId>) { auto converted = wire_entity(data); entity(converted, "entity"); *primitive->mutable_entity_value() = std::move(converted); }
      else if constexpr (std::is_same_v<T, ecs::AssetReference>) { auto text = guid(data.id.bytes()); guid_bytes(text, "asset"); if (!data.revision) fail(ErrorCode::Identity, "asset", "Asset revision must be positive."); primitive->mutable_asset_value()->set_id(text); primitive->mutable_asset_value()->set_revision(data.revision); }
    }
  }, value.data);
  return out;
}
ecs::SchemaValue from_wire(const pb::EngineValue& value, View type) {
  if (value.has_record()) {
    if (type.kind != ecs::FieldKind::Record || !type.fields) fail(ErrorCode::Value, "record", "Record descriptor mapping is missing.");
    ecs::SchemaValue::Record out;
    for (const auto& field : value.record().fields()) {
      const ecs::FieldId id(guid_bytes(field.field_id(), "field_id"));
      const auto found = std::find_if(type.fields->begin(), type.fields->end(), [&](const auto& candidate) { return candidate.id == id; });
      if (found == type.fields->end()) fail(ErrorCode::Value, "field_id", "FieldId is not in the existing component descriptor.");
      out.emplace(found->name, from_wire(field.value(), view(*found->type)));
    }
    return {std::move(out)};
  }
  if (value.has_list()) {
    if (type.kind != ecs::FieldKind::List || !type.element) fail(ErrorCode::Value, "list", "List descriptor is missing.");
    ecs::SchemaValue::List out; out.reserve(static_cast<std::size_t>(value.list().values_size()));
    for (const auto& child : value.list().values()) out.push_back(from_wire(child, view(*type.element)));
    return {std::move(out)};
  }
  const auto& primitive = value.primitive();
  switch (primitive.value_case()) {
    case shared::PropertyValue::kExplicitNull: return {};
    case shared::PropertyValue::kBooleanValue: return {primitive.boolean_value()};
    case shared::PropertyValue::kIntegerValue: return {primitive.integer_value()};
    case shared::PropertyValue::kFloatingValue: return {primitive.floating_value()};
    case shared::PropertyValue::kTextValue: return {primitive.text_value()};
    case shared::PropertyValue::kEntityValue: return {entity(primitive.entity_value(), "entity")};
    case shared::PropertyValue::kAssetValue: return {ecs::AssetReference{ecs::AssetId(guid_bytes(primitive.asset_value().id(), "asset")), primitive.asset_value().revision()}};
    default: fail(ErrorCode::Value, "value", "Missing primitive kind.");
  }
}
}  // namespace

struct ConversionContext::State {
  const Policy policy;
  Budget budget;
  explicit State(Policy configured) : policy(configured), budget{policy} {}
  template <typename T, typename Action> Result<T> convert(Action&& action) {
    try {
      Budget staged{policy, budget.nodes, budget.bytes};
      auto output = action(staged);
      budget.nodes = staged.nodes; budget.bytes = staged.bytes;
      return Result<T>{std::move(output)};
    } catch (const Rejected& failure) { return failure.error; }
    catch (const std::bad_alloc&) { return Error{ErrorCode::Limit, "resource", "Conversion allocation failed."}; }
    catch (const std::length_error&) { return Error{ErrorCode::Limit, "resource", "Conversion capacity is not representable."}; }
  }
};
ConversionContext::ConversionContext(std::unique_ptr<State> state) noexcept : state_(std::move(state)) {}
ConversionContext::~ConversionContext() = default;
Result<std::unique_ptr<ConversionContext>> ConversionContext::create(Policy policy) {
  try {
    return attempt<std::unique_ptr<ConversionContext>>([&] {
      policy_ok(policy);
      return std::unique_ptr<ConversionContext>(new ConversionContext(std::make_unique<State>(policy)));
    });
  } catch (const std::bad_alloc&) { return Error{ErrorCode::Limit, "resource", "Conversion context allocation failed."}; }
}
Result<pb::ComponentValue> ConversionContext::wire_component(const NativeComponent& component) {
  return state_->convert<pb::ComponentValue>([&](Budget& budget) {
    if (!component.schema || !component.schema->revision) fail(ErrorCode::Value, "component", "Missing component descriptor/revision.");
    auto id = guid(component.schema->id.bytes()); guid_bytes(id, "component_type_id");
    if (!std::holds_alternative<ecs::SchemaValue::Record>(component.value.data)) fail(ErrorCode::Value, "component", "Component root must be a Record.");
    auto value = to_wire(component.value, {ecs::FieldKind::Record, &component.schema->fields, nullptr}, budget, 1);
    pb::ComponentValue out; out.set_component_type_id(id); out.set_schema_revision(component.schema->revision);
    *out.mutable_value() = std::move(value); return out;
  });
}
Result<NativeComponent> ConversionContext::native_component(const pb::ComponentValue& component, const ecs::ComponentRegistry& registry) {
  return state_->convert<NativeComponent>([&](Budget& budget) {
    const ecs::ComponentTypeId id(component_header(component));
    value_ok(component.value(), budget, 1, component.component_type_id());
    auto schema = registry.lookup(id, component.schema_revision());
    if (!std::holds_alternative<ecs::ComponentSchemaHandle>(schema)) fail(ErrorCode::Value, "component", "Component mapping is not in the existing registry/revision.");
    auto descriptor = std::get<ecs::ComponentSchemaHandle>(schema);
    auto value = from_wire(component.value(), {ecs::FieldKind::Record, &descriptor->fields, nullptr});
    return NativeComponent{std::move(descriptor), std::move(value)};
  });
}
Result<pb::EngineValue> ConversionContext::wire_value(const ecs::SchemaValue& value, const ecs::ValueSchema& type) {
  return state_->convert<pb::EngineValue>([&](Budget& budget) { return to_wire(value, view(type), budget, 1); });
}
Result<ecs::SchemaValue> ConversionContext::native_value(const pb::EngineValue& value, const ecs::ValueSchema& type) {
  return state_->convert<ecs::SchemaValue>([&](Budget& budget) {
    value_ok(value, budget, 1, "value"); return from_wire(value, view(type));
  });
}
Result<std::monostate> validate_policy(const Policy& policy) { return attempt<std::monostate>([&] { policy_ok(policy); return std::monostate{}; }); }
Result<Policy> load_policy(const std::string& path) {
  return attempt<Policy>([&] {
    std::ifstream file(path, std::ios::binary); if (!file) fail(ErrorCode::Policy, "policy", "Policy file could not be opened.");
    const std::string json{std::istreambuf_iterator<char>(file), {}};
    google::protobuf::Struct object;
    if (!google::protobuf::util::JsonStringToMessage(json, &object).ok() || object.fields_size() != 5) fail(ErrorCode::Policy, "policy", "Expected five named numeric policy controls.");
    const auto read = [&](const char* key) -> std::size_t {
      const auto value = object.fields().find(key);
      if (value == object.fields().end() || value->second.kind_case() != google::protobuf::Value::kNumberValue) fail(ErrorCode::Policy, key, "Policy limit must be numeric.");
      const auto number = value->second.number_value();
      // JSON's exact integral range, and the actual native size_t range, precede conversion.
      constexpr double max_exact_json_integer = 9007199254740991.0;
      if (!std::isfinite(number) || number < 1 || number > max_exact_json_integer || number >= static_cast<double>(std::numeric_limits<std::size_t>::max()) || number != std::floor(number)) fail(ErrorCode::Policy, key, "Policy limit must be a positive exactly representable integer.");
      return static_cast<std::size_t>(number);
    };
    Policy policy{read("frame_bytes"), read("protobuf_recursion"), read("value_depth"), read("value_nodes"), read("text_bytes")}; policy_ok(policy); return policy;
  });
}
Result<std::array<std::uint8_t, 16>> parse_guid(std::string_view text) { return attempt<std::array<std::uint8_t, 16>>([&] { return guid_bytes(text, "guid"); }); }
std::string guid(std::span<const std::uint8_t, 16> bytes) {
  constexpr char hex[] = "0123456789abcdef"; std::string out; out.reserve(36);
  for (std::size_t i = 0; i < bytes.size(); ++i) { if (i == 4 || i == 6 || i == 8 || i == 10) out.push_back('-'); out.push_back(hex[bytes[i] >> 4]); out.push_back(hex[bytes[i] & 15]); }
  return out;
}
Result<ecs::EntityId> native_entity(const shared::EntityRef& value) { return attempt<ecs::EntityId>([&] { return entity(value, "entity"); }); }
shared::EntityRef wire_entity(ecs::EntityId value) { shared::EntityRef out; out.set_world_id(guid(value.world.bytes())); out.set_entity_id(value.index); out.set_generation(value.generation); return out; }
Result<std::vector<std::uint8_t>> encode(const pb::Envelope& envelope, const Policy& policy) {
  return attempt<std::vector<std::uint8_t>>([&] {
    envelope_ok(envelope, policy); const auto size = envelope.ByteSizeLong();
    if (!size || size > policy.frame_bytes) fail(ErrorCode::Limit, "frame", "Encoded payload exceeds the frame policy.");
    std::vector<std::uint8_t> frame(size + 4);
    const auto length = static_cast<std::uint32_t>(size);
    for (std::size_t i = 0; i < 4; ++i) frame[i] = static_cast<std::uint8_t>(length >> (24 - 8 * i));
    if (!envelope.SerializeToArray(frame.data() + 4, static_cast<int>(size))) fail(ErrorCode::Protobuf, "frame", "Protobuf serialization failed.");
    return frame;
  });
}
Result<pb::Envelope> decode(std::span<const std::uint8_t> frame, const Policy& policy) {
  return attempt<pb::Envelope>([&] {
    policy_ok(policy);
    if (frame.size() < 4) fail(ErrorCode::Frame, "frame", "Incomplete four-byte frame prefix.");
    std::uint32_t length = 0; for (std::size_t i = 0; i < 4; ++i) length = (length << 8) | frame[i];
    if (!length || length > policy.frame_bytes || frame.size() - 4 != length) fail(ErrorCode::Frame, "frame", "Zero/oversized/incomplete/trailing frame payload.");
    google::protobuf::io::CodedInputStream input(frame.data() + 4, static_cast<int>(length));
    input.SetTotalBytesLimit(static_cast<int>(policy.frame_bytes)); input.SetRecursionLimit(100);
    pb::Envelope out;
    if (!out.ParseFromCodedStream(&input) || !input.ConsumedEntireMessage()) fail(ErrorCode::Protobuf, "frame", "Malformed protobuf or physical parser recursion exceeded.");
    envelope_ok(out, policy); return out;
  });
}
Result<pb::EntityInspection> wire_inspection(const NativeInspection& inspection, const Policy& policy) {
  auto created = ConversionContext::create(policy);
  if (const auto error = std::get_if<Error>(&created)) return *error;
  auto context = std::move(std::get<std::unique_ptr<ConversionContext>>(created));
  return attempt<pb::EntityInspection>([&] {
    pb::EntityInspection out;
    auto reference = wire_entity(inspection.entity); entity(reference, "entity"); *out.mutable_entity() = std::move(reference);
    std::set<ecs::ComponentTypeId> seen;
    for (const auto& component : inspection.components) {
      if (!component.schema || !seen.insert(component.schema->id).second) fail(ErrorCode::Value, "component", "Missing/duplicate component descriptor.");
      auto converted = context->wire_component(component);
      if (const auto error = std::get_if<Error>(&converted)) throw Rejected{*error};
      *out.add_components() = std::move(std::get<pb::ComponentValue>(converted));
    }
    return out;
  });
}
Result<NativeInspection> native_inspection(const pb::EntityInspection& inspection, const ecs::ComponentRegistry& registry, const Policy& policy) {
  auto created = ConversionContext::create(policy);
  if (const auto error = std::get_if<Error>(&created)) return *error;
  auto context = std::move(std::get<std::unique_ptr<ConversionContext>>(created));
  return attempt<NativeInspection>([&] {
    if (!inspection.has_entity()) fail(ErrorCode::Identity, "entity", "Inspection entity is missing.");
    NativeInspection out{entity(inspection.entity(), "entity"), {}};
    std::set<std::string_view> seen;
    for (const auto& component : inspection.components()) {
      if (!seen.insert(component.component_type_id()).second) fail(ErrorCode::Value, "components", "Duplicate component ID.");
      auto converted = context->native_component(component, registry);
      if (const auto error = std::get_if<Error>(&converted)) throw Rejected{*error};
      out.components.push_back(std::move(std::get<NativeComponent>(converted)));
    }
    return out;
  });
}
}  // namespace mudmaker::wire
