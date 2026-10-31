#pragma once
#include "mudmaker/ecs/identity.h"

namespace mudmaker::ecs::detail {
// Pure production decisions, also exercised at their unreachable-in-small-tests boundaries.
constexpr bool can_append_slot(std::size_t count) noexcept { return count < kInvalidEntityIndex; }
constexpr std::optional<std::uint32_t> generation_after_release(std::uint32_t generation) noexcept {
  if (generation == std::numeric_limits<std::uint32_t>::max()) return std::nullopt;
  return generation + 1;
}
}  // namespace mudmaker::ecs::detail
