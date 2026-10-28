// Generated protobuf messages are converted to the public, immutable SDK DTOs.
// This adapter lives in the host's local script worker. No player code is loaded.
#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using Sdk = MudMaker.Scripting.V1;
using Wire = MudMaker.Scripting.V1.Wire;

namespace MudMaker.Scripting.Worker;

public static class ScriptWireCodec
{
    public static Sdk.AssetRef Asset(Wire.AssetRef x) => new(Guid.Parse(x.Id), x.Revision);
    public static Sdk.EntityRef Entity(Wire.EntityRef x) =>
        new(Guid.Parse(x.WorldId), x.EntityId, x.Generation);
    public static Sdk.ScopeRef Scope(Wire.ScopeRef x) => new(Guid.Parse(x.Id), x.Revision);
    public static Wire.AssetRef Asset(Sdk.AssetRef x) => new() { Id = x.Id.ToString(), Revision = x.Revision };
    public static Wire.EntityRef Entity(Sdk.EntityRef x) =>
        new() { WorldId = x.WorldId.ToString(), EntityId = x.EntityId, Generation = x.Generation };
    public static Wire.ScopeRef Scope(Sdk.ScopeRef x) => new() { Id = x.Id.ToString(), Revision = x.Revision };

    private static Sdk.QuestState QuestState(Wire.QuestState x)
    {
        int raw = (int)x;
        if (raw is < 1 or > 7) throw new InvalidOperationException("MM-SCRIPT-QUEST-STATE");
        return (Sdk.QuestState)(raw - 1);
    }

    public static Sdk.FieldRef Field(Wire.FieldRef x) =>
        new(Guid.Parse(x.ComponentTypeId), Guid.Parse(x.FieldId), x.SchemaRevision);
    public static Wire.FieldRef Field(Sdk.FieldRef x) =>
        new() { ComponentTypeId = x.ComponentTypeId.ToString(), FieldId = x.FieldId.ToString(), SchemaRevision = x.SchemaRevision };

    private static Sdk.StateSlotRef Slot(Wire.StateSlotRef x)
    {
        var raw = (int)x.Scope;
        if (raw is < 1 or > 5) throw new InvalidOperationException("MM-SCRIPT-SLOT-SCOPE");
        return new Sdk.StateSlotRef(
            (Sdk.StateScope)(raw - 1), Guid.Parse(x.WorldId), Guid.Parse(x.SchemaId), x.Key,
            x.EntityOwner is null ? null : Entity(x.EntityOwner),
            string.IsNullOrWhiteSpace(x.ScopedOwnerId) ? null : Guid.Parse(x.ScopedOwnerId));
    }
    private static Wire.StateSlotRef Slot(Sdk.StateSlotRef x)
    {
        var value = new Wire.StateSlotRef {
            Scope = (Wire.StateScope)((int)x.Scope + 1), WorldId = x.WorldId.ToString(),
            SchemaId = x.SchemaId.ToString(), Key = x.Key,
            ScopedOwnerId = x.ScopedOwnerId?.ToString() ?? ""
        };
        if (x.EntityOwner is { } owner) value.EntityOwner = Entity(owner);
        return value;
    }

    public static Sdk.PropertyValue Value(Wire.PropertyValue x) => x.ValueCase switch
    {
        Wire.PropertyValue.ValueOneofCase.BooleanValue => Sdk.PropertyValue.FromBoolean(x.BooleanValue),
        Wire.PropertyValue.ValueOneofCase.IntegerValue => Sdk.PropertyValue.FromInteger(x.IntegerValue),
        Wire.PropertyValue.ValueOneofCase.FloatingValue => Sdk.PropertyValue.FromDouble(x.FloatingValue),
        Wire.PropertyValue.ValueOneofCase.TextValue => Sdk.PropertyValue.FromText(x.TextValue),
        Wire.PropertyValue.ValueOneofCase.EntityValue => Sdk.PropertyValue.FromEntity(Entity(x.EntityValue)),
        Wire.PropertyValue.ValueOneofCase.AssetValue => Sdk.PropertyValue.FromAsset(Asset(x.AssetValue)),
        Wire.PropertyValue.ValueOneofCase.ExplicitNull when x.ExplicitNull => Sdk.PropertyValue.Null(),
        _ => throw new InvalidOperationException("MM-SCRIPT-VALUE-WIRE-INVALID")
    };
    public static Wire.PropertyValue Value(Sdk.PropertyValue x) => x.Kind switch
    {
        Sdk.PropertyKind.Boolean when x.Boolean.HasValue => new() { BooleanValue = x.Boolean.Value },
        Sdk.PropertyKind.Integer when x.Integer.HasValue => new() { IntegerValue = x.Integer.Value },
        Sdk.PropertyKind.Floating when x.Floating.HasValue && double.IsFinite(x.Floating.Value) =>
            new() { FloatingValue = x.Floating.Value },
        Sdk.PropertyKind.Text when x.Text != null => new() { TextValue = x.Text },
        Sdk.PropertyKind.Entity when x.Entity.HasValue => new() { EntityValue = Entity(x.Entity.Value) },
        Sdk.PropertyKind.Asset when x.Asset.HasValue => new() { AssetValue = Asset(x.Asset.Value) },
        Sdk.PropertyKind.Null => new() { ExplicitNull = true },
        _ => throw new InvalidOperationException("MM-SCRIPT-VALUE-INVALID")
    };

