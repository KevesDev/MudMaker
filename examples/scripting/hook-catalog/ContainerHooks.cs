// SDK v1 hook cookbook: source-level C# methods for all 4 'container' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.container")]
public sealed class ContainerHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("container.leave.before")]
    public HookDecision On_container_leave_before(HookContext ctx, MovementHookEvent e)
    {
        if (e.Mover != ctx.Actor.Ref || e.Destination is null)
            return HookDecision.Veto("MOVE_TARGET_INVALID");
        return HookDecision.Continue();
    }

    [MudHook("container.receive.before")]
    public HookDecision On_container_receive_before(HookContext ctx, MovementHookEvent e)
    {
        if (e.Mover != ctx.Actor.Ref || e.Destination is null)
            return HookDecision.Veto("MOVE_TARGET_INVALID");
        return HookDecision.Continue();
    }

    [MudHook("container.leave.after")]
    public HookDecision On_container_leave_after(HookContext ctx, MovementHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "container.leave.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:container.leave.after"));
    }

    [MudHook("container.receive.after")]
    public HookDecision On_container_receive_after(HookContext ctx, MovementHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "container.receive.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:container.receive.after"));
    }
}
