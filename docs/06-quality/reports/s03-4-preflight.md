# S03.4 preflight checkpoint — not implementation evidence

Builder performed source/dependency preflight only; no edits, builds or tests. S03.1–3 independently passed and pushed; current native World library is real, app integration is not ready.

- Rust `engine_status` only checks for a nearby mudmaker-engine.exe. No engine supervisor, spawn/stop, handshake or typed engine-control IPC exists. windowShell owns window chrome; STARTUP_REQUIRES_ENGINE is false until the real path ships.
- ADR-005 requires a separate engine process and approved Protobuf/local framed IPC. Existing scripting.v1 messages are worker protocol, not inspector commands. Lead must define control envelope/handshake, frame limits, local access, deadlines, shutdown and bootstrap schemas/bindings/config before implementation.
- Existing MSVC19.51/CMake builds native core/tests. protoc26.1 is installed; no configured C++ protobuf runtime/vcpkg manifest, VCPKG_ROOT unset. Cargo locks Tauri2.12.5/serde1.0.229/serde_json1.0.154; no prost/protobuf codec locked. Runtime/codec pinning is a genuine prerequisite, not verified yet.
- Native World already provides bounded live IDs, owned entity/component/schema inspection, lifecycle/component mutations and stable-FieldId replacement. One owner thread must execute all live calls; thin shell must not duplicate world state.
- Planned small slices: (a) actual engine process/codecs and one Rust bridge/lifetime owner, (b) compact registered inspector bound to that actual API. Independent scoped audit per slice; precise commands assigned only after contract/dependencies are resolved. No alternate JSON transport, fake native state or future remote-hosting/auth/persistence expansion.
- Readiness must become actual successful protocol/world initialization and blocking startup once shipped, not file existence. Notify owner with exact steps at the first real app milestone.
- S02.10a/b/c remains a binding before-S03-close requirement; theme IO alone is deferred to S18.17. All agents finished; no S03.4 code started.
