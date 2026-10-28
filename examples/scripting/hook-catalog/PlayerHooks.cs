// SDK v1 hook cookbook: source-level C# methods for all 2 'player' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.player")]
public sealed class PlayerHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("player.login.after")]
    public HookDecision On_player_login_after(HookContext ctx, PlayerSessionEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "player.login.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:player.login.after"));
    }

    [MudHook("player.logout.after")]
    public HookDecision On_player_logout_after(HookContext ctx, PlayerSessionEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "player.logout.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:player.logout.after"));
    }
}
