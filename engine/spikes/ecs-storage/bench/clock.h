#pragma once
#include <intrin.h>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <vector>

namespace bench {

using SteadyClock = std::chrono::steady_clock;

// Accumulates several timed segments in one repetition so untimed verification can sit between them.
class RepTimer {
 public:
  void start() { t0_ = SteadyClock::now(); }
  void stop() { total_ += SteadyClock::now() - t0_; }
  double seconds() const { return std::chrono::duration<double>(total_).count(); }

 private:
  SteadyClock::time_point t0_{};
  SteadyClock::duration total_{};
};

// Per-operation timer. steady_clock ticks are 100 ns on Windows, too coarse for operations that
// take tens of nanoseconds, so latency uses the invariant TSC calibrated against steady_clock.
class TickClock {
 public:
  TickClock() {
    int r[4];
    __cpuid(r, 0x80000000);
    bool invariant = false;
    if (static_cast<unsigned>(r[0]) >= 0x80000007u) {
      __cpuid(r, 0x80000007);
      invariant = (r[3] & (1 << 8)) != 0;
    }
    if (!invariant) throw std::runtime_error("invariant TSC not available for per-operation latency timing");
    const double a = calibrate();
    const double b = calibrate();
    nsPerTick_ = (a + b) / 2;
    calibrationSpread_ = std::abs(a - b) / nsPerTick_;
    if (calibrationSpread_ > 0.01) throw std::runtime_error("TSC calibration unstable (>1% between runs)");
  }

  std::uint64_t begin() const {
    _mm_lfence();
    const std::uint64_t t = __rdtsc();
    _mm_lfence();
    return t;
  }
  std::uint64_t end() const {
    unsigned aux;
    const std::uint64_t t = __rdtscp(&aux);
    _mm_lfence();
    return t;
  }

  double nsPerTick() const { return nsPerTick_; }
  double calibrationSpread() const { return calibrationSpread_; }

 private:
  static double calibrate() {
    const auto s0 = SteadyClock::now();
    const std::uint64_t c0 = __rdtsc();
    while (SteadyClock::now() - s0 < std::chrono::milliseconds(150)) {
    }
    const std::uint64_t c1 = __rdtsc();
    const auto s1 = SteadyClock::now();
    return std::chrono::duration<double, std::nano>(s1 - s0).count() / static_cast<double>(c1 - c0);
  }

  double nsPerTick_ = 0;
  double calibrationSpread_ = 0;
};

// Median ticks of an empty begin()/end() pair; subtracted from every latency sample.
inline std::uint64_t measureEmptyOverheadTicks(const TickClock& clk) {
  constexpr std::size_t kSamples = 200000;
  std::vector<std::uint64_t> v(kSamples);
  for (std::size_t i = 0; i < kSamples; ++i) {
    const std::uint64_t t0 = clk.begin();
    const std::uint64_t t1 = clk.end();
    v[i] = t1 - t0;
  }
  std::nth_element(v.begin(), v.begin() + kSamples / 2, v.end());
  return v[kSamples / 2];
}

// Smallest nonzero step observed between consecutive steady_clock reads, in nanoseconds.
inline double steadyClockResolutionNs() {
  std::int64_t best = INT64_MAX;
  for (int i = 0; i < 200000; ++i) {
    const auto a = SteadyClock::now();
    auto b = SteadyClock::now();
    while (b == a) b = SteadyClock::now();
    best = std::min<std::int64_t>(best, std::chrono::duration_cast<std::chrono::nanoseconds>(b - a).count());
  }
  return static_cast<double>(best);
}

// Results of timed loops go through this so the optimiser cannot prove them unused.
inline volatile std::uint64_t g_sink = 0;
inline void sink(std::uint64_t v) { g_sink = g_sink ^ v; }

}  // namespace bench
