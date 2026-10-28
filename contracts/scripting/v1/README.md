# MudMaker local script SDK v1

**Interface definitions, not a running host.** Use `MudMaker.Scripting.Abstractions/Contracts.cs` and `mudmaker_scripting_v1.proto` as normative type/wire definitions. The SDK project and the [examples](../../../examples/scripting/) target `net10.0` and C# 14. The example project includes two host-authored scripts. No script has runtime effect until the ECS/script worker/host is implemented.

After installing .NET SDK 10: `dotnet build examples/scripting/MudMaker.ScriptExamples.csproj` from repository root. To check wire schema after installing the protobuf compiler: `protoc --proto_path=contracts/scripting/v1 --descriptor_set_out=/tmp/mudmaker-v1.pb contracts/scripting/v1/mudmaker_scripting_v1.proto` (use suitable output path on Windows). The build and protocol checks have **not yet been run** in the specification authoring environment, which lacks these executables.

Only **locally authored, host-published** scripts become part of a world's immutable release. Remote players transmit gameplay input, never scripts, bytecode or code updates. Persistent field overrides and scoped state slots are validated through native ECS transactions and do not permit raw database or pointer access.

Agent read order: [scripting v1 INDEX](../../../docs/03-contracts/scripting-v1/INDEX.md). No need to load the entire design archive.
