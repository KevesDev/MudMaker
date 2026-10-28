// SDK v1 hook cookbook: source-level C# methods for all 2 'narration' hooks.
// These are opt-in examples; enabling all persistent audit counters is not recommended
// in production. Host must register HookMetricsSchema and grant State.Write.
#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookCatalog;

[MudScript("mudmaker.catalog.narration")]
public sealed class NarrationHooks
{
    // The host's world definition must register this persistent state schema
    // and expose the relevant slot snapshots to these demo bindings.
    private static readonly Guid HookMetricsSchema =
        Guid.Parse("ca100000-0000-4000-8000-000000000001");

    [MudHook("narration.move.origin.query")]
    public HookQueryResult On_narration_move_origin_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref) return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText + "\n[Observed through the host's world rules]");
    }

    [MudHook("narration.move.destination.query")]
    public HookQueryResult On_narration_move_destination_query(HookContext ctx, PresentationQueryEvent e)
    {
        if (e.Viewer != ctx.Actor.Ref) return HookQueryResult.Deny("VIEWER_NOT_AUTHORIZED");
        return HookQueryResult.ReplaceText(e.CurrentText + "\n[Observed through the host's world rules]");
    }
}
