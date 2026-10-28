// SDK v1 hook cookbook: source-level C# methods for all 14 'channel' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.channel")]
public sealed class ChannelHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("channel.recipient.before")]
    public HookDecision On_channel_recipient_before(HookContext ctx, ChannelHookEvent e)
    {
        if (e.Message.Length > 1_024 || e.Message.IndexOf('\0') >= 0)
            return HookDecision.Veto("CHANNEL_PAYLOAD_INVALID");
        return HookDecision.Continue();
    }

    [MudHook("channel.recipient.after")]
    public HookDecision On_channel_recipient_after(HookContext ctx, ChannelHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "channel.recipient.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:channel.recipient.after"));
    }

    [MudHook("channel.created.after")]
    public HookDecision On_channel_created_after(HookContext ctx, ChannelHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "channel.created.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:channel.created.after"));
    }

    [MudHook("channel.prefix.query")]
    public HookQueryResult On_channel_prefix_query(HookContext ctx, QueryHookEvent e)
    {
        if (e.Key.StartsWith("restricted.", StringComparison.Ordinal))
            return HookQueryResult.Deny("OPTION_NOT_AVAILABLE");
        return HookQueryResult.Keep();
    }

    [MudHook("channel.message.before")]
    public HookDecision On_channel_message_before(HookContext ctx, ChannelHookEvent e)
    {
        if (e.Message.Length > 1_024 || e.Message.IndexOf('\0') >= 0)
            return HookDecision.Veto("CHANNEL_PAYLOAD_INVALID");
        return HookDecision.Continue();
    }

    [MudHook("channel.message.after")]
    public HookDecision On_channel_message_after(HookContext ctx, ChannelHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "channel.message.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:channel.message.after"));
    }

    [MudHook("channel.member.join.before")]
    public HookDecision On_channel_member_join_before(HookContext ctx, ChannelHookEvent e)
    {
        if (e.Message.Length > 1_024 || e.Message.IndexOf('\0') >= 0)
            return HookDecision.Veto("CHANNEL_PAYLOAD_INVALID");
        return HookDecision.Continue();
    }

    [MudHook("channel.member.join.after")]
    public HookDecision On_channel_member_join_after(HookContext ctx, ChannelHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "channel.member.join.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:channel.member.join.after"));
    }

    [MudHook("channel.member.leave.before")]
    public HookDecision On_channel_member_leave_before(HookContext ctx, ChannelHookEvent e)
    {
        if (e.Message.Length > 1_024 || e.Message.IndexOf('\0') >= 0)
            return HookDecision.Veto("CHANNEL_PAYLOAD_INVALID");
        return HookDecision.Continue();
    }

    [MudHook("channel.member.leave.after")]
    public HookDecision On_channel_member_leave_after(HookContext ctx, ChannelHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "channel.member.leave.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:channel.member.leave.after"));
    }

    [MudHook("channel.hydrated.after")]
    public HookDecision On_channel_hydrated_after(HookContext ctx, ChannelHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "channel.hydrated.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:channel.hydrated.after"));
    }

    [MudHook("channel.senders.format.query")]
    public HookQueryResult On_channel_senders_format_query(HookContext ctx, ChannelHookEvent e)
    {
        return HookQueryResult.ReplaceText("[In-world channel] " + e.Message);
    }

    [MudHook("channel.external.format.query")]
    public HookQueryResult On_channel_external_format_query(HookContext ctx, ChannelHookEvent e)
    {
        return HookQueryResult.ReplaceText("[In-world channel] " + e.Message);
    }

    [MudHook("channel.message.format.query")]
    public HookQueryResult On_channel_message_format_query(HookContext ctx, ChannelHookEvent e)
    {
        return HookQueryResult.ReplaceText("[In-world channel] " + e.Message);
    }
}
