# ECS storage spike

Disposable measurement code comparing chunked archetype storage with sparse-set storage. Windows, MSVC, CMake 3.25 or newer, no third-party dependencies. Run every command from this directory.

## Build and run tests (Release)

```
cmake -S . -B build/release -G "Visual Studio 18 2026" -A x64
cmake --build build/release --config Release --target ecs_spike_tests
build\release\Release\ecs_spike_tests.exe
```

## Build and run tests (AddressSanitizer)

Run from a Visual Studio developer prompt, or add the MSVC `Hostx64\x64` directory to `PATH` so the ASan runtime DLL is found.

```
cmake -S . -B build/asan -G "Visual Studio 18 2026" -A x64 -DECS_SPIKE_ASAN=ON
cmake --build build/asan --config Release --target ecs_spike_tests
build\asan\Release\ecs_spike_tests.exe
```

## Build and run the benchmark (Release)

```
cmake --build build/release --config Release --target ecs_spike_bench
build\release\Release\ecs_spike_bench.exe
```

Results are written to `results/results-<date>.json` and `results/results-<date>.md`.

Optional filters (output is then named `results-<date>-filtered.*`):

```
build\release\Release\ecs_spike_bench.exe --sizes=100000 --workloads=iterate_2_components_write_1_field_fragmented,memory,latency
```

Workload names: `bulk_create`, `destroy_recreate_churn_50pct`, `iterate_2_components_write_1_field_fresh`, `iterate_2_components_write_1_field_fragmented`, `iterate_3_components_exclude_1_fresh`, `iterate_3_components_exclude_1_fragmented`, `tag_add_remove_10pct_steady_state`, `tag_add_remove_10pct_cold_start`, `random_access_by_handle`, `latency`, `memory`.
