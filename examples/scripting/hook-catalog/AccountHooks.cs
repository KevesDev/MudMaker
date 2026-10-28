// SDK v1 hook cookbook: source-level C# methods for all 11 'account' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.account")]
public sealed class AccountHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("account.character.assigned.after")]
    public HookDecision On_account_character_assigned_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "account.character.assigned.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:account.character.assigned.after"));
    }

    [MudHook("account.character.unassigned.after")]
    public HookDecision On_account_character_unassigned_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "account.character.unassigned.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:account.character.unassigned.after"));
    }

    [MudHook("account.created.after")]
    public HookDecision On_account_created_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "account.created.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:account.created.after"));
    }

    [MudHook("account.hydrated.after")]
    public HookDecision On_account_hydrated_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "account.hydrated.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:account.hydrated.after"));
    }

    [MudHook("account.first_login.after")]
    public HookDecision On_account_first_login_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "account.first_login.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:account.first_login.after"));
    }

    [MudHook("account.credentials.changed.after")]
    public HookDecision On_account_credentials_changed_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "account.credentials.changed.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:account.credentials.changed.after"));
    }

    [MudHook("account.login.before")]
    public HookDecision On_account_login_before(HookContext ctx, AccountHookEvent e)
    {
        if (string.Equals(e.ReasonCode, "maintenance", StringComparison.Ordinal))
            return HookDecision.Veto("WORLD_MAINTENANCE");
        return HookDecision.Continue();
    }

    [MudHook("account.login.after")]
    public HookDecision On_account_login_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "account.login.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:account.login.after"));
    }

    [MudHook("account.login.failed.after")]
    public HookDecision On_account_login_failed_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "account.login.failed.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:account.login.failed.after"));
    }

    [MudHook("account.disconnect.before")]
    public HookDecision On_account_disconnect_before(HookContext ctx, AccountHookEvent e)
    {
        if (string.Equals(e.ReasonCode, "maintenance", StringComparison.Ordinal))
            return HookDecision.Veto("WORLD_MAINTENANCE");
        return HookDecision.Continue();
    }

    [MudHook("account.disconnect.after")]
    public HookDecision On_account_disconnect_after(HookContext ctx, AccountHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "account.disconnect.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:account.disconnect.after"));
    }
}
