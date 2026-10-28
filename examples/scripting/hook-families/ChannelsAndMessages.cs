#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookFamilies;

[MudScript("examples.channels")]
public sealed class ChannelsAndMessages
{
    // Evennia at_pre_msg: server-authorized channel text is checked before
    // it enters the persistent message log and observer projection.
    [MudHook("channel.message.before")]
    public HookDecision ModerateMessage(HookContext ctx, ChannelHookEvent e)
    {
        if (e.Message.Length > 500)
            return HookDecision.Veto("CHANNEL_MESSAGE_TOO_LONG");
        if (e.Message.Contains("\u0000", StringComparison.Ordinal))
            return HookDecision.Veto("CHANNEL_MESSAGE_INVALID");
        return HookDecision.Continue();
    }

    // Evennia format_message: **presentation only**. Engine always
    // escapes/encodes resulting text per client transport.
    [MudHook("channel.message.format.query")]
    public HookQueryResult FormatMessage(HookContext ctx, ChannelHookEvent e)
        => HookQueryResult.ReplaceText("[Regional] " + e.Message);

    // Evennia pre_join_channel: a channel owner may impose game-specific
    // participation rules; engine authentication and memberships remain mandatory.
    [MudHook("channel.member.join.before")]
    public HookDecision RequireCharacterToJoin(HookContext ctx, ChannelHookEvent e)
        => e.Sender == ctx.Actor.Ref
            ? HookDecision.Continue()
            : HookDecision.Veto("CHANNEL_SENDER_MISMATCH");
}
