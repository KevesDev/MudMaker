// SDK v1 hook cookbook: source-level C# methods for all 5 'character' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.character")]
public sealed class CharacterHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("character.control.before")]
    public HookDecision On_character_control_before(HookContext ctx, AccountHookEvent e)
    {
        if (string.Equals(e.ReasonCode, "maintenance", StringComparison.Ordinal))
            return HookDecision.Veto("WORLD_MAINTENANCE");
        return HookDecision.Continue();
    }

    [MudHook("character.control.after")]
    public HookDecision On_character_control_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "character.control.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:character.control.after"));
    }

    [MudHook("character.release.before")]
    public HookDecision On_character_release_before(HookContext ctx, AccountHookEvent e)
    {
        if (string.Equals(e.ReasonCode, "maintenance", StringComparison.Ordinal))
            return HookDecision.Veto("WORLD_MAINTENANCE");
        return HookDecision.Continue();
    }

    [MudHook("character.release.after")]
    public HookDecision On_character_release_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "character.release.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:character.release.after"));
    }

    [MudHook("character.created.after")]
    public HookDecision On_character_created_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "character.created.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:character.created.after"));
    }
}
