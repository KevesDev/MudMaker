#include "mudmaker/ecs/identity.h"
#include "ecs/identity_rules.h"

#include <Windows.h>
#include <bcrypt.h>
#include <algorithm>
#include <functional>
#include <new>
#include <stdexcept>
#include <unordered_set>
#include <utility>
#include <vector>

namespace mudmaker::ecs {
namespace {
IdentityError error(IdentityErrorCode code, std::string_view message) noexcept { return {code, message}; }
class SystemEntropy final : public EntropySource {
 public:
  std::optional<IdentityError> fill(std::span<std::uint8_t, kWorldIdBytes> bytes) noexcept override {
    const NTSTATUS status = BCryptGenRandom(nullptr, bytes.data(), static_cast<ULONG>(bytes.size()), BCRYPT_USE_SYSTEM_PREFERRED_RNG);
    if (status < 0) return IdentityError{IdentityErrorCode::entropy_failure, "Windows cryptographic entropy failed.", static_cast<std::uint32_t>(status)};
    return std::nullopt;
  }
};
struct WorldIdHash {
  std::size_t operator()(const WorldId& id) const noexcept {
    return std::hash<std::string_view>{}({reinterpret_cast<const char*>(id.bytes().data()), id.bytes().size()});
  }
};
}  // namespace

namespace detail {
struct DomainState {
  explicit DomainState(std::unique_ptr<EntropySource> source) : entropy(std::move(source)) {}
  std::unique_ptr<EntropySource> entropy;
  std::unordered_set<WorldId, WorldIdHash> issued;
};
enum class SlotState { live, free, retired };
struct Slot {
  std::uint32_t generation = 0;
  std::uint32_t next_free = kInvalidEntityIndex;
  SlotState state = SlotState::live;
};
struct AllocatorState {
  AllocatorState(std::shared_ptr<DomainState> authority, WorldId id) : domain(std::move(authority)), world(id) {}
  // Retains the same namespace authority/tombstones even after the domain facade is destroyed.
  std::shared_ptr<DomainState> domain;
  WorldId world;
  std::vector<Slot> slots;
  std::uint32_t free_head = kInvalidEntityIndex;
  IdentityDiagnostics counts;
};
}  // namespace detail

IdentityDomain::IdentityDomain() : IdentityDomain(std::make_unique<SystemEntropy>()) {}
IdentityDomain::IdentityDomain(std::unique_ptr<EntropySource> entropy) {
  if (!entropy) throw std::invalid_argument("An identity domain needs an entropy source.");
  state_ = std::make_shared<detail::DomainState>(std::move(entropy));
}
IdentityDomain::~IdentityDomain() = default;
IdentityDomain::IdentityDomain(IdentityDomain&&) noexcept = default;
IdentityDomain& IdentityDomain::operator=(IdentityDomain&&) noexcept = default;

IdentityResult<WorldAllocator> IdentityDomain::create_world() {
  if (!state_) return error(IdentityErrorCode::world_unavailable, "The identity domain has been moved.");
  for (std::size_t attempt = 0; attempt < kNamespaceAttempts; ++attempt) {
    std::array<std::uint8_t, kWorldIdBytes> bytes{};
    if (const auto failure = state_->entropy->fill(bytes)) return *failure;
    if (std::all_of(bytes.begin(), bytes.end(), [](std::uint8_t byte) { return byte == 0; })) continue;
    const WorldId id(bytes);
    try {
      if (!state_->issued.insert(id).second) continue;
      return WorldAllocator(std::make_unique<detail::AllocatorState>(state_, id));
    } catch (const std::bad_alloc&) {
      // A namespace already inserted stays burned even if allocating its world storage fails.
      return error(IdentityErrorCode::resource_exhausted, "Identity namespace storage could not be allocated.");
    }
  }
  return error(IdentityErrorCode::namespace_retry_exhausted, "Cryptographic entropy repeatedly returned zero or an already issued world namespace.");
}

WorldAllocator::WorldAllocator(std::unique_ptr<detail::AllocatorState> state) noexcept : state_(std::move(state)) {}
WorldAllocator::~WorldAllocator() = default;
WorldAllocator::WorldAllocator(WorldAllocator&&) noexcept = default;
WorldAllocator& WorldAllocator::operator=(WorldAllocator&&) noexcept = default;
WorldId WorldAllocator::world_id() const noexcept { return state_ ? state_->world : WorldId{}; }
IdentityDiagnostics WorldAllocator::diagnostics() const noexcept { return state_ ? state_->counts : IdentityDiagnostics{}; }

IdentityResult<EntityId> WorldAllocator::create() {
  if (!state_) return error(IdentityErrorCode::world_unavailable, "The world allocator has been moved.");
  auto& state = *state_;
  std::uint32_t index;
  if (state.free_head != kInvalidEntityIndex) {
    index = state.free_head;
    auto& slot = state.slots[index];
    state.free_head = slot.next_free;
    slot.next_free = kInvalidEntityIndex;
    slot.state = detail::SlotState::live;
    --state.counts.free;
  } else {
    if (!detail::can_append_slot(state.slots.size())) return error(IdentityErrorCode::index_capacity_exhausted, "The world has exhausted its entity index space.");
    index = static_cast<std::uint32_t>(state.slots.size());
    try { state.slots.push_back({}); }
    catch (const std::bad_alloc&) { return error(IdentityErrorCode::resource_exhausted, "Entity identity storage could not be allocated."); }
    ++state.counts.slots;
  }
  ++state.counts.live;
  return EntityId{state.world, index, state.slots[index].generation};
}

std::optional<IdentityError> WorldAllocator::validate(EntityId id) const noexcept {
  if (!state_) return error(IdentityErrorCode::world_unavailable, "The world allocator has been moved.");
  if (id.world != state_->world) return error(IdentityErrorCode::foreign_world, "The entity belongs to another world namespace.");
  if (id.index >= state_->slots.size()) return error(IdentityErrorCode::invalid_index, "The entity index is outside this world's identity storage.");
  const auto& slot = state_->slots[id.index];
  if (id.generation != slot.generation) return error(IdentityErrorCode::stale_generation, "The entity generation is stale.");
  if (slot.state != detail::SlotState::live) return error(IdentityErrorCode::dead_entity, "The entity slot is no longer live.");
  return std::nullopt;
}

std::optional<IdentityError> WorldAllocator::release(EntityId id) noexcept {
  if (const auto failure = validate(id)) return failure;
  auto& state = *state_;
  auto& slot = state.slots[id.index];
  --state.counts.live;
  if (const auto next = detail::generation_after_release(slot.generation)) {
    slot.generation = *next;
    slot.state = detail::SlotState::free;
    slot.next_free = state.free_head;
    state.free_head = id.index;
    ++state.counts.free;
  } else {
    slot.state = detail::SlotState::retired;
    ++state.counts.retired;
  }
  return std::nullopt;
}
}  // namespace mudmaker::ecs
