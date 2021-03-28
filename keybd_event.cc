#include <v8.h>
#include <napi.h>
#include <windows.h>
using namespace std;
using namespace v8;
Napi::Value do_keybd_event(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	uint32_t bVk = info[0].As<Napi::Number>().Int32Value();
	uint32_t bScan = info[1].As<Napi::Number>().Int32Value();
	uint32_t dwFlags = info[2].As<Napi::Number>().Int32Value();
	uint32_t dwExtraInfo = info[3].As<Napi::Number>().Int32Value();
	keybd_event(bVk, bScan, dwFlags, dwExtraInfo);;
	return Napi::Number::New(env,0);
}
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "keybd_event"),Napi::Function::New(env, do_keybd_event));
  exports.Set(Napi::String::New(env, "KEYEVENTF_KEYUP"),Napi::Number::New(env, KEYEVENTF_KEYUP));
  
  return exports;
}

NODE_API_MODULE(addon, Init)