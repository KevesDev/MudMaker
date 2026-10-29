#pragma once
#include <cstdint>

namespace bench {

// Live heap bytes (usable block size) allocated while counting is enabled. The replacement
// operator new/delete in alloc_counter.cpp keeps these up to date; with counting off they add one
// predictable branch per allocation.
struct AllocCounter {
  static void begin();
  static std::uint64_t liveBytes();
  static void end();
};

}  // namespace bench
