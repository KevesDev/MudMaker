#include <cstdio>
#include <cstring>
#include <iostream>
#include <set>
#include <sstream>

#include "alloc_counter.h"
#include "platform.h"
#include "ecs/archetype_world.h"
#include "ecs/sparse_world.h"
#include "report.h"

using namespace bench;

namespace {

struct Options {
  std::vector<std::uint32_t> sizes{10'000, 100'000, 1'000'000};
  std::set<std::string> workloads;  // empty means all
  std::string outDir;
  bool filtered = false;
};

std::vector<std::string> splitCsv(const std::string& s) {
  std::vector<std::string> out;
  std::stringstream ss(s);
  std::string item;
  while (std::getline(ss, item, ',')) {
    if (!item.empty()) out.push_back(item);
  }
  return out;
}

Options parseArgs(int argc, char** argv) {
  Options o;
#ifdef ECS_SPIKE_SOURCE_DIR
  o.outDir = std::string(ECS_SPIKE_SOURCE_DIR) + "/results";
#endif
  for (int i = 1; i < argc; ++i) {
    const std::string a = argv[i];
    if (a.rfind("--sizes=", 0) == 0) {
      o.sizes.clear();
      for (const auto& s : splitCsv(a.substr(8))) o.sizes.push_back(static_cast<std::uint32_t>(std::stoul(s)));
      o.filtered = true;
    } else if (a.rfind("--workloads=", 0) == 0) {
      for (const auto& s : splitCsv(a.substr(12))) o.workloads.insert(s);
      o.filtered = true;
    } else if (a.rfind("--out-dir=", 0) == 0) {
      o.outDir = a.substr(10);
    } else {
      throw std::invalid_argument("unknown argument: " + a +
                                  " (use --sizes=N,N --workloads=name,name,latency,memory --out-dir=PATH)");
    }
  }
  for (std::uint32_t n : o.sizes) {
    if (n < 1000) throw std::invalid_argument("sizes below 1000 are not meaningful for these workloads");
  }
  return o;
}

bool selected(const Options& o, const std::string& name) { return o.workloads.empty() || o.workloads.count(name) != 0; }

template <class W>
MemoryResult measureMemory(const Env& e) {
  AllocCounter::begin();
  auto world = std::make_unique<W>(kWorldId, e.s.reg);
  for (std::uint32_t i = 0; i < e.ds.n; ++i) createEntity(*world, e.s, e.ds.flags[i], i);
  const std::uint64_t live = AllocCounter::liveBytes();
  AllocCounter::end();
  require(world->entityCount() == e.ds.n, "memory build count");
  std::uint64_t payload = 0;
  for (std::uint8_t f : e.ds.flags) {
    payload += sizeof(ecs::Position) + sizeof(ecs::Velocity);
    if (f & kHasHealth) payload += sizeof(ecs::Health);
    if (f & kHasTicket) payload += sizeof(ecs::Ticket);
  }
  std::size_t archetypes = 0;
  if constexpr (requires { world->archetypeCount(); }) archetypes = world->archetypeCount();
  const double n = e.ds.n;
  return {W::kName, e.ds.n, static_cast<double>(world->memoryBytes()) / n, static_cast<double>(live) / n,
          static_cast<double>(payload) / n, archetypes};
}

void runThroughput(const Options& opt, const Env& e, Results& R) {
  constexpr std::array<Workload, 9> all{Workload::BulkCreate,         Workload::Churn,
                                        Workload::Iterate2,           Workload::Iterate2Fragmented,
                                        Workload::Iterate3,           Workload::Iterate3Fragmented,
                                        Workload::TagToggle,          Workload::TagToggleCold,
                                        Workload::RandomAccess};
  for (Workload w : all) {
    if (!selected(opt, workloadName(w))) continue;
    std::vector<double> secA, secB;
    std::uint64_t checksum = 0;
    bool haveChecksum = false;
    std::size_t archetypes = 0;
    const auto observe = [&](std::uint64_t c) {
      if (!haveChecksum) {
        checksum = c;
        haveChecksum = true;
      }
      require(c == checksum, "checksum differs between repetitions or between storage paths");
    };
    // Paths alternate which goes first each repetition so slow drift does not favour either.
    for (std::uint32_t rep = 0; rep < kWarmups + kRepetitions; ++rep) {
      RepOutcome a{}, b{};
      if (rep % 2 == 0) {
        a = runRep<ecs::ArchetypeWorld>(w, e);
        b = runRep<ecs::SparseWorld>(w, e);
      } else {
        b = runRep<ecs::SparseWorld>(w, e);
        a = runRep<ecs::ArchetypeWorld>(w, e);
      }
      observe(a.checksum);
      archetypes = a.archetypes;
      observe(b.checksum);
      if (rep >= kWarmups) {
        secA.push_back(a.seconds);
        secB.push_back(b.seconds);
      }
    }
    const std::uint64_t ops = opsPerRep(w, e.ds);
    R.throughput.push_back({w, ecs::ArchetypeWorld::kName, e.ds.n, ops, secA, checksum, archetypes});
    R.throughput.push_back({w, ecs::SparseWorld::kName, e.ds.n, ops, secB, checksum, 0});
    std::printf("  %s n=%u done\n", workloadName(w), e.ds.n);
    std::fflush(stdout);
  }
}

void runLatency(const Env& e, const TickClock& clk, std::uint64_t overhead, Results& R) {
  constexpr std::size_t kOps = kLatOps.size();
  std::array<std::vector<LatStat>, kOps> repsA, repsB;
  for (std::uint32_t rep = 0; rep < kWarmups + kRepetitions; ++rep) {
    std::array<LatStat, kOps> a{}, b{};
    if (rep % 2 == 0) {
      a = runLatencyRep<ecs::ArchetypeWorld>(e, clk, overhead);
      b = runLatencyRep<ecs::SparseWorld>(e, clk, overhead);
    } else {
      b = runLatencyRep<ecs::SparseWorld>(e, clk, overhead);
      a = runLatencyRep<ecs::ArchetypeWorld>(e, clk, overhead);
    }
    if (rep >= kWarmups) {
      for (std::size_t k = 0; k < kOps; ++k) {
        repsA[k].push_back(a[k]);
        repsB[k].push_back(b[k]);
      }
    }
  }
  const std::uint32_t samples = latencySamples(e.ds.n);
  for (std::size_t k = 0; k < kOps; ++k) {
    R.latency.push_back({kLatOps[k], ecs::ArchetypeWorld::kName, e.ds.n, samples, repsA[k]});
    R.latency.push_back({kLatOps[k], ecs::SparseWorld::kName, e.ds.n, samples, repsB[k]});
  }
  std::printf("  latency n=%u done\n", e.ds.n);
  std::fflush(stdout);
}

}  // namespace

