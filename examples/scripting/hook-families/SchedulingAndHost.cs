#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookFamilies;

[MudScript("examples.scheduler-host")]
public sealed class SchedulingAndHost
{
    private static readonly Guid ScheduleSchema =
        Guid.Parse("b0000000-0000-4000-8000-000000000001");

    // Evennia is_valid: a pure query controls scheduler eligibility.
    // Any invalid/missing state must be handled by host's configured policy.
    [MudHook("scheduler.job.validity.query")]
    public HookQueryResult ScheduleValid(HookContext ctx, QueryHookEvent e)
    {
        if (e.Key == "storm_warning" &&
            !string.Equals(e.DefaultValue, "enabled", StringComparison.Ordinal))
            return HookQueryResult.Deny("SCHEDULE_DISABLED");
        return HookQueryResult.Keep();
    }

    // Evennia at_repeat: persistent count increment, not a script-owned timer.
    // ExpectedVersion avoids concurrent lost updates.
    [MudHook("timer.fired.after")]
    public HookDecision OnSchedule(HookContext ctx, TimerFiredEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            ScheduleSchema, "occurrence_count");
        var current = ctx.StateSlots.Require(slot);
        long n = current.Value.Integer ?? 0;
        return HookDecision.EnqueueAfter(new WriteStateSlot(slot,
            PropertyValue.FromInteger(checked(n + 1)), current.Version,
            $"{e.ScheduledOccurrenceId:N}:schedule-counter"));
    }

    // Shutdown must NEVER be vetoable/blocked by a script.
    [MudHook("host.stopping.before")]
    public HookDecision OnStopping(HookContext ctx, HostHookEvent e)
        => HookDecision.Continue();
}
