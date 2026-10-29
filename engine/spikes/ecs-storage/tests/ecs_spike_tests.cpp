#include <algorithm>
#include <array>
#include <cstdio>
#include <cstring>
#include <map>

#include "check.h"
#include "ecs/archetype_world.h"
#include "ecs/sparse_world.h"
#include "ecs/standard.h"

using namespace ecs;

namespace {

struct Spec {
  bool p = false, v = false, h = false, frozen = false, marked = false, t = false;
};

// Component values are pure functions of `val`, so tests recompute expectations independently.
Position expectPos(std::uint32_t val) { return {val, val + 1, val + 2}; }
Velocity expectVel(std::uint32_t val) { return {2 * val, 0, 7}; }
Health expectHealth(std::uint32_t val) { return {1000 + val}; }
Ticket expectTicket(std::uint64_t val) { return {val, val ^ 0xFFFFull, 77}; }

template <class W>
EntityId spawn(W& w, const Standard& s, Spec spec, std::uint32_t val) {
  const Position p = expectPos(val);
  const Velocity v = expectVel(val);
  const Health h = expectHealth(val);
  const Ticket t = expectTicket(val);
  std::array<ComponentInit, 6> inits{};
  std::size_t n = 0;
  if (spec.p) inits[n++] = {s.position, &p};
  if (spec.v) inits[n++] = {s.velocity, &v};
  if (spec.h) inits[n++] = {s.health, &h};
  if (spec.frozen) inits[n++] = {s.frozen, nullptr};
  if (spec.marked) inits[n++] = {s.marked, nullptr};
  if (spec.t) inits[n++] = {s.ticket, &t};
  return w.create(std::span<const ComponentInit>(inits.data(), n));
}

template <class T, class W>
T read(W& w, EntityId id, ComponentId c) {
  const void* p = w.get(id, c);
  ECS_CHECK(p != nullptr);
  T out;
  std::memcpy(&out, p, sizeof(T));
  return out;
}

bool samePos(const Position& a, const Position& b) { return a.x == b.x && a.y == b.y && a.z == b.z; }
bool sameVel(const Velocity& a, const Velocity& b) { return a.x == b.x && a.y == b.y && a.z == b.z; }
bool sameTicket(const Ticket& a, const Ticket& b) { return a.a == b.a && a.b == b.b && a.c == b.c; }

template <class W>
std::vector<EntityId> runQuery(W& w, std::vector<ComponentId> req, std::vector<ComponentId> ex) {
  std::vector<EntityId> out;
  w.query(req, ex, [&](EntityId id, void* const*) { out.push_back(id); });
  std::sort(out.begin(), out.end(), [](EntityId a, EntityId b) { return a.index < b.index; });
  return out;
}

std::vector<EntityId> sorted(std::vector<EntityId> v) {
  std::sort(v.begin(), v.end(), [](EntityId a, EntityId b) { return a.index < b.index; });
  return v;
}

}  // namespace

ECS_TEST(stale_handle_after_destroy_is_rejected_and_slot_reuse_gives_generation_1) {
  Standard s;
  W w(1, s.reg);
  const EntityId a = spawn(w, s, {.p = true}, 5);
  ECS_CHECK_EQ(a.world, 1u);
  ECS_CHECK_EQ(a.index, 0u);
  ECS_CHECK_EQ(a.generation, 0u);
  ECS_CHECK(w.alive(a));
  ECS_CHECK(w.destroy(a));
  ECS_CHECK(!w.alive(a));
  ECS_CHECK(w.get(a, s.position) == nullptr);
  ECS_CHECK(!w.has(a, s.position));
  ECS_CHECK(!w.destroy(a));
  ECS_CHECK(!w.add(a, s.marked, nullptr));
  ECS_CHECK(!w.remove(a, s.position));
  const EntityId b = spawn(w, s, {.p = true}, 6);
  ECS_CHECK_EQ(b.index, 0u);
  ECS_CHECK_EQ(b.generation, 1u);
  ECS_CHECK(!w.alive(a));
  ECS_CHECK(w.get(a, s.position) == nullptr);
  ECS_CHECK(w.alive(b));
  ECS_CHECK(samePos(read<Position>(w, b, s.position), expectPos(6)));
  ECS_CHECK_EQ(w.entityCount(), 1u);
}

