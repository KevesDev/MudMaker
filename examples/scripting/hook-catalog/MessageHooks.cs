// SDK v1 hook cookbook: source-level C# methods for all 2 'message' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.message")]
public sealed class MessageHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("message.receive.before")]
    public HookDecision On_message_receive_before(HookContext ctx, ChannelHookEvent e)
    {
        if (e.Message.Length > 1_024 || e.Message.IndexOf('\0') >= 0)
            return HookDecision.Veto("CHANNEL_PAYLOAD_INVALID");
        return HookDecision.Continue();
    }

    [MudHook("message.send.before")]
    public HookDecision On_message_send_before(HookContext ctx, ChannelHookEvent e)
    {
        if (e.Message.Length > 1_024 || e.Message.IndexOf('\0') >= 0)
            return HookDecision.Veto("CHANNEL_PAYLOAD_INVALID");
        return HookDecision.Continue();
    }
}
