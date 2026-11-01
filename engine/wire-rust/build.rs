use std::{env, path::PathBuf, process::Command};
fn main() {
    let engine = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap()).parent().unwrap().to_path_buf();
    let protoc = engine.join(".deps/vcpkg_installed_33_release/x64-windows-cxx20/tools/protobuf/protoc.exe");
    if let Some(configured) = env::var_os("PROTOC") {
        assert_eq!(PathBuf::from(configured).canonicalize().expect("configured protoc"), protoc.canonicalize().expect("pinned protoc"), "PROTOC conflicts with the pinned manifest compiler");
    }
    let version = Command::new(&protoc).arg("--version").output().expect("prepare/build pinned protoc first");
    assert!(version.status.success() && String::from_utf8(version.stdout).unwrap().trim() == "libprotoc 33.6", "protoc33.6 required");
    let contracts = engine.parent().unwrap().join("contracts");
    let mut config = prost_build::Config::new();
    config.protoc_executable(&protoc);
    config.compile_protos(&[contracts.join("engine/v1/mudmaker_engine_v1.proto")], &[&contracts]).expect("generate pinned bindings");
    println!("cargo:rerun-if-changed={}", contracts.join("engine/v1/mudmaker_engine_v1.proto").display());
    println!("cargo:rerun-if-changed={}", contracts.join("scripting/v1/mudmaker_scripting_v1.proto").display());
    println!("cargo:rerun-if-changed={}", contracts.join("engine/v1/protocol-policy.json").display());
}