ECS_TEST(handle_from_world_1_is_rejected_by_world_2_with_same_index_0_and_generation_0) {
  Standard s;
  W w1(1, s.reg);
  W w2(2, s.reg);
  const EntityId h1 = spawn(w1, s, {.p = true}, 111);
  const EntityId h2 = spawn(w2, s, {.p = true}, 222);
  ECS_CHECK_EQ(h1.index, h2.index);
  ECS_CHECK_EQ(h1.generation, h2.generation);
  ECS_CHECK_EQ(h1.world, 1u);
  ECS_CHECK_EQ(h2.world, 2u);
  ECS_CHECK(!w2.alive(h1));
  ECS_CHECK(w2.get(h1, s.position) == nullptr);
  ECS_CHECK(!w2.has(h1, s.position));
  ECS_CHECK(!w2.destroy(h1));
  ECS_CHECK(!w2.add(h1, s.marked, nullptr));
  ECS_CHECK(!w2.remove(h1, s.position));
  ECS_CHECK(!w1.alive(h2));
  ECS_CHECK(w2.alive(h2));
  ECS_CHECK_EQ(read<Position>(w2, h2, s.position).x, 222u);
  ECS_CHECK_EQ(read<Position>(w1, h1, s.position).x, 111u);
  ECS_CHECK(w1.destroy(h1));
  ECS_CHECK(w2.alive(h2));
}

ECS_TEST(slot_at_generation_uint32_max_is_retired_and_never_reused) {
  Standard s;
  W w(1, s.reg);
  const EntityId first = spawn(w, s, {.p = true}, 1);
  ECS_CHECK(w.destroy(first));
  w.entityTable().forceFreeSlotGeneration(0, UINT32_MAX - 1);

  const EntityId nearMax = spawn(w, s, {.p = true}, 2);
  ECS_CHECK_EQ(nearMax.index, 0u);
  ECS_CHECK_EQ(nearMax.generation, UINT32_MAX - 1);
  ECS_CHECK(w.destroy(nearMax));
  ECS_CHECK_EQ(w.entityTable().retiredCount(), 0u);  // incrementing to UINT32_MAX is still safe

  const EntityId last = spawn(w, s, {.p = true}, 3);
  ECS_CHECK_EQ(last.index, 0u);
  ECS_CHECK_EQ(last.generation, UINT32_MAX);
  ECS_CHECK(w.alive(last));
  ECS_CHECK(w.destroy(last));
  ECS_CHECK_EQ(w.entityTable().retiredCount(), 1u);
  ECS_CHECK_EQ(w.entityTable().freeCount(), 0u);
  ECS_CHECK(!w.alive(last));

  const EntityId n1 = spawn(w, s, {.p = true}, 4);
  const EntityId n2 = spawn(w, s, {.p = true}, 5);
  ECS_CHECK_EQ(n1.index, 1u);
  ECS_CHECK_EQ(n2.index, 2u);
  ECS_CHECK_EQ(n1.generation, 0u);
  ECS_CHECK_EQ(w.entityTable().generationOf(0), UINT32_MAX);  // retired, not wrapped to 0
  ECS_CHECK(!w.alive(last));
  ECS_CHECK_EQ(w.entityTable().retiredCount(), 1u);
  ECS_CHECK_EQ(w.entityTable().slotCount(), 3u);
}

ECS_TEST(add_and_remove_component_moves_entity_and_preserves_all_data_across_chunks) {
  Standard s;
  W w(1, s.reg);
  constexpr std::uint32_t kCount = 2000;  // more than one 16 KiB chunk for every archetype
  std::vector<EntityId> ids;
  for (std::uint32_t i = 0; i < kCount; ++i) ids.push_back(spawn(w, s, {.p = true, .v = true, .t = true}, i));

  for (std::uint32_t i = 0; i < kCount; ++i) {
    if (i % 3 == 0) {
      const Health h = expectHealth(i);
      ECS_CHECK(w.add(ids[i], s.health, &h));
    }
    if (i % 7 == 0) ECS_CHECK(w.remove(ids[i], s.velocity));
    if (i % 5 == 0) ECS_CHECK(w.add(ids[i], s.marked, nullptr));
  }
  for (std::uint32_t i = 0; i < kCount; ++i) {
    ECS_CHECK(w.alive(ids[i]));
    ECS_CHECK(samePos(read<Position>(w, ids[i], s.position), expectPos(i)));
    ECS_CHECK(sameTicket(read<Ticket>(w, ids[i], s.ticket), expectTicket(i)));
    ECS_CHECK_EQ(w.has(ids[i], s.velocity), i % 7 != 0);
    if (i % 7 != 0) ECS_CHECK(sameVel(read<Velocity>(w, ids[i], s.velocity), expectVel(i)));
    ECS_CHECK_EQ(w.has(ids[i], s.health), i % 3 == 0);
    if (i % 3 == 0) ECS_CHECK_EQ(read<Health>(w, ids[i], s.health).value, 1000 + i);
    ECS_CHECK_EQ(w.has(ids[i], s.marked), i % 5 == 0);
  }
}