    public static Sdk.HookContext Context(Wire.HookInvoke x)
    {
        if (x.ProtocolMajor != 1) throw new InvalidOperationException("MM-SCRIPT-PROTOCOL-MAJOR");
        var quests = new Dictionary<Guid, Sdk.QuestAttemptSnapshot>();
        foreach (var q in x.Actor.QuestAttempts)
        {
            var reference = Asset(q.Quest);
            if (!quests.TryAdd(reference.Id, new Sdk.QuestAttemptSnapshot(
                reference, Guid.Parse(q.AttemptId), QuestState(q.State),
                new HashSet<string>(q.CreditedObjectives, StringComparer.Ordinal))))
                throw new InvalidOperationException("MM-SCRIPT-DUPLICATE-QUEST");
        }

        var actor = new Sdk.ActorSnapshot(
            Entity(x.Actor.Actor), x.Actor.DisplayName, x.Actor.NameKey,
            quests, x.Actor.AboardVehicles.Select(Asset).ToHashSet(),
            x.Actor.Kind switch {
                Wire.ActorKind.ActorPlayer => Sdk.ActorKind.Player,
                Wire.ActorKind.ActorWorldSystem => Sdk.ActorKind.WorldSystem,
                _ => throw new InvalidOperationException("MM-SCRIPT-ACTOR-KIND")
            });
        var world = new Sdk.WorldReadSnapshot(Guid.Parse(x.World.WorldId), x.World.Revision,
            x.World.InTransitVehicles.Select(Asset).ToHashSet(),
            x.World.ActiveWorldEventDefinitions.Select(Asset).ToHashSet());
        var fields = new Sdk.FieldReadSet(x.Fields.Select(f =>
            new Sdk.ComponentFieldSnapshot(Entity(f.Owner), Field(f.Field),
                Value(f.Value), f.Version)).ToArray());
        var slots = new Sdk.StateReadSet(x.StateSlots.Select(s =>
            new Sdk.StateSlotSnapshot(Slot(s.Slot), Value(s.Value), s.Version)).ToArray());

        return new Sdk.HookContext(Guid.Parse(x.InvocationId), Guid.Parse(x.RequestId),
            Asset(x.Binding), Entity(x.Owner), actor,
            x.Target is null ? null : Entity(x.Target), world, fields, slots,
            x.Phase switch {
                Wire.HookPhase.Before => Sdk.HookPhase.Before,
                Wire.HookPhase.After => Sdk.HookPhase.After,
                Wire.HookPhase.Query => Sdk.HookPhase.Query,
                _ => throw new InvalidOperationException("MM-SCRIPT-HOOK-PHASE")
            });
    }

