#pragma once
#include <algorithm>
#include <array>
#include <bit>
#include <cstring>
#include <span>
#include <vector>

#include "ecs/entity.h"
#include "ecs/memory.h"
#include "ecs/registry.h"

namespace ecs {

// One component type: a sparse index array (entity index -> dense slot) plus densely packed
// entity indices and values with swap-remove.
class SparseSet {
 public:
  SparseSet(std::uint32_t elemSize, std::uint32_t align) : elemSize_(elemSize), align_(align) {}

  std::uint32_t size() const noexcept { return static_cast<std::uint32_t>(dense_.size()); }
  std::uint32_t denseEntity(std::uint32_t d) const noexcept { return dense_[d]; }
  std::byte* denseValue(std::uint32_t d) const noexcept {
    return elemSize_ == 0 ? zeroSizeSentinel() : data_.get() + std::size_t{d} * elemSize_;
  }
  // Caller guarantees the entity holds this component.
  std::byte* valueOf(std::uint32_t entityIndex) const noexcept { return denseValue(sparse_[entityIndex]); }

  void insert(std::uint32_t entityIndex, const void* init) {
    if (entityIndex >= sparse_.size()) {
      sparse_.resize(std::max<std::size_t>(std::size_t{entityIndex} + 1, sparse_.size() * 2), kNoIndex);
    }
    const auto d = static_cast<std::uint32_t>(dense_.size());
    if (elemSize_ != 0 && d == capacity_) {
      const std::size_t newCap = std::max<std::size_t>(16, std::size_t{capacity_} * 2);
      AlignedBlock grown(newCap * elemSize_, std::max<std::uint32_t>(align_, 16));
      if (capacity_ != 0) std::memcpy(grown.get(), data_.get(), std::size_t{capacity_} * elemSize_);
      data_ = std::move(grown);
      capacity_ = static_cast<std::uint32_t>(newCap);
    }
    dense_.push_back(entityIndex);
    sparse_[entityIndex] = d;
    copyOrZero(denseValue(d), init, elemSize_);
  }

  void erase(std::uint32_t entityIndex) {
    const std::uint32_t d = sparse_[entityIndex];
    const std::uint32_t last = size() - 1;
    if (d != last) {
      if (elemSize_ != 0) std::memcpy(denseValue(d), denseValue(last), elemSize_);
      const std::uint32_t moved = dense_[last];
      dense_[d] = moved;
      sparse_[moved] = d;
    }
    dense_.pop_back();
    sparse_[entityIndex] = kNoIndex;
  }

  std::size_t memoryBytes() const noexcept {
    return sparse_.capacity() * sizeof(std::uint32_t) + dense_.capacity() * sizeof(std::uint32_t) +
           std::size_t{capacity_} * elemSize_;
  }

 private:
  std::uint32_t elemSize_;
  std::uint32_t align_;
  std::vector<std::uint32_t> sparse_;
  std::vector<std::uint32_t> dense_;
  AlignedBlock data_;
  std::uint32_t capacity_ = 0;
};

// Sparse-set storage: one set per component type plus a per-entity component mask used for
// destroy and for filtering queries.
class SparseWorld {
 public:
  static constexpr const char* kName = "sparse";

  SparseWorld(std::uint32_t worldId, const ComponentRegistry& reg) : table_(worldId), reg_(&reg) {
    requireUsable(reg);
    sets_.reserve(reg.count());
    for (ComponentId c = 0; c < reg.count(); ++c) sets_.emplace_back(reg.sizeOf(c), reg.desc(c).align);
  }

  EntityId create(std::span<const ComponentInit> inits) {
    const Mask m = maskOfInits(*reg_, inits);
    const EntityId id = table_.create();
    if (id.index == masks_.size()) {
      masks_.push_back(m);
    } else {
      masks_[id.index] = m;
    }
    for (const ComponentInit& i : inits) sets_[i.id].insert(id.index, i.data);
    return id;
  }

  bool alive(EntityId id) const noexcept { return table_.valid(id); }

  bool destroy(EntityId id) {
    if (!table_.valid(id)) return false;
    Mask m = masks_[id.index];
    while (m != 0) {
      const auto c = static_cast<ComponentId>(std::countr_zero(m));
      sets_[c].erase(id.index);
      m &= m - 1;
    }
    masks_[id.index] = 0;
    table_.release(id);
    return true;
  }

  bool has(EntityId id, ComponentId c) const {
    requireComponent(*reg_, c);
    return table_.valid(id) && (masks_[id.index] & bitOf(c)) != 0;
  }

  bool add(EntityId id, ComponentId c, const void* init) {
    requireComponent(*reg_, c);
    if (!table_.valid(id) || (masks_[id.index] & bitOf(c))) return false;
    sets_[c].insert(id.index, init);
    masks_[id.index] |= bitOf(c);
    return true;
  }

  bool remove(EntityId id, ComponentId c) {
    requireComponent(*reg_, c);
    if (!table_.valid(id) || !(masks_[id.index] & bitOf(c))) return false;
    sets_[c].erase(id.index);
    masks_[id.index] &= ~bitOf(c);
    return true;
  }

  void* get(EntityId id, ComponentId c) {
    requireComponent(*reg_, c);
    if (!table_.valid(id) || !(masks_[id.index] & bitOf(c))) return nullptr;
    return sets_[c].valueOf(id.index);
  }
  const void* get(EntityId id, ComponentId c) const { return const_cast<SparseWorld*>(this)->get(id, c); }

  // Same callback contract as ArchetypeWorld::query. Iterates the smallest required set.
  template <class F>
  void query(std::span<const ComponentId> required, std::span<const ComponentId> excluded, F&& f) {
    const QuerySpec q = makeQuerySpec(*reg_, required, excluded);
    std::uint32_t pivot = 0;
    for (std::uint32_t k = 1; k < q.termCount; ++k) {
      if (sets_[required[k]].size() < sets_[required[pivot]].size()) pivot = k;
    }
    const SparseSet& ps = sets_[required[pivot]];
    void* ptrs[kMaxQueryTerms];
    for (std::uint32_t d = 0; d < ps.size(); ++d) {
      const std::uint32_t idx = ps.denseEntity(d);
      const Mask m = masks_[idx];
      if ((m & q.required) != q.required || (m & q.excluded) != 0) continue;
      for (std::uint32_t k = 0; k < q.termCount; ++k) {
        ptrs[k] = k == pivot ? ps.denseValue(d) : sets_[required[k]].valueOf(idx);
      }
      f(EntityId{table_.worldId(), idx, table_.generationOf(idx)}, static_cast<void* const*>(ptrs));
    }
  }

  std::size_t entityCount() const noexcept { return table_.aliveCount(); }
  EntityTable& entityTable() noexcept { return table_; }
  const EntityTable& entityTable() const noexcept { return table_; }

  // Computed from container capacities; excludes allocator bookkeeping.
  std::size_t memoryBytes() const noexcept {
    std::size_t total = table_.memoryBytes() + masks_.capacity() * sizeof(Mask) +
                        sets_.capacity() * sizeof(SparseSet);
    for (const SparseSet& s : sets_) total += s.memoryBytes();
    return total;
  }

 private:
  EntityTable table_;
  const ComponentRegistry* reg_;
  std::vector<SparseSet> sets_;
  std::vector<Mask> masks_;
};

}  // namespace ecs
