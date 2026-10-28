#nullable enable
using System;
using MudMaker.Scripting.V1;
namespace MudMaker.Examples.HookFamilies;

[MudScript("examples.accounts-commands")]
public sealed class AccountsAndCommands
{
    private static readonly Guid LoginGateSchema =
        Guid.Parse("af000000-0000-4000-8000-000000000001");

    // Evennia at_pre_login: host-local game maintenance gate;
    // never reads/overrides passwords, tokens, or authentication decisions.
    [MudHook("account.login.before")]
    public HookDecision MaintenanceGate(HookContext ctx, AccountHookEvent e)
    {
        var key = new StateSlotRef(StateScope.World, ctx.World.WorldId,
            LoginGateSchema, "maintenance");
        var setting = ctx.StateSlots.Require(key);
        return setting.Value.Boolean == true
            ? HookDecision.Veto("WORLD_MAINTENANCE")
            : HookDecision.Continue();
    }

    // Evennia at_pre_cmd: a host game command restriction, not an
    // authentication bypass. The native command dispatcher owns parsing.
    [MudHook("command.execute.before")]
    public HookDecision PreventTeleportCommand(HookContext ctx, CommandHookEvent e)
    {
        if (!string.Equals(e.CommandKey, "teleport", StringComparison.Ordinal))
            return HookDecision.Continue();
        return HookDecision.Veto("TELEPORT_DISABLED_IN_THIS_GAME");
    }

    // Evennia parse: customize argument normalization only; engine
    // reparses/validates the resulting command and never trusts an admin verb.
    [MudHook("command.parse.query")]
    public HookQueryResult NormalizeSayArgs(HookContext ctx, CommandHookEvent e)
    {
        if (!string.Equals(e.CommandKey, "say", StringComparison.Ordinal))
            return HookQueryResult.Keep();
        return HookQueryResult.ReplaceText(e.Arguments.Trim());
    }
}
