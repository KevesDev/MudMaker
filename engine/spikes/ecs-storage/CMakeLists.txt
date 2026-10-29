cmake_minimum_required(VERSION 3.25)
project(ecs_storage_spike LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreadedDLL")
set(CMAKE_CXX_FLAGS_RELEASE "/O2 /Ob2 /DNDEBUG")

option(ECS_SPIKE_ASAN "Build the tests with AddressSanitizer" OFF)

set(ECS_SPIKE_WARN /W4 /WX /permissive-)
set(ECS_SPIKE_DEFS NOMINMAX WIN32_LEAN_AND_MEAN _CRT_SECURE_NO_WARNINGS)

add_library(ecs_spike_core INTERFACE)
target_include_directories(ecs_spike_core INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_compile_features(ecs_spike_core INTERFACE cxx_std_20)

add_executable(ecs_spike_tests tests/ecs_spike_tests.cpp)
target_link_libraries(ecs_spike_tests PRIVATE ecs_spike_core)
target_compile_options(ecs_spike_tests PRIVATE ${ECS_SPIKE_WARN})
target_compile_definitions(ecs_spike_tests PRIVATE ${ECS_SPIKE_DEFS})

if(ECS_SPIKE_ASAN)
  target_compile_options(ecs_spike_tests PRIVATE /fsanitize=address /Zi)
  target_link_options(ecs_spike_tests PRIVATE /INCREMENTAL:NO /DEBUG)
else()
  # The text recorded in the results is assembled from the same variables that configure the
  # compiler: the standard, the base and Release flag strings, the runtime library selection, the
  # warning options and the definitions. The Visual Studio generator also defines _MBCS for the
  # default character set.
  if(NOT CMAKE_MSVC_RUNTIME_LIBRARY STREQUAL "MultiThreadedDLL")
    message(FATAL_ERROR "Flag recording only maps the MultiThreadedDLL runtime")
  endif()
  set(ECS_SPIKE_FLAG_LIST /std:c++20 ${CMAKE_CXX_FLAGS} ${CMAKE_CXX_FLAGS_RELEASE} /MD ${ECS_SPIKE_WARN})
  if(CMAKE_GENERATOR MATCHES "^Visual Studio")
    list(APPEND ECS_SPIKE_FLAG_LIST /D_MBCS)
  endif()
  foreach(def IN LISTS ECS_SPIKE_DEFS)
    list(APPEND ECS_SPIKE_FLAG_LIST /D${def})
  endforeach()
  string(REPLACE ";" " " ECS_SPIKE_FLAG_TEXT "${ECS_SPIKE_FLAG_LIST}")

  add_executable(ecs_spike_bench bench/bench_main.cpp bench/alloc_counter.cpp)
  target_link_libraries(ecs_spike_bench PRIVATE ecs_spike_core)
  target_compile_options(ecs_spike_bench PRIVATE ${ECS_SPIKE_WARN})
  target_compile_definitions(ecs_spike_bench PRIVATE ${ECS_SPIKE_DEFS}
    "ECS_SPIKE_SOURCE_DIR=\"${CMAKE_CURRENT_SOURCE_DIR}\""
    "ECS_SPIKE_FLAGS=\"${ECS_SPIKE_FLAG_TEXT}\"")
endif()