    public static Sdk.MudEvent Event(Wire.HookEvent e) => e.KindCase switch
    {
        Wire.HookEvent.KindOneofCase.NpcInteract =>
            new Sdk.NpcInteractEvent(Guid.Parse(e.NpcInteract.EventId)),
        Wire.HookEvent.KindOneofCase.DialogueChoice =>
            new Sdk.DialogueChoiceEvent(Guid.Parse(e.DialogueChoice.EventId),
                Guid.Parse(e.DialogueChoice.SessionId), e.DialogueChoice.ChoiceKey),
        Wire.HookEvent.KindOneofCase.QuizEvaluated =>
            new Sdk.QuizEvaluatedEvent(Guid.Parse(e.QuizEvaluated.EventId),
                Guid.Parse(e.QuizEvaluated.SessionId), e.QuizEvaluated.IsCorrect,
                e.QuizEvaluated.SessionOwnedByActor),
        Wire.HookEvent.KindOneofCase.QuestTurnIn =>
            new Sdk.QuestTurnInEvent(Guid.Parse(e.QuestTurnIn.EventId),
                Guid.Parse(e.QuestTurnIn.AttemptId)),
        Wire.HookEvent.KindOneofCase.QuestLifecycle =>
            new Sdk.QuestLifecycleEvent(Guid.Parse(e.QuestLifecycle.EventId),
                Guid.Parse(e.QuestLifecycle.AttemptId),
                QuestState(e.QuestLifecycle.BeforeState),
                QuestState(e.QuestLifecycle.AfterState)),
        Wire.HookEvent.KindOneofCase.ObjectiveCredit =>
            new Sdk.ObjectiveCreditEvent(Guid.Parse(e.ObjectiveCredit.EventId),
                Guid.Parse(e.ObjectiveCredit.AttemptId), e.ObjectiveCredit.ObjectiveKey),
        Wire.HookEvent.KindOneofCase.RewardClaim =>
            new Sdk.RewardClaimEvent(Guid.Parse(e.RewardClaim.EventId),
                Guid.Parse(e.RewardClaim.AttemptId), Asset(e.RewardClaim.Reward)),
        Wire.HookEvent.KindOneofCase.EntityMove =>
            new Sdk.EntityMoveEvent(Guid.Parse(e.EntityMove.EventId), Entity(e.EntityMove.Entity),
                Entity(e.EntityMove.Origin), Entity(e.EntityMove.Destination)),
        Wire.HookEvent.KindOneofCase.Transit =>
            new Sdk.TransitEvent(Guid.Parse(e.Transit.EventId), Entity(e.Transit.Vehicle),
                e.Transit.Station is null ? null : Entity(e.Transit.Station)),
        Wire.HookEvent.KindOneofCase.WorldEventLifecycle =>
            new Sdk.WorldEventLifecycleEvent(Guid.Parse(e.WorldEventLifecycle.EventId),
                Asset(e.WorldEventLifecycle.Definition), Scope(e.WorldEventLifecycle.Scope),
                WorldAction(e.WorldEventLifecycle.Action)),
        Wire.HookEvent.KindOneofCase.ItemEvent =>
            new Sdk.ItemEvent(Guid.Parse(e.ItemEvent.EventId), Entity(e.ItemEvent.Item),
                e.ItemEvent.OtherParty is null ? null : Entity(e.ItemEvent.OtherParty)),
        Wire.HookEvent.KindOneofCase.TimerFired =>
            new Sdk.TimerFiredEvent(Guid.Parse(e.TimerFired.EventId),
                Asset(e.TimerFired.Timer), Guid.Parse(e.TimerFired.OccurrenceId)),
        Wire.HookEvent.KindOneofCase.PlayerSession =>
            new Sdk.PlayerSessionEvent(Guid.Parse(e.PlayerSession.EventId)),
        Wire.HookEvent.KindOneofCase.EntitySpawn =>
            new Sdk.EntityLifecycleEvent(Guid.Parse(e.EntitySpawn.EventId),
                Entity(e.EntitySpawn.Entity), Asset(e.EntitySpawn.Prototype)),
        Wire.HookEvent.KindOneofCase.EntityDespawn =>
            new Sdk.EntityLifecycleEvent(Guid.Parse(e.EntityDespawn.EventId),
                Entity(e.EntityDespawn.Entity), Asset(e.EntityDespawn.Prototype)),

        Wire.HookEvent.KindOneofCase.EntityLifecycleHook =>
            new Sdk.EntityLifecycleHookEvent(Guid.Parse(e.EntityLifecycleHook.EventId),
                Entity(e.EntityLifecycleHook.Subject),
                e.EntityLifecycleHook.Related is null ? null : Entity(e.EntityLifecycleHook.Related),
                e.EntityLifecycleHook.Prototype is null ? null : Asset(e.EntityLifecycleHook.Prototype)),
        Wire.HookEvent.KindOneofCase.MovementHook =>
            new Sdk.MovementHookEvent(Guid.Parse(e.MovementHook.EventId),
                Entity(e.MovementHook.Mover), e.MovementHook.Origin is null ? null : Entity(e.MovementHook.Origin),
                e.MovementHook.Destination is null ? null : Entity(e.MovementHook.Destination),
                e.MovementHook.Exit is null ? null : Entity(e.MovementHook.Exit)),
        Wire.HookEvent.KindOneofCase.PresentationQuery =>
            new Sdk.PresentationQueryEvent(Guid.Parse(e.PresentationQuery.EventId),
                Entity(e.PresentationQuery.Viewer), Entity(e.PresentationQuery.Subject),
                e.PresentationQuery.CurrentText, checked((int)e.PresentationQuery.Count)),
        Wire.HookEvent.KindOneofCase.CommandHook =>
            new Sdk.CommandHookEvent(Guid.Parse(e.CommandHook.EventId),
                e.CommandHook.CommandKey, e.CommandHook.Arguments),
        Wire.HookEvent.KindOneofCase.AccountHook =>
            new Sdk.AccountHookEvent(Guid.Parse(e.AccountHook.EventId),
                Guid.Parse(e.AccountHook.AccountId), e.AccountHook.Character is null ? null :
                    Entity(e.AccountHook.Character), e.AccountHook.ReasonCode),
        Wire.HookEvent.KindOneofCase.ChannelHook =>
            new Sdk.ChannelHookEvent(Guid.Parse(e.ChannelHook.EventId),
                Guid.Parse(e.ChannelHook.ChannelId), e.ChannelHook.Sender is null ? null :
                    Entity(e.ChannelHook.Sender), e.ChannelHook.Message,
                string.IsNullOrWhiteSpace(e.ChannelHook.RecipientAccountId) ? null :
                    Guid.Parse(e.ChannelHook.RecipientAccountId)),
        Wire.HookEvent.KindOneofCase.ScheduleHook =>
            new Sdk.ScheduleHookEvent(Guid.Parse(e.ScheduleHook.EventId),
                Guid.Parse(e.ScheduleHook.ScheduleId), Guid.Parse(e.ScheduleHook.OccurrenceId)),
        Wire.HookEvent.KindOneofCase.HostHook =>
            new Sdk.HostHookEvent(Guid.Parse(e.HostHook.EventId), e.HostHook.LifecycleCode),
        Wire.HookEvent.KindOneofCase.AccessHook =>
            new Sdk.AccessHookEvent(Guid.Parse(e.AccessHook.EventId),
                Entity(e.AccessHook.Subject), Entity(e.AccessHook.Object),
                e.AccessHook.AccessKey, e.AccessHook.EngineAllowed),
        Wire.HookEvent.KindOneofCase.QueryHook =>
            new Sdk.QueryHookEvent(Guid.Parse(e.QueryHook.EventId),
                e.QueryHook.Key, e.QueryHook.DefaultValue),
        _ => throw new InvalidOperationException("MM-SCRIPT-EVENT-WIRE-INVALID")
    };

