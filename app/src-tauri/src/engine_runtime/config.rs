use super::{Error, Result};
use mudmaker_engine_wire::Policy;
use serde::Deserialize;
use std::{fs::File, io::Read, path::{Component, Path, PathBuf, Prefix}, time::Duration};
pub const CONFIGURATION_BYTES: usize = 16384;
#[derive(Clone, Debug)]
pub enum Locator { Development, Resources(PathBuf) }
#[derive(Clone, Debug)]
pub struct Paths { pub(super) executable: PathBuf, pub(super) wire: PathBuf, pub(super) runtime: PathBuf }
impl Locator {
    pub fn resolve(&self) -> Result<Paths> {
        let paths = match self {
            Self::Development => {
                let repo = Path::new(env!("CARGO_MANIFEST_DIR")).parent().and_then(Path::parent).ok_or(Error::new("development_locator"))?;
                Paths { executable: repo.join("engine/build/s03-wire-33-release/Release/mudmaker-engine.exe"), wire: repo.join("contracts/engine/v1/protocol-policy.json"), runtime: repo.join("contracts/engine/v1/runtime-policy.json") }
            }
            Self::Resources(root) => Paths { executable: root.join("engine/mudmaker-engine.exe"), wire: root.join("engine/v1/protocol-policy.json"), runtime: root.join("engine/v1/runtime-policy.json") },
        };
        paths.validate()?; Ok(paths)
    }
}
fn local_drive(path: &Path) -> bool {
    let mut parts=path.components();
    matches!(parts.next(),Some(Component::Prefix(p)) if matches!(p.kind(),Prefix::Disk(_))) && matches!(parts.next(),Some(Component::RootDir)) && parts.all(|p|matches!(p,Component::Normal(_)))
}
impl Paths {
    pub(super) fn validate(&self)->Result<()> {
        if [&self.executable,&self.wire,&self.runtime].iter().any(|p| !local_drive(p)||!p.is_file()) { return Err(Error::new("engine_files_missing_or_nonlocal")); } Ok(())
    }
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Runtime {
    pub schema_nodes: u32, pub schema_name_bytes: u32, pub chunk_target_bytes: u64, pub page_limit: u32,
    pub minimum_control_frame_bytes: u32, pub error_text_bytes: u32, pub error_path_bytes: u32,
    pub connect_timeout_ms: u32, pub hello_timeout_ms: u32, pub frame_io_timeout_ms: u32,
    pub cancel_drain_timeout_ms: u32, pub process_exit_timeout_ms: u32, pub pipe_buffer_bytes: u32,
}
#[derive(Clone,Debug)]
pub(super) struct Configuration {pub policy: Policy,pub runtime: Runtime}
fn bounded(path:&Path)->Result<Vec<u8>> {
    let mut bytes=Vec::new();File::open(path).map_err(|_|Error::new("configuration_read"))?.take(CONFIGURATION_BYTES as u64+1).read_to_end(&mut bytes).map_err(|_|Error::new("configuration_read"))?;
    if bytes.len()>CONFIGURATION_BYTES{return Err(Error::new("configuration_too_large"));}Ok(bytes)
}
impl Configuration {
 pub fn load(paths:&Paths)->Result<Self>{
    paths.validate()?;
    let bytes=bounded(&paths.wire)?;let policy=Policy::from_json(std::str::from_utf8(&bytes).map_err(|_|Error::new("wire_configuration"))?).map_err(|_|Error::new("wire_configuration"))?;
    let runtime:Runtime=serde_json::from_slice(&bounded(&paths.runtime)?).map_err(|_|Error::new("runtime_configuration"))?;
    let r=&runtime;
    let waits=[r.connect_timeout_ms,r.hello_timeout_ms,r.frame_io_timeout_ms,r.cancel_drain_timeout_ms,r.process_exit_timeout_ms];
    if waits.iter().any(|v|*v==0||*v==u32::MAX)||r.schema_nodes==0||r.schema_name_bytes==0||r.chunk_target_bytes==0||r.chunk_target_bytes>isize::MAX as u64||r.page_limit==0||r.page_limit as usize>policy.value_nodes||r.minimum_control_frame_bytes==0||r.minimum_control_frame_bytes as usize>policy.frame_bytes||r.error_text_bytes==0||r.error_path_bytes==0||r.error_text_bytes as usize>policy.text_bytes||r.error_path_bytes as usize>policy.text_bytes||u64::from(r.error_text_bytes)+u64::from(r.error_path_bytes)>u64::from(r.minimum_control_frame_bytes)||r.pipe_buffer_bytes==0||r.pipe_buffer_bytes as usize>policy.frame_bytes {return Err(Error::new("runtime_configuration"));}
    Ok(Self{policy,runtime})
 }
 pub fn completion_budget(&self)->Duration{Duration::from_millis(u64::from(self.runtime.frame_io_timeout_ms)+u64::from(self.runtime.cancel_drain_timeout_ms)+u64::from(self.runtime.process_exit_timeout_ms))}
}
