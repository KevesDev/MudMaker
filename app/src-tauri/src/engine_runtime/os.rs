use super::{config::{Configuration, Paths}, Error, Outcome, Result};
use mudmaker_engine_wire::{self as wire, pb};
use std::{ffi::OsStr, mem::size_of, os::windows::{ffi::OsStrExt, io::{AsRawHandle, FromRawHandle, OwnedHandle}}, sync::Arc, time::{Duration, Instant}};
use windows::{core::{PCWSTR, PWSTR, HRESULT}, Win32::{Foundation::*, Security::{*, Authorization::*, Cryptography::*}, Storage::FileSystem::*, System::{IO::*, Memory::*, Pipes::*, Threading::*}}};
use windows::Win32::System::SystemServices::SE_GROUP_LOGON_ID;
pub(super) fn handle(value:&impl AsRawHandle)->HANDLE{HANDLE(value.as_raw_handle())}
fn platform(code:&'static str,e:windows::core::Error)->Error{Error{code,platform_code:Some(e.code().0 as u32),raw_exit:None,outcome:Outcome::None}}
fn last(code:&'static str)->Error{Error{code,platform_code:Some(unsafe{GetLastError().0}),raw_exit:None,outcome:Outcome::None}}
fn owns(raw:HANDLE)->Result<OwnedHandle>{if raw.is_invalid(){Err(last("handle_create"))}else{Ok(unsafe{OwnedHandle::from_raw_handle(raw.0)})}}
fn wide(text:impl AsRef<OsStr>)->Vec<u16>{text.as_ref().encode_wide().chain(Some(0)).collect()}
pub(super) fn event()->Result<OwnedHandle>{owns(unsafe{CreateEventW(None,true,false,PCWSTR::null())}.map_err(|e|platform("event_create",e))?)}
pub(super) fn signal(value:&OwnedHandle){let _=unsafe{SetEvent(handle(value))};}
pub(super) fn wait(value:&impl AsRawHandle,ms:u32)->WAIT_EVENT{unsafe{WaitForSingleObject(handle(value),ms)}}
fn milliseconds(deadline:Instant)->u32{deadline.saturating_duration_since(Instant::now()).as_millis().min(u128::from(u32::MAX-1)) as u32}
fn pending(error:&windows::core::Error)->bool{error.code()==HRESULT::from_win32(ERROR_IO_PENDING.0)}
pub(super) fn random_id()->Result<String>{let mut bytes=[0u8;16];unsafe{BCryptGenRandom(None,&mut bytes,BCRYPT_USE_SYSTEM_PREFERRED_RNG)}.ok().map_err(|e|platform("entropy",e))?;let value=format!("{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",bytes[0],bytes[1],bytes[2],bytes[3],bytes[4],bytes[5],bytes[6],bytes[7],bytes[8],bytes[9],bytes[10],bytes[11],bytes[12],bytes[13],bytes[14],bytes[15]);wire::parse_guid(&value).map_err(|_|Error::new("entropy_identifier"))?;Ok(value)}
fn wipe(bytes:&mut[u8]){for b in bytes{unsafe{std::ptr::write_volatile(b,0)}}}
struct Secret([u8;32]);impl Drop for Secret{fn drop(&mut self){wipe(&mut self.0);}}
struct Local(HLOCAL);impl Drop for Local{fn drop(&mut self){unsafe{LocalFree(Some(self.0));}}}
struct Bootstrap{_mapping:OwnedHandle,read_only:OwnedHandle,view:MEMORY_MAPPED_VIEW_ADDRESS,secret:Secret}
impl Bootstrap{
 fn create()->Result<Self>{
  let mapping=owns(unsafe{CreateFileMappingW(INVALID_HANDLE_VALUE,None,PAGE_READWRITE,0,32,PCWSTR::null())}.map_err(|e|platform("bootstrap_mapping",e))?)?;
  let view=unsafe{MapViewOfFile(handle(&mapping),FILE_MAP_WRITE,0,0,32)};if view.Value.is_null(){return Err(last("bootstrap_view"));}
  // Own the view immediately so failure in entropy/duplication still erases/unmaps it.
  struct View(MEMORY_MAPPED_VIEW_ADDRESS);impl Drop for View{fn drop(&mut self){unsafe{wipe(std::slice::from_raw_parts_mut(self.0.Value as *mut u8,32));let _=UnmapViewOfFile(self.0);}}}
  let guard=View(view);let mut secret=Secret([0;32]);unsafe{BCryptGenRandom(None,&mut secret.0,BCRYPT_USE_SYSTEM_PREFERRED_RNG)}.ok().map_err(|e|platform("entropy",e))?;unsafe{std::ptr::copy_nonoverlapping(secret.0.as_ptr(),view.Value as *mut u8,32)};
  let mut reduced=HANDLE::default();unsafe{DuplicateHandle(GetCurrentProcess(),handle(&mapping),GetCurrentProcess(),&mut reduced,FILE_MAP_READ.0,true,DUPLICATE_HANDLE_OPTIONS(0))}.map_err(|e|platform("bootstrap_duplicate",e))?;
  let read_only=owns(reduced)?;std::mem::forget(guard);Ok(Self{_mapping:mapping,read_only,view,secret})
 }
}
impl Drop for Bootstrap{fn drop(&mut self){unsafe{wipe(std::slice::from_raw_parts_mut(self.view.Value as *mut u8,32));let _=UnmapViewOfFile(self.view);}}}
fn security()->Result<Local>{
 let mut raw=HANDLE::default();unsafe{OpenProcessToken(GetCurrentProcess(),TOKEN_QUERY,&mut raw)}.map_err(|e|platform("logon_token",e))?;let token=owns(raw)?;let mut length=0;
 let _=unsafe{GetTokenInformation(handle(&token),TokenLogonSid,None,0,&mut length)};if length==0{return Err(last("logon_sid"));}
 let mut storage=vec![0usize;(length as usize+size_of::<usize>()-1)/size_of::<usize>()];unsafe{GetTokenInformation(handle(&token),TokenLogonSid,Some(storage.as_mut_ptr().cast()),length,&mut length)}.map_err(|e|platform("logon_sid",e))?;
 let groups=unsafe{&*storage.as_ptr().cast::<TOKEN_GROUPS>()};if groups.GroupCount!=1||groups.Groups[0].Attributes&(SE_GROUP_LOGON_ID as u32)!=(SE_GROUP_LOGON_ID as u32){return Err(Error::new("logon_sid"));}
 let mut text=PWSTR::null();unsafe{ConvertSidToStringSidW(groups.Groups[0].Sid,&mut text)}.map_err(|e|platform("logon_sid_string",e))?;let _text_guard=Local(HLOCAL(text.0.cast()));let sid=unsafe{text.to_string()}.map_err(|_|Error::new("logon_sid_string"))?;
 let sddl=wide(format!("D:P(A;;GA;;;{sid})"));let mut descriptor=PSECURITY_DESCRIPTOR::default();unsafe{ConvertStringSecurityDescriptorToSecurityDescriptorW(PCWSTR(sddl.as_ptr()),SDDL_REVISION_1,&mut descriptor,None)}.map_err(|e|platform("pipe_security",e))?;Ok(Local(HLOCAL(descriptor.0)))
}
fn drain(pipe:&OwnedHandle,operation:&OVERLAPPED,timeout:u32){
 let _=unsafe{CancelIoEx(handle(pipe),Some(operation))};let _=unsafe{WaitForSingleObject(operation.hEvent,timeout)};let mut transferred=0;
 if let Err(e)=unsafe{GetOverlappedResult(handle(pipe),operation,&mut transferred,false)}{if e.code()==HRESULT::from_win32(ERROR_IO_INCOMPLETE.0){std::process::abort();}}
}
fn finish(pipe:&OwnedHandle,operation:&OVERLAPPED,child:Option<&OwnedHandle>,stop:&OwnedHandle,deadline:Instant,drain_ms:u32)->Result<u32>{
 let handles=[operation.hEvent,handle(stop),child.map(handle).unwrap_or_default()];let count=if child.is_some(){3}else{2};let result=unsafe{WaitForMultipleObjects(&handles[..count],false,milliseconds(deadline))};let mut transferred=0;
 if result==WAIT_OBJECT_0{unsafe{GetOverlappedResult(handle(pipe),operation,&mut transferred,false)}.map_err(|e|platform("io_complete",e))?;return Ok(transferred);}
 drain(pipe,operation,drain_ms);Err(Error::new(if result==WAIT_TIMEOUT{"io_timeout"}else if result.0==WAIT_OBJECT_0.0+1{"owner_stopping"}else if result.0==WAIT_OBJECT_0.0+2{"child_exit"}else{"io_wait"}))
}
struct Listener{pipe:Option<OwnedHandle>,_event:OwnedHandle,operation:Box<OVERLAPPED>,pending:bool,drain_ms:u32}
impl Listener{
 fn new(name:&str,c:&Configuration)->Result<Self>{
  let sd=security()?;let access=SECURITY_ATTRIBUTES{nLength:size_of::<SECURITY_ATTRIBUTES>() as u32,lpSecurityDescriptor:sd.0.0,bInheritHandle:false.into()};let name=wide(name);
  let raw=unsafe{CreateNamedPipeW(PCWSTR(name.as_ptr()),PIPE_ACCESS_DUPLEX|FILE_FLAG_FIRST_PIPE_INSTANCE|FILE_FLAG_OVERLAPPED,PIPE_TYPE_BYTE|PIPE_READMODE_BYTE|PIPE_WAIT|PIPE_REJECT_REMOTE_CLIENTS,1,c.runtime.pipe_buffer_bytes,c.runtime.pipe_buffer_bytes,0,Some(&access))};let pipe=owns(raw)?;let event=event()?;let mut operation=Box::<OVERLAPPED>::default();operation.hEvent=handle(&event);
  let pending=match unsafe{ConnectNamedPipe(handle(&pipe),Some(operation.as_mut()))}{Ok(())=>false,Err(e) if pending(&e)=>true,Err(e) if e.code()==HRESULT::from_win32(ERROR_PIPE_CONNECTED.0)=>false,Err(e)=>return Err(platform("pipe_listen",e))};
  Ok(Self{pipe:Some(pipe),_event:event,operation,pending,drain_ms:c.runtime.cancel_drain_timeout_ms})
 }
 fn connect(mut self,child:&Child,stop:&OwnedHandle,deadline:Instant)->Result<OwnedHandle>{if self.pending{let result=finish(self.pipe.as_ref().unwrap(),&self.operation,Some(child.process.as_ref()),stop,deadline,self.drain_ms);self.pending=false;result?;}let mut pid=0;unsafe{GetNamedPipeClientProcessId(handle(self.pipe.as_ref().unwrap()),&mut pid)}.map_err(|e|platform("pipe_client_pid",e))?;if pid!=child.pid||child.exit_code()?.is_some(){return Err(Error::new("pipe_client_pid"));}Ok(self.pipe.take().unwrap())}
}
impl Drop for Listener{fn drop(&mut self){if self.pending{drain(self.pipe.as_ref().unwrap(),&self.operation,self.drain_ms);}}}
pub(super) struct Child{pub process:Arc<OwnedHandle>,pub pid:u32,exit_ms:u32}
impl Child{
 pub fn exit_code(&self)->Result<Option<u32>>{let waited=wait(self.process.as_ref(),0);if waited==WAIT_TIMEOUT{return Ok(None);}if waited!=WAIT_OBJECT_0{return Err(last("child_wait"));}let mut code=0;unsafe{GetExitCodeProcess(handle(self.process.as_ref()),&mut code)}.map_err(|e|platform("child_exit_code",e))?;Ok(Some(code))}
 pub fn terminate(&self)->Result<()> {if self.exit_code()?.is_none(){unsafe{TerminateProcess(handle(self.process.as_ref()),ERROR_PROCESS_ABORTED.0)}.map_err(|e|platform("child_terminate",e))?;}if wait(self.process.as_ref(),self.exit_ms)!=WAIT_OBJECT_0{return Err(Error::new("child_exit_timeout"));}Ok(())}
}
impl Drop for Child{fn drop(&mut self){if self.terminate().is_err(){std::process::abort();}match self.exit_code(){Ok(Some(code))=>eprintln!("engine-owned-exit pid={} code=0x{code:08x}",self.pid),_=>eprintln!("engine-owned-exit pid={} status-unavailable",self.pid)}}}
fn append_arg(out:&mut Vec<u16>,value:impl AsRef<OsStr>)->Result<()>{let value:Vec<u16>=value.as_ref().encode_wide().collect();if value.contains(&(b'"' as u16)){return Err(Error::new("launch_path"));}out.push(b'"' as u16);out.extend(value);out.extend([b'"' as u16,b' ' as u16]);Ok(())}
fn spawn(paths:&Paths,name:&str,bootstrap:&Bootstrap,c:&Configuration)->Result<Child>{
 let access=SECURITY_ATTRIBUTES{nLength:size_of::<SECURITY_ATTRIBUTES>() as u32,lpSecurityDescriptor:std::ptr::null_mut(),bInheritHandle:true.into()};let nul=wide("NUL");let diagnostic=owns(unsafe{CreateFileW(PCWSTR(nul.as_ptr()),GENERIC_READ.0|GENERIC_WRITE.0,FILE_SHARE_READ|FILE_SHARE_WRITE,Some(&access),OPEN_EXISTING,FILE_ATTRIBUTE_NORMAL,None)}.map_err(|e|platform("diagnostic_handle",e))?)?;
 let inherited=[handle(&bootstrap.read_only),handle(&diagnostic)];let mut bytes=0;let _=unsafe{InitializeProcThreadAttributeList(None,1,None,&mut bytes)};if bytes==0{return Err(last("handle_list_size"));}let mut storage=vec![0usize;(bytes+size_of::<usize>()-1)/size_of::<usize>()];let list=LPPROC_THREAD_ATTRIBUTE_LIST(storage.as_mut_ptr().cast());unsafe{InitializeProcThreadAttributeList(Some(list),1,None,&mut bytes)}.map_err(|e|platform("handle_list",e))?;
 struct Attributes(LPPROC_THREAD_ATTRIBUTE_LIST);impl Drop for Attributes{fn drop(&mut self){unsafe{DeleteProcThreadAttributeList(self.0);}}}let _guard=Attributes(list);
 unsafe{UpdateProcThreadAttribute(list,0,PROC_THREAD_ATTRIBUTE_HANDLE_LIST as usize,Some(inherited.as_ptr().cast()),size_of_val(&inherited),None,None)}.map_err(|e|platform("handle_list",e))?;
 let mut info=STARTUPINFOEXW::default();info.lpAttributeList=list;info.StartupInfo.cb=size_of::<STARTUPINFOEXW>() as u32;info.StartupInfo.dwFlags=STARTF_USESTDHANDLES;info.StartupInfo.hStdInput=handle(&diagnostic);info.StartupInfo.hStdOutput=handle(&diagnostic);info.StartupInfo.hStdError=handle(&diagnostic);
 let mut command=Vec::new();append_arg(&mut command,&paths.executable)?;for(flag,value)in [("--pipe-name",name.to_owned()),("--parent-pid",std::process::id().to_string()),("--bootstrap-handle",(handle(&bootstrap.read_only).0 as usize).to_string())]{append_arg(&mut command,flag)?;append_arg(&mut command,value)?;}append_arg(&mut command,"--wire-policy")?;append_arg(&mut command,&paths.wire)?;append_arg(&mut command,"--runtime-policy")?;append_arg(&mut command,&paths.runtime)?;command.push(0);let exe=wide(&paths.executable);let mut process=PROCESS_INFORMATION::default();
 unsafe{CreateProcessW(PCWSTR(exe.as_ptr()),Some(PWSTR(command.as_mut_ptr())),None,None,true,CREATE_NO_WINDOW|EXTENDED_STARTUPINFO_PRESENT,None,PCWSTR::null(),&info.StartupInfo,&mut process)}.map_err(|e|platform("child_launch",e))?;let process_handle=owns(process.hProcess)?;let _thread=owns(process.hThread)?;Ok(Child{process:Arc::new(process_handle),pid:process.dwProcessId,exit_ms:c.runtime.process_exit_timeout_ms})
}
struct CredentialEnvelope(pb::Envelope);impl Drop for CredentialEnvelope{fn drop(&mut self){if let Some(pb::envelope::Body::Hello(h))=&mut self.0.body{wipe(&mut h.pairing_token);}}}
struct Frame{bytes:Vec<u8>,secret:bool}impl Drop for Frame{fn drop(&mut self){if self.secret{wipe(&mut self.bytes);}}}
pub(super) struct Transport{pipe:OwnedHandle,pub child:Child,pub stop:Arc<OwnedHandle>,pub config:Configuration,connection:String,next:u64}
impl Transport{
 pub fn launch(paths:&Paths,c:Configuration,stop:Arc<OwnedHandle>)->Result<(Self,String)>{
  let name=format!("\\\\.\\pipe\\MudMaker.EngineControl.v1.{}",random_id()?);let listener=Listener::new(&name,&c)?;let bootstrap=Bootstrap::create()?;let child=spawn(paths,&name,&bootstrap,&c)?;let pipe=listener.connect(&child,&stop,Instant::now()+Duration::from_millis(u64::from(c.runtime.connect_timeout_ms)))?;
  let mut value=Self{pipe,child,stop,config:c,connection:random_id()?,next:0};let response=value.exchange(pb::envelope::Body::Hello(pb::Hello{pairing_token:bootstrap.secret.0.to_vec(),min_minor:0,max_minor:0}),false,Expected::Hello,Instant::now()+Duration::from_millis(u64::from(value.config.runtime.hello_timeout_ms)))?;
  let world=match response{pb::envelope::Body::HelloAck(ack)=>ack.world_id,_=>return Err(Error::new("hello_rejected"))};wire::parse_guid(&world).map_err(|_|Error::new("hello_world"))?;if value.child.exit_code()?.is_some(){return Err(Error::new("hello_child_exit"));}Ok((value,world))
 }
 fn transfer(&self,bytes:&mut[u8],writing:bool,deadline:Instant,issued:&mut bool)->Result<u32>{
  if wait(self.stop.as_ref(),0)==WAIT_OBJECT_0{return Err(Error::new("owner_stopping"));}if self.child.exit_code()?.is_some(){return Err(Error::new("child_exit"));}if Instant::now()>=deadline{return Err(Error::new("io_timeout"));}
  let event=event()?;let mut operation=OVERLAPPED::default();operation.hEvent=handle(&event);let mut count=0;
  let result=unsafe{if writing{WriteFile(handle(&self.pipe),Some(bytes),Some(&mut count),Some(&mut operation))}else{ReadFile(handle(&self.pipe),Some(bytes),Some(&mut count),Some(&mut operation))}};
  match result{Ok(())=>{if writing{*issued=true;}},Err(e)if pending(&e)=>{if writing{*issued=true;}count=finish(&self.pipe,&operation,Some(self.child.process.as_ref()),self.stop.as_ref(),deadline,self.config.runtime.cancel_drain_timeout_ms)?;},Err(e)=>return Err(platform(if writing{"pipe_write"}else{"pipe_read"},e))}
  if count==0{return Err(Error::new("pipe_eof"));}Ok(count)
 }
 fn exact(&self,mut bytes:&mut[u8],writing:bool,deadline:Instant,issued:&mut bool)->Result<()>{while !bytes.is_empty(){let n=self.transfer(bytes,writing,deadline,issued)? as usize;bytes=&mut bytes[n..];}Ok(())}
 pub fn exchange(&mut self,body:pb::envelope::Body,mutation:bool,expected:Expected,deadline:Instant)->Result<pb::envelope::Body>{
  self.next=self.next.checked_add(1).ok_or(Error::new("request_id_exhausted"))?;let id=self.next;let secret=matches!(body,pb::envelope::Body::Hello(_));let request=CredentialEnvelope(pb::Envelope{protocol:Some(pb::ProtocolVersion{major:1,minor:0}),request_id:id,connection_id:self.connection.clone(),body:Some(body)});
  let mut frame=Frame{bytes:wire::encode(&request.0,self.config.policy).map_err(|_|Error::new("request_invalid"))?,secret};let mut issued=false;
  let work=(||{self.exact(&mut frame.bytes,true,deadline,&mut issued)?;let mut prefix=[0u8;4];self.exact(&mut prefix,false,deadline,&mut issued)?;let n=wire::frame_length(&prefix,self.config.policy).map_err(|_|Error::new("response_frame"))?;let mut bytes=prefix.to_vec();bytes.resize(n+4,0);self.exact(&mut bytes[4..],false,deadline,&mut issued)?;let response=wire::decode(&bytes,self.config.policy).map_err(|_|Error::new("response_invalid"))?;if response.connection_id!=self.connection||response.request_id!=id{return Err(Error::new("response_correlation"));}let body=response.body.ok_or(Error::new("response_body"))?;if !expected.accepts(&body){return Err(Error::new("response_body"));}Ok(body)})();
  work.map_err(|mut e|{if mutation&&issued{e.outcome=Outcome::Unknown;}e})
 }
}
#[derive(Clone,Copy)]pub(super) enum Expected{Hello,Catalog,List,Create,Inspect,Ack,Shutdown}
impl Expected{fn accepts(self,body:&pb::envelope::Body)->bool{use pb::envelope::Body::*;matches!(body,Error(_))||matches!((self,body),(Self::Hello,HelloAck(_))|(Self::Catalog,CatalogResult(_))|(Self::List,ListEntitiesResult(_))|(Self::Create,CreateEntityResult(_))|(Self::Inspect,EntityInspection(_))|(Self::Ack,MutationAck(_))|(Self::Shutdown,ShutdownAck(_)))}}
