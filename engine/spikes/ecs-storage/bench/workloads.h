#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

#include "clock.h"
#include "dataset.h"

namespace bench {

inline constexpr std::uint32_t kWorldId = 1;
inline constexpr std::uint32_t kRepetitions = 7;
inline constexpr std::uint32_t kWarmups = 2;
// Query and lookup workloads repeat passes until about this many entity visits are timed per
// repetition, so small worlds still run long enough for the steady clock to resolve.
inline constexpr std::uint64_t kVisitsPerRep = 1'000'000;
inline constexpr std::uint32_t kChurnDivisor = 2;       // destroy and recreate 1/2 of the entities
inline constexpr std::uint32_t kTagDivisor = 10;        // add then remove a tag on 1/10 of the entities
inline constexpr std::uint32_t kLatencySampleDivisor = 4;
inline constexpr std::uint32_t kLatencySampleCap = 100'000;

struct Env {
  const ecs::Standard& s;
  const Dataset& ds;
  const Selections& sel;
};

inline void require(bool ok, const char* what) {
  if (!ok) throw std::runtime_error(std::string("benchmark invariant violated: ") + what);
}

inline std::uint64_t passesFor(std::uint32_t n) { return std::max<std::uint64_t>(1, kVisitsPerRep / n); }

template <class W>
struct Fixture {
  std::unique_ptr<W> world;
  std::vector<ecs::EntityId> handles;
};

template <class W>
Fixture<W> populate(const Env& e) {
  Fixture<W> f;
  f.world = std::make_unique<W>(kWorldId, e.s.reg);
  f.handles.resize(e.ds.n);
  for (std::uint32_t i = 0; i < e.ds.n; ++i) f.handles[i] = createEntity(*f.world, e.s, e.ds.flags[i], i);
  return f;
}

template <class W>
std::uint64_t sumPositionX(W& w, const ecs::Standard& s) {
  std::uint64_t sum = 0;
  const std::array<ecs::ComponentId, 1> req{s.position};
  w.query(req, std::span<const ecs::ComponentId>{}, [&](ecs::EntityId, void* const* p) {
    sum += static_cast<const ecs::Position*>(p[0])->x;
  });
  return sum;
}

template <class W>
std::uint64_t sumHealth(W& w, const ecs::Standard& s) {
  std::uint64_t sum = 0;
  const std::array<ecs::ComponentId, 1> req{s.health};
  w.query(req, std::span<const ecs::ComponentId>{}, [&](ecs::EntityId, void* const* p) {
    sum += static_cast<const ecs::Health*>(p[0])->value;
  });
  return sum;
}

template <class W>
std::uint64_t countWith(W& w, ecs::ComponentId c) {
  std::uint64_t n = 0;
  const std::array<ecs::ComponentId, 1> req{c};
  w.query(req, std::span<const ecs::ComponentId>{}, [&](ecs::EntityId, void* const*) { ++n; });
  return n;
}

// Order-independent digest of every component value in the world.
template <class W>
std::uint64_t checksumWorld(W& w, const ecs::Standard& s) {
  std::uint64_t digest = 0;
  std::uint64_t count = 0;
  const std::array<ecs::ComponentId, 3> pv{s.position, s.velocity, s.ticket};
  const std::array<ecs::ComponentId, 2> pvOnly{s.position, s.velocity};
  w.query(pvOnly, std::span<const ecs::ComponentId>{}, [&](ecs::EntityId, void* const* p) {
    const auto* pos = static_cast<const ecs::Position*>(p[0]);
    const auto* vel = static_cast<const ecs::Velocity*>(p[1]);
    digest += pos->x + 3ull * pos->y + 5ull * pos->z + 7ull * vel->x + 11ull * vel->y + 13ull * vel->z;
    ++count;
  });
  w.query(pv, std::span<const ecs::ComponentId>{}, [&](ecs::EntityId, void* const* p) {
    const auto* t = static_cast<const ecs::Ticket*>(p[2]);
    digest += t->a ^ t->b ^ t->c;
  });
  digest += 17ull * sumHealth(w, s);
  digest += 19ull * countWith(w, s.frozen) + 23ull * countWith(w, s.marked);
  return digest * 31ull + count;
}

// Timer plus facts a workload observed about its world that the report needs.
struct RepContext : RepTimer {
  std::size_t archetypeCount = 0;  // 0 when the storage path has no archetypes
};

struct RepOutcome {
  double seconds = 0;
  std::uint64_t checksum = 0;
  std::size_t archetypes = 0;
};

enum class Workload {
  BulkCreate,
  Churn,
  Iterate2,
  Iterate2Fragmented,
  Iterate3,
  Iterate3Fragmented,
  TagToggle,
  TagToggleCold,
  RandomAccess
};

inline const char* workloadName(Workload w) {
  switch (w) {
    case Workload::BulkCreate: return "bulk_create";
    case Workload::Churn: return "destroy_recreate_churn_50pct";
    case Workload::Iterate2: return "iterate_2_components_write_1_field_fresh";
    case Workload::Iterate2Fragmented: return "iterate_2_components_write_1_field_fragmented";
    case Workload::Iterate3: return "iterate_3_components_exclude_1_fresh";
    case Workload::Iterate3Fragmented: return "iterate_3_components_exclude_1_fragmented";
    case Workload::TagToggle: return "tag_add_remove_10pct_steady_state";
    case Workload::TagToggleCold: return "tag_add_remove_10pct_cold_start";
    case Workload::RandomAccess: return "random_access_by_handle";
  }
  return "";
}

inline std::uint64_t opsPerRep(Workload w, const Dataset& ds) {
  const std::uint64_t n = ds.n;
  switch (w) {
    case Workload::BulkCreate: return n;
    case Workload::Churn: return 2 * (n / kChurnDivisor);
    case Workload::Iterate2:
    case Workload::Iterate2Fragmented: return passesFor(ds.n) * n;
    case Workload::Iterate3:
    case Workload::Iterate3Fragmented: return passesFor(ds.n) * ds.matchedThreeTerm;
    case Workload::TagToggle:
    case Workload::TagToggleCold: return 2 * (n / kTagDivisor);
    case Workload::RandomAccess: return passesFor(ds.n) * n;
  }
  return 0;
}

template <class W>
std::size_t archetypesOf(const W& w) {
  if constexpr (requires { w.archetypeCount(); }) {
    return w.archetypeCount();
  } else {
    return 0;
  }
}

template <class W>
std::uint64_t runBulkCreate(const Env& e, RepContext& t) {
  const std::uint32_t n = e.ds.n;
  auto world = std::make_unique<W>(kWorldId, e.s.reg);
  std::vector<ecs::EntityId> handles(n);
  t.start();
  for (std::uint32_t i = 0; i < n; ++i) handles[i] = createEntity(*world, e.s, e.ds.flags[i], i);
  t.stop();
  sink(handles[n - 1].index);
  require(world->entityCount() == n, "bulk create count");
  require(sumPositionX(*world, e.s) == std::uint64_t{n} * (n - 1) / 2, "bulk create position sum");
  return checksumWorld(*world, e.s);
}

template <class W>
std::uint64_t runChurn(const Env& e, RepContext& t) {
  const std::uint32_t n = e.ds.n;
  const std::uint32_t half = n / kChurnDivisor;
  auto f = populate<W>(e);
  const auto& perm = e.sel.churn;
  std::vector<ecs::EntityId> old(half);
  for (std::uint32_t j = 0; j < half; ++j) old[j] = f.handles[perm[j]];
  std::uint64_t destroyed = 0;
  t.start();
  for (std::uint32_t j = 0; j < half; ++j) destroyed += f.world->destroy(old[j]) ? 1 : 0;
  for (std::uint32_t j = 0; j < half; ++j) {
    const std::uint32_t idx = perm[j];
    f.handles[idx] = createEntity(*f.world, e.s, e.ds.flags[idx], idx + n);
  }
  t.stop();
  sink(destroyed);
  require(destroyed == half, "churn destroyed count");
  require(f.world->entityCount() == n, "churn live count");
  std::uint64_t expectedX = 0;
  std::vector<std::uint8_t> replaced(n, 0);
  for (std::uint32_t j = 0; j < half; ++j) {
    replaced[perm[j]] = 1;
    require(!f.world->alive(old[j]), "churn old handle still alive");
    require(f.world->alive(f.handles[perm[j]]), "churn new handle not alive");
  }
  for (std::uint32_t i = 0; i < n; ++i) expectedX += replaced[i] ? std::uint64_t{i} + n : i;
  require(sumPositionX(*f.world, e.s) == expectedX, "churn position sum");
  return checksumWorld(*f.world, e.s);
}

// Untimed, seeded, identical on both paths: destroy and recreate half of the entities, then add
// and remove a tag on a tenth. Afterwards storage order no longer follows creation order.
// valueIndex[i] receives the value index that slot i's entity was created with.
template <class W>
void fragment(const Env& e, Fixture<W>& f, std::vector<std::uint32_t>& valueIndex) {
  const std::uint32_t n = e.ds.n;
  const std::uint32_t half = n / kChurnDivisor;
  const std::uint32_t tagged = n / kTagDivisor;
  valueIndex.resize(n);
  for (std::uint32_t i = 0; i < n; ++i) valueIndex[i] = i;
  for (std::uint32_t j = 0; j < half; ++j) {
    require(f.world->destroy(f.handles[e.sel.churn[j]]), "fragment destroy");
  }
  for (std::uint32_t j = 0; j < half; ++j) {
    const std::uint32_t idx = e.sel.churn[j];
    f.handles[idx] = createEntity(*f.world, e.s, e.ds.flags[idx], idx + n);
    valueIndex[idx] = idx + n;
  }
  for (std::uint32_t i = 0; i < tagged; ++i) {
    require(f.world->add(f.handles[e.sel.tag[i]], e.s.marked, nullptr), "fragment tag add");
  }
  for (std::uint32_t i = 0; i < tagged; ++i) {
    require(f.world->remove(f.handles[e.sel.tag[i]], e.s.marked), "fragment tag remove");
  }
  require(f.world->entityCount() == n, "fragment live count");
}

template <class W, bool Fragmented>
std::uint64_t runIterate2(const Env& e, RepContext& t) {
  const std::uint32_t n = e.ds.n;
  auto f = populate<W>(e);
  std::vector<std::uint32_t> valueIndex(n);
  if constexpr (Fragmented) {
    fragment(e, f, valueIndex);
  } else {
    for (std::uint32_t i = 0; i < n; ++i) valueIndex[i] = i;
  }
  t.archetypeCount = archetypesOf(*f.world);
  const std::uint64_t passes = passesFor(n);
  const std::array<ecs::ComponentId, 2> req{e.s.position, e.s.velocity};
  std::uint64_t visited = 0;
  f.world->query(req, std::span<const ecs::ComponentId>{}, [&](ecs::EntityId, void* const*) { ++visited; });
  require(visited == n, "iterate2 matched count");
  t.start();
  for (std::uint64_t p = 0; p < passes; ++p) {
    f.world->query(req, std::span<const ecs::ComponentId>{}, [](ecs::EntityId, void* const* c) {
      auto* pos = static_cast<ecs::Position*>(c[0]);
      const auto* vel = static_cast<const ecs::Velocity*>(c[1]);
      pos->x += vel->x;
    });
  }
  t.stop();
  // Position.x is uint32, so the oracle wraps the same way.
  std::uint64_t expectedX = 0;
  for (std::uint32_t i = 0; i < n; ++i) {
    const std::uint32_t v = valueIndex[i];
    expectedX += (v + passes * velocityFor(v).x) & 0xFFFFFFFFull;
  }
  require(sumPositionX(*f.world, e.s) == expectedX, "iterate2 position sum");
  return checksumWorld(*f.world, e.s);
}

template <class W, bool Fragmented>
std::uint64_t runIterate3(const Env& e, RepContext& t) {
  const std::uint32_t n = e.ds.n;
  auto f = populate<W>(e);
  std::vector<std::uint32_t> valueIndex(n);
  if constexpr (Fragmented) {
    fragment(e, f, valueIndex);
  } else {
    for (std::uint32_t i = 0; i < n; ++i) valueIndex[i] = i;
  }
  t.archetypeCount = archetypesOf(*f.world);
  const std::uint64_t passes = passesFor(n);
  const std::array<ecs::ComponentId, 3> req{e.s.position, e.s.velocity, e.s.health};
  const std::array<ecs::ComponentId, 1> ex{e.s.frozen};
  std::uint64_t visited = 0;
  f.world->query(req, ex, [&](ecs::EntityId, void* const*) { ++visited; });
  require(visited == e.ds.matchedThreeTerm, "iterate3 matched count versus dataset flags");
  t.start();
  for (std::uint64_t p = 0; p < passes; ++p) {
    f.world->query(req, ex, [](ecs::EntityId, void* const* c) {
      const auto* vel = static_cast<const ecs::Velocity*>(c[1]);
      static_cast<ecs::Health*>(c[2])->value += vel->x;
    });
  }
  t.stop();
  std::uint64_t expectedHealth = 0;
  for (std::uint32_t i = 0; i < n; ++i) {
    const std::uint8_t fl = e.ds.flags[i];
    if (!(fl & kHasHealth)) continue;
    const std::uint32_t v = valueIndex[i];
    const bool bumped = !(fl & kHasFrozen);
    expectedHealth += (healthFor(v).value + (bumped ? passes * velocityFor(v).x : 0)) & 0xFFFFFFFFull;
  }
  require(sumHealth(*f.world, e.s) == expectedHealth, "iterate3 health sum");
  return checksumWorld(*f.world, e.s);
}

// Steady state primes the tag untimed first (storage growth, archetype creation), so the timed
// passes measure repeated use. The cold variant skips priming and so includes first-use growth.
template <class W, bool Primed>
std::uint64_t runTagToggle(const Env& e, RepContext& t) {
  const std::uint32_t n = e.ds.n;
  const std::uint32_t k = n / kTagDivisor;
  auto f = populate<W>(e);
  const auto& sel = e.sel.tag;
  if constexpr (Primed) {
    for (std::uint32_t i = 0; i < k; ++i) require(f.world->add(f.handles[sel[i]], e.s.marked, nullptr), "prime tag add");
    for (std::uint32_t i = 0; i < k; ++i) require(f.world->remove(f.handles[sel[i]], e.s.marked), "prime tag remove");
  }
  const std::uint64_t before = checksumWorld(*f.world, e.s);
  std::uint64_t added = 0, removed = 0;
  t.start();
  for (std::uint32_t i = 0; i < k; ++i) added += f.world->add(f.handles[sel[i]], e.s.marked, nullptr) ? 1 : 0;
  t.stop();
  require(added == k, "tag add count");
  require(countWith(*f.world, e.s.marked) == k, "tag holders after add");
  t.archetypeCount = archetypesOf(*f.world);
  t.start();
  for (std::uint32_t i = 0; i < k; ++i) removed += f.world->remove(f.handles[sel[i]], e.s.marked) ? 1 : 0;
  t.stop();
  sink(added + removed);
  require(removed == k, "tag remove count");
  require(countWith(*f.world, e.s.marked) == 0, "tag holders after remove");
  const std::uint64_t after = checksumWorld(*f.world, e.s);
  require(after == before, "component data changed by tag toggle");
  return after;
}

template <class W>
std::uint64_t runRandomAccess(const Env& e, RepContext& t) {
  const std::uint32_t n = e.ds.n;
  auto f = populate<W>(e);
  std::vector<ecs::EntityId> shuffled(n);
  for (std::uint32_t i = 0; i < n; ++i) shuffled[i] = f.handles[e.sel.access[i]];
  const std::uint64_t passes = passesFor(n);
  std::uint64_t acc = 0;
  t.start();
  for (std::uint64_t p = 0; p < passes; ++p) {
    for (std::uint32_t i = 0; i < n; ++i) {
      acc += static_cast<const ecs::Position*>(f.world->get(shuffled[i], e.s.position))->x;
    }
  }
  t.stop();
  sink(acc);
  require(acc == passes * (std::uint64_t{n} * (n - 1) / 2), "random access position sum");
  return checksumWorld(*f.world, e.s);
}

template <class W>
RepOutcome runRep(Workload w, const Env& e) {
  RepContext t;
  std::uint64_t checksum = 0;
  switch (w) {
    case Workload::BulkCreate: checksum = runBulkCreate<W>(e, t); break;
    case Workload::Churn: checksum = runChurn<W>(e, t); break;
    case Workload::Iterate2: checksum = runIterate2<W, false>(e, t); break;
    case Workload::Iterate2Fragmented: checksum = runIterate2<W, true>(e, t); break;
    case Workload::Iterate3: checksum = runIterate3<W, false>(e, t); break;
    case Workload::Iterate3Fragmented: checksum = runIterate3<W, true>(e, t); break;
    case Workload::TagToggle: checksum = runTagToggle<W, true>(e, t); break;
    case Workload::TagToggleCold: checksum = runTagToggle<W, false>(e, t); break;
    case Workload::RandomAccess: checksum = runRandomAccess<W>(e, t); break;
  }
  sink(checksum);
  return {t.seconds(), checksum, t.archetypeCount};
}

// ---- per-mutation latency ----

enum class LatOp { Create, AddTag, RemoveTag, AddTicket, RemoveTicket, Destroy };
inline constexpr std::array<LatOp, 6> kLatOps{LatOp::Create,    LatOp::AddTag,       LatOp::RemoveTag,
                                              LatOp::AddTicket, LatOp::RemoveTicket, LatOp::Destroy};

inline const char* latOpName(LatOp op) {
  switch (op) {
    case LatOp::Create: return "create_entity_3_to_5_components";
    case LatOp::AddTag: return "add_tag";
    case LatOp::RemoveTag: return "remove_tag";
    case LatOp::AddTicket: return "add_runtime_component_24_bytes";
    case LatOp::RemoveTicket: return "remove_runtime_component_24_bytes";
    case LatOp::Destroy: return "destroy_entity";
  }
  return "";
}

inline std::uint32_t latencySamples(std::uint32_t n) {
  return std::min<std::uint32_t>(n / kLatencySampleDivisor, kLatencySampleCap);
}

struct LatStat {
  double p50 = 0, p99 = 0, max = 0;  // nanoseconds, empty-timer overhead subtracted
};

inline LatStat summarizeTicks(std::vector<std::uint64_t>& ticks, std::uint64_t overhead, double nsPerTick) {
  for (auto& v : ticks) v = v > overhead ? v - overhead : 0;
  std::sort(ticks.begin(), ticks.end());
  const auto rank = [&](double q) {
    const auto idx = static_cast<std::size_t>(std::ceil(q * static_cast<double>(ticks.size()))) - 1;
    return static_cast<double>(ticks[std::min(idx, ticks.size() - 1)]) * nsPerTick;
  };
  return {rank(0.50), rank(0.99), static_cast<double>(ticks.back()) * nsPerTick};
}

// Each operation is timed on its own with the clock read immediately before and after it; argument
// preparation happens outside the timed window. Operation order restores the world between steps.
template <class W>
std::array<LatStat, kLatOps.size()> runLatencyRep(const Env& e, const TickClock& clk, std::uint64_t overhead) {
  const std::uint32_t n = e.ds.n;
  const std::uint32_t samples = latencySamples(n);
  require(e.sel.ticketless.size() >= samples, "not enough entities without a ticket");
  auto f = populate<W>(e);
  std::vector<std::uint64_t> ticks(samples);
  std::array<LatStat, kLatOps.size()> out{};
  std::uint64_t okCount = 0;
  const auto finish = [&](LatOp op) {
    out[static_cast<std::size_t>(op)] = summarizeTicks(ticks, overhead, clk.nsPerTick());
  };

  for (std::uint32_t i = 0; i < samples; ++i) {  // create
    const InitPack pk(e.s, e.ds.flags[i], n + i);
    const auto inits = pk.span();
    const std::uint64_t t0 = clk.begin();
    const ecs::EntityId id = f.world->create(inits);
    const std::uint64_t t1 = clk.end();
    ticks[i] = t1 - t0;
    okCount += id.index;
  }
  finish(LatOp::Create);

  // Untimed priming restores the world afterwards but leaves the grown storage and created
  // archetypes in place, so the timed add steps below measure steady-state use.
  for (std::uint32_t i = 0; i < samples; ++i) {
    require(f.world->add(f.handles[e.sel.tag[i]], e.s.marked, nullptr), "prime tag add");
  }
  for (std::uint32_t i = 0; i < samples; ++i) {
    require(f.world->remove(f.handles[e.sel.tag[i]], e.s.marked), "prime tag remove");
  }
  for (std::uint32_t i = 0; i < samples; ++i) {
    const std::uint32_t idx = e.sel.ticketless[i];
    const ecs::Ticket tk = ticketFor(idx);
    require(f.world->add(f.handles[idx], e.s.ticket, &tk), "prime ticket add");
  }
  for (std::uint32_t i = 0; i < samples; ++i) {
    require(f.world->remove(f.handles[e.sel.ticketless[i]], e.s.ticket), "prime ticket remove");
  }

  for (std::uint32_t i = 0; i < samples; ++i) {  // add tag
    const ecs::EntityId h = f.handles[e.sel.tag[i]];
    const std::uint64_t t0 = clk.begin();
    const bool ok = f.world->add(h, e.s.marked, nullptr);
    const std::uint64_t t1 = clk.end();
    ticks[i] = t1 - t0;
    require(ok, "latency add tag");
    okCount += ok;
  }
  finish(LatOp::AddTag);

  for (std::uint32_t i = 0; i < samples; ++i) {  // remove tag
    const ecs::EntityId h = f.handles[e.sel.tag[i]];
    const std::uint64_t t0 = clk.begin();
    const bool ok = f.world->remove(h, e.s.marked);
    const std::uint64_t t1 = clk.end();
    ticks[i] = t1 - t0;
    require(ok, "latency remove tag");
    okCount += ok;
  }
  finish(LatOp::RemoveTag);

  for (std::uint32_t i = 0; i < samples; ++i) {  // add runtime-registered component with data
    const std::uint32_t idx = e.sel.ticketless[i];
    const ecs::EntityId h = f.handles[idx];
    const ecs::Ticket tk = ticketFor(idx);
    const std::uint64_t t0 = clk.begin();
    const bool ok = f.world->add(h, e.s.ticket, &tk);
    const std::uint64_t t1 = clk.end();
    ticks[i] = t1 - t0;
    require(ok, "latency add ticket");
    okCount += ok;
  }
  finish(LatOp::AddTicket);

  for (std::uint32_t i = 0; i < samples; ++i) {  // remove runtime-registered component
    const ecs::EntityId h = f.handles[e.sel.ticketless[i]];
    const std::uint64_t t0 = clk.begin();
    const bool ok = f.world->remove(h, e.s.ticket);
    const std::uint64_t t1 = clk.end();
    ticks[i] = t1 - t0;
    require(ok, "latency remove ticket");
    okCount += ok;
  }
  finish(LatOp::RemoveTicket);

  for (std::uint32_t i = 0; i < samples; ++i) {  // destroy
    const ecs::EntityId h = f.handles[e.sel.destroy[i]];
    const std::uint64_t t0 = clk.begin();
    const bool ok = f.world->destroy(h);
    const std::uint64_t t1 = clk.end();
    ticks[i] = t1 - t0;
    require(ok, "latency destroy");
    okCount += ok;
  }
  finish(LatOp::Destroy);

  require(f.world->entityCount() == std::size_t{n}, "latency final live count");
  sink(okCount);
  return out;
}

}  // namespace bench