    private static Sdk.WorldEventAction WorldAction(Wire.WorldEventAction a) => (int)a switch
    {
        1 => Sdk.WorldEventAction.Start,
        2 => Sdk.WorldEventAction.Stop,
        _ => throw new InvalidOperationException("MM-SCRIPT-WORLD-EVENT-ACTION")
    };
    private static Wire.WorldEventAction WorldAction(Sdk.WorldEventAction a) =>
        (Wire.WorldEventAction)((int)a + 1);

    private static Wire.Disposition Disposition(Sdk.HookDisposition x) =>
        (Wire.Disposition)((int)x + 1);

    public static Wire.HookReply Reply(Wire.HookInvoke invoke, Sdk.HookDecision result)
    {
        var reply = new Wire.HookReply {
            ProtocolMajor = 1, InvocationId = invoke.InvocationId,
            Binding = invoke.Binding, TraceId = invoke.TraceId,
            Disposition = Disposition(result.Disposition),
            SafeErrorCode = result.Reason?.Value ?? ""
        };
        if (result.DeferredPrompt is { } prompt) reply.DeferredPrompt = Asset(prompt);
        foreach (var effect in result.Effects) reply.Effects.Add(Effect(effect));
        return reply;
    }


    public static Wire.HookReply QueryReply(Wire.HookInvoke invoke, Sdk.HookQueryResult result)
    {
        if (invoke.Phase != Wire.HookPhase.Query)
            throw new InvalidOperationException("MM-SCRIPT-QUERY-WRONG-PHASE");
        var reply = new Wire.HookReply {
            ProtocolMajor = 1, InvocationId = invoke.InvocationId,
            Binding = invoke.Binding, TraceId = invoke.TraceId,
            Disposition = Wire.Disposition.ContinueDefault
        };
        var outcome = new Wire.HookQueryResult();
        switch (result.Disposition)
        {
            case Sdk.QueryDisposition.KeepDefault: outcome.KeepDefault = true; break;
            case Sdk.QueryDisposition.ReplaceText:
                outcome.ReplaceText = result.Text ??
                    throw new InvalidOperationException("MM-SCRIPT-QUERY-MISSING-TEXT"); break;
            case Sdk.QueryDisposition.Deny:
                outcome.DenyErrorCode = result.Reason?.Value ??
                    throw new InvalidOperationException("MM-SCRIPT-QUERY-MISSING-REASON"); break;
            default: throw new InvalidOperationException("MM-SCRIPT-QUERY-INVALID");
        }
        reply.QueryResult = outcome;
        return reply;
    }

