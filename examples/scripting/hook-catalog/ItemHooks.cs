// SDK v1 hook cookbook: source-level C# methods for all 8 'item' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.item")]
public sealed class ItemHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("item.use.before")]
    public HookDecision On_item_use_before(HookContext ctx, ItemEvent e)
    {
        if (e.Item != ctx.Owner)
            return HookDecision.Veto("ITEM_BINDING_MISMATCH");
        return HookDecision.Continue();
    }

    [MudHook("item.use.after")]
    public HookDecision On_item_use_after(HookContext ctx, ItemEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "item.use.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:item.use.after"));
    }

    [MudHook("item.pickup.before")]
    public HookDecision On_item_pickup_before(HookContext ctx, ItemEvent e)
    {
        if (e.Item != ctx.Owner)
            return HookDecision.Veto("ITEM_BINDING_MISMATCH");
        return HookDecision.Continue();
    }

    [MudHook("item.pickup.after")]
    public HookDecision On_item_pickup_after(HookContext ctx, ItemEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "item.pickup.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:item.pickup.after"));
    }

    [MudHook("item.transfer.before")]
    public HookDecision On_item_transfer_before(HookContext ctx, ItemEvent e)
    {
        if (e.Item != ctx.Owner)
            return HookDecision.Veto("ITEM_BINDING_MISMATCH");
        return HookDecision.Continue();
    }

    [MudHook("item.transfer.after")]
    public HookDecision On_item_transfer_after(HookContext ctx, ItemEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "item.transfer.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:item.transfer.after"));
    }

    [MudHook("item.drop.before")]
    public HookDecision On_item_drop_before(HookContext ctx, ItemEvent e)
    {
        if (e.Item != ctx.Owner)
            return HookDecision.Veto("ITEM_BINDING_MISMATCH");
        return HookDecision.Continue();
    }

    [MudHook("item.drop.after")]
    public HookDecision On_item_drop_after(HookContext ctx, ItemEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "item.drop.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:item.drop.after"));
    }
}
