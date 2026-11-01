#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <memory>
#include <optional>
#include <span>
#include <string_view>
#include <variant>

namespace mudmaker::ecs {

inline constexpr std::size_t kWorldIdBytes = 16;
inline constexpr std::uint32_t kInvalidEntityIndex = std::numeric_limits<std::uint32_t>::max();
// A zero/collision is effectively impossible from healthy 128-bit entropy. Bound retries to detect
// a broken provider without hanging world creation; never substitute a weaker source.
inline constexpr std::size_t kNamespaceAttempts = 8;

class IdentityDomain;
class WorldId final {
 public:
  constexpr WorldId() noexcept = default;
  static WorldId from_bytes(std::array<std::uint8_t, kWorldIdBytes> bytes) noexcept { return WorldId(bytes); }
  const std::array<std::uint8_t, kWorldIdBytes>& bytes() const noexcept { return bytes_; }
  friend bool operator==(const WorldId&, const WorldId&) = default;

 private:
  explicit WorldId(std::array<std::uint8_t, kWorldIdBytes> bytes) noexcept : bytes_(bytes) {}
  std::array<std::uint8_t, kWorldIdBytes> bytes_{};
  friend class IdentityDomain;
};
static_assert(sizeof(WorldId) == kWorldIdBytes);

struct EntityId {
  WorldId world;
  std::uint32_t index = kInvalidEntityIndex;
  std::uint32_t generation = 0;
  friend bool operator==(const EntityId&, const EntityId&) = default;
};
static_assert(sizeof(EntityId) == kWorldIdBytes + 2 * sizeof(std::uint32_t));

enum class IdentityErrorCode {
  entropy_failure, namespace_retry_exhausted, world_unavailable, invalid_index,
  foreign_world, stale_generation, dead_entity, index_capacity_exhausted, resource_exhausted
};
struct IdentityError {
  IdentityErrorCode code;
  std::string_view message;
  std::uint32_t platform_code = 0;
};
template <typename T> using IdentityResult = std::variant<T, IdentityError>;

/** The only substitutable boundary: production defaults to Windows system cryptographic entropy. */
class EntropySource {
 public:
  virtual ~EntropySource() = default;
  virtual std::optional<IdentityError> fill(std::span<std::uint8_t, kWorldIdBytes> bytes) noexcept = 0;
};

struct IdentityDiagnostics {
  std::size_t slots = 0;
  std::size_t live = 0;
  std::size_t free = 0;
  std::size_t retired = 0;
  friend bool operator==(const IdentityDiagnostics&, const IdentityDiagnostics&) = default;
};
namespace detail { struct DomainState; struct AllocatorState; }

/** World-bound identity storage, used only by its world writer. No component/gameplay authority. */
class WorldAllocator final {
 public:
  ~WorldAllocator();
  WorldAllocator(WorldAllocator&&) noexcept;
  WorldAllocator& operator=(WorldAllocator&&) noexcept;
  WorldAllocator(const WorldAllocator&) = delete;
  WorldAllocator& operator=(const WorldAllocator&) = delete;
  WorldId world_id() const noexcept;
  IdentityDiagnostics diagnostics() const noexcept;
  IdentityResult<EntityId> create();
  std::optional<IdentityError> validate(EntityId id) const noexcept;
  std::optional<IdentityError> release(EntityId id) noexcept;

 private:
  explicit WorldAllocator(std::unique_ptr<detail::AllocatorState> state) noexcept;
  std::unique_ptr<detail::AllocatorState> state_;
  friend class IdentityDomain;
};

/** One explicitly owned namespace authority; issued tombstones outlive every issued allocator. */
class IdentityDomain final {
 public:
  IdentityDomain();
  explicit IdentityDomain(std::unique_ptr<EntropySource> entropy);
  ~IdentityDomain();
  IdentityDomain(IdentityDomain&&) noexcept;
  IdentityDomain& operator=(IdentityDomain&&) noexcept;
  IdentityDomain(const IdentityDomain&) = delete;
  IdentityDomain& operator=(const IdentityDomain&) = delete;
  IdentityResult<WorldAllocator> create_world();

 private:
  std::shared_ptr<detail::DomainState> state_;
};
}  // namespace mudmaker::ecs
