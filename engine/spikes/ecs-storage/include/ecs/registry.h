#pragma once
#include <bit>
#include <cstdint>
#include <cstring>
#include <optional>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

#include "ecs/entity.h"

namespace ecs {

using ComponentId = std::uint32_t;
using Mask = std::uint64_t;

inline constexpr std::uint32_t kMaxComponentTypes = 64;  // one bit per type in a Mask
inline constexpr std::uint32_t kMaxComponentSize = 1024;
inline constexpr std::uint32_t kMaxComponentAlign = 64;
inline constexpr std::uint32_t kMaxQueryTerms = 8;

inline constexpr Mask bitOf(ComponentId id) noexcept { return Mask{1} << id; }

struct ComponentDesc {
  std::string name;
  std::uint32_t size;   // 0 for tag components
  std::uint32_t align;
};

struct FieldSpec {
  std::uint32_t size;
  std::uint32_t align;
};

// C-style struct layout computed at runtime, as a creator schema would be.
inline ComponentDesc layoutFromFields(std::string name, std::span<const FieldSpec> fields) {
  std::uint32_t offset = 0, align = 1;
  for (const FieldSpec& f : fields) {
    if (f.align == 0 || !std::has_single_bit(f.align)) throw std::invalid_argument("field alignment");
    offset = (offset + f.align - 1) / f.align * f.align + f.size;
    if (f.align > align) align = f.align;
  }
  offset = (offset + align - 1) / align * align;
  return {std::move(name), offset, align};
}

struct ComponentInit {
  ComponentId id;
  const void* data;  // null means zero-initialised
};

// Layouts are registered first, then frozen; worlds only accept a frozen registry.
class ComponentRegistry {
 public:
  ComponentId registerComponent(std::string name, std::uint32_t size, std::uint32_t align) {
    if (frozen_) throw std::logic_error("registry is frozen");
    if (name.empty()) throw std::invalid_argument("component name is empty");
    if (descs_.size() >= kMaxComponentTypes) throw std::length_error("too many component types");
    if (find(name).has_value()) throw std::invalid_argument("duplicate component name: " + name);
    if (align == 0 || !std::has_single_bit(align) || align > kMaxComponentAlign) {
      throw std::invalid_argument("alignment must be a power of two up to 64: " + name);
    }
    if (size > kMaxComponentSize) throw std::invalid_argument("component too large: " + name);
    if (size == 0 && align != 1) throw std::invalid_argument("tag alignment must be 1: " + name);
    if (size % align != 0) throw std::invalid_argument("size must be a multiple of alignment: " + name);
    descs_.push_back({std::move(name), size, align});
    return static_cast<ComponentId>(descs_.size() - 1);
  }
  ComponentId registerComponent(const ComponentDesc& d) { return registerComponent(d.name, d.size, d.align); }

  void freeze() noexcept { frozen_ = true; }
  bool frozen() const noexcept { return frozen_; }
  std::uint32_t count() const noexcept { return static_cast<std::uint32_t>(descs_.size()); }
  const ComponentDesc& desc(ComponentId id) const { return descs_.at(id); }
  std::uint32_t sizeOf(ComponentId id) const noexcept { return descs_[id].size; }

  std::optional<ComponentId> find(const std::string& name) const {
    for (std::size_t i = 0; i < descs_.size(); ++i) {
      if (descs_[i].name == name) return static_cast<ComponentId>(i);
    }
    return std::nullopt;
  }

 private:
  std::vector<ComponentDesc> descs_;
  bool frozen_ = false;
};

inline void requireUsable(const ComponentRegistry& reg) {
  if (!reg.frozen()) throw std::logic_error("world requires a frozen component registry");
}

inline void requireComponent(const ComponentRegistry& reg, ComponentId id) {
  if (id >= reg.count()) throw std::invalid_argument("unknown component id " + std::to_string(id));
}

inline Mask maskOfInits(const ComponentRegistry& reg, std::span<const ComponentInit> inits) {
  Mask m = 0;
  for (const ComponentInit& i : inits) {
    requireComponent(reg, i.id);
    if (m & bitOf(i.id)) throw std::invalid_argument("duplicate component in create: " + reg.desc(i.id).name);
    m |= bitOf(i.id);
  }
  return m;
}

inline void copyOrZero(void* dst, const void* init, std::uint32_t size) noexcept {
  if (size == 0) return;
  if (init != nullptr) {
    std::memcpy(dst, init, size);
  } else {
    std::memset(dst, 0, size);
  }
}

struct QuerySpec {
  Mask required = 0;
  Mask excluded = 0;
  std::uint32_t termCount = 0;
};

// Validates a query once per call; the callers' per-row loops then work on checked data.
inline QuerySpec makeQuerySpec(const ComponentRegistry& reg, std::span<const ComponentId> required,
                               std::span<const ComponentId> excluded) {
  if (required.empty()) throw std::invalid_argument("query needs at least one required component");
  if (required.size() > kMaxQueryTerms) throw std::invalid_argument("too many query terms");
  QuerySpec q;
  q.termCount = static_cast<std::uint32_t>(required.size());
  for (ComponentId c : required) {
    requireComponent(reg, c);
    if (q.required & bitOf(c)) throw std::invalid_argument("duplicate required component");
    q.required |= bitOf(c);
  }
  for (ComponentId c : excluded) {
    requireComponent(reg, c);
    q.excluded |= bitOf(c);
  }
  if (q.required & q.excluded) throw std::invalid_argument("component both required and excluded");
  return q;
}

}  // namespace ecs
