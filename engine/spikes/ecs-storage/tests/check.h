#pragma once
#include <functional>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace spiketest {

struct CheckFailure : std::runtime_error {
  using std::runtime_error::runtime_error;
};

struct TestEntry {
  std::string name;
  std::function<void()> fn;
};

inline std::vector<TestEntry>& allTests() {
  static std::vector<TestEntry> tests;
  return tests;
}

inline bool addTest(std::string name, std::function<void()> fn) {
  allTests().push_back({std::move(name), std::move(fn)});
  return true;
}

template <class A, class B>
void checkEq(const A& a, const B& b, const char* aText, const char* bText, const char* file, int line) {
  if (!(a == b)) {
    std::ostringstream os;
    os << file << ":" << line << ": expected " << aText << " == " << bText << " but got " << a << " vs " << b;
    throw CheckFailure(os.str());
  }
}

inline void checkTrue(bool ok, const char* text, const char* file, int line) {
  if (!ok) {
    std::ostringstream os;
    os << file << ":" << line << ": check failed: " << text;
    throw CheckFailure(os.str());
  }
}

template <class E, class F>
void checkThrows(F&& f, const char* text, const char* file, int line) {
  try {
    f();
  } catch (const E&) {
    return;
  }
  std::ostringstream os;
  os << file << ":" << line << ": expected exception from " << text;
  throw CheckFailure(os.str());
}

}  // namespace spiketest

#define ECS_CHECK(cond) ::spiketest::checkTrue(static_cast<bool>(cond), #cond, __FILE__, __LINE__)
#define ECS_CHECK_EQ(a, b) ::spiketest::checkEq((a), (b), #a, #b, __FILE__, __LINE__)
#define ECS_CHECK_THROWS(ExType, expr) \
  ::spiketest::checkThrows<ExType>([&] { (void)(expr); }, #expr, __FILE__, __LINE__)

// Registers the templated test body once per storage path.
#define ECS_TEST(NAME)                                                                          \
  template <class W>                                                                            \
  void NAME();                                                                                  \
  static const bool NAME##_registered =                                                         \
      ::spiketest::addTest(#NAME "/archetype", [] { NAME<::ecs::ArchetypeWorld>(); }) &&        \
      ::spiketest::addTest(#NAME "/sparse", [] { NAME<::ecs::SparseWorld>(); });                \
  template <class W>                                                                            \
  void NAME()

#define ECS_PLAIN_TEST(NAME)                                                       \
  static void NAME();                                                              \
  static const bool NAME##_registered = ::spiketest::addTest(#NAME, &NAME);        \
  static void NAME()
