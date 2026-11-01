# Pinned protobuf6.33.6 package

Derived from Microsoft vcpkg protobuf6.33.4#2 tree `ed5f5c06952c67498f580082ff1209d051222947`; recipe license is preserved in LICENSE.vcpkg. Upstream protobuf remains BSD-3-Clause, installed through its LICENSE by the port.

The package honestly reports6.33.6 (overlay revision0), pinned to upstream commit `6e1998413a5bca7c058b85999667893f167434bc` and its verified archive SHA512. CMakeLists.txt:93,119–127 derives CMake package33.6.0; runtime marker6033006 and protoc33.6 must match.

Five original packaging patches are retained with13 sequential exact-context matches against this archive (line endings normalized only): static/install header pruning, relocated protoc include discovery, external utf8-range integration, GNU install directories and upb installation exclusions. The clang-cl port_def patch is omitted for the selected Windows/native-MSVC profile. No default/bootstrap/parser/container runtime repair patch is applied, and no sanitizer checks are disabled. Source REF has no mutable HEAD fallback.

Dependencies and host-tool wrappers remain from the named recipe and resolve through the unchanged registry baseline. Selected triplets override the recipe C++17 setting to required C++20 using the supported configure option. Ordinary and ASan runtime/generated/owned/header consumers must be rebuilt together in the named isolated33 roots; never mix the retained failed36 artifacts.
