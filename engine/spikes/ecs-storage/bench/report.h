#pragma once
#include <windows.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <cstdio>
#include <cmath>
#include <cstring>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <map>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

#include "workloads.h"

namespace bench {

struct Stat {
  double median = 0, min = 0, max = 0;
};

inline Stat summarize(std::vector<double> v) {
  std::sort(v.begin(), v.end());
  const std::size_t m = v.size() / 2;
  const double median = v.size() % 2 == 1 ? v[m] : (v[m - 1] + v[m]) / 2;
  return {median, v.front(), v.back()};
}

struct SysInfo {
  std::string date, cpu, os, compiler, flags, gitCommit, gitDirty, pinning;
  bool gitDirtyFlag = false;
  unsigned logicalCores = 0;
  double ramGiB = 0;
};

inline std::string runCommandFirstLine(const std::string& cmd) {
  std::string out;
  FILE* pipe = _popen(cmd.c_str(), "r");
  if (pipe == nullptr) return "unavailable";
  std::array<char, 256> buf{};
  if (std::fgets(buf.data(), static_cast<int>(buf.size()), pipe) != nullptr) out = buf.data();
  const int rc = _pclose(pipe);
  while (!out.empty() && (out.back() == '\n' || out.back() == '\r')) out.pop_back();
  return rc == 0 && !out.empty() ? out : (rc == 0 ? "" : "unavailable");
}

inline std::vector<std::string> runCommandLines(const std::string& cmd, bool& ok) {
  std::vector<std::string> lines;
  FILE* pipe = _popen(cmd.c_str(), "r");
  ok = false;
  if (pipe == nullptr) return lines;
  std::array<char, 512> buf{};
  while (std::fgets(buf.data(), static_cast<int>(buf.size()), pipe) != nullptr) {
    std::string l = buf.data();
    while (!l.empty() && (l.back() == '\n' || l.back() == '\r')) l.pop_back();
    if (!l.empty()) lines.push_back(l);
  }
  ok = _pclose(pipe) == 0;
  return lines;
}

inline SysInfo collectSysInfo(const std::string& sourceDir) {
  SysInfo s;
  const std::time_t now = std::time(nullptr);
  std::tm utc{};
  gmtime_s(&utc, &now);
  char dbuf[16];
  std::strftime(dbuf, sizeof dbuf, "%Y-%m-%d", &utc);
  s.date = dbuf;

  int r[4];
  char brand[49] = {};
  for (int i = 0; i < 3; ++i) {
    __cpuid(r, static_cast<int>(0x80000002u + static_cast<unsigned>(i)));
    std::memcpy(brand + 16 * i, r, 16);
  }
  s.cpu = brand;
  s.cpu.erase(0, s.cpu.find_first_not_of(' '));

  s.logicalCores = std::thread::hardware_concurrency();
  MEMORYSTATUSEX ms{};
  ms.dwLength = sizeof ms;
  GlobalMemoryStatusEx(&ms);
  s.ramGiB = static_cast<double>(ms.ullTotalPhys) / (1024.0 * 1024.0 * 1024.0);

  using RtlGetVersionFn = LONG(WINAPI*)(OSVERSIONINFOW*);
  OSVERSIONINFOW vi{};
  vi.dwOSVersionInfoSize = sizeof vi;
  const HMODULE nt = GetModuleHandleW(L"ntdll.dll");
  const auto fn = nt ? reinterpret_cast<RtlGetVersionFn>(reinterpret_cast<void*>(GetProcAddress(nt, "RtlGetVersion")))
                     : nullptr;
  if (fn != nullptr && fn(&vi) == 0) {
    s.os = "Windows " + std::to_string(vi.dwMajorVersion) + "." + std::to_string(vi.dwMinorVersion) + " build " +
           std::to_string(vi.dwBuildNumber);
  } else {
    s.os = "Windows (version query failed)";
  }

  s.compiler = "MSVC _MSC_VER=" + std::to_string(_MSC_VER) + " _MSC_FULL_VER=" + std::to_string(_MSC_FULL_VER);
#ifdef ECS_SPIKE_FLAGS
  s.flags = ECS_SPIKE_FLAGS;
#else
  s.flags = "unknown";
#endif
  s.gitCommit = runCommandFirstLine("git -C \"" + sourceDir + "\" rev-parse HEAD 2>nul");
  bool ok = false;
  const auto dirty = runCommandLines("git -C \"" + sourceDir + "\" status --porcelain -uall -- . 2>nul", ok);
  if (!ok) {
    s.gitDirty = "unknown (git status failed)";
    s.gitDirtyFlag = true;
  } else if (dirty.empty()) {
    s.gitDirty = "clean for the spike directory";
  } else {
    s.gitDirtyFlag = true;
    // -uall lists every untracked file individually, so the count is a file count.
    s.gitDirty = "DIRTY: " + std::to_string(dirty.size()) + (dirty.size() == 1 ? " file" : " files") +
                 " modified or untracked under the spike directory at run start (first: " + dirty.front() +
                 "); the commit hash alone does not identify the measured sources";
  }
  return s;
}

struct ThroughputResult {
  Workload workload;
  std::string path;
  std::uint32_t n;
  std::uint64_t ops;
  std::vector<double> repSeconds;
  std::uint64_t checksum;
  std::size_t archetypes;  // archetype count the archetype path held during the workload; 0 for sparse
};

struct LatencyResult {
  LatOp op;
  std::string path;
  std::uint32_t n;
  std::uint32_t samples;
  std::vector<LatStat> reps;
};

struct MemoryResult {
  std::string path;
  std::uint32_t n;
  double computedBytesPerEntity;
  double allocatorBytesPerEntity;
  double payloadBytesPerEntity;
  std::size_t archetypes;  // 0 when not applicable
};

struct LatencyMeta {
  std::string clock;
  double nsPerTick = 0, calibrationSpread = 0, overheadNs = 0, steadyResolutionNs = 0;
  std::uint64_t overheadTicks = 0;
};

struct Results {
  SysInfo sys;
  LatencyMeta lat;
  std::string filterNote;
  std::vector<ThroughputResult> throughput;
  std::vector<LatencyResult> latency;
  std::vector<MemoryResult> memory;
};

inline std::string jsonEscape(const std::string& s) {
  std::string o;
  for (char c : s) {
    switch (c) {
      case '\\': o += "\\\\"; break;
      case '"': o += "\\\""; break;
      case '\n': o += "\\n"; break;
      case '\r': o += "\\r"; break;
      case '\t': o += "\\t"; break;
      default: o += c;
    }
  }
  return o;
}

inline std::string num(double v, int prec = 3) {
  std::ostringstream os;
  os << std::fixed << std::setprecision(prec) << v;
  return os.str();
}

// A latency percentile is flagged when its largest per-repetition value exceeds this multiple of its
// smallest. Every repetition replays the same seeded operation sequence, so a stable cost moves by
// well under 2x between repetitions; a larger swing means placement or scheduler effects or two
// distinct timing modes, and the row should be read by its min-max range rather than its median.
inline constexpr double kLatencySpreadFlagRatio = 2.0;

inline std::string countOrNote(std::size_t v) { return v ? std::to_string(v) : std::string("not measured in this run"); }

// Generated from the run itself so the text cannot drift from what was measured.
inline std::vector<std::string> limitations(const Results& R) {
  std::size_t base = 0, afterTag = 0;
  for (const auto& m : R.memory) base = std::max(base, m.archetypes);
  for (const auto& t : R.throughput) {
    if (t.workload == Workload::TagToggle) afterTag = std::max(afterTag, t.archetypes);
  }
  std::vector<std::string> v;
  v.push_back("Archetype queries scan the whole archetype list on every call (no query cache). Archetypes held: " +
              countOrNote(base) + " after building the dataset, " + countOrNote(afterTag) +
              " while the transient tag is present. Query numbers include that scan.");
  v.push_back("Iteration is reported twice. The fresh rows run on a freshly built world where sparse dense order equals "
              "creation order. The fragmented rows first apply, untimed and identically on both paths, a seeded "
              "destroy and recreate of half the entities and an add and remove of the tag on a tenth, then time "
              "iteration. Compare fragmented rows for steady-state behaviour.");
  v.push_back("Tag rows are reported twice. Steady-state rows prime the tag untimed (add then remove on the same entities) "
              "so storage growth and archetype creation are outside the timed region. Cold-start rows are unprimed "
              "and include first-use growth. Latency add tag and add runtime component steps are primed the same way; "
              "latency create rows still include amortised container growth, and max values include reallocation.");
  v.push_back("CPU placement: " + R.sys.pinning);
  v.push_back("Per-operation latency uses the invariant TSC (rdtsc and rdtscp with lfence) calibrated against steady_clock, "
              "not steady_clock, because steady_clock advances in " + num(R.lat.steadyResolutionNs, 0) +
              " ns steps and many operations take 10 to 50 ns. Throughput rows use steady_clock.");
  v.push_back("AddressSanitizer ran on the correctness tests only. UndefinedBehaviorSanitizer is not available on this MSVC "
              "toolchain and did not run. The benchmark itself was not run under any sanitizer.");
  v.push_back("Rows flagged as unstable (throughput variance, latency percentile spread above " +
              num(kLatencySpreadFlagRatio, 1) +
              "x between repetitions) are reported as measured. They are compared by median and min-max range, with no "
              "rerun and no discarded repetition.");
  v.push_back("Git state: " + R.sys.gitDirty + ".");
  v.push_back("Sparse storage carries an 8 byte component mask per entity and flat sparse arrays; bytes per entity depend "
              "on container capacity growth and are not monotonic in entity count.");
  return v;
}

inline std::vector<double> msOf(const ThroughputResult& r) {
  std::vector<double> v;
  for (double s : r.repSeconds) v.push_back(s * 1000.0);
  return v;
}

inline std::string rangeText(const Stat& s, int prec) {
  return num(s.median, prec) + " (" + num(s.min, prec) + "-" + num(s.max, prec) + ")";
}

inline Stat latField(const LatencyResult& r, double LatStat::*field) {
  std::vector<double> v;
  for (const LatStat& s : r.reps) v.push_back(s.*field);
  return summarize(v);
}

inline std::string toJson(const Results& R) {
  std::ostringstream o;
  o << "{\n  \"environment\": {\n"
    << "    \"date_utc\": \"" << R.sys.date << "\",\n"
    << "    \"cpu\": \"" << jsonEscape(R.sys.cpu) << "\",\n"
    << "    \"logical_cores\": " << R.sys.logicalCores << ",\n"
    << "    \"ram_gib\": " << num(R.sys.ramGiB, 2) << ",\n"
    << "    \"os\": \"" << jsonEscape(R.sys.os) << "\",\n"
    << "    \"compiler\": \"" << jsonEscape(R.sys.compiler) << "\",\n"
    << "    \"flags\": \"" << jsonEscape(R.sys.flags) << "\",\n"
    << "    \"git_commit\": \"" << jsonEscape(R.sys.gitCommit) << "\",\n"
    << "    \"git_state\": \"" << jsonEscape(R.sys.gitDirty) << "\",\n"
    << "    \"git_working_tree_dirty\": " << (R.sys.gitDirtyFlag ? "true" : "false") << ",\n"
    << "    \"cpu_placement\": \"" << jsonEscape(R.sys.pinning) << "\",\n"
    << "    \"filter\": \"" << jsonEscape(R.filterNote) << "\",\n"
    << "    \"repetitions\": " << kRepetitions << ",\n    \"warmups\": " << kWarmups << ",\n"
    << "    \"visits_per_rep_target\": " << kVisitsPerRep << ",\n"
    << "    \"latency_clock\": \"" << jsonEscape(R.lat.clock) << "\",\n"
    << "    \"latency_ns_per_tick\": " << num(R.lat.nsPerTick, 6) << ",\n"
    << "    \"latency_calibration_spread\": " << num(R.lat.calibrationSpread, 6) << ",\n"
    << "    \"latency_empty_overhead_ticks\": " << R.lat.overheadTicks << ",\n"
    << "    \"latency_empty_overhead_ns\": " << num(R.lat.overheadNs, 3) << ",\n"
    << "    \"steady_clock_resolution_ns\": " << num(R.lat.steadyResolutionNs, 1) << "\n  },\n";
  o << "  \"throughput\": [\n";
  for (std::size_t i = 0; i < R.throughput.size(); ++i) {
    const auto& t = R.throughput[i];
    const Stat ms = summarize(msOf(t));
    o << "    {\"workload\": \"" << workloadName(t.workload) << "\", \"path\": \"" << t.path << "\", \"entities\": " << t.n
      << ", \"ops_per_rep\": " << t.ops << ", \"ms_median\": " << num(ms.median, 4) << ", \"ms_min\": " << num(ms.min, 4)
      << ", \"ms_max\": " << num(ms.max, 4)
      << ", \"ns_per_op_median\": " << num(ms.median * 1e6 / static_cast<double>(t.ops), 3)
      << ", \"archetypes_held\": " << t.archetypes << ", \"checksum\": " << t.checksum << ", \"rep_ms\": [";
    const auto reps = msOf(t);
    for (std::size_t k = 0; k < reps.size(); ++k) o << (k ? ", " : "") << num(reps[k], 4);
    o << "]}" << (i + 1 < R.throughput.size() ? "," : "") << "\n";
  }
  o << "  ],\n  \"latency_ns\": [\n";
  for (std::size_t i = 0; i < R.latency.size(); ++i) {
    const auto& l = R.latency[i];
    const Stat p50 = latField(l, &LatStat::p50), p99 = latField(l, &LatStat::p99), mx = latField(l, &LatStat::max);
    o << "    {\"op\": \"" << latOpName(l.op) << "\", \"path\": \"" << l.path << "\", \"entities\": " << l.n
      << ", \"samples_per_rep\": " << l.samples << ", \"p50\": {\"median\": " << num(p50.median, 1)
      << ", \"min\": " << num(p50.min, 1) << ", \"max\": " << num(p50.max, 1) << "}, \"p99\": {\"median\": "
      << num(p99.median, 1) << ", \"min\": " << num(p99.min, 1) << ", \"max\": " << num(p99.max, 1)
      << "}, \"max\": {\"median\": " << num(mx.median, 1) << ", \"min\": " << num(mx.min, 1)
      << ", \"max\": " << num(mx.max, 1) << "}}" << (i + 1 < R.latency.size() ? "," : "") << "\n";
  }
  o << "  ],\n  \"memory\": [\n";
  for (std::size_t i = 0; i < R.memory.size(); ++i) {
    const auto& m = R.memory[i];
    o << "    {\"path\": \"" << m.path << "\", \"entities\": " << m.n
      << ", \"computed_bytes_per_entity\": " << num(m.computedBytesPerEntity, 2)
      << ", \"allocator_measured_bytes_per_entity\": " << num(m.allocatorBytesPerEntity, 2)
      << ", \"component_payload_bytes_per_entity\": " << num(m.payloadBytesPerEntity, 2)
      << ", \"archetypes\": " << m.archetypes << "}" << (i + 1 < R.memory.size() ? "," : "") << "\n";
  }
  o << "  ],\n  \"limitations\": [\n";
  const auto lim = limitations(R);
  for (std::size_t i = 0; i < lim.size(); ++i) {
    o << "    \"" << jsonEscape(lim[i]) << "\"" << (i + 1 < lim.size() ? "," : "") << "\n";
  }
  o << "  ]\n}\n";
  return o.str();
}

// Pairs the two paths for one (workload, size) so the winner and ratio are computed, not typed.
struct PairedThroughput {
  const ThroughputResult* a = nullptr;
  const ThroughputResult* b = nullptr;
};

inline std::string spreadFlags(const ThroughputResult& t) {
  const Stat ms = summarize(msOf(t));
  const double spread = (ms.max - ms.min) / ms.median;
  const double nsPerOp = ms.median * 1e6 / static_cast<double>(t.ops);
  std::string f;
  if (spread < 0.002) f += " LOW_VARIANCE(" + t.path + ")";
  if (spread > 0.5) f += " HIGH_VARIANCE(" + t.path + ")";
  if (nsPerOp < 0.3) f += " IMPLAUSIBLY_FAST(" + t.path + ")";
  return f;
}

inline std::string toMarkdown(const Results& R) {
  std::ostringstream o;
  o << "# ECS storage spike results\n\n";
  o << "| Item | Value |\n|---|---|\n"
    << "| Date (UTC) | " << R.sys.date << " |\n"
    << "| CPU | " << R.sys.cpu << " |\n"
    << "| Logical cores | " << R.sys.logicalCores << " |\n"
    << "| RAM | " << num(R.sys.ramGiB, 2) << " GiB |\n"
    << "| OS | " << R.sys.os << " |\n"
    << "| Compiler | " << R.sys.compiler << " |\n"
    << "| Flags | `" << R.sys.flags << "` |\n"
    << "| Git commit | " << R.sys.gitCommit << " |\n"
    << "| Git state | " << R.sys.gitDirty << " |\n"
    << "| CPU placement | " << R.sys.pinning << " |\n"
    << "| Run filter | " << R.filterNote << " |\n"
    << "| Repetitions | " << kRepetitions << " timed after " << kWarmups << " warmups; median (min-max) |\n"
    << "| Latency clock | " << R.lat.clock << ", " << num(R.lat.nsPerTick, 5) << " ns/tick, calibration spread "
    << num(R.lat.calibrationSpread * 100, 3) << "% |\n"
    << "| Latency timer overhead removed | " << R.lat.overheadTicks << " ticks (" << num(R.lat.overheadNs, 2)
    << " ns), median of empty begin/end pairs |\n"
    << "| steady_clock smallest step | " << num(R.lat.steadyResolutionNs, 0) << " ns |\n\n";

  o << "## Throughput workloads\n\nTimes are milliseconds per timed repetition. ns/op is the median time divided by the "
       "operations in that repetition. Faster is the path with the lower median; separated is yes only when the "
       "faster path's slowest repetition is quicker than the other path's fastest.\n\n"
    << "| Workload | Entities | Ops/rep | Archetype ms | Sparse ms | Archetype ns/op | Sparse ns/op | Faster | "
       "Ratio | Separated | Flags |\n|---|---|---|---|---|---|---|---|---|---|---|\n";
  std::map<std::pair<int, std::uint32_t>, PairedThroughput> pairs;
  std::vector<std::pair<int, std::uint32_t>> order;
  for (const auto& t : R.throughput) {
    const auto key = std::make_pair(static_cast<int>(t.workload), t.n);
    if (!pairs.count(key)) order.push_back(key);
    (t.path == "archetype" ? pairs[key].a : pairs[key].b) = &t;
  }
  std::sort(order.begin(), order.end(), [](auto x, auto y) { return x.second != y.second ? x.second < y.second : x.first < y.first; });
  std::string suspicious;
  for (const auto& key : order) {
    const auto& p = pairs[key];
    if (!p.a || !p.b) continue;
    const Stat ma = summarize(msOf(*p.a)), mb = summarize(msOf(*p.b));
    const bool aFaster = ma.median < mb.median;
    const Stat& fast = aFaster ? ma : mb;
    const Stat& slow = aFaster ? mb : ma;
    const std::string flags = spreadFlags(*p.a) + spreadFlags(*p.b);
    o << "| " << workloadName(p.a->workload) << " | " << p.a->n << " | " << p.a->ops << " | " << rangeText(ma, 3) << " | "
      << rangeText(mb, 3) << " | " << num(ma.median * 1e6 / static_cast<double>(p.a->ops), 2) << " | "
      << num(mb.median * 1e6 / static_cast<double>(p.b->ops), 2) << " | " << (aFaster ? "archetype" : "sparse") << " | "
      << num(slow.median / fast.median, 2) << "x | " << (fast.max < slow.min ? "yes" : "no") << " |" << flags << " |\n";
    if (!flags.empty()) suspicious += "- " + std::string(workloadName(p.a->workload)) + " at " + std::to_string(p.a->n) + ":" + flags + "\n";
    if (p.a->checksum != p.b->checksum) suspicious += "- CHECKSUM MISMATCH " + std::string(workloadName(p.a->workload)) + "\n";
  }

  o << "\n## Per-mutation latency (nanoseconds)\n\nEach operation is timed individually; values are the median "
       "(min-max) across repetitions of that repetition's percentile, with the empty-timer overhead subtracted and "
       "clamped at zero.\n\n"
    << "| Operation | Entities | Samples/rep | Path | p50 | p99 | max |\n|---|---|---|---|---|---|---|\n";
  std::vector<const LatencyResult*> lats;
  for (const auto& l : R.latency) lats.push_back(&l);
  std::sort(lats.begin(), lats.end(), [](auto* x, auto* y) {
    if (x->n != y->n) return x->n < y->n;
    if (x->op != y->op) return x->op < y->op;
    return x->path < y->path;
  });
  for (const auto* l : lats) {
    const std::pair<const char*, double LatStat::*> percentiles[] = {{"p50", &LatStat::p50}, {"p99", &LatStat::p99}};
    for (const auto& [label, field] : percentiles) {
      const Stat st = latField(*l, field);
      const double ratio = st.max / std::max(st.min, 1.0);
      if (ratio > kLatencySpreadFlagRatio) {
        suspicious += std::string("- LATENCY_SPREAD ") + latOpName(l->op) + " at " + std::to_string(l->n) + " " + l->path +
                      " " + label + ": " + rangeText(st, 0) + " ns, max/min " + num(ratio, 1) + "x\n";
      }
    }
    o << "| " << latOpName(l->op) << " | " << l->n << " | " << l->samples << " | " << l->path << " | "
      << rangeText(latField(*l, &LatStat::p50), 0) << " | " << rangeText(latField(*l, &LatStat::p99), 0) << " | "
      << rangeText(latField(*l, &LatStat::max), 0) << " |\n";
  }

  o << "\n## Bytes per entity\n\nComputed is the sum of container capacities and chunk allocations. Allocator-measured is "
       "the live usable heap size recorded by a counting operator new while the world was built. Payload is the average "
       "sum of component sizes only.\n\n"
    << "| Path | Entities | Computed B/entity | Allocator-measured B/entity | Payload B/entity | Archetypes |\n"
       "|---|---|---|---|---|---|\n";
  for (const auto& m : R.memory) {
    o << "| " << m.path << " | " << m.n << " | " << num(m.computedBytesPerEntity, 2) << " | "
      << num(m.allocatorBytesPerEntity, 2) << " | " << num(m.payloadBytesPerEntity, 2) << " | "
      << (m.archetypes ? std::to_string(m.archetypes) : "n/a") << " |\n";
    const double diff = std::abs(m.computedBytesPerEntity - m.allocatorBytesPerEntity) / m.allocatorBytesPerEntity;
    if (diff > 0.10) suspicious += "- MEMORY computed vs allocator differ by " + num(diff * 100, 1) + "% for " + m.path + " at " + std::to_string(m.n) + "\n";
  }
  o << "\n## Automatic suspicion flags\n\n" << (suspicious.empty() ? "None raised.\n" : suspicious);
  o << "\n## Limitations and handling\n\n";
  for (const auto& l : limitations(R)) o << "- " << l << "\n";
  return o.str();
}

inline void writeFile(const std::string& path, const std::string& text) {
  std::ofstream f(path, std::ios::binary | std::ios::trunc);
  if (!f) throw std::runtime_error("cannot open for writing: " + path);
  f << text;
  f.flush();
  if (!f) throw std::runtime_error("write failed: " + path);
}

}  // namespace bench
