#pragma once
#include <algorithm>
#include <array>
#include <cstdint>
#include <memory>
#include <span>
#include <vector>

#include "ecs/standard.h"

namespace bench {

inline constexpr std::uint64_t kDatasetSeed = 0x4D75644D616B6572ull;
inline constexpr std::uint32_t kHealthPercent = 60;
inline constexpr std::uint32_t kTicketPercent = 10;
inline constexpr std::uint32_t kFrozenPercent = 10;
inline constexpr std::uint8_t kHasHealth = 1;
inline constexpr std::uint8_t kHasTicket = 2;
inline constexpr std::uint8_t kHasFrozen = 4;

class SplitMix64 {
 public:
  explicit SplitMix64(std::uint64_t seed) : s_(seed) {}
  std::uint64_t next() {
    std::uint64_t z = (s_ += 0x9E3779B97F4A7C15ull);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ull;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBull;
    return z ^ (z >> 31);
  }

 private:
  std::uint64_t s_;
};

// Composition of every entity, fixed by seed. Both storage paths are built from this one table.
struct Dataset {
  std::uint32_t n = 0;
  std::vector<std::uint8_t> flags;
  std::uint32_t matchedThreeTerm = 0;  // has health, not frozen (position and velocity always present)
};

inline Dataset makeDataset(std::uint32_t n) {
  Dataset d;
  d.n = n;
  d.flags.resize(n);
  SplitMix64 rng(kDatasetSeed);
  for (std::uint32_t i = 0; i < n; ++i) {
    const std::uint64_t r = rng.next();
    std::uint8_t f = 0;
    if (r % 100 < kHealthPercent) f |= kHasHealth;
    if ((r >> 16) % 100 < kTicketPercent) f |= kHasTicket;
    if ((r >> 32) % 100 < kFrozenPercent) f |= kHasFrozen;
    d.flags[i] = f;
    if ((f & kHasHealth) && !(f & kHasFrozen)) ++d.matchedThreeTerm;
  }
  return d;
}

inline std::vector<std::uint32_t> makePermutation(std::uint32_t n, std::uint64_t seed) {
  std::vector<std::uint32_t> p(n);
  for (std::uint32_t i = 0; i < n; ++i) p[i] = i;
  SplitMix64 rng(seed);
  for (std::uint32_t i = n; i > 1; --i) std::swap(p[i - 1], p[rng.next() % i]);
  return p;
}

// Fixed selections shared by both paths so each workload touches the same entities.
struct Selections {
  std::vector<std::uint32_t> churn, tag, access, destroy, ticketless;
};

inline Selections makeSelections(const Dataset& d) {
  Selections s;
  s.churn = makePermutation(d.n, kDatasetSeed ^ 1);
  s.tag = makePermutation(d.n, kDatasetSeed ^ 2);
  s.access = makePermutation(d.n, kDatasetSeed ^ 3);
  s.destroy = makePermutation(d.n, kDatasetSeed ^ 4);
  for (std::uint32_t idx : makePermutation(d.n, kDatasetSeed ^ 5)) {
    if (!(d.flags[idx] & kHasTicket)) s.ticketless.push_back(idx);
  }
  return s;
}

// Value-index based initial values; the oracles in the workloads recompute them independently.
inline ecs::Position positionFor(std::uint32_t v) { return {v, v * 3u + 1u, v * 7u + 2u}; }
inline ecs::Velocity velocityFor(std::uint32_t v) { return {1u + v % 5u, 2u, 3u}; }
inline ecs::Health healthFor(std::uint32_t v) { return {100u + v % 50u}; }
inline ecs::Ticket ticketFor(std::uint32_t v) { return {v, ~static_cast<std::uint64_t>(v), 13u}; }

struct InitPack {
  InitPack(const ecs::Standard& s, std::uint8_t flags, std::uint32_t v)
      : p(positionFor(v)), vel(velocityFor(v)), h(healthFor(v)), t(ticketFor(v)) {
    inits[count++] = {s.position, &p};
    inits[count++] = {s.velocity, &vel};
    if (flags & kHasHealth) inits[count++] = {s.health, &h};
    if (flags & kHasFrozen) inits[count++] = {s.frozen, nullptr};
    if (flags & kHasTicket) inits[count++] = {s.ticket, &t};
  }
  InitPack(const InitPack&) = delete;
  InitPack& operator=(const InitPack&) = delete;

  std::span<const ecs::ComponentInit> span() const { return {inits.data(), count}; }

  ecs::Position p;
  ecs::Velocity vel;
  ecs::Health h;
  ecs::Ticket t;
  std::array<ecs::ComponentInit, 5> inits{};
  std::size_t count = 0;
};

template <class W>
ecs::EntityId createEntity(W& w, const ecs::Standard& s, std::uint8_t flags, std::uint32_t valueIndex) {
  const InitPack pk(s, flags, valueIndex);
  return w.create(pk.span());
}

}  // namespace bench
