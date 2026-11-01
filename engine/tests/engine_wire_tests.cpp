#include "mudmaker/wire/codec.h"
#include <google/protobuf/descriptor.pb.h>
#include <array>
#include <cstdio>
#include <fstream>
#include <functional>
#include <iterator>
#include <limits>
#include <stdexcept>

namespace wire = mudmaker::wire;
namespace ecs = mudmaker::ecs;
namespace epb = mudmaker::engine::v1;
#define CHECK(expression) do { if (!(expression)) throw std::runtime_error(std::string(__FILE__) + ":" + std::to_string(__LINE__) + " " #expression); } while (false)
namespace {
constexpr auto world_guid = "00112233-4455-6677-8899-aabbccddeeff";
constexpr auto component_guid = "11112233-4455-6677-8899-aabbccddeeff";
constexpr auto asset_guid = "ffeeddcc-bbaa-9988-7766-554433221100";
template <typename T> T take(wire::Result<T> result) {
  if (const auto error = std::get_if<wire::Error>(&result)) throw std::runtime_error(error->path + ": " + error->reason);
  return std::move(std::get<T>(result));
}
template <typename T> T schema(ecs::SchemaResult<T> result) {
  if (const auto error = std::get_if<ecs::SchemaError>(&result)) throw std::runtime_error(error->path + ": " + std::string(error->reason));
  return std::move(std::get<T>(result));
}
template <typename T> void rejected(const wire::Result<T>& result, wire::ErrorCode code) {
  CHECK(std::holds_alternative<wire::Error>(result)); const auto& error = std::get<wire::Error>(result);
  CHECK(error.code == code && !error.path.empty() && !error.reason.empty());
}
std::array<std::uint8_t, 16> bytes(std::uint8_t number) { std::array<std::uint8_t, 16> out{}; out.back() = number; return out; }
std::shared_ptr<ecs::ValueDefinition> type(ecs::FieldKind kind, bool nullable = false) { auto out = std::make_shared<ecs::ValueDefinition>(); out->kind = kind; out->nullable = nullable; return out; }
ecs::FieldDefinition field(std::uint8_t number, std::string name, ecs::FieldKind kind) { return {ecs::FieldId(bytes(number)), std::move(name), false, {}, type(kind), {}, {}}; }
ecs::SchemaValue record(ecs::SchemaValue::Record value) { return {std::move(value)}; }
ecs::SchemaValue list(ecs::SchemaValue::List value) { return {std::move(value)}; }
struct Fixture {
  std::unique_ptr<ecs::ComponentRegistry> registry;
  wire::NativeInspection inspection;
  Fixture() {
    registry = schema(ecs::ComponentRegistry::create({256, 256, 64, 262144, 64}));
    ecs::ComponentDefinition definition{ecs::ComponentTypeId(take(wire::parse_guid(component_guid))), "fixture.codec", 1, ecs::PersistenceMode::Transient, {}, {}, {}};
    definition.fields = {field(1, "text", ecs::FieldKind::Text), field(2, "minimum", ecs::FieldKind::Integer), field(3, "maximum", ecs::FieldKind::Integer), field(4, "boolean", ecs::FieldKind::Boolean), field(5, "floating", ecs::FieldKind::Floating), field(6, "entity", ecs::FieldKind::Entity), field(7, "asset", ecs::FieldKind::Asset), field(8, "null", ecs::FieldKind::Text), field(9, "absent", ecs::FieldKind::Text), field(10, "nested", ecs::FieldKind::Record), field(13, "list", ecs::FieldKind::List)};
    definition.fields[7].type->nullable = true;
    definition.fields[9].type->fields = {field(11, "integer", ecs::FieldKind::Integer), field(12, "text", ecs::FieldKind::Text)};
    definition.fields[10].type->element = type(ecs::FieldKind::Text);
    auto deep_type = type(ecs::FieldKind::Integer); ecs::SchemaValue deep{std::int64_t{777}};
    // Component Record is depth1;30 additional Records put this primitive at logical depth32.
    for (std::uint8_t i = 0; i < 30; ++i) {
      auto parent = type(ecs::FieldKind::Record);
      auto child = field(static_cast<std::uint8_t>(50 - i), "next", ecs::FieldKind::Integer); child.type = deep_type;
      parent->fields.push_back(std::move(child)); deep_type = std::move(parent);
      deep = record({{"next", std::move(deep)}});
    }
    auto deep_field = field(20, "deep", ecs::FieldKind::Record); deep_field.type = std::move(deep_type); definition.fields.push_back(std::move(deep_field));
    const auto descriptor = schema(registry->register_creator(definition)); registry->freeze();
    const ecs::EntityId entity{ecs::WorldId::from_bytes(take(wire::parse_guid(world_guid))), 4294967294u, 4294967295u};
    auto value = record({{"text", {std::string("from C++")}}, {"minimum", {std::numeric_limits<std::int64_t>::min()}}, {"maximum", {std::numeric_limits<std::int64_t>::max()}},
      {"boolean", {true}}, {"floating", {1.25}}, {"entity", {entity}}, {"asset", {ecs::AssetReference{ecs::AssetId(take(wire::parse_guid(asset_guid))), 7}}},
      {"null", {}}, {"nested", record({{"integer", {std::int64_t{7}}}, {"text", {std::string("nested")}}})}, {"list", list({{std::string("first")}, {std::string("second")}})}, {"deep", std::move(deep)}});
    inspection = {entity, {{descriptor, schema(registry->validate_value(definition.id, 1, value))}}};
  }
};
wire::Policy policy() { return take(wire::load_policy(WIRE_POLICY_FILE)); }
epb::Envelope envelope() {
  Fixture fixture; epb::Envelope out;
  out.mutable_protocol()->set_major(1); out.mutable_protocol()->set_minor(0);
  out.set_request_id(std::numeric_limits<std::uint64_t>::max()); out.set_connection_id(world_guid);
  *out.mutable_entity_inspection() = take(wire::wire_inspection(fixture.inspection, policy())); return out;
}
epb::EngineValue* value(epb::Envelope& message, std::uint8_t number) {
  const auto id = wire::guid(bytes(number));
  for (auto& field : *message.mutable_entity_inspection()->mutable_components(0)->mutable_value()->mutable_record()->mutable_fields()) if (field.field_id() == id) return field.mutable_value();
  throw std::runtime_error("Fixture FieldId missing");
}
std::vector<std::uint8_t> read(const std::string& path) {
  std::ifstream file(path, std::ios::binary); CHECK(file.good()); return {std::istreambuf_iterator<char>(file), {}};
}
void write(const std::string& path, std::span<const std::uint8_t> data) {
  std::ofstream file(path, std::ios::binary); CHECK(file.good()); file.write(reinterpret_cast<const char*>(data.data()), static_cast<std::streamsize>(data.size())); CHECK(file.good());
}
void native_roundtrip_preserves_owned_values_and_deepest_supported_boundary() {
  Fixture fixture; const auto expected = fixture.inspection.components[0].value;
  auto encoded = take(wire::encode(envelope(), policy()));
  auto decoded = take(wire::decode(encoded, policy()));
  const auto native = take(wire::native_inspection(decoded.entity_inspection(), *fixture.registry, policy()));
  CHECK(native.entity == fixture.inspection.entity && native.components[0].value == expected);
  CHECK(wire::guid(native.entity.world.bytes()) == world_guid && native.entity.index == 4294967294u && native.entity.generation == 4294967295u);
  const auto& fields = std::get<ecs::SchemaValue::Record>(native.components[0].value.data);
  CHECK(!fields.contains("absent") && std::holds_alternative<std::monostate>(fields.at("null").data));
  CHECK(std::get<std::int64_t>(fields.at("minimum").data) == std::numeric_limits<std::int64_t>::min());
  CHECK(std::get<std::int64_t>(fields.at("maximum").data) == std::numeric_limits<std::int64_t>::max());
  std::get<ecs::SchemaValue::Record>(fixture.inspection.components[0].value.data)["text"] = {std::string("edited native source")};
  CHECK(std::get<std::string>(fields.at("text").data) == "from C++");
}
void frame_and_protobuf_failures_are_bounded() {
  const auto encoded = take(wire::encode(envelope(), policy()));
  rejected(wire::decode({}, policy()), wire::ErrorCode::Frame);
  rejected(wire::decode(std::array<std::uint8_t, 4>{0,0,0,0}, policy()), wire::ErrorCode::Frame);
  auto truncated = encoded; truncated.pop_back(); rejected(wire::decode(truncated, policy()), wire::ErrorCode::Frame);
  auto trailing = encoded; trailing.push_back(0); rejected(wire::decode(trailing, policy()), wire::ErrorCode::Frame);
  auto oversized = encoded; oversized[0] = 0x7f; rejected(wire::decode(oversized, policy()), wire::ErrorCode::Frame);
  auto limited = policy(); limited.frame_bytes = 1; rejected(wire::decode(encoded, limited), wire::ErrorCode::Frame);
  rejected(wire::decode(std::array<std::uint8_t, 5>{0,0,0,1,0xff}, policy()), wire::ErrorCode::Protobuf);
}
void version_body_and_error_vocabulary_reject_unknowns() {
  auto message = envelope(); message.mutable_protocol()->set_major(2); rejected(wire::encode(message, policy()), wire::ErrorCode::Version);
  message = envelope(); message.mutable_protocol()->set_minor(1); rejected(wire::encode(message, policy()), wire::ErrorCode::Version);
  message = envelope(); message.set_request_id(0); rejected(wire::encode(message, policy()), wire::ErrorCode::Envelope);
  message = envelope(); message.clear_body(); rejected(wire::encode(message, policy()), wire::ErrorCode::Envelope);
  message.mutable_hello()->set_pairing_token("x"); rejected(wire::encode(message, policy()), wire::ErrorCode::Envelope);
  message.mutable_hello()->set_pairing_token(std::string(32, 'x')); CHECK(std::holds_alternative<std::vector<std::uint8_t>>(wire::encode(message, policy())));
  message.mutable_hello()->set_min_minor(1); rejected(wire::encode(message, policy()), wire::ErrorCode::Envelope);
  message.mutable_error()->set_code(epb::UNSPECIFIED); rejected(wire::encode(message, policy()), wire::ErrorCode::Envelope);
  message.mutable_error()->set_code(static_cast<epb::ErrorCode>(10)); rejected(wire::encode(message, policy()), wire::ErrorCode::Envelope);
  message.mutable_error()->set_code(epb::WORLD_FAILURE); message.mutable_error()->set_native_code("ecs.stale_generation");
  *message.mutable_error()->mutable_entity() = envelope().entity_inspection().entity();
  CHECK(take(wire::decode(take(wire::encode(message, policy())), policy())).error().native_code() == "ecs.stale_generation");
}
void identity_representation_is_exact() {
  const auto native = take(wire::native_entity(envelope().entity_inspection().entity())); CHECK(native.world.bytes()[0] == 0 && native.world.bytes()[1] == 0x11 && native.world.bytes()[15] == 0xff);
  auto shared = wire::wire_entity(native); shared.set_entity_id(4294967295ull); rejected(wire::native_entity(shared), wire::ErrorCode::Identity);
  shared.set_entity_id(std::numeric_limits<std::uint64_t>::max()); rejected(wire::native_entity(shared), wire::ErrorCode::Identity);
  shared.set_entity_id(0); shared.set_world_id("00112233-4455-6677-8899-AABBCCDDEEFF"); rejected(wire::native_entity(shared), wire::ErrorCode::Identity);
  rejected(wire::parse_guid("00000000-0000-0000-0000-000000000000"), wire::ErrorCode::Identity);
  rejected(wire::parse_guid("not-a-guid"), wire::ErrorCode::Identity);
  auto message = envelope(); value(message, 7)->mutable_primitive()->mutable_asset_value()->set_revision(0); rejected(wire::encode(message, policy()), wire::ErrorCode::Identity);
}
void malformed_typed_values_never_become_defaults() {
  auto message = envelope(); value(message, 8)->mutable_primitive()->set_explicit_null(false); rejected(wire::encode(message, policy()), wire::ErrorCode::Value);
  message = envelope(); value(message, 1)->clear_value(); rejected(wire::encode(message, policy()), wire::ErrorCode::Value);
  message = envelope(); auto* record = message.mutable_entity_inspection()->mutable_components(0)->mutable_value()->mutable_record();
  *record->add_fields() = record->fields(0); rejected(wire::encode(message, policy()), wire::ErrorCode::Value);
  message = envelope(); message.mutable_entity_inspection()->mutable_components(0)->mutable_value()->mutable_record()->mutable_fields(0)->clear_value(); rejected(wire::encode(message, policy()), wire::ErrorCode::Value);
  message = envelope(); value(message, 5)->mutable_primitive()->set_floating_value(std::numeric_limits<double>::infinity()); rejected(wire::encode(message, policy()), wire::ErrorCode::Value);
  message = envelope(); value(message, 1)->mutable_primitive()->set_text_value(std::string("\xc0\xaf")); rejected(wire::encode(message, policy()), wire::ErrorCode::Value);
  message = envelope(); message.mutable_entity_inspection()->mutable_components(0)->mutable_value()->mutable_record()->mutable_fields(0)->set_field_id("bad"); rejected(wire::encode(message, policy()), wire::ErrorCode::Identity);
  message = envelope(); message.mutable_entity_inspection()->mutable_components(0)->mutable_value()->mutable_primitive()->set_boolean_value(true); rejected(wire::encode(message, policy()), wire::ErrorCode::Value);
}
void logical_limits_and_fixed_parser_policy() {
  auto p = policy(); p.protobuf_recursion = 99; rejected(wire::validate_policy(p), wire::ErrorCode::Policy);
  p = policy(); p.value_depth = 33; rejected(wire::validate_policy(p), wire::ErrorCode::Policy);
  p = policy(); p.value_depth = 0; rejected(wire::validate_policy(p), wire::ErrorCode::Policy);
  p = policy(); p.frame_bytes = 0; rejected(wire::validate_policy(p), wire::ErrorCode::Policy);
  p = policy(); p.frame_bytes = 10; rejected(wire::encode(envelope(), p), wire::ErrorCode::Limit);
  p = policy(); p.value_depth = 4; rejected(wire::decode(take(wire::encode(envelope(), policy())), p), wire::ErrorCode::Limit);
  p = policy(); p.value_nodes = 2; rejected(wire::encode(envelope(), p), wire::ErrorCode::Limit);
  p = policy(); p.text_bytes = 3; rejected(wire::encode(envelope(), p), wire::ErrorCode::Limit);
  auto message = envelope(); auto* deep = value(message, 20);
  for (int i = 0; i < 30; ++i) deep = deep->mutable_record()->mutable_fields(0)->mutable_value();
  deep->clear_value(); deep->mutable_record()->add_fields()->set_field_id(wire::guid(bytes(51)));
  deep->mutable_record()->mutable_fields(0)->mutable_value()->mutable_primitive()->set_integer_value(1);
  rejected(wire::encode(message, policy()), wire::ErrorCode::Limit);
}
void descriptor_freeze_detects_changes_and_allows_additions() {
  const auto frozen = read(WIRE_FROZEN_FILE), current = read(WIRE_CURRENT_FILE);
  take(wire::compatible_descriptors(frozen, current));
  google::protobuf::FileDescriptorSet changed; CHECK(changed.ParseFromArray(current.data(), static_cast<int>(current.size())));
  google::protobuf::DescriptorProto* target = nullptr;
  for (auto& file : *changed.mutable_file()) if (file.package() == "mudmaker.engine.v1") target = file.mutable_message_type(0);
  CHECK(target != nullptr);
  target->mutable_field(0)->set_type(google::protobuf::FieldDescriptorProto::TYPE_STRING);
  auto serialized = changed.SerializeAsString(); rejected(wire::compatible_descriptors(frozen, {reinterpret_cast<const std::uint8_t*>(serialized.data()), serialized.size()}), wire::ErrorCode::Descriptor);
  CHECK(changed.ParseFromArray(current.data(), static_cast<int>(current.size())));
  for (auto& file : *changed.mutable_file()) if (file.package() == "mudmaker.engine.v1") target = file.mutable_message_type(0);
  auto* addition = target->add_field(); addition->set_name("additive_fixture"); addition->set_number(999); addition->set_type(google::protobuf::FieldDescriptorProto::TYPE_STRING); addition->set_label(google::protobuf::FieldDescriptorProto::LABEL_OPTIONAL);
  serialized = changed.SerializeAsString(); take(wire::compatible_descriptors(frozen, {reinterpret_cast<const std::uint8_t*>(serialized.data()), serialized.size()}));
}
void check_mutated(const std::string& path) {
  Fixture fixture;
  const auto decoded = take(wire::decode(read(path), policy()));
  const auto native = take(wire::native_inspection(decoded.entity_inspection(), *fixture.registry, policy()));
  const auto& fields = std::get<ecs::SchemaValue::Record>(native.components[0].value.data);
  CHECK(std::get<std::string>(fields.at("text").data) == "from Rust");
  CHECK(std::get<std::int64_t>(fields.at("minimum").data) == 42);
  CHECK(std::get<std::int64_t>(std::get<ecs::SchemaValue::Record>(fields.at("nested").data).at("integer").data) == -17);
  const auto* deep = &fields.at("deep"); for (int i = 0; i < 30; ++i) deep = &std::get<ecs::SchemaValue::Record>(deep->data).at("next");
  CHECK(std::get<std::int64_t>(deep->data) == 777);
  CHECK(native.entity.index == 4294967294u && native.entity.generation == 4294967295u && wire::guid(native.entity.world.bytes()) == world_guid);
}
}  // namespace
int main(int argc, char** argv) {
  try {
    if (argc == 3 && std::string_view(argv[1]) == "--write-fixture") { write(argv[2], take(wire::encode(envelope(), policy()))); return 0; }
    if (argc == 3 && std::string_view(argv[1]) == "--read-mutated") { check_mutated(argv[2]); return 0; }
    CHECK(argc == 1);
    const std::pair<const char*, void(*)()> tests[] = {
      {"native owned kinds and deepest supported value roundtrip", native_roundtrip_preserves_owned_values_and_deepest_supported_boundary},
      {"bounded frame and malformed protobuf", frame_and_protobuf_failures_are_bounded},
      {"version/body/error vocabulary", version_body_and_error_vocabulary_reject_unknowns},
      {"complete GUID and index/generation representation", identity_representation_is_exact},
      {"malformed/duplicate/missing typed values", malformed_typed_values_never_become_defaults},
      {"logical bounds and fixed physical parser policy", logical_limits_and_fixed_parser_policy},
      {"substantive frozen descriptor compatibility", descriptor_freeze_detects_changes_and_allows_additions},
    };
    int failures = 0;
    for (const auto& [name, run] : tests) {
      try { run(); std::printf("PASS %s\n", name); }
      catch (const std::exception& error) { ++failures; std::printf("FAIL %s: %s\n", name, error.what()); }
    }
    std::printf("%zu wire cases, %d failed\n", std::size(tests), failures); return failures == 0 ? 0 : 1;
  } catch (const std::exception& error) { std::fprintf(stderr, "Fixture failure: %s\n", error.what()); return 1; }
}
