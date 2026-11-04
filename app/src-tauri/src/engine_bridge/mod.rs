mod dto;
pub use dto::*;
use crate::engine_runtime::{self as runtime,EngineOwner,Locator,Lifecycle,PendingRequest,ShutdownMode};
use mudmaker_engine_wire::Policy;
use serde::{Serialize,Deserialize};
use std::sync::{Arc,Mutex};
#[derive(Clone,Debug,PartialEq,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct Failure{pub code:String,pub message:String,#[serde(skip_serializing_if="Option::is_none")]pub outcome:Option<String>,#[serde(skip_serializing_if="Option::is_none")]pub raw_exit:Option<u32>}
impl Failure{pub(crate) fn new(code:&str)->Self{Self{code:code.into(),message:"The engine operation failed.".into(),outcome:None,raw_exit:None}}}
impl From<runtime::Error> for Failure{fn from(e:runtime::Error)->Self{Self{code:e.code.into(),message:"The engine operation failed.".into(),outcome:Some(if e.outcome==runtime::Outcome::Unknown{"unknown"}else{"none"}.into()),raw_exit:e.raw_exit}}}
pub type Result<T>=std::result::Result<T,Failure>;
#[derive(Clone,Debug,PartialEq,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct Status{pub state:String,#[serde(skip_serializing_if="Option::is_none")]pub world_id:Option<String>,#[serde(skip_serializing_if="Option::is_none")]pub failure:Option<Failure>}
fn status(value:runtime::Status)->Status{Status{state:match value.lifecycle{Lifecycle::Starting=>"starting",Lifecycle::Ready=>"ready",Lifecycle::Stopping=>"stopping",Lifecycle::Stopped=>"stopped",Lifecycle::Failed=>"failed"}.into(),world_id:if value.lifecycle==Lifecycle::Ready{value.world_id}else{None},failure:value.failure.map(Into::into)}}
struct State{owner:Option<EngineOwner>,starting:bool,closed:bool,epoch:u64,failure:Option<Failure>}
pub struct Managed{state:Mutex<State>}
pub enum Start{Ready(Status),Launch(Ticket)}
pub struct Ticket{managed:Arc<Managed>,epoch:u64,locator:Locator,previous:Option<EngineOwner>}
pub struct Admitted{pending:PendingRequest,policy:Policy}
impl Admitted{pub fn wait(self)->Result<Response>{dto::response(self.pending.wait().map_err(Failure::from)?,self.policy)}}
impl Default for Managed{fn default()->Self{Self{state:Mutex::new(State{owner:None,starting:false,closed:false,epoch:0,failure:None})}}}
impl Managed{
 pub fn status(&self)->Status{let s=self.state.lock().unwrap_or_else(|e|e.into_inner());if s.closed{return Status{state:"stopped".into(),world_id:None,failure:None};}if s.starting{return Status{state:"starting".into(),world_id:None,failure:None};}if let Some(owner)=&s.owner{return status(owner.status());}Status{state:if s.failure.is_some(){"failed"}else{"stopped"}.into(),world_id:None,failure:s.failure.clone()}}
 pub fn begin(self:&Arc<Self>,locator:Locator)->Result<Start>{let mut s=self.state.try_lock().map_err(|_|Failure::new("busy"))?;if s.closed{return Err(Failure::new("engine_stopped"));}if s.starting{return Err(Failure::new("busy"));}if let Some(owner)=&s.owner{let current=status(owner.status());if current.state=="ready"{return Ok(Start::Ready(current));}}s.epoch=s.epoch.checked_add(1).ok_or_else(||Failure::new("engine_epoch"))?;s.starting=true;s.failure=None;Ok(Start::Launch(Ticket{managed:self.clone(),epoch:s.epoch,locator,previous:s.owner.take()}))}
 pub fn admit(&self,request:RequestDto)->Result<Admitted>{let s=self.state.try_lock().map_err(|_|Failure::new("busy"))?;if s.closed||s.starting{return Err(Failure::new("not_ready"));}let owner=s.owner.as_ref().ok_or_else(||Failure::new("not_ready"))?;let policy=owner.policy();let request=dto::request(request,policy)?;let pending=owner.try_request(request).map_err(Failure::from)?;Ok(Admitted{pending,policy})}
 /// Called only after existing exit guards accept, or at the final Exit fallback.
 pub fn shutdown(&self,mode:ShutdownMode){let owner={let mut s=self.state.lock().unwrap_or_else(|e|e.into_inner());s.closed=true;s.starting=false;s.epoch=s.epoch.saturating_add(1);s.owner.take()};if let Some(mut owner)=owner{let report=owner.shutdown(mode);eprintln!("engine-app-stop kind={:?} raw_exit={:?}",report.kind,report.raw_exit);}}
}
impl Ticket{
 pub fn run(mut self)->Result<Status>{if let Some(mut old)=self.previous.take(){old.shutdown(ShutdownMode::Immediate);}let valid={let s=self.managed.state.lock().unwrap_or_else(|e|e.into_inner());!s.closed&&s.epoch==self.epoch};if !valid{return Err(Failure::new("engine_start_cancelled"));}
  let launched=EngineOwner::launch(self.locator);let mut s=self.managed.state.lock().unwrap_or_else(|e|e.into_inner());if s.closed||s.epoch!=self.epoch{drop(s);if let Ok(mut owner)=launched{owner.shutdown(ShutdownMode::Immediate);}return Err(Failure::new("engine_start_cancelled"));}s.starting=false;match launched{Ok(owner)=>{let native=owner.status();eprintln!("engine-app-ready pid={} world={}",native.child_pid,native.world_id.as_deref().unwrap_or(""));let ready=status(native);s.owner=Some(owner);Ok(ready)},Err(error)=>{let failure=Failure::from(error);s.failure=Some(failure.clone());Err(failure)}}
 }
}
#[cfg(test)]mod tests;
