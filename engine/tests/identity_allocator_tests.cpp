#include "mudmaker/ecs/identity.h"
#include "ecs/identity_rules.h"

#include <algorithm>
#include <cstdio>
#include <functional>
#include <stdexcept>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

using namespace mudmaker::ecs;
static_assert(!std::is_copy_constructible_v<WorldAllocator>);
static_assert(!std::is_copy_assignable_v<WorldAllocator>);
static_assert(!std::is_copy_constructible_v<IdentityDomain>);
static_assert(!std::is_copy_assignable_v<IdentityDomain>);
static_assert(!std::is_constructible_v<WorldAllocator, WorldId>);
static_assert(std::is_nothrow_move_constructible_v<WorldAllocator>);

#define CHECK(expression) do { if (!(expression)) throw std::runtime_error(std::string(__FILE__) + ":" + std::to_string(__LINE__) + " " #expression); } while (false)

namespace {
using Bytes = std::array<std::uint8_t, kWorldIdBytes>;
struct Probe {
  std::vector<Bytes> values;
  std::size_t calls = 0;
  bool destroyed = false;
  std::optional<IdentityError> failure;
};
// Replaces only the OS entropy boundary, never the domain or allocator behavior.
class ScriptedEntropy final : public EntropySource {
 public:
  explicit ScriptedEntropy(std::shared_ptr<Probe> probe) : probe_(std::move(probe)) {}
  ~ScriptedEntropy() override { probe_->destroyed = true; }
  std::optional<IdentityError> fill(std::span<std::uint8_t, kWorldIdBytes> bytes) noexcept override {
    const auto call = probe_->calls++;
    if (probe_->failure) return probe_->failure;
    const auto& value = probe_->values[std::min(call, probe_->values.size() - 1)];
    std::copy(value.begin(), value.end(), bytes.begin());
    return std::nullopt;
  }
 private:
  std::shared_ptr<Probe> probe_;
};
Bytes namespace_bytes(std::uint8_t last) { Bytes bytes{}; bytes.back() = last; return bytes; }
std::unique_ptr<EntropySource> entropy(const std::shared_ptr<Probe>& probe) { return std::make_unique<ScriptedEntropy>(probe); }
template <typename T> T take(IdentityResult<T> result) {
  if (const auto failure = std::get_if<IdentityError>(&result)) throw std::runtime_error(std::string(failure->message));
  return std::move(std::get<T>(result));
}
template <typename T> void failed(const IdentityResult<T>& result, IdentityErrorCode code) {
  CHECK(std::holds_alternative<IdentityError>(result));
  CHECK(std::get<IdentityError>(result).code == code);
  CHECK(!std::get<IdentityError>(result).message.empty());
}
void rejected(std::optional<IdentityError> result, IdentityErrorCode code) {
  CHECK(result.has_value()); CHECK(result->code == code); CHECK(!result->message.empty());
}

void system_entropy_creates_live_distinct_worlds() {
  IdentityDomain domain;
  auto first = take(domain.create_world());
  auto second = take(domain.create_world());
  CHECK(first.world_id() != WorldId{});
  CHECK(second.world_id() != WorldId{});
  CHECK(first.world_id() != second.world_id());
  CHECK(!first.validate(take(first.create())));
  CHECK(!second.validate(take(second.create())));
}
void full_128_bit_world_isolation() {
  auto probe = std::make_shared<Probe>();
  probe->values = {namespace_bytes(1), namespace_bytes(2)};
  IdentityDomain domain(entropy(probe));
  auto first = take(domain.create_world());
  auto second = take(domain.create_world());
  const auto a = take(first.create()), b = take(second.create());
  CHECK(a.index == b.index && a.generation == b.generation);
  CHECK(a.world.bytes().front() == b.world.bytes().front());
  CHECK(a.world.bytes().back() != b.world.bytes().back());
  const auto before = second.diagnostics();
  rejected(second.validate(a), IdentityErrorCode::foreign_world);
  rejected(second.release(a), IdentityErrorCode::foreign_world);
  CHECK(second.diagnostics() == before);
  CHECK(!second.validate(b));
}
void lifecycle_reuse_and_rejected_releases_are_atomic() {
  IdentityDomain domain;
  auto world = take(domain.create_world());
  const auto a = take(world.create()), b = take(world.create());
  CHECK(a.index == 0 && a.generation == 0 && b.index == 1);
  auto forged = a; forged.index = kInvalidEntityIndex;
  const auto before = world.diagnostics();
  rejected(world.release(forged), IdentityErrorCode::invalid_index);
  CHECK(world.diagnostics() == before);
  CHECK(!world.release(a));
  auto dead = a; ++dead.generation;
  const auto released = world.diagnostics();
  rejected(world.validate(dead), IdentityErrorCode::dead_entity);
  rejected(world.release(dead), IdentityErrorCode::dead_entity);
  rejected(world.release(a), IdentityErrorCode::stale_generation);
  CHECK(world.diagnostics() == released);
  const auto c = take(world.create());
  CHECK(c.index == a.index && c.generation == a.generation + 1);
  rejected(world.validate(a), IdentityErrorCode::stale_generation);
  CHECK(!world.release(c)); CHECK(!world.release(b));
  CHECK(take(world.create()).index == b.index);  // deterministic LIFO reuse
  const auto d = take(world.create());
  CHECK(d.index == a.index && d.generation == 2);
  CHECK(world.diagnostics() == (IdentityDiagnostics{2, 2, 0, 0}));
}
void generation_retirement_and_capacity_use_production_boundary_decisions() {
  constexpr auto maximum = std::numeric_limits<std::uint32_t>::max();
  CHECK(detail::generation_after_release(0) == 1u);
  CHECK(detail::generation_after_release(maximum - 1) == maximum);
  CHECK(!detail::generation_after_release(maximum));  // actual release retirement decision, no wrap
  CHECK(detail::can_append_slot(0));
  CHECK(detail::can_append_slot(static_cast<std::size_t>(kInvalidEntityIndex) - 1));
  CHECK(!detail::can_append_slot(kInvalidEntityIndex));
}
void entropy_failure_is_structured_and_has_no_fallback() {
  auto probe = std::make_shared<Probe>();
  constexpr std::uint32_t platform_failure = 0xc0000001u;
  probe->failure = IdentityError{IdentityErrorCode::entropy_failure, "Fixture OS entropy failure.", platform_failure};
  IdentityDomain domain(entropy(probe));
  const auto result = domain.create_world();
  failed(result, IdentityErrorCode::entropy_failure);
  CHECK(std::get<IdentityError>(result).platform_code == platform_failure);
  CHECK(probe->calls == 1);
}
void zero_and_retired_namespace_duplicates_are_bounded_and_never_accepted() {
  auto probe = std::make_shared<Probe>();
  probe->values.assign(2 + kNamespaceAttempts, namespace_bytes(1));
  probe->values[0] = {};
  IdentityDomain domain(entropy(probe));
  { auto retired_world = take(domain.create_world()); CHECK(retired_world.world_id().bytes().back() == 1); }
  CHECK(probe->calls == 2);
  failed(domain.create_world(), IdentityErrorCode::namespace_retry_exhausted);
  CHECK(probe->calls == 2 + kNamespaceAttempts);
  probe->values.push_back(namespace_bytes(2));
  CHECK(take(domain.create_world()).world_id().bytes().back() == 2);
  auto zero = std::make_shared<Probe>(); zero->values.push_back({});
  IdentityDomain zero_domain(entropy(zero));
  failed(zero_domain.create_world(), IdentityErrorCode::namespace_retry_exhausted);
  CHECK(zero->calls == kNamespaceAttempts);
}
void moves_preserve_authority_and_allocators_keep_it_alive() {
  auto probe = std::make_shared<Probe>(); probe->values = {namespace_bytes(1), namespace_bytes(1), namespace_bytes(2)};
  std::optional<WorldAllocator> survivor;
  {
    IdentityDomain original(entropy(probe));
    auto world = take(original.create_world());
    const auto handle = take(world.create());
    IdentityDomain moved(std::move(original));
    failed(original.create_world(), IdentityErrorCode::world_unavailable);
    CHECK(take(moved.create_world()).world_id().bytes().back() == 2); // original tombstone retained
    survivor.emplace(std::move(world));
    failed(world.create(), IdentityErrorCode::world_unavailable);
    rejected(world.release(handle), IdentityErrorCode::world_unavailable);
    CHECK(!survivor->validate(handle));
  }
  CHECK(!probe->destroyed);
  CHECK(!survivor->validate(take(survivor->create())));
  survivor.reset();
  CHECK(probe->destroyed);
}
}  // namespace

int main() {
  const std::pair<const char*, void(*)()> tests[] = {
    {"system entropy and live worlds", system_entropy_creates_live_distinct_worlds},
    {"all 128 namespace bits isolate worlds", full_128_bit_world_isolation},
    {"lifecycle, deterministic reuse and failed-release atomicity", lifecycle_reuse_and_rejected_releases_are_atomic},
    {"maximum generation retirement and capacity decisions", generation_retirement_and_capacity_use_production_boundary_decisions},
    {"entropy failure has no fallback", entropy_failure_is_structured_and_has_no_fallback},
    {"zero/duplicate namespace rejection and retired tombstones", zero_and_retired_namespace_duplicates_are_bounded_and_never_accepted},
    {"move and domain lifetime safety", moves_preserve_authority_and_allocators_keep_it_alive},
  };
  int failures = 0;
  for (const auto& [name, run] : tests) {
    try { run(); std::printf("PASS %s\n", name); }
    catch (const std::exception& failure) { ++failures; std::printf("FAIL %s: %s\n", name, failure.what()); }
  }
  std::printf("%zu identity cases, %d failed\n", std::size(tests), failures);
  return failures == 0 ? 0 : 1;
}
