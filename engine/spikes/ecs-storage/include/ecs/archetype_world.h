#pragma once
#include <algorithm>
#include <array>
#include <cstring>
#include <memory>
#include <span>
#include <unordered_map>
#include <vector>

#include "ecs/entity.h"
#include "ecs/memory.h"
#include "ecs/registry.h"

namespace ecs {

inline constexpr std::uint32_t kChunkBytes = 16 * 1024;
inline constexpr std::uint32_t kChunkAlign = 64;

// All entities sharing one component set. Rows are packed (swap-remove), stored in fixed-size
// chunks as an entity-id array followed by one aligned column per non-tag component.
class Archetype {
 public:
  struct Column {
    ComponentId id;
    std::uint32_t size;
    std::uint32_t align;
    std::uint32_t offset;
  };

  Archetype(Mask mask, const ComponentRegistry& reg) : mask_(mask) {
    columnOf_.fill(-1);
    addEdge_.fill(kNoIndex);
    removeEdge_.fill(kNoIndex);
    std::uint32_t rowBytes = sizeof(EntityId);
    for (ComponentId id = 0; id < reg.count(); ++id) {
      if (!(mask & bitOf(id)) || reg.sizeOf(id) == 0) continue;
      columnOf_[id] = static_cast<std::int8_t>(cols_.size());
      cols_.push_back({id, reg.sizeOf(id), reg.desc(id).align, 0});
      rowBytes += reg.sizeOf(id);
    }
    std::uint32_t n = kChunkBytes / rowBytes;
    while (n > 0 && !layout(n)) --n;
    if (n == 0) throw std::length_error("archetype row does not fit in a chunk");
    rowsPerChunk_ = n;
  }

  Mask mask() const noexcept { return mask_; }
  std::uint32_t rowCount() const noexcept { return rowCount_; }
  std::uint32_t rowsPerChunk() const noexcept { return rowsPerChunk_; }
  std::size_t chunkCount() const noexcept { return chunks_.size(); }
  int columnOf(ComponentId id) const noexcept { return columnOf_[id]; }
  std::size_t columnCount() const noexcept { return cols_.size(); }
  const Column& column(std::size_t i) const noexcept { return cols_[i]; }

  std::byte* chunkBase(std::size_t ci) const noexcept { return chunks_[ci].get(); }
  EntityId* idsIn(std::size_t ci) const noexcept { return reinterpret_cast<EntityId*>(chunks_[ci].get()); }
  std::byte* cell(std::uint32_t row, int col) const noexcept {
    const Column& c = cols_[static_cast<std::size_t>(col)];
    return chunks_[row / rowsPerChunk_].get() + c.offset + std::size_t{row % rowsPerChunk_} * c.size;
  }

  std::uint32_t pushRow(EntityId id) {
    const std::size_t ci = rowCount_ / rowsPerChunk_;
    if (ci == chunks_.size()) chunks_.emplace_back(kChunkBytes, kChunkAlign);
    idsIn(ci)[rowCount_ % rowsPerChunk_] = id;
    return rowCount_++;
  }

  // Removes a row by moving the last row into it. Returns true and the moved id when another
  // entity changed row.
  bool popRow(std::uint32_t row, EntityId& moved) {
    const std::uint32_t last = rowCount_ - 1;
    bool didMove = false;
    if (row != last) {
      idsIn(row / rowsPerChunk_)[row % rowsPerChunk_] = idsIn(last / rowsPerChunk_)[last % rowsPerChunk_];
      moved = idsIn(row / rowsPerChunk_)[row % rowsPerChunk_];
      for (std::size_t i = 0; i < cols_.size(); ++i) {
        std::memcpy(cell(row, static_cast<int>(i)), cell(last, static_cast<int>(i)), cols_[i].size);
      }
      didMove = true;
    }
    rowCount_ = last;
    const std::size_t needed = (rowCount_ + rowsPerChunk_ - 1) / rowsPerChunk_;
    while (chunks_.size() > needed + 1) chunks_.pop_back();  // keep one spare chunk against boundary thrash
    return didMove;
  }

  std::uint32_t addEdge(ComponentId c) const noexcept { return addEdge_[c]; }
  std::uint32_t removeEdge(ComponentId c) const noexcept { return removeEdge_[c]; }
  void setAddEdge(ComponentId c, std::uint32_t to) noexcept { addEdge_[c] = to; }
  void setRemoveEdge(ComponentId c, std::uint32_t to) noexcept { removeEdge_[c] = to; }

