#pragma once
#include <windows.h>

#include <algorithm>
#include <cstddef>
#include <set>
#include <string>
#include <vector>

namespace bench {

// Pins the calling thread to one logical processor of the most performant core class and raises
// priorities. Returns a description of what was applied, or why it could not be.
inline std::string pinToPerformanceCoreAndRaisePriority() {
  struct Cpu {
    unsigned logical, core, efficiencyClass, group;
  };
  ULONG len = 0;
  GetSystemCpuSetInformation(nullptr, 0, &len, GetCurrentProcess(), 0);
  if (len == 0) return "not pinned: GetSystemCpuSetInformation reported no data (error " + std::to_string(GetLastError()) + ")";
  std::vector<std::byte> buf(len);
  if (!GetSystemCpuSetInformation(reinterpret_cast<PSYSTEM_CPU_SET_INFORMATION>(buf.data()), len, &len,
                                  GetCurrentProcess(), 0)) {
    return "not pinned: GetSystemCpuSetInformation failed (error " + std::to_string(GetLastError()) + ")";
  }
  std::vector<Cpu> cpus;
  for (ULONG off = 0; off < len;) {
    const auto* e = reinterpret_cast<const SYSTEM_CPU_SET_INFORMATION*>(buf.data() + off);
    if (e->Type == CpuSetInformation) {
      cpus.push_back({e->CpuSet.LogicalProcessorIndex, e->CpuSet.CoreIndex, e->CpuSet.EfficiencyClass, e->CpuSet.Group});
    }
    off += e->Size;
  }
  unsigned maxClass = 0, minClass = ~0u;
  for (const Cpu& c : cpus) {
    maxClass = std::max(maxClass, c.efficiencyClass);
    minClass = std::min(minClass, c.efficiencyClass);
  }
  std::vector<Cpu> best;
  for (const Cpu& c : cpus) {
    if (c.efficiencyClass == maxClass && c.group == 0 && c.logical < 64) best.push_back(c);
  }
  if (best.empty()) return "not pinned: no processor in group 0 with the top efficiency class";
  std::sort(best.begin(), best.end(), [](const Cpu& a, const Cpu& b) { return a.logical < b.logical; });
  // Take the first logical processor of the second core when there is one, leaving core 0 to the OS.
  const unsigned firstCore = best.front().core;
  Cpu chosen = best.front();
  for (const Cpu& c : best) {
    if (c.core != firstCore) {
      chosen = c;
      break;
    }
  }
  std::string text;
  if (SetThreadAffinityMask(GetCurrentThread(), DWORD_PTR{1} << chosen.logical) == 0) {
    return "not pinned: SetThreadAffinityMask failed (error " + std::to_string(GetLastError()) + ")";
  }
  text = "thread pinned to logical processor " + std::to_string(chosen.logical) + " (core " + std::to_string(chosen.core) +
         ", efficiency class " + std::to_string(chosen.efficiencyClass) + (maxClass != minClass ? " of a hybrid CPU, top class" : ", CPU reports a single class") +
         ")";
  text += SetPriorityClass(GetCurrentProcess(), HIGH_PRIORITY_CLASS) ? "; process priority HIGH"
                                                                      : "; process priority NOT raised (error " + std::to_string(GetLastError()) + ")";
  text += SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_HIGHEST) ? ", thread priority HIGHEST"
                                                                          : ", thread priority NOT raised (error " + std::to_string(GetLastError()) + ")";
  return text;
}

}  // namespace bench
