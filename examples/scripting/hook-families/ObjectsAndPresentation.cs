#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookFamilies;

[MudScript("examples.objects-presentation")]
public sealed class ObjectsAndPresentation
{
    private static readonly AssetRef FindJoe =
        new(Guid.Parse("ae000000-0000-4000-8000-000000000001"), 1);
    private static readonly AssetRef NightBellEvent =
        new(Guid.Parse("ae000000-0000-4000-8000-000000000002"), 1);

    // Evennia return_appearance/at_desc: view-specific text,
    // filtered by native phase/visibility before the query is invoked.
    [MudHook("entity.description.query")]
    public HookQueryResult Description(HookContext ctx, PresentationQueryEvent e)
    {
        if (ctx.Actor.Quest(FindJoe)?.IsActive == true)
            return HookQueryResult.ReplaceText(
                e.CurrentText + "\nYou notice a folded railway timetable beside the door.");
        return HookQueryResult.Keep();
    }

    // Evennia at_object_post_spawn: after a prefab instance has been created,
    // queue an independently validated domain event for regional observers.
    [MudHook("entity.prototype.applied.after")]
    public HookDecision OnPrototypeApplied(HookContext ctx, EntityLifecycleHookEvent e)
    {
        if (e.Subject != ctx.Owner) return HookDecision.Continue();
        return HookDecision.EnqueueAfter(
            new EmitDomainEvent(ctx.Actor.Ref, NightBellEvent,
                $"{e.EventId:N}:prototype-applied"));
    }

    // Evennia at_rename: hook sees a committed fact; it does NOT alter identity.
    [MudHook("entity.renamed.after")]
    public HookDecision OnRename(HookContext ctx, EntityLifecycleHookEvent e)
    {
        // The authoritative ECS already committed the name and its indexes.
        return HookDecision.Continue();
    }
}