  std::size_t memoryBytes() const noexcept {
    return chunks_.capacity() * sizeof(AlignedBlock) + chunks_.size() * kChunkBytes + sizeof(Archetype) +
           cols_.capacity() * sizeof(Column);
  }

 private:
  bool layout(std::uint32_t n) {
    std::size_t off = std::size_t{n} * sizeof(EntityId);
    std::vector<std::uint32_t> offsets;
    for (const Column& c : cols_) {
      off = (off + c.align - 1) / c.align * c.align;
      offsets.push_back(static_cast<std::uint32_t>(off));
      off += std::size_t{n} * c.size;
    }
    if (off > kChunkBytes) return false;
    for (std::size_t i = 0; i < cols_.size(); ++i) cols_[i].offset = offsets[i];
    return true;
  }

  Mask mask_;
  std::vector<Column> cols_;
  std::array<std::int8_t, kMaxComponentTypes> columnOf_{};
  std::array<std::uint32_t, kMaxComponentTypes> addEdge_{};
  std::array<std::uint32_t, kMaxComponentTypes> removeEdge_{};
  std::vector<AlignedBlock> chunks_;
  std::uint32_t rowCount_ = 0;
  std::uint32_t rowsPerChunk_ = 0;
};

class ArchetypeWorld {
 public:
  static constexpr const char* kName = "archetype";

  ArchetypeWorld(std::uint32_t worldId, const ComponentRegistry& reg) : table_(worldId), reg_(&reg) {
    requireUsable(reg);
    archetypeFor(0);
  }

  EntityId create(std::span<const ComponentInit> inits) {
    const Mask m = maskOfInits(*reg_, inits);
    const std::uint32_t ai = archetypeFor(m);
    Archetype& a = *archs_[ai];
    const EntityId id = table_.create();
    const std::uint32_t row = a.pushRow(id);
    for (const ComponentInit& i : inits) {
      const int col = a.columnOf(i.id);
      if (col >= 0) copyOrZero(a.cell(row, col), i.data, reg_->sizeOf(i.id));
    }
    if (id.index == loc_.size()) {
      loc_.push_back({ai, row});
    } else {
      loc_[id.index] = {ai, row};
    }
    return id;
  }

  bool alive(EntityId id) const noexcept { return table_.valid(id); }

  bool destroy(EntityId id) {
    if (!table_.valid(id)) return false;
    const Loc l = loc_[id.index];
    EntityId moved{};
    if (archs_[l.arch]->popRow(l.row, moved)) loc_[moved.index].row = l.row;
    table_.release(id);
    return true;
  }

  bool has(EntityId id, ComponentId c) const {
    requireComponent(*reg_, c);
    return table_.valid(id) && (archs_[loc_[id.index].arch]->mask() & bitOf(c)) != 0;
  }

  bool add(EntityId id, ComponentId c, const void* init) {
    requireComponent(*reg_, c);
    if (!table_.valid(id)) return false;
    const std::uint32_t from = loc_[id.index].arch;
    if (archs_[from]->mask() & bitOf(c)) return false;
    std::uint32_t to = archs_[from]->addEdge(c);
    if (to == kNoIndex) {
      to = archetypeFor(archs_[from]->mask() | bitOf(c));
      archs_[from]->setAddEdge(c, to);
    }
    moveTo(id, to, c, init);
    return true;
  }

  bool remove(EntityId id, ComponentId c) {
    requireComponent(*reg_, c);
    if (!table_.valid(id)) return false;
    const std::uint32_t from = loc_[id.index].arch;
    if (!(archs_[from]->mask() & bitOf(c))) return false;
    std::uint32_t to = archs_[from]->removeEdge(c);
    if (to == kNoIndex) {
      to = archetypeFor(archs_[from]->mask() & ~bitOf(c));
      archs_[from]->setRemoveEdge(c, to);
    }
    moveTo(id, to, kNoIndex, nullptr);
    return true;
  }

  void* get(EntityId id, ComponentId c) {
    requireComponent(*reg_, c);
    if (!table_.valid(id)) return nullptr;
    const Loc l = loc_[id.index];
    const Archetype& a = *archs_[l.arch];
    if (!(a.mask() & bitOf(c))) return nullptr;
    const int col = a.columnOf(c);
    return col < 0 ? zeroSizeSentinel() : a.cell(l.row, col);
  }
  const void* get(EntityId id, ComponentId c) const { return const_cast<ArchetypeWorld*>(this)->get(id, c); }

