#include "alloc_counter.h"

#include <malloc.h>

#include <cstdlib>
#include <new>

namespace {
bool g_counting = false;
std::int64_t g_live = 0;

void* plainAlloc(std::size_t n) {
  void* p = std::malloc(n == 0 ? 1 : n);
  if (p == nullptr) throw std::bad_alloc();
  if (g_counting) g_live += static_cast<std::int64_t>(_msize(p));
  return p;
}

void plainFree(void* p) noexcept {
  if (p == nullptr) return;
  if (g_counting) g_live -= static_cast<std::int64_t>(_msize(p));
  std::free(p);
}

void* alignedAlloc(std::size_t n, std::size_t align) {
  void* p = _aligned_malloc(n == 0 ? 1 : n, align);
  if (p == nullptr) throw std::bad_alloc();
  if (g_counting) g_live += static_cast<std::int64_t>(_aligned_msize(p, align, 0));
  return p;
}

void alignedFree(void* p, std::size_t align) noexcept {
  if (p == nullptr) return;
  if (g_counting) g_live -= static_cast<std::int64_t>(_aligned_msize(p, align, 0));
  _aligned_free(p);
}
}  // namespace

namespace bench {
void AllocCounter::begin() {
  g_live = 0;
  g_counting = true;
}
std::uint64_t AllocCounter::liveBytes() { return g_live < 0 ? 0 : static_cast<std::uint64_t>(g_live); }
void AllocCounter::end() { g_counting = false; }
}  // namespace bench

void* operator new(std::size_t n) { return plainAlloc(n); }
void* operator new[](std::size_t n) { return plainAlloc(n); }
void operator delete(void* p) noexcept { plainFree(p); }
void operator delete[](void* p) noexcept { plainFree(p); }
void operator delete(void* p, std::size_t) noexcept { plainFree(p); }
void operator delete[](void* p, std::size_t) noexcept { plainFree(p); }

void* operator new(std::size_t n, std::align_val_t a) { return alignedAlloc(n, static_cast<std::size_t>(a)); }
void* operator new[](std::size_t n, std::align_val_t a) { return alignedAlloc(n, static_cast<std::size_t>(a)); }
void operator delete(void* p, std::align_val_t a) noexcept { alignedFree(p, static_cast<std::size_t>(a)); }
void operator delete[](void* p, std::align_val_t a) noexcept { alignedFree(p, static_cast<std::size_t>(a)); }
void operator delete(void* p, std::size_t, std::align_val_t a) noexcept { alignedFree(p, static_cast<std::size_t>(a)); }
void operator delete[](void* p, std::size_t, std::align_val_t a) noexcept { alignedFree(p, static_cast<std::size_t>(a)); }
