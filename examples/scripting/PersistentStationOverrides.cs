// Host-authored local source example using v1 SDK. Engine implementation not present.
#nullable enable
using System;
using MudMaker.Scripting.V1;

namespace MudMaker.Examples;

[MudScript("mudmaker.examples.station-overrides")]
public sealed class PersistentStationOverrides
{
    // Stable schema IDs are registered by host editor and included in the release.
    private static readonly FieldRef DoorLocked =
        new(Guid.Parse("0d000000-0000-4000-8000-000000000001"),
            Guid.Parse("0d000000-0000-4000-8000-000000000002"), 1);

    private static readonly Guid StormStageSchema =
        Guid.Parse("0d000000-0000-4000-8000-000000000003");
    private static readonly Guid NorthgateRegion =
        Guid.Parse("0d000000-0000-4000-8000-000000000004");

    // The binding is owned by the local host and targets its station door entity.
    // The host must expose DoorLocked and region slot snapshots for this binding.
    [MudHook("timer.fired.after")]
    public HookDecision OnStormWarning(HookContext ctx, TimerFiredEvent evt)
    {
        var door = ctx.Fields.Require(ctx.Owner, DoorLocked);
        var slotRef = new StateSlotRef(
            StateScope.Region, ctx.World.WorldId, StormStageSchema,
            "storm_stage", ScopedOwnerId: NorthgateRegion);
        var stage = ctx.StateSlots.Require(slotRef);

        // After-hook effects are queued as a separate durable server command.
        // Native engine revalidates field version, value, and target capability.
        return HookDecision.EnqueueAfter(
            new SetComponentField(
                ctx.Owner, DoorLocked, PropertyValue.FromBoolean(true),
                door.Version, $"{evt.ScheduledOccurrenceId:N}:door-lock"),
            new WriteStateSlot(
                slotRef, PropertyValue.FromText("warning"),
                stage.Version, $"{evt.ScheduledOccurrenceId:N}:region-stage"));
    }
}