  // f(EntityId, void* const* components). Components appear in the order of `required`. The
  // callback may write component fields but must not create, destroy, add or remove.
  template <class F>
  void query(std::span<const ComponentId> required, std::span<const ComponentId> excluded, F&& f) {
    const QuerySpec q = makeQuerySpec(*reg_, required, excluded);
    for (const auto& up : archs_) {
      const Archetype& a = *up;
      if ((a.mask() & q.required) != q.required || (a.mask() & q.excluded) != 0 || a.rowCount() == 0) continue;
      std::array<int, kMaxQueryTerms> col{};
      std::array<std::size_t, kMaxQueryTerms> stride{};
      std::array<std::size_t, kMaxQueryTerms> offset{};
      for (std::uint32_t k = 0; k < q.termCount; ++k) {
        col[k] = a.columnOf(required[k]);
        stride[k] = col[k] < 0 ? 0 : a.column(static_cast<std::size_t>(col[k])).size;
        offset[k] = col[k] < 0 ? 0 : a.column(static_cast<std::size_t>(col[k])).offset;
      }
      for (std::size_t ci = 0; ci < a.chunkCount(); ++ci) {
        const std::size_t first = ci * a.rowsPerChunk();
        if (first >= a.rowCount()) break;
        const std::size_t rows = std::min<std::size_t>(a.rowsPerChunk(), a.rowCount() - first);
        std::array<std::byte*, kMaxQueryTerms> base{};
        for (std::uint32_t k = 0; k < q.termCount; ++k) {
          base[k] = col[k] < 0 ? zeroSizeSentinel() : a.chunkBase(ci) + offset[k];
        }
        const EntityId* ids = a.idsIn(ci);
        void* ptrs[kMaxQueryTerms];
        for (std::size_t r = 0; r < rows; ++r) {
          for (std::uint32_t k = 0; k < q.termCount; ++k) ptrs[k] = base[k] + r * stride[k];
          f(ids[r], static_cast<void* const*>(ptrs));
        }
      }
    }
  }

  std::size_t entityCount() const noexcept { return table_.aliveCount(); }
  std::size_t archetypeCount() const noexcept { return archs_.size(); }
  EntityTable& entityTable() noexcept { return table_; }
  const EntityTable& entityTable() const noexcept { return table_; }

  // Computed from container capacities and chunk allocations; excludes allocator bookkeeping.
  std::size_t memoryBytes() const noexcept {
    std::size_t total = table_.memoryBytes() + loc_.capacity() * sizeof(Loc) +
                        archs_.capacity() * sizeof(std::unique_ptr<Archetype>) +
                        byMask_.bucket_count() * sizeof(void*) + byMask_.size() * 24;
    for (const auto& a : archs_) total += a->memoryBytes();
    return total;
  }

 private:
  struct Loc {
    std::uint32_t arch;
    std::uint32_t row;
  };

  std::uint32_t archetypeFor(Mask m) {
    const auto it = byMask_.find(m);
    if (it != byMask_.end()) return it->second;
    archs_.push_back(std::make_unique<Archetype>(m, *reg_));
    const auto idx = static_cast<std::uint32_t>(archs_.size() - 1);
    byMask_.emplace(m, idx);
    return idx;
  }

  void moveTo(EntityId id, std::uint32_t dstIdx, ComponentId added, const void* init) {
    Loc& l = loc_[id.index];
    Archetype& src = *archs_[l.arch];
    Archetype& dst = *archs_[dstIdx];
    const std::uint32_t dstRow = dst.pushRow(id);
    for (std::size_t i = 0; i < dst.columnCount(); ++i) {
      const Archetype::Column& c = dst.column(i);
      std::byte* d = dst.cell(dstRow, static_cast<int>(i));
      const int sc = src.columnOf(c.id);
      if (sc >= 0) {
        std::memcpy(d, src.cell(l.row, sc), c.size);
      } else {
        copyOrZero(d, c.id == added ? init : nullptr, c.size);
      }
    }
    EntityId moved{};
    if (src.popRow(l.row, moved)) loc_[moved.index].row = l.row;
    l.arch = dstIdx;
    l.row = dstRow;
  }

  EntityTable table_;
  const ComponentRegistry* reg_;
  std::vector<std::unique_ptr<Archetype>> archs_;
  std::unordered_map<Mask, std::uint32_t> byMask_;
  std::vector<Loc> loc_;
};

}  // namespace ecs
