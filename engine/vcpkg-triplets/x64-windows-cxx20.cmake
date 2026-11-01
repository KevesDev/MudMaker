# Same pinned Windows ABI defaults, with one supported configure-option override.
include("${CMAKE_CURRENT_LIST_DIR}/../.deps/vcpkg/triplets/x64-windows.cmake")
list(APPEND VCPKG_CMAKE_CONFIGURE_OPTIONS "-DCMAKE_CXX_STANDARD=20")