ECS_TEST(add_duplicate_and_remove_missing_return_false_and_leave_data_unchanged) {
  Standard s;
  W w(1, s.reg);
  const EntityId e = spawn(w, s, {.p = true, .v = true}, 9);
  const Position other{500, 501, 502};
  ECS_CHECK(!w.add(e, s.position, &other));
  ECS_CHECK(!w.remove(e, s.health));
  ECS_CHECK(samePos(read<Position>(w, e, s.position), expectPos(9)));
  ECS_CHECK(w.get(e, s.health) == nullptr);
  ECS_CHECK_THROWS(std::invalid_argument, w.has(e, 99));
}

ECS_TEST(destroy_keeps_every_other_entity_data_intact_when_rows_are_swapped) {
  Standard s;
  W w(1, s.reg);
  constexpr std::uint32_t kCount = 1500;
  std::vector<EntityId> ids;
  for (std::uint32_t i = 0; i < kCount; ++i) ids.push_back(spawn(w, s, {.p = true, .v = true, .h = true}, i));
  for (std::uint32_t i = 0; i < kCount; i += 4) ECS_CHECK(w.destroy(ids[i]));
  ECS_CHECK_EQ(w.entityCount(), kCount - (kCount + 3) / 4);
  for (std::uint32_t i = 0; i < kCount; ++i) {
    ECS_CHECK_EQ(w.alive(ids[i]), i % 4 != 0);
    if (i % 4 != 0) {
      ECS_CHECK(samePos(read<Position>(w, ids[i], s.position), expectPos(i)));
      ECS_CHECK(sameVel(read<Velocity>(w, ids[i], s.velocity), expectVel(i)));
      ECS_CHECK_EQ(read<Health>(w, ids[i], s.health).value, 1000 + i);
    }
  }
}

ECS_TEST(query_returns_exactly_the_required_and_not_the_excluded_entities_on_a_hand_checked_set) {
  Standard s;
  W w(1, s.reg);
  const EntityId e0 = spawn(w, s, {.p = true, .v = true}, 0);
  const EntityId e1 = spawn(w, s, {.p = true, .v = true, .frozen = true}, 1);
  const EntityId e2 = spawn(w, s, {.p = true, .v = true, .h = true}, 2);
  const EntityId e3 = spawn(w, s, {.p = true}, 3);
  const EntityId e4 = spawn(w, s, {.v = true, .h = true}, 4);
  const EntityId e5 = spawn(w, s, {.p = true, .v = true, .h = true, .frozen = true}, 5);
  const EntityId e6 = spawn(w, s, {.p = true, .v = true, .marked = true}, 6);
  spawn(w, s, {}, 7);

  ECS_CHECK(runQuery(w, {s.position, s.velocity}, {}) == sorted({e0, e1, e2, e5, e6}));
  ECS_CHECK(runQuery(w, {s.position, s.velocity}, {s.frozen}) == sorted({e0, e2, e6}));
  ECS_CHECK(runQuery(w, {s.position, s.velocity, s.health}, {s.frozen}) == sorted({e2}));
  ECS_CHECK(runQuery(w, {s.health}, {}) == sorted({e2, e4, e5}));
  ECS_CHECK(runQuery(w, {s.frozen}, {}) == sorted({e1, e5}));
  ECS_CHECK(runQuery(w, {s.position}, {s.velocity}) == sorted({e3}));

  ECS_CHECK(w.add(e2, s.marked, nullptr));
  ECS_CHECK(w.remove(e1, s.frozen));
  ECS_CHECK(w.destroy(e0));
  ECS_CHECK(runQuery(w, {s.position, s.velocity}, {s.frozen, s.marked}) == sorted({e1}));
  ECS_CHECK(runQuery(w, {s.marked}, {}) == sorted({e2, e6}));
}

ECS_TEST(query_rejects_empty_required_and_overlapping_required_and_excluded) {
  Standard s;
  W w(1, s.reg);
  spawn(w, s, {.p = true}, 0);
  ECS_CHECK_THROWS(std::invalid_argument, runQuery(w, {}, {s.frozen}));
  ECS_CHECK_THROWS(std::invalid_argument, runQuery(w, {s.position}, {s.position}));
  ECS_CHECK_THROWS(std::invalid_argument, runQuery(w, {s.position, s.position}, {}));
  ECS_CHECK_THROWS(std::invalid_argument, runQuery(w, {77}, {}));
}

