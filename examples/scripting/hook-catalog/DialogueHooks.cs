// SDK v1 hook cookbook: source-level C# methods for all 2 'dialogue' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.dialogue")]
public sealed class DialogueHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("dialogue.choice.before")]
    public HookDecision On_dialogue_choice_before(HookContext ctx, DialogueChoiceEvent e)
    {
        return HookDecision.Continue();
    }

    [MudHook("dialogue.choice.after")]
    public HookDecision On_dialogue_choice_after(HookContext ctx, DialogueChoiceEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "dialogue.choice.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:dialogue.choice.after"));
    }
}
