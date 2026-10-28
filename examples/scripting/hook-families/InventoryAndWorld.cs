#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookFamilies;

[MudScript("examples.inventory-world")]
public sealed class InventoryAndWorld
{
    // Evennia at_pre_drop: this binding is attached to the quest parcel.
    // Native inventory/ownership rules still apply on every drop request.
    [MudHook("item.drop.before")]
    public HookDecision StopDroppingQuestParcel(HookContext ctx, ItemEvent e)
        => e.Item == ctx.Owner
            ? HookDecision.Veto("QUEST_PARCEL_MUST_BE_DELIVERED")
            : HookDecision.Continue();

    // Evennia at_pre_get: host-defined restrictions before pickup.
    [MudHook("item.pickup.before")]
    public HookDecision PickupRule(HookContext ctx, ItemEvent e)
        => e.Item == ctx.Owner &&
           ctx.Actor.NameKey.StartsWith("a", StringComparison.Ordinal)
            ? HookDecision.Continue()
            : HookDecision.Veto("PICKUP_NOT_AVAILABLE");

    // World events are internal engine-owned lifecycle commands; code
    // listens to facts and queues separate follow-up effects, not raw broadcasts.
    [MudHook("world_event.started.after")]
    public HookDecision StormStarted(HookContext ctx, WorldEventLifecycleEvent e)
        => HookDecision.Continue();
}