ECS_TEST(query_matches_brute_force_over_600_entities_after_random_mutations) {
  Standard s;
  W w(1, s.reg);
  constexpr std::uint32_t kCount = 600;
  struct Row {
    EntityId id;
    bool p, v, h, frozen, marked, t, dead;
  };
  std::vector<Row> rows;
  std::uint64_t state = 12345;
  auto next = [&state] {
    state = state * 6364136223846793005ull + 1442695040888963407ull;
    return static_cast<std::uint32_t>(state >> 33);
  };
  for (std::uint32_t i = 0; i < kCount; ++i) {
    const std::uint32_t r = next();
    Row row{{}, (r & 1) != 0, (r & 2) != 0, (r & 4) != 0, (r & 8) != 0, (r & 16) != 0, (r & 32) != 0, false};
    row.id = spawn(w, s, {row.p, row.v, row.h, row.frozen, row.marked, row.t}, i);
    rows.push_back(row);
  }
  for (std::uint32_t i = 0; i < kCount; ++i) {
    const std::uint32_t r = next() % 6;
    Row& row = rows[i];
    if (r == 0 && !row.marked) {
      ECS_CHECK(w.add(row.id, s.marked, nullptr));
      row.marked = true;
    } else if (r == 1 && row.frozen) {
      ECS_CHECK(w.remove(row.id, s.frozen));
      row.frozen = false;
    } else if (r == 2) {
      ECS_CHECK(w.destroy(row.id));
      row.dead = true;
    } else if (r == 3 && row.p) {
      ECS_CHECK(w.remove(row.id, s.position));
      row.p = false;
    }
  }
  struct Q {
    std::vector<ComponentId> req, ex;
  };
  const std::vector<Q> queries = {{{s.position, s.velocity}, {}},
                                  {{s.position, s.velocity, s.health}, {s.frozen}},
                                  {{s.velocity}, {s.marked, s.frozen}},
                                  {{s.ticket, s.health}, {s.position}},
                                  {{s.frozen}, {}}};
  for (const Q& q : queries) {
    std::vector<EntityId> expected;
    for (const Row& row : rows) {
      if (row.dead) continue;
      auto has = [&](ComponentId c) {
        return (c == s.position && row.p) || (c == s.velocity && row.v) || (c == s.health && row.h) ||
               (c == s.frozen && row.frozen) || (c == s.marked && row.marked) || (c == s.ticket && row.t);
      };
      bool ok = true;
      for (ComponentId c : q.req) ok = ok && has(c);
      for (ComponentId c : q.ex) ok = ok && !has(c);
      if (ok) expected.push_back(row.id);
    }
    ECS_CHECK(runQuery(w, q.req, q.ex) == sorted(expected));
  }
}

ECS_TEST(runtime_registered_components_round_trip_their_bytes_with_declared_alignment) {
  ComponentRegistry reg;
  const ComponentId pos = reg.registerComponent("mud.position", sizeof(Position), alignof(Position));
  const ComponentId blob = reg.registerComponent("creator.blob", 48, 16);
  const ComponentId odd = reg.registerComponent("creator.odd", 40, 8);
  reg.freeze();
  W w(1, reg);

  std::array<std::uint8_t, 48> blobBytes{};
  std::array<std::uint8_t, 40> oddBytes{};
  for (std::size_t i = 0; i < blobBytes.size(); ++i) blobBytes[i] = static_cast<std::uint8_t>(i * 7 + 3);
  for (std::size_t i = 0; i < oddBytes.size(); ++i) oddBytes[i] = static_cast<std::uint8_t>(255 - i);
  const std::array<ComponentInit, 2> inits{{{blob, blobBytes.data()}, {odd, oddBytes.data()}}};
  const EntityId e = w.create(inits);
  const EntityId filler = w.create(inits);  // second row so a later move swaps rows

  auto verify = [&] {
    const void* b = w.get(e, blob);
    const void* o = w.get(e, odd);
    ECS_CHECK(b != nullptr && o != nullptr);
    ECS_CHECK_EQ(reinterpret_cast<std::uintptr_t>(b) % 16, 0u);
    ECS_CHECK_EQ(reinterpret_cast<std::uintptr_t>(o) % 8, 0u);
    ECS_CHECK_EQ(std::memcmp(b, blobBytes.data(), 48), 0);
    ECS_CHECK_EQ(std::memcmp(o, oddBytes.data(), 40), 0);
  };
  verify();
  const Position p{1, 2, 3};
  ECS_CHECK(w.add(e, pos, &p));
  verify();
  ECS_CHECK(w.remove(e, pos));
  verify();
  ECS_CHECK_EQ(std::memcmp(w.get(filler, blob), blobBytes.data(), 48), 0);

  // Writes made through a query pointer are visible through get.
  w.query(std::array<ComponentId, 1>{blob}, std::span<const ComponentId>{}, [&](EntityId id, void* const* ptrs) {
    if (id == e) static_cast<std::uint8_t*>(ptrs[0])[47] = 0xEE;
  });
  ECS_CHECK_EQ(static_cast<const std::uint8_t*>(w.get(e, blob))[47], 0xEE);
  ECS_CHECK_EQ(static_cast<const std::uint8_t*>(w.get(filler, blob))[47], blobBytes[47]);
}

