// SDK v1 hook cookbook: source-level C# methods for all 23 'entity' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.entity")]
public sealed class EntityHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("entity.move.after")]
    public HookDecision On_entity_move_after(HookContext ctx, EntityMoveEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.move.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.move.after"));
    }

    [MudHook("entity.spawn.after")]
    public HookDecision On_entity_spawn_after(HookContext ctx, EntityLifecycleEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.spawn.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.spawn.after"));
    }

    [MudHook("entity.despawn.after")]
    public HookDecision On_entity_despawn_after(HookContext ctx, EntityLifecycleEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.despawn.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.despawn.after"));
    }

    [MudHook("entity.copied.after")]
    public HookDecision On_entity_copied_after(HookContext ctx, EntityLifecycleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.copied.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.copied.after"));
    }

    [MudHook("entity.appearance.format.query")]
    public HookQueryResult On_entity_appearance_format_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref) return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText + "\n[Observed through the host's world rules]");
    }

    [MudHook("entity.appearance.resolve.query")]
    public HookQueryResult On_entity_appearance_resolve_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref) return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText + "\n[Observed through the host's world rules]");
    }

    [MudHook("entity.created.after")]
    public HookDecision On_entity_created_after(HookContext ctx, EntityLifecycleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.created.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.created.after"));
    }

    [MudHook("entity.initialized.after")]
    public HookDecision On_entity_initialized_after(HookContext ctx, EntityLifecycleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.initialized.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.initialized.after"));
    }

    [MudHook("entity.delete.before")]
    public HookDecision On_entity_delete_before(HookContext ctx, EntityLifecycleHookEvent e)
    {
        if (e.Subject != ctx.Owner)
            return HookDecision.Veto("ENTITY_BINDING_MISMATCH");
        return HookDecision.Continue();
    }

    [MudHook("entity.prototype.applied.after")]
    public HookDecision On_entity_prototype_applied_after(HookContext ctx, EntityLifecycleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.prototype.applied.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.prototype.applied.after"));
    }

    [MudHook("entity.hydrated.after")]
    public HookDecision On_entity_hydrated_after(HookContext ctx, EntityLifecycleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.hydrated.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.hydrated.after"));
    }

    [MudHook("entity.move.before")]
    public HookDecision On_entity_move_before(HookContext ctx, MovementHookEvent e)
    {
        if (e.Mover != ctx.Actor.Ref || e.Destination is null)
            return HookDecision.Veto("MOVE_TARGET_INVALID");
        return HookDecision.Continue();
    }

    [MudHook("entity.look.after")]
    public HookDecision On_entity_look_after(HookContext ctx, EntityLifecycleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.look.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.look.after"));
    }

    [MudHook("entity.description.query")]
    public HookQueryResult On_entity_description_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref) return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText + "\n[Observed through the host's world rules]");
    }

    [MudHook("entity.renamed.after")]
    public HookDecision On_entity_renamed_after(HookContext ctx, EntityLifecycleHookEvent e)
    {
        var slot = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            HookMetricsSchema, "entity.renamed.after");
        var current = ctx.StateSlots.Require(slot);
        long updated = checked((current.Value.Integer ?? 0L) + 1L);
        return HookDecision.EnqueueAfter(
            new WriteStateSlot(slot, PropertyValue.FromInteger(updated),
                current.Version, $"{e.EventId:N}:entity.renamed.after"));
    }
    [MudHook("entity.appearance.name.query")]
    public HookQueryResult On_entity_appearance_name_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref)
            return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText);
    }

    [MudHook("entity.appearance.numbered_name.query")]
    public HookQueryResult On_entity_appearance_numbered_name_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref)
            return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText($"{e.Count} {e.CurrentText}");
    }

    [MudHook("entity.appearance.header.query")]
    public HookQueryResult On_entity_appearance_header_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref)
            return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText);
    }

    [MudHook("entity.appearance.desc.query")]
    public HookQueryResult On_entity_appearance_desc_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref)
            return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText);
    }

    [MudHook("entity.appearance.exits.query")]
    public HookQueryResult On_entity_appearance_exits_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref)
            return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText);
    }

    [MudHook("entity.appearance.characters.query")]
    public HookQueryResult On_entity_appearance_characters_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref)
            return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText);
    }

    [MudHook("entity.appearance.things.query")]
    public HookQueryResult On_entity_appearance_things_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref)
            return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText);
    }

    [MudHook("entity.appearance.footer.query")]
    public HookQueryResult On_entity_appearance_footer_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref)
            return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText);
    }
}
