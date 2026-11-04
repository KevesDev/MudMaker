//! One Windows child and typed connection. No native World data is cached here.
mod config;
mod os;
pub use config::{Locator, Paths};
use config::Configuration;
use mudmaker_engine_wire::pb;
use std::{os::windows::io::OwnedHandle,sync::{Arc,Weak,Mutex,Condvar,atomic::{AtomicBool,Ordering}},thread::JoinHandle,time::{Duration,Instant}};
use windows::Win32::{Foundation::{WAIT_OBJECT_0,WAIT_TIMEOUT,ERROR_PROCESS_ABORTED},System::Threading::{GetExitCodeProcess,ResetEvent,TerminateProcess,WaitForMultipleObjects}};
#[derive(Clone,Copy,Debug,PartialEq,Eq)]pub enum Outcome{None,Unknown}
#[derive(Clone,Copy,Debug,PartialEq,Eq)]pub struct Error{pub code:&'static str,pub platform_code:Option<u32>,pub raw_exit:Option<u32>,pub outcome:Outcome}
impl Error{fn new(code:&'static str)->Self{Self{code,platform_code:None,raw_exit:None,outcome:Outcome::None}}}
pub type Result<T>=std::result::Result<T,Error>;
#[derive(Clone,Copy,Debug,PartialEq,Eq)]pub enum Lifecycle{Starting,Ready,Stopping,Stopped,Failed}
#[derive(Clone,Debug,PartialEq,Eq)]pub struct Status{pub lifecycle:Lifecycle,pub child_pid:u32,pub world_id:Option<String>,pub failure:Option<Error>}
#[derive(Clone,Copy,Debug,PartialEq,Eq)]pub enum ShutdownMode{Graceful,Immediate}
#[derive(Clone,Copy,Debug,PartialEq,Eq)]pub enum ShutdownKind{Graceful,Forced,Failed}
#[derive(Clone,Copy,Debug,PartialEq,Eq)]pub struct ShutdownReport{pub kind:ShutdownKind,pub raw_exit:Option<u32>,pub failure:Option<Error>}
/// Headers, credentials, Hello and Shutdown are deliberately not caller-selectable.
pub enum Request{
 Catalog(pb::CatalogRequest),List(pb::ListEntitiesRequest),Create(pb::CreateEntityRequest),Inspect(pb::InspectEntity),Destroy(pb::DestroyEntityRequest),Add(pb::AddComponentRequest),Remove(pb::RemoveComponentRequest),Replace(pb::ReplaceComponentRequest),Field(pb::ReplaceFieldRequest),
}
impl Request{fn body(self)->(pb::envelope::Body,bool,os::Expected){use pb::envelope::Body;use os::Expected;match self{Self::Catalog(v)=>(Body::CatalogRequest(v),false,Expected::Catalog),Self::List(v)=>(Body::ListEntitiesRequest(v),false,Expected::List),Self::Create(v)=>(Body::CreateEntityRequest(v),true,Expected::Create),Self::Inspect(v)=>(Body::InspectEntity(v),false,Expected::Inspect),Self::Destroy(v)=>(Body::DestroyEntityRequest(v),true,Expected::Ack),Self::Add(v)=>(Body::AddComponentRequest(v),true,Expected::Ack),Self::Remove(v)=>(Body::RemoveComponentRequest(v),true,Expected::Ack),Self::Replace(v)=>(Body::ReplaceComponentRequest(v),true,Expected::Ack),Self::Field(v)=>(Body::ReplaceFieldRequest(v),true,Expected::Ack)}}}
struct CompletionState{held:bool,complete:bool,result:Option<Result<pb::envelope::Body>>}
struct Completion{state:Mutex<CompletionState>,changed:Condvar,permit:Arc<AtomicBool>,owner:Weak<Core>}
impl Completion{
 fn finish(&self,result:Result<pb::envelope::Body>){let mut state=self.state.lock().unwrap_or_else(|e|e.into_inner());state.complete=true;state.result=Some(result);if !state.held{self.permit.store(false,Ordering::Release);}self.changed.notify_all();}
 fn release(&self){let mut state=self.state.lock().unwrap_or_else(|e|e.into_inner());state.held=false;if state.complete{self.permit.store(false,Ordering::Release);}}
}
pub struct PendingRequest{completion:Arc<Completion>,deadline:Instant,mutation:bool}
impl PendingRequest{
 /// Future async adapters must wait off the UI thread. This wait itself is bounded.
 pub fn wait(self)->Result<pb::envelope::Body>{
  let mut state=self.completion.state.lock().unwrap_or_else(|e|e.into_inner());
  while !state.complete{let remaining=self.deadline.saturating_duration_since(Instant::now());if remaining.is_zero(){drop(state);let mut error=Error::new("request_wait_timeout");if self.mutation{error.outcome=Outcome::Unknown;}if let Some(core)=self.completion.owner.upgrade(){core.fail(error);os::signal(core.stop.as_ref());}return Err(error);}let waited=self.completion.changed.wait_timeout(state,remaining).unwrap_or_else(|e|e.into_inner());state=waited.0;}
  state.result.take().unwrap_or(Err(Error::new("request_result_missing")))
 }
}
impl Drop for PendingRequest{fn drop(&mut self){self.completion.release();}}
enum Job{Request{request:Request,completion:Arc<Completion>,deadline:Instant},Shutdown}
struct Core{process:Arc<OwnedHandle>,stop:Arc<OwnedHandle>,wake:OwnedHandle,slot:Mutex<Option<Job>>,permit:Arc<AtomicBool>,closing:AtomicBool,status:Mutex<Status>,shutdown:Mutex<Option<ShutdownReport>>}
impl Core{
 fn fail(&self,error:Error){self.closing.store(true,Ordering::Release);let mut state=self.status.lock().unwrap_or_else(|e|e.into_inner());state.lifecycle=Lifecycle::Failed;state.world_id=None;if state.failure.is_none(){state.failure=Some(error);}}
 fn exit_code(&self)->Result<Option<u32>>{let waited=os::wait(self.process.as_ref(),0);if waited==WAIT_TIMEOUT{return Ok(None);}if waited!=WAIT_OBJECT_0{return Err(Error::new("child_wait"));}let mut code=0;unsafe{GetExitCodeProcess(os::handle(self.process.as_ref()),&mut code)}.map_err(|e|Error{platform_code:Some(e.code().0 as u32),..Error::new("child_exit_code")})?;Ok(Some(code))}
 fn child_failure(&self)->Error{Error{raw_exit:self.exit_code().ok().flatten(),..Error::new("child_exit")}}
 fn finish_status(&self,report:ShutdownReport){let mut state=self.status.lock().unwrap_or_else(|e|e.into_inner());if state.lifecycle!=Lifecycle::Failed{state.lifecycle=Lifecycle::Stopped;state.world_id=None;}*self.shutdown.lock().unwrap_or_else(|e|e.into_inner())=Some(report);}
}
pub struct EngineOwner{core:Arc<Core>,worker:Option<JoinHandle<()>>,configuration:Configuration}
impl EngineOwner{
 pub fn launch(locator:Locator)->Result<Self>{Self::launch_paths(locator.resolve()?)}
 fn launch_paths(paths:Paths)->Result<Self>{
  let configuration=Configuration::load(&paths)?;let stop=Arc::new(os::event()?);let(transport,world)=os::Transport::launch(&paths,configuration.clone(),stop.clone())?;
  let core=Arc::new(Core{process:transport.child.process.clone(),stop,wake:os::event()?,slot:Mutex::new(None),permit:Arc::new(AtomicBool::new(false)),closing:AtomicBool::new(false),status:Mutex::new(Status{lifecycle:Lifecycle::Starting,child_pid:transport.child.pid,world_id:None,failure:None}),shutdown:Mutex::new(None)});
  let thread_core=core.clone();let worker=std::thread::Builder::new().name("mudmaker-engine-control".into()).spawn(move||worker(transport,thread_core)).map_err(|_|Error::new("worker_start"))?;
  let mut owner=Self{core,worker:Some(worker),configuration};
  let initial=owner.core.exit_code();
  let failure=match initial{Ok(Some(_))=>Some(owner.core.child_failure()),Err(error)=>Some(error),_=>None};
  if let Some(error)=failure{owner.core.fail(error);owner.shutdown(ShutdownMode::Immediate);return Err(error);}
  {let mut state=owner.core.status.lock().unwrap_or_else(|e|e.into_inner());if state.lifecycle==Lifecycle::Failed||owner.core.closing.load(Ordering::Acquire){let error=state.failure.unwrap_or(Error::new("worker_start"));drop(state);owner.shutdown(ShutdownMode::Immediate);return Err(error);}state.lifecycle=Lifecycle::Ready;state.world_id=Some(world);}
  Ok(owner)
 }

 pub fn policy(&self)->mudmaker_engine_wire::Policy{self.configuration.policy}
 pub fn status(&self)->Status{match self.core.exit_code(){Ok(Some(code))=>{let mut state=self.core.status.lock().unwrap_or_else(|e|e.into_inner());let failed=state.lifecycle==Lifecycle::Ready||state.lifecycle==Lifecycle::Starting;if let Some(error)=state.failure.as_mut(){if error.raw_exit.is_none(){error.raw_exit=Some(code);}}drop(state);if failed{self.core.fail(self.core.child_failure());}},Err(error)=>self.core.fail(error),_=>{}}self.core.status.lock().unwrap_or_else(|e|e.into_inner()).clone()}
 /// The admission limit is exactly one, including a completed but uncollected reply.
 pub fn try_request(&self,request:Request)->Result<PendingRequest>{
  if self.core.closing.load(Ordering::Acquire){return Err(Error::new("not_ready"));}
  if let Some(_)=self.core.exit_code()?{self.core.fail(self.core.child_failure());return Err(Error::new("not_ready"));}
  let state=self.core.status.try_lock().map_err(|_|Error::new("busy"))?;if state.lifecycle!=Lifecycle::Ready{return Err(Error::new("not_ready"));}drop(state);
  self.core.permit.compare_exchange(false,true,Ordering::AcqRel,Ordering::Acquire).map_err(|_|Error::new("busy"))?;
  let mut slot=match self.core.slot.try_lock(){Ok(slot)=>slot,Err(_)=>{self.core.permit.store(false,Ordering::Release);return Err(Error::new("busy"));}};
  if self.core.closing.load(Ordering::Acquire){self.core.permit.store(false,Ordering::Release);return Err(Error::new("not_ready"));}
  let mutation=!matches!(&request,Request::Catalog(_)|Request::List(_)|Request::Inspect(_));let completion=Arc::new(Completion{state:Mutex::new(CompletionState{held:true,complete:false,result:None}),changed:Condvar::new(),permit:self.core.permit.clone(),owner:Arc::downgrade(&self.core)});
  *slot=Some(Job::Request{request,completion:completion.clone(),deadline:Instant::now()+Duration::from_millis(u64::from(self.configuration.runtime.frame_io_timeout_ms))});drop(slot);os::signal(&self.core.wake);
  Ok(PendingRequest{completion,deadline:Instant::now()+self.configuration.completion_budget(),mutation})
 }
 pub fn shutdown(&mut self,mode:ShutdownMode)->ShutdownReport{
  if self.worker.is_none(){return self.core.shutdown.lock().unwrap_or_else(|e|e.into_inner()).unwrap_or(ShutdownReport{kind:ShutdownKind::Failed,raw_exit:None,failure:Some(Error::new("shutdown_state"))});}
  self.core.closing.store(true,Ordering::Release);{let mut state=self.core.status.lock().unwrap_or_else(|e|e.into_inner());if state.lifecycle!=Lifecycle::Failed{state.lifecycle=Lifecycle::Stopping;state.world_id=None;}}
  if mode==ShutdownMode::Graceful&&self.core.permit.compare_exchange(false,true,Ordering::AcqRel,Ordering::Acquire).is_ok(){*self.core.slot.lock().unwrap_or_else(|e|e.into_inner())=Some(Job::Shutdown);os::signal(&self.core.wake);}else{os::signal(self.core.stop.as_ref());}
  if let Some(thread)=self.worker.take(){
   let timeout=self.configuration.completion_budget().as_millis().min(u128::from(u32::MAX-1)) as u32;
   if os::wait(&thread,timeout)!=WAIT_OBJECT_0{os::signal(self.core.stop.as_ref());let _=unsafe{TerminateProcess(os::handle(self.core.process.as_ref()),ERROR_PROCESS_ABORTED.0)};if os::wait(&thread,self.configuration.runtime.process_exit_timeout_ms)!=WAIT_OBJECT_0{std::process::abort();}}
   if thread.join().is_err(){self.core.fail(Error::new("worker_panic"));}
  }
  self.core.shutdown.lock().unwrap_or_else(|e|e.into_inner()).unwrap_or(ShutdownReport{kind:ShutdownKind::Failed,raw_exit:self.core.exit_code().ok().flatten(),failure:Some(Error::new("worker_failed"))})
 }
}
impl Drop for EngineOwner{fn drop(&mut self){if self.worker.is_some(){self.shutdown(ShutdownMode::Immediate);}}}
fn worker(mut transport:os::Transport,core:Arc<Core>){
 let mut graceful=false;
 loop{
  let handles=[os::handle(core.stop.as_ref()),os::handle(&core.wake),os::handle(core.process.as_ref())];let signalled=unsafe{WaitForMultipleObjects(&handles,false,u32::MAX)};
  if signalled==WAIT_OBJECT_0{break;}if signalled.0==WAIT_OBJECT_0.0+2{core.fail(core.child_failure());break;}if signalled.0!=WAIT_OBJECT_0.0+1{core.fail(Error::new("worker_wait"));break;}
  let _=unsafe{ResetEvent(os::handle(&core.wake))};let job=core.slot.lock().unwrap_or_else(|e|e.into_inner()).take();
  match job{
   Some(Job::Request{request,completion,deadline})=>{let(body,mutation,expected)=request.body();let result=transport.exchange(body,mutation,expected,deadline);let fatal=result.as_ref().err().copied().filter(|e|e.code!="request_invalid");if let Some(error)=fatal{if !core.closing.load(Ordering::Acquire){core.fail(error);}}completion.finish(result);if fatal.is_some(){break;}}
   Some(Job::Shutdown)=>{
    let response=transport.exchange(pb::envelope::Body::ShutdownRequest(pb::ShutdownRequest{}),false,os::Expected::Shutdown,Instant::now()+Duration::from_millis(u64::from(transport.config.runtime.frame_io_timeout_ms)));
    if matches!(response,Ok(pb::envelope::Body::ShutdownAck(_)))&&os::wait(transport.child.process.as_ref(),transport.config.runtime.process_exit_timeout_ms)==WAIT_OBJECT_0&&matches!(transport.child.exit_code(),Ok(Some(0))){graceful=true;}break;
   }
   None=>{}
  }
 }
 // Resolve a queued admission on stop before its I/O ever starts.
 if let Some(Job::Request{completion,..})=core.slot.lock().unwrap_or_else(|e|e.into_inner()).take(){completion.finish(Err(Error::new("owner_stopping")));}
 let failure=core.status.lock().unwrap_or_else(|e|e.into_inner()).failure;
 let cleanup=transport.child.terminate();let raw_exit=transport.child.exit_code().ok().flatten();let report=ShutdownReport{kind:if failure.is_some()||cleanup.is_err(){ShutdownKind::Failed}else if graceful{ShutdownKind::Graceful}else{ShutdownKind::Forced},raw_exit,failure:failure.or_else(||cleanup.err())};
 drop(transport);core.finish_status(report);
}
#[cfg(test)]mod tests;