    public static Wire.GameEffect Effect(Sdk.GameEffect e)
    {
        var x = new Wire.GameEffect { OnceKey = e.OnceKey };
        switch (e)
        {
            case Sdk.StartQuest v: x.StartQuest = new() { Actor = Entity(v.Actor), Quest = Asset(v.Quest) }; break;
            case Sdk.CompleteQuest v: x.CompleteQuest = new() { AttemptId = v.AttemptId.ToString(), EvidenceEventId = v.EvidenceEventId.ToString() }; break;
            case Sdk.CreditObjective v: x.CreditObjective = new() { AttemptId = v.AttemptId.ToString(), ObjectiveKey = v.ObjectiveKey, EvidenceEventId = v.EvidenceEventId.ToString() }; break;
            case Sdk.ChangeWorldEvent v: x.ChangeWorldEvent = new() { Definition = Asset(v.Definition), Scope = Scope(v.Scope), Action = WorldAction(v.Action) }; break;
            case Sdk.OpenQuiz v: x.OpenQuiz = new() { Actor = Entity(v.Actor), QuestionSet = Asset(v.QuestionSet), QuestAttemptId = v.QuestAttemptId.ToString() }; break;
            case Sdk.RecordQuizResult v: x.RecordQuizResult = new() { QuizSessionId = v.QuizSessionId.ToString(), IsCorrect = v.IsCorrect }; break;
            case Sdk.GrantRewardPlan v: x.GrantRewardPlan = new() { Actor = Entity(v.Actor), RewardPlan = Asset(v.RewardPlan), QuestAttemptId = v.QuestAttemptId.ToString() }; break;
            case Sdk.RollRewardTable v: x.RollRewardTable = new() { Actor = Entity(v.Actor), RewardTable = Asset(v.RewardTable), QuestAttemptId = v.QuestAttemptId.ToString() }; break;
            case Sdk.ShowDialogue v: x.ShowDialogue = new() { Actor = Entity(v.Actor), Dialogue = Asset(v.Dialogue) }; break;
            case Sdk.EmitDomainEvent v: x.EmitDomainEvent = new() { Actor = Entity(v.Actor), Definition = Asset(v.EventDefinition) }; break;
            case Sdk.SetComponentField v: x.SetComponentField = new() { Owner = Entity(v.Owner), Field = Field(v.Field), Value = Value(v.Value), ExpectedVersion = v.ExpectedVersion }; break;
            case Sdk.AdjustComponentNumber v:
                if (!double.IsFinite(v.Delta)) throw new InvalidOperationException("MM-SCRIPT-NONFINITE-DELTA");
                x.AdjustComponentNumber = new() { Owner = Entity(v.Owner), Field = Field(v.Field), Delta = v.Delta, ExpectedVersion = v.ExpectedVersion }; break;
            case Sdk.ClearComponentOverride v: x.ClearComponentOverride = new() { Owner = Entity(v.Owner), Field = Field(v.Field), ExpectedVersion = v.ExpectedVersion }; break;
            case Sdk.WriteStateSlot v: x.WriteStateSlot = new() { Slot = Slot(v.Slot), Value = Value(v.Value), ExpectedVersion = v.ExpectedVersion }; break;
            case Sdk.DeleteStateSlot v: x.DeleteStateSlot = new() { Slot = Slot(v.Slot), ExpectedVersion = v.ExpectedVersion }; break;
            default: throw new InvalidOperationException("MM-SCRIPT-EFFECT-UNKNOWN");
        }
        return x;
    }
}
