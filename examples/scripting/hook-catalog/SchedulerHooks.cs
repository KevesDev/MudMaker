// SDK v1 hook cookbook: source-level C# methods for all 7 'scheduler' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.scheduler")]
public sealed class SchedulerHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("scheduler.job.created.after")]
    public HookDecision On_scheduler_job_created_after(HookContext ctx, ScheduleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "scheduler.job.created.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:scheduler.job.created.after"));
    }

    [MudHook("scheduler.job.hydrated.after")]
    public HookDecision On_scheduler_job_hydrated_after(HookContext ctx, ScheduleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "scheduler.job.hydrated.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:scheduler.job.hydrated.after"));
    }

    [MudHook("scheduler.job.delete.before")]
    public HookDecision On_scheduler_job_delete_before(HookContext ctx, ScheduleHookEvent e)
    {
        if (e.ScheduleId == Guid.Empty)
            return HookDecision.Veto("SCHEDULE_INVALID");
        return HookDecision.Continue();
    }

    [MudHook("scheduler.job.validity.query")]
    public HookQueryResult On_scheduler_job_validity_query(HookContext ctx, QueryHookEvent e)
    {
        if (e.Key.StartsWith("restricted.", StringComparison.Ordinal))
            return HookQueryResult.Deny("OPTION_NOT_AVAILABLE");
        return HookQueryResult.Keep();
    }

    [MudHook("scheduler.job.started.after")]
    public HookDecision On_scheduler_job_started_after(HookContext ctx, ScheduleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "scheduler.job.started.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:scheduler.job.started.after"));
    }

    [MudHook("scheduler.job.paused.after")]
    public HookDecision On_scheduler_job_paused_after(HookContext ctx, ScheduleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "scheduler.job.paused.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:scheduler.job.paused.after"));
    }

    [MudHook("scheduler.job.stopped.after")]
    public HookDecision On_scheduler_job_stopped_after(HookContext ctx, ScheduleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "scheduler.job.stopped.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:scheduler.job.stopped.after"));
    }
}