ECS_PLAIN_TEST(registry_rejects_invalid_layouts_and_late_registration) {
  ComponentRegistry reg;
  ECS_CHECK_THROWS(std::invalid_argument, reg.registerComponent("a", 12, 3));
  ECS_CHECK_THROWS(std::invalid_argument, reg.registerComponent("a", 10, 4));
  ECS_CHECK_THROWS(std::invalid_argument, reg.registerComponent("a", 0, 4));
  ECS_CHECK_THROWS(std::invalid_argument, reg.registerComponent("a", 128, 128));
  ECS_CHECK_THROWS(std::invalid_argument, reg.registerComponent("", 4, 4));
  ECS_CHECK_THROWS(std::invalid_argument, reg.registerComponent("a", kMaxComponentSize + 8, 8));
  ECS_CHECK_EQ(reg.registerComponent("a", 4, 4), 0u);
  ECS_CHECK_THROWS(std::invalid_argument, reg.registerComponent("a", 4, 4));
  ECS_CHECK_THROWS(std::logic_error, ArchetypeWorld(1, reg));
  ECS_CHECK_THROWS(std::logic_error, SparseWorld(1, reg));
  for (std::uint32_t i = 1; i < kMaxComponentTypes; ++i) reg.registerComponent("c" + std::to_string(i), 4, 4);
  ECS_CHECK_THROWS(std::length_error, reg.registerComponent("one_too_many", 4, 4));
  reg.freeze();
  ECS_CHECK_THROWS(std::logic_error, reg.registerComponent("late", 4, 4));
}

ECS_PLAIN_TEST(runtime_layout_from_fields_matches_c_struct_rules_size_12_align_4) {
  const std::array<FieldSpec, 3> fields{{{1, 1}, {4, 4}, {2, 2}}};
  const ComponentDesc d = layoutFromFields("x", fields);
  ECS_CHECK_EQ(d.size, 12u);
  ECS_CHECK_EQ(d.align, 4u);
  const std::array<FieldSpec, 3> wide{{{8, 8}, {8, 8}, {8, 8}}};
  const ComponentDesc t = layoutFromFields("ticket", wide);
  ECS_CHECK_EQ(t.size, 24u);
  ECS_CHECK_EQ(t.align, 8u);
}

ECS_TEST(create_rejects_duplicate_and_unknown_component_ids_without_creating_an_entity) {
  Standard s;
  W w(1, s.reg);
  const Position p{1, 2, 3};
  const std::array<ComponentInit, 2> dup{{{s.position, &p}, {s.position, &p}}};
  const std::array<ComponentInit, 1> unknown{{{99, nullptr}}};
  ECS_CHECK_THROWS(std::invalid_argument, w.create(dup));
  ECS_CHECK_THROWS(std::invalid_argument, w.create(unknown));
  ECS_CHECK_EQ(w.entityCount(), 0u);
  ECS_CHECK_EQ(w.entityTable().slotCount(), 0u);
}

int main() {
  int passed = 0, failed = 0;
  for (const auto& t : spiketest::allTests()) {
    try {
      t.fn();
      ++passed;
      std::printf("PASS %s\n", t.name.c_str());
    } catch (const std::exception& e) {
      ++failed;
      std::printf("FAIL %s\n  %s\n", t.name.c_str(), e.what());
    }
  }
  std::printf("%d passed, %d failed, %zu total\n", passed, failed, spiketest::allTests().size());
  return failed == 0 ? 0 : 1;
}
