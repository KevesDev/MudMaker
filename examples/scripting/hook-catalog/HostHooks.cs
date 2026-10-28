// SDK v1 hook cookbook: source-level C# methods for all 2 'host' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.host")]
public sealed class HostHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("host.stopping.before")]
    public HookDecision On_host_stopping_before(HookContext ctx, HostHookEvent e)
    {
        // Shutdown is always owned by the local supervisor and cannot be vetoed.
        return HookDecision.Continue();
    }

    [MudHook("host.started.after")]
    public HookDecision On_host_started_after(HookContext ctx, HostHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "host.started.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:host.started.after"));
    }
}
