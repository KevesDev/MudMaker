// SDK v1 hook cookbook: source-level C# methods for all 16 'quest' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.quest")]
public sealed class QuestHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("quest.offer.before")]
    public HookDecision On_quest_offer_before(HookContext ctx, QuestLifecycleEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("quest.accept.before")]
    public HookDecision On_quest_accept_before(HookContext ctx, QuestLifecycleEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("quest.accept.after")]
    public HookDecision On_quest_accept_after(HookContext ctx, QuestLifecycleEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "quest.accept.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:quest.accept.after"));
    }

    [MudHook("quest.objective.credit.before")]
    public HookDecision On_quest_objective_credit_before(HookContext ctx, ObjectiveCreditEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("quest.objective.credit.after")]
    public HookDecision On_quest_objective_credit_after(HookContext ctx, ObjectiveCreditEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "quest.objective.credit.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:quest.objective.credit.after"));
    }

    [MudHook("quest.turn_in.before")]
    public HookDecision On_quest_turn_in_before(HookContext ctx, QuestTurnInEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("quest.turn_in.after")]
    public HookDecision On_quest_turn_in_after(HookContext ctx, QuestTurnInEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "quest.turn_in.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:quest.turn_in.after"));
    }

    [MudHook("quest.completed.after")]
    public HookDecision On_quest_completed_after(HookContext ctx, QuestLifecycleEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "quest.completed.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:quest.completed.after"));
    }

    [MudHook("quest.fail.before")]
    public HookDecision On_quest_fail_before(HookContext ctx, QuestLifecycleEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("quest.fail.after")]
    public HookDecision On_quest_fail_after(HookContext ctx, QuestLifecycleEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "quest.fail.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:quest.fail.after"));
    }

    [MudHook("quest.abandon.before")]
    public HookDecision On_quest_abandon_before(HookContext ctx, QuestLifecycleEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("quest.abandon.after")]
    public HookDecision On_quest_abandon_after(HookContext ctx, QuestLifecycleEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "quest.abandon.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:quest.abandon.after"));
    }

    [MudHook("quest.reset.before")]
    public HookDecision On_quest_reset_before(HookContext ctx, QuestLifecycleEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("quest.reset.after")]
    public HookDecision On_quest_reset_after(HookContext ctx, QuestLifecycleEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "quest.reset.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:quest.reset.after"));
    }

    [MudHook("quest.reward.claim.before")]
    public HookDecision On_quest_reward_claim_before(HookContext ctx, RewardClaimEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("quest.reward.claim.after")]
    public HookDecision On_quest_reward_claim_after(HookContext ctx, RewardClaimEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "quest.reward.claim.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:quest.reward.claim.after"));
    }
}
