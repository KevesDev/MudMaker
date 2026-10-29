#pragma once
#include <cstddef>
#include <new>
#include <utility>

namespace ecs {

// Owns one over-aligned allocation. Move-only so containers of blocks never copy storage.
class AlignedBlock {
 public:
  AlignedBlock() = default;
  AlignedBlock(std::size_t bytes, std::size_t align)
      : p_(static_cast<std::byte*>(::operator new(bytes, std::align_val_t(align)))), align_(align) {}
  AlignedBlock(const AlignedBlock&) = delete;
  AlignedBlock& operator=(const AlignedBlock&) = delete;
  AlignedBlock(AlignedBlock&& o) noexcept : p_(std::exchange(o.p_, nullptr)), align_(o.align_) {}
  AlignedBlock& operator=(AlignedBlock&& o) noexcept {
    if (this != &o) {
      reset();
      p_ = std::exchange(o.p_, nullptr);
      align_ = o.align_;
    }
    return *this;
  }
  ~AlignedBlock() { reset(); }

  std::byte* get() const noexcept { return p_; }

 private:
  void reset() noexcept {
    if (p_ != nullptr) ::operator delete(p_, std::align_val_t(align_));
    p_ = nullptr;
  }
  std::byte* p_ = nullptr;
  std::size_t align_ = 1;
};

// Components with size zero (tags) still need a non-null address when handed to callers.
inline std::byte* zeroSizeSentinel() noexcept {
  static std::byte sentinel;
  return &sentinel;
}

}  // namespace ecs
