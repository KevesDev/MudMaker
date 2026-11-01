#pragma once
#include "mudmaker/ecs/world.h"
#include "mudmaker/wire/codec.h"
namespace mudmaker::control {
inline constexpr std::size_t kPairingTokenBytes = 32;
inline constexpr std::size_t kConfigurationInputBytes = 16384;
inline constexpr std::string_view kNamedId = "efbeba2d-21cd-4df8-a757-d96e53f8380c";
inline constexpr std::string_view kNameFieldId = "dea816fc-0ae4-4eac-b02a-a1596450f93a";
inline constexpr std::string_view kDescriptionFieldId = "6b76f067-e60e-49e6-8820-7a9748468de1";
using PairingToken = std::array<std::uint8_t, kPairingTokenBytes>;
struct StartupError { std::string code, reason; };
template <typename T> using Result = std::variant<T, StartupError>;
struct Configuration { wire::Policy wire; wire::pb::RuntimeSettings runtime; };
Result<Configuration> load_configuration(const std::string& wire_path, const std::string& runtime_path);
std::string native_code(const ecs::IdentityError& error);
std::string native_code(const ecs::SchemaError& error);
std::string native_code(const ecs::WorldError& error);
wire::Result<wire::pb::CatalogResult> schema_metadata(const ecs::ComponentCatalogPage& page,
    std::span<const ecs::ComponentBinding> bindings, const wire::Policy& policy);
enum class MutationOutcome { None, Committed, Unknown };
struct Reply { std::vector<std::uint8_t> frame; bool closing = false; MutationOutcome outcome = MutationOutcome::None; std::string diagnostic; };
class ControlSession final {
 public:
  static Result<std::unique_ptr<ControlSession>> create(Configuration configuration, PairingToken token);
  ~ControlSession();
  ControlSession(const ControlSession&) = delete;
  ControlSession& operator=(const ControlSession&) = delete;
  Reply receive(std::span<const std::uint8_t> frame);
  ecs::WorldId world_id() const noexcept;
 private:
  struct State;
  explicit ControlSession(std::unique_ptr<State> state) noexcept;
  std::unique_ptr<State> state_;
};
}  // namespace mudmaker::control