int main(int argc, char** argv) {
  try {
    const Options opt = parseArgs(argc, argv);
    const ecs::Standard standard;
    Results R;
#ifdef ECS_SPIKE_SOURCE_DIR
    R.sys = collectSysInfo(ECS_SPIKE_SOURCE_DIR);
#else
    R.sys = collectSysInfo(".");
#endif
    std::ostringstream filter;
    if (!opt.filtered) {
      filter << "none (full run)";
    } else {
      filter << "sizes=";
      for (auto n : opt.sizes) filter << n << ",";
      filter << " workloads=";
      if (opt.workloads.empty()) filter << "all";
      for (const auto& w : opt.workloads) filter << w << ",";
    }
    R.filterNote = filter.str();

    R.sys.pinning = pinToPerformanceCoreAndRaisePriority();
    std::printf("%s\n", R.sys.pinning.c_str());
    const TickClock clk;
    R.lat.clock = "invariant TSC (rdtsc/rdtscp with lfence), calibrated against steady_clock";
    R.lat.nsPerTick = clk.nsPerTick();
    R.lat.calibrationSpread = clk.calibrationSpread();
    R.lat.overheadTicks = measureEmptyOverheadTicks(clk);
    R.lat.overheadNs = static_cast<double>(R.lat.overheadTicks) * clk.nsPerTick();
    R.lat.steadyResolutionNs = steadyClockResolutionNs();
    std::printf("tick %.5f ns, empty overhead %llu ticks, steady_clock step %.0f ns\n", R.lat.nsPerTick,
                static_cast<unsigned long long>(R.lat.overheadTicks), R.lat.steadyResolutionNs);

    for (std::uint32_t n : opt.sizes) {
      std::printf("size %u\n", n);
      const Dataset ds = makeDataset(n);
      const Selections sel = makeSelections(ds);
      const Env e{standard, ds, sel};
      if (selected(opt, "memory")) {
        R.memory.push_back(measureMemory<ecs::ArchetypeWorld>(e));
        R.memory.push_back(measureMemory<ecs::SparseWorld>(e));
      }
      runThroughput(opt, e, R);
      if (selected(opt, "latency")) runLatency(e, clk, R.lat.overheadTicks, R);
    }

    const std::string base = opt.outDir + "/results-" + R.sys.date + (opt.filtered ? "-filtered" : "");
    writeFile(base + ".json", toJson(R));
    writeFile(base + ".md", toMarkdown(R));
    std::printf("wrote %s.json and %s.md\n", base.c_str(), base.c_str());
    return 0;
  } catch (const std::exception& ex) {
    std::fprintf(stderr, "benchmark failed: %s\n", ex.what());
    return 1;
  }
}
