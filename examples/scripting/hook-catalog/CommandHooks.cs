// SDK v1 hook cookbook: source-level C# methods for all 5 'command' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.command")]
public sealed class CommandHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("command.available.query")]
    public HookQueryResult On_command_available_query(HookContext ctx, QueryHookEvent e)
    {
        if (e.Key.StartsWith("restricted.", StringComparison.Ordinal))
            return HookQueryResult.Deny("OPTION_NOT_AVAILABLE");
        return HookQueryResult.Keep();
    }

    [MudHook("command.execute.before")]
    public HookDecision On_command_execute_before(HookContext ctx, CommandHookEvent e)
    {
        if (string.IsNullOrWhiteSpace(e.CommandKey))
            return HookDecision.Veto("COMMAND_UNRECOGNIZED");
        return HookDecision.Continue();
    }

    [MudHook("command.execute.after")]
    public HookDecision On_command_execute_after(HookContext ctx, CommandHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "command.execute.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:command.execute.after"));
    }

    [MudHook("command.parse.query")]
    public HookQueryResult On_command_parse_query(HookContext ctx, CommandHookEvent e)
    {
        if (string.Equals(e.CommandKey, "say", StringComparison.Ordinal))
            return HookQueryResult.ReplaceText(e.Arguments.Trim());
        return HookQueryResult.Keep();
    }

    [MudHook("command.set.created.after")]
    public HookDecision On_command_set_created_after(HookContext ctx, CommandHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "command.set.created.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:command.set.created.after"));
    }
}
