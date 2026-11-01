include("${CMAKE_CURRENT_LIST_DIR}/x64-windows-cxx20.cmake")
# Sanitizer ABI must match generated/owned consumers; host protoc uses the ordinary triplet.
set(VCPKG_BUILD_TYPE release)
set(VCPKG_C_FLAGS "/fsanitize=address")
set(VCPKG_CXX_FLAGS "/fsanitize=address")
set(VCPKG_LINKER_FLAGS "/INCREMENTAL:NO")
