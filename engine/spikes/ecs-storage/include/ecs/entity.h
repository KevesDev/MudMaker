#pragma once
#include <algorithm>
#include <cstdint>
#include <limits>
#include <stdexcept>
#include <vector>

namespace ecs {

struct EntityId {
  std::uint32_t world;
  std::uint32_t index;
  std::uint32_t generation;
  friend bool operator==(const EntityId&, const EntityId&) = default;
};
static_assert(sizeof(EntityId) == 12);

inline constexpr std::uint32_t kNoIndex = std::numeric_limits<std::uint32_t>::max();

// Slot allocator with generation checking. A slot whose generation is already at the maximum is
// retired on destroy instead of wrapping, so an old handle can never become valid again.
class EntityTable {
 public:
  explicit EntityTable(std::uint32_t worldId) : world_(worldId) {}

  EntityId create() {
    std::uint32_t idx;
    if (!free_.empty()) {
      idx = free_.back();
      free_.pop_back();
    } else {
      if (generation_.size() >= kNoIndex) throw std::length_error("entity index space exhausted");
      idx = static_cast<std::uint32_t>(generation_.size());
      generation_.push_back(0);
      alive_.push_back(0);
    }
    alive_[idx] = 1;
    ++aliveCount_;
    return {world_, idx, generation_[idx]};
  }

  bool valid(EntityId id) const noexcept {
    return id.world == world_ && id.index < generation_.size() && alive_[id.index] != 0 &&
           generation_[id.index] == id.generation;
  }

  bool release(EntityId id) {
    if (!valid(id)) return false;
    alive_[id.index] = 0;
    --aliveCount_;
    if (generation_[id.index] == std::numeric_limits<std::uint32_t>::max()) {
      ++retired_;
    } else {
      ++generation_[id.index];
      free_.push_back(id.index);
    }
    return true;
  }

  std::uint32_t worldId() const noexcept { return world_; }
  std::size_t aliveCount() const noexcept { return aliveCount_; }
  std::size_t slotCount() const noexcept { return generation_.size(); }
  std::size_t freeCount() const noexcept { return free_.size(); }
  std::size_t retiredCount() const noexcept { return retired_; }
  std::uint32_t generationOf(std::uint32_t index) const noexcept { return generation_[index]; }

  // Lets tests reach the generation limit without four billion create/destroy cycles.
  void forceFreeSlotGeneration(std::uint32_t index, std::uint32_t generation) {
    if (std::find(free_.begin(), free_.end(), index) == free_.end()) {
      throw std::invalid_argument("slot is not on the free list");
    }
    generation_[index] = generation;
  }

  std::size_t memoryBytes() const noexcept {
    return generation_.capacity() * sizeof(std::uint32_t) + alive_.capacity() +
           free_.capacity() * sizeof(std::uint32_t);
  }

 private:
  std::uint32_t world_;
  std::vector<std::uint32_t> generation_;
  std::vector<std::uint8_t> alive_;
  std::vector<std::uint32_t> free_;
  std::size_t aliveCount_ = 0;
  std::size_t retired_ = 0;
};

}  // namespace ecs
