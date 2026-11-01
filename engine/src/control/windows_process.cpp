#include "mudmaker/control/windows_process.h"
#include <algorithm>
#include <cstdio>
#include <filesystem>
#include <limits>
#include <map>
namespace mudmaker::control::windows {
[[noreturn]] void fail(const char*phase,DWORD code){throw Fault(phase,code);}
Deadline Deadline::after(std::uint32_t ms)noexcept{return {GetTickCount64()+ms};}
Deadline Deadline::idle()noexcept{return {std::numeric_limits<ULONGLONG>::max()};}
DWORD Deadline::remaining()const noexcept{if(end==std::numeric_limits<ULONGLONG>::max())return INFINITE;auto now=GetTickCount64();return now>=end?0:static_cast<DWORD>(std::min<ULONGLONG>(end-now,INFINITE-1u));}
DWORD finish_io(HANDLE pipe,HANDLE peer,OVERLAPPED& operation,Deadline deadline,std::uint32_t drain_ms){
 HANDLE waits[]={operation.hEvent,peer};auto outcome=WaitForMultipleObjects(peer?2u:1u,waits,FALSE,deadline.remaining());DWORD count=0;
 if(outcome==WAIT_OBJECT_0){if(!GetOverlappedResult(pipe,&operation,&count,FALSE))fail("io.complete");return count;}
 const DWORD failure=outcome==WAIT_TIMEOUT?ERROR_TIMEOUT:outcome==WAIT_OBJECT_0+1?ERROR_PROCESS_ABORTED:GetLastError();
 // Cancellation alone does not end kernel access to operation/event/buffer. Drain even if CancelIoEx lost the completion race.
 CancelIoEx(pipe,&operation);auto drained=WaitForSingleObject(operation.hEvent,drain_ms);DWORD completion=ERROR_IO_INCOMPLETE;
 if(drained==WAIT_OBJECT_0){if(GetOverlappedResult(pipe,&operation,&count,FALSE))completion=ERROR_SUCCESS;else completion=GetLastError();}
 if(completion==ERROR_IO_INCOMPLETE){TerminateProcess(GetCurrentProcess(),ERROR_IO_INCOMPLETE);std::terminate();}
 fail(outcome==WAIT_OBJECT_0+1?"io.parent_exit":"io.deadline",failure);
}
namespace {
DWORD transfer(HANDLE pipe,HANDLE peer,void*buffer,DWORD length,bool writing,Deadline deadline,std::uint32_t drain){
 if(peer&&WaitForSingleObject(peer,0)!=WAIT_TIMEOUT)fail("io.parent_exit",ERROR_PROCESS_ABORTED);
 if(!deadline.remaining())fail("io.deadline",ERROR_TIMEOUT);
 Handle event(CreateEventW(nullptr,TRUE,FALSE,nullptr));if(!event)fail("io.event");OVERLAPPED operation{};operation.hEvent=event.get();DWORD count=0;
 const BOOL immediate=writing?WriteFile(pipe,buffer,length,&count,&operation):ReadFile(pipe,buffer,length,&count,&operation);
 if(!immediate){if(GetLastError()!=ERROR_IO_PENDING)fail(writing?"io.write":"io.read");count=finish_io(pipe,peer,operation,deadline,drain);}
 if(!count)fail("io.eof",ERROR_BROKEN_PIPE);return count;
}
std::uintptr_t decimal(std::wstring_view text){if(text.empty())fail("cli.number",ERROR_INVALID_PARAMETER);std::uintptr_t n=0;for(wchar_t c:text){if(c<L'0'||c>L'9'||n>(std::numeric_limits<std::uintptr_t>::max()-static_cast<unsigned>(c-L'0'))/10u)fail("cli.number",ERROR_INVALID_PARAMETER);n=n*10u+static_cast<unsigned>(c-L'0');}if(!n)fail("cli.number",ERROR_INVALID_PARAMETER);return n;}
bool local_path(std::wstring_view path){return path.size()>3&&((path[0]>=L'A'&&path[0]<=L'Z')||(path[0]>=L'a'&&path[0]<=L'z'))&&path[1]==L':'&&(path[2]==L'\\'||path[2]==L'/');}
struct Options{std::wstring pipe,wire,runtime;DWORD parent;std::uintptr_t bootstrap;};
Options options(int argc,wchar_t**argv){
 if(argc!=11)fail("cli.arguments",ERROR_INVALID_PARAMETER);std::map<std::wstring,std::wstring,std::less<>> values;
 for(int i=1;i<argc;i+=2){std::wstring key=argv[i];if(key!=L"--pipe-name"&&key!=L"--parent-pid"&&key!=L"--bootstrap-handle"&&key!=L"--wire-policy"&&key!=L"--runtime-policy")fail("cli.flag",ERROR_INVALID_PARAMETER);if(!values.emplace(key,argv[i+1]).second)fail("cli.duplicate",ERROR_INVALID_PARAMETER);}
 Options out{values.at(L"--pipe-name"),values.at(L"--wire-policy"),values.at(L"--runtime-policy"),0,decimal(values.at(L"--bootstrap-handle"))};
 const auto parent=decimal(values.at(L"--parent-pid"));if(parent>std::numeric_limits<DWORD>::max()||out.bootstrap==std::numeric_limits<std::uintptr_t>::max())fail("cli.number",ERROR_INVALID_PARAMETER);out.parent=static_cast<DWORD>(parent);
 constexpr std::wstring_view prefix=L"\\\\.\\pipe\\MudMaker.EngineControl.v1.";
 if(!out.pipe.starts_with(prefix)||out.pipe.size()!=prefix.size()+36||!local_path(out.wire)||!local_path(out.runtime))fail("cli.path",ERROR_INVALID_PARAMETER);
 std::string suffix;for(auto c:std::wstring_view(out.pipe).substr(prefix.size())){if(c>127)fail("cli.pipe",ERROR_INVALID_PARAMETER);suffix.push_back(static_cast<char>(c));}if(std::holds_alternative<wire::Error>(wire::parse_guid(suffix)))fail("cli.pipe",ERROR_INVALID_PARAMETER);return out;
}
struct TokenGuard{PairingToken value{};~TokenGuard(){SecureZeroMemory(value.data(),value.size());}};
}
void read_exact(HANDLE pipe,HANDLE peer,std::span<std::uint8_t> bytes,Deadline deadline,std::uint32_t drain){while(!bytes.empty()){auto count=transfer(pipe,peer,bytes.data(),static_cast<DWORD>(std::min<std::size_t>(bytes.size(),std::numeric_limits<DWORD>::max())),false,deadline,drain);bytes=bytes.subspan(count);}}
void write_exact(HANDLE pipe,HANDLE peer,std::span<const std::uint8_t> bytes,Deadline deadline,std::uint32_t drain){while(!bytes.empty()){auto count=transfer(pipe,peer,const_cast<std::uint8_t*>(bytes.data()),static_cast<DWORD>(std::min<std::size_t>(bytes.size(),std::numeric_limits<DWORD>::max())),true,deadline,drain);bytes=bytes.subspan(count);}}
std::vector<std::uint8_t> read_frame(HANDLE pipe,HANDLE peer,const Configuration& config,bool ready,Deadline hello){
 std::array<std::uint8_t,4> prefix{};const auto drain=config.runtime.cancel_drain_timeout_ms();read_exact(pipe,peer,std::span(prefix).first(1),ready?Deadline::idle():hello,drain);
 auto deadline=Deadline::after(config.runtime.frame_io_timeout_ms());if(!ready)deadline.end=std::min(deadline.end,hello.end);read_exact(pipe,peer,std::span(prefix).subspan(1),deadline,drain);
 auto length=wire::frame_length(prefix,config.wire);if(std::holds_alternative<wire::Error>(length))fail("frame.prefix",ERROR_INVALID_DATA);const auto size=std::get<std::uint32_t>(length);
 std::vector<std::uint8_t> frame(prefix.begin(),prefix.end());frame.resize(prefix.size()+size);read_exact(pipe,peer,std::span(frame).subspan(prefix.size()),deadline,drain);return frame;
}
int run(int argc,wchar_t**argv)noexcept{
 bool committed=false;
 try{
  const auto args=options(argc,argv);Handle parent(OpenProcess(SYNCHRONIZE|PROCESS_QUERY_LIMITED_INFORMATION,FALSE,args.parent));if(!parent||GetProcessId(parent.get())!=args.parent||WaitForSingleObject(parent.get(),0)!=WAIT_TIMEOUT)fail("parent.open",ERROR_PROCESS_ABORTED);
  auto loaded=load_configuration(std::filesystem::path(args.wire).string(),std::filesystem::path(args.runtime).string());if(std::holds_alternative<StartupError>(loaded))fail("configuration",ERROR_INVALID_DATA);auto config=std::get<Configuration>(std::move(loaded));
  TokenGuard token;{auto supplied=reinterpret_cast<HANDLE>(args.bootstrap);DWORD flags=0;if(!GetHandleInformation(supplied,&flags))fail("bootstrap.handle");Handle bootstrap(supplied);auto view=MapViewOfFile(bootstrap.get(),FILE_MAP_READ,0,0,kPairingTokenBytes);if(!view)fail("bootstrap.map");std::copy_n(static_cast<const std::uint8_t*>(view),token.value.size(),token.value.begin());UnmapViewOfFile(view);}
  Handle pipe(CreateFileW(args.pipe.c_str(),FILE_READ_DATA|FILE_WRITE_DATA|FILE_READ_ATTRIBUTES|SYNCHRONIZE,0,nullptr,OPEN_EXISTING,FILE_FLAG_OVERLAPPED,nullptr));if(!pipe)fail("pipe.open");ULONG server=0;if(!GetNamedPipeServerProcessId(pipe.get(),&server)||server!=args.parent)fail("pipe.parent",ERROR_ACCESS_DENIED);
  auto hello=Deadline::after(config.runtime.hello_timeout_ms());auto made=ControlSession::create(config,token.value);SecureZeroMemory(token.value.data(),token.value.size());if(std::holds_alternative<StartupError>(made))fail("bootstrap.world",ERROR_INVALID_DATA);auto session=std::move(std::get<std::unique_ptr<ControlSession>>(made));
  for(;;){auto frame=read_frame(pipe.get(),parent.get(),config,session->ready(),hello);const bool was_ready=session->ready();auto reply=session->receive(frame);committed=reply.outcome==MutationOutcome::Committed||reply.outcome==MutationOutcome::Unknown;
   if(reply.outcome==MutationOutcome::Unknown)fail("session.outcome",ERROR_WRITE_FAULT);
   if(!reply.frame.empty())write_exact(pipe.get(),parent.get(),reply.frame,Deadline::after(config.runtime.frame_io_timeout_ms()),config.runtime.cancel_drain_timeout_ms());committed=false;
   if(!was_ready&&!session->ready())fail("session.pairing",ERROR_ACCESS_DENIED);
   if(reply.closing){auto decoded=wire::decode(reply.frame,config.wire);if(auto envelope=std::get_if<wire::pb::Envelope>(&decoded);envelope&&envelope->has_shutdown_ack())return 0;fail("session.closed",ERROR_INVALID_DATA);}
  }
 }catch(const Fault& e){std::fprintf(stderr,"engine-control phase=%s code=%lu outcome=%s\n",e.phase,e.code,committed?"unknown":"none");}
 catch(const std::exception&){std::fprintf(stderr,"engine-control phase=internal code=%lu outcome=%s\n",static_cast<unsigned long>(ERROR_INVALID_DATA),committed?"unknown":"none");}
 return 1;
}
} // namespace mudmaker::control::windows
