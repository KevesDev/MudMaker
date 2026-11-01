#pragma once
#include "mudmaker/control/session.h"
#include <Windows.h>
#include <exception>
namespace mudmaker::control::windows {
class Handle final {
 HANDLE value_=nullptr;
 public:
 Handle()noexcept=default;explicit Handle(HANDLE value)noexcept:value_(value){}~Handle(){reset();}
 Handle(const Handle&)=delete;Handle&operator=(const Handle&)=delete;
 Handle(Handle&& other)noexcept:value_(other.release()){}Handle&operator=(Handle&& other)noexcept{if(this!=&other)reset(other.release());return *this;}
 HANDLE get()const noexcept{return value_;}explicit operator bool()const noexcept{return value_&&value_!=INVALID_HANDLE_VALUE;}
 HANDLE release()noexcept{auto value=value_;value_=nullptr;return value;}void reset(HANDLE value=nullptr)noexcept{if(*this)CloseHandle(value_);value_=value;}
};
struct Fault final:std::exception {const char* phase;DWORD code;Fault(const char*p,DWORD c):phase(p),code(c){}const char*what()const noexcept override{return phase;}};
[[noreturn]] void fail(const char* phase,DWORD code=GetLastError());
struct Deadline {ULONGLONG end;static Deadline after(std::uint32_t ms)noexcept;static Deadline idle()noexcept;DWORD remaining()const noexcept;};
DWORD finish_io(HANDLE pipe,HANDLE peer,OVERLAPPED& operation,Deadline deadline,std::uint32_t drain_ms);
void read_exact(HANDLE pipe,HANDLE peer,std::span<std::uint8_t> bytes,Deadline deadline,std::uint32_t drain_ms);
void write_exact(HANDLE pipe,HANDLE peer,std::span<const std::uint8_t> bytes,Deadline deadline,std::uint32_t drain_ms);
std::vector<std::uint8_t> read_frame(HANDLE pipe,HANDLE peer,const Configuration& configuration,bool ready,Deadline hello);
int run(int argc,wchar_t**argv)noexcept;
} // namespace mudmaker::control::windows
