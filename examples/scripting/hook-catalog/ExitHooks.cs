// SDK v1 hook cookbook: source-level C# methods for all 3 'exit' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.exit")]
public sealed class ExitHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("exit.traverse.before")]
    public HookDecision On_exit_traverse_before(HookContext ctx, EntityMoveEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("exit.traverse.after")]
    public HookDecision On_exit_traverse_after(HookContext ctx, EntityMoveEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "exit.traverse.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:exit.traverse.after"));
    }

    [MudHook("exit.traverse.failed.after")]
    public HookDecision On_exit_traverse_failed_after(HookContext ctx, MovementHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "exit.traverse.failed.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:exit.traverse.failed.after"));
    }
}
