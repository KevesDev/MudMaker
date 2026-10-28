#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookFamilies;

// Host binds handlers to the train exit / carriage / navigation components.
[MudScript("examples.train-movement")]
public sealed class MovementAndContainment
{
    private static readonly FieldRef OccupantCount = new(
        Guid.Parse("ac000000-0000-4000-8000-000000000004"),
        Guid.Parse("ac000000-0000-4000-8000-000000000005"), 1);
    private static readonly AssetRef EmergencyQuest =
        new(Guid.Parse("ac000000-0000-4000-8000-000000000001"), 1);
    private static readonly AssetRef Train =
        new(Guid.Parse("ac000000-0000-4000-8000-000000000002"), 1);

    // Evennia at_pre_move: may veto a move BEFORE ECS changes containment.
    [MudHook("entity.move.before")]
    public HookDecision RequireEmergencyPermission(HookContext ctx, MovementHookEvent e)
    {
        if (e.Mover != ctx.Actor.Ref) return HookDecision.Veto("MOVE_ACTOR_MISMATCH");
        if (e.Destination is null) return HookDecision.Veto("MOVE_DESTINATION_MISSING");
        if (!ctx.World.InTransitVehicles.Contains(Train)) return HookDecision.Continue();

        // This binding is installed only on the emergency cab exit.
        return ctx.Actor.Quest(EmergencyQuest)?.IsActive == true
            ? HookDecision.Continue()
            : HookDecision.Veto("CAB_ACCESS_REQUIRES_QUEST");
    }

    // Evennia at_pre_object_receive: container-owned guard, still enforced
    // alongside native containment invariants and real capacity/phase checks.
    [MudHook("container.receive.before")]
    public HookDecision PreventMidTransitBoarding(HookContext ctx, MovementHookEvent e)
    {
        if (e.Destination != ctx.Owner) return HookDecision.Continue();
        return ctx.World.InTransitVehicles.Contains(Train)
            ? HookDecision.Veto("TRAIN_DOORS_CLOSED")
            : HookDecision.Continue();
    }

    // Evennia announce_move_from: pure renderer; changes no state and
    // cannot expose private IDs to observers.
    [MudHook("narration.move.origin.query")]
    public HookQueryResult DepartureNarration(HookContext ctx, PresentationQueryEvent e)
    {
        if (ctx.World.InTransitVehicles.Contains(Train))
            return HookQueryResult.ReplaceText("A passenger moves toward the next carriage.");
        return HookQueryResult.Keep();
    }

    // Evennia at_object_delete: cancel deletion while owner entity is occupied.
    // Native engine still separately applies the definitive container policy.
    [MudHook("entity.delete.before")]
    public HookDecision PreventDeletingOccupiedRoom(HookContext ctx, EntityLifecycleHookEvent e)
    {
        if (e.Subject != ctx.Owner) return HookDecision.Continue();
        // Registered, host-exposed occupancy count snapshot; the native engine
        // independently rechecks the containment invariant before commit.
        var occupied = ctx.Fields.Require(ctx.Owner, OccupantCount);
        if (occupied.Value.Integer is > 0)
            return HookDecision.Veto("ROOM_NOT_EMPTY");
        return HookDecision.Continue();
    }
}
