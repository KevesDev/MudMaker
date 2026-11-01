#pragma once
#include "mudmaker/ecs/component_schema.h"
#include "engine/v1/mudmaker_engine_v1.pb.h"

namespace mudmaker::wire {
namespace pb = ::mudmaker::engine::v1;
struct Policy { std::size_t frame_bytes, protobuf_recursion, value_depth, value_nodes, text_bytes; };
enum class ErrorCode { Policy, Frame, Protobuf, Version, Envelope, Identity, Value, Limit, Descriptor };
struct Error { ErrorCode code; std::string path, reason; };
template <typename T> using Result = std::variant<T, Error>;
Result<Policy> load_policy(const std::string& path);
Result<std::monostate> validate_policy(const Policy& policy);
Result<std::vector<std::uint8_t>> encode(const pb::Envelope& envelope, const Policy& policy);
Result<pb::Envelope> decode(std::span<const std::uint8_t> frame, const Policy& policy);
Result<std::array<std::uint8_t, 16>> parse_guid(std::string_view text);
std::string guid(std::span<const std::uint8_t, 16> bytes);
Result<ecs::EntityId> native_entity(const ::mudmaker::scripting::v1::EntityRef& entity);
::mudmaker::scripting::v1::EntityRef wire_entity(ecs::EntityId entity);
struct NativeComponent { ecs::ComponentSchemaHandle schema; ecs::SchemaValue value; };
struct NativeInspection { ecs::EntityId entity; std::vector<NativeComponent> components; };
// One context per message: all successful siblings share aggregate node/frame-text accounting.
// text_bytes remains per string; depth remains each value's nesting depth.
// It owns its policy/counters; failed conversions return no value and preserve those counters.
// Full protobuf frame size/metadata validation remains encode/decode's responsibility.
class ConversionContext final {
 public:
  static Result<std::unique_ptr<ConversionContext>> create(Policy policy);
  ~ConversionContext();
  ConversionContext(const ConversionContext&) = delete;
  ConversionContext& operator=(const ConversionContext&) = delete;
  Result<pb::ComponentValue> wire_component(const NativeComponent& component);
  Result<NativeComponent> native_component(const pb::ComponentValue& component, const ecs::ComponentRegistry& registry);
  Result<pb::EngineValue> wire_value(const ecs::SchemaValue& value, const ecs::ValueSchema& type);
  Result<ecs::SchemaValue> native_value(const pb::EngineValue& value, const ecs::ValueSchema& type);
 private:
  struct State;
  explicit ConversionContext(std::unique_ptr<State> state) noexcept;
  std::unique_ptr<State> state_;
};
Result<pb::EntityInspection> wire_inspection(const NativeInspection& inspection, const Policy& policy);
Result<NativeInspection> native_inspection(const pb::EntityInspection& inspection, const ecs::ComponentRegistry& registry, const Policy& policy);
Result<std::monostate> compatible_descriptors(std::span<const std::uint8_t> frozen, std::span<const std::uint8_t> current);
}  // namespace mudmaker::wire
