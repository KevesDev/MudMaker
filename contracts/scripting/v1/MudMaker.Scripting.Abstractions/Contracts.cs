// MudMaker Scripting SDK v1 — normative interface types, not a runtime implementation.
// Copyright held by project owner. No direct ECS, process or storage handles exposed.
#nullable enable
using System;
using System.Collections.Generic;

namespace MudMaker.Scripting.V1;

[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class MudScriptAttribute(string moduleId) : Attribute
{
    public string ModuleId { get; } = moduleId;
}

[AttributeUsage(AttributeTargets.Method, AllowMultiple = true, Inherited = false)]
public sealed class MudHookAttribute(string hookId) : Attribute
{
    public string HookId { get; } = hookId;
}

[AttributeUsage(AttributeTargets.Method, Inherited = false)]
public sealed class MudGraphCallableAttribute(string nodeId) : Attribute
{
    public string NodeId { get; } = nodeId;
}

public readonly record struct AssetRef(Guid Id, uint Revision);
public readonly record struct EntityRef(Guid WorldId, ulong EntityId, uint Generation);
public readonly record struct ScopeRef(Guid Id, uint Revision);
public readonly record struct ErrorCode(string Value);

public readonly record struct FieldRef(Guid ComponentTypeId, Guid FieldId, uint SchemaRevision);
public enum StateScope { World, Region, Entity, Player, QuestAttempt }
public readonly record struct StateSlotRef(
    StateScope Scope, Guid WorldId, Guid SchemaId, string Key,
    EntityRef? EntityOwner = null, Guid? ScopedOwnerId = null);
public enum PropertyKind { Null, Boolean, Integer, Floating, Text, Entity, Asset }
public sealed record PropertyValue(
    PropertyKind Kind,
    bool? Boolean = null,
    long? Integer = null,
    double? Floating = null,
    string? Text = null,
    EntityRef? Entity = null,
    AssetRef? Asset = null)
{
    public static PropertyValue FromBoolean(bool x) => new(PropertyKind.Boolean, Boolean: x);
    public static PropertyValue FromInteger(long x) => new(PropertyKind.Integer, Integer: x);
    public static PropertyValue FromDouble(double x) => new(PropertyKind.Floating, Floating: x);
    public static PropertyValue FromText(string x) => new(PropertyKind.Text, Text: x);
    public static PropertyValue FromEntity(EntityRef x) => new(PropertyKind.Entity, Entity: x);
    public static PropertyValue FromAsset(AssetRef x) => new(PropertyKind.Asset, Asset: x);
    public static PropertyValue Null() => new(PropertyKind.Null);
}
public sealed record ComponentFieldSnapshot(
    EntityRef Owner, FieldRef Field, PropertyValue Value, ulong Version);
public sealed record StateSlotSnapshot(
    StateSlotRef Slot, PropertyValue Value, ulong Version);
public sealed class FieldReadSet(IReadOnlyList<ComponentFieldSnapshot> entries)
{
    public IReadOnlyList<ComponentFieldSnapshot> Entries { get; } = entries;
    public ComponentFieldSnapshot Require(EntityRef owner, FieldRef field)
    {
        foreach (var item in Entries)
            if (item.Owner == owner && item.Field == field) return item;
        throw new InvalidOperationException("MM-SCRIPT-READ-NOT-IN-SNAPSHOT");
    }
}
public sealed class StateReadSet(IReadOnlyList<StateSlotSnapshot> entries)
{
    public IReadOnlyList<StateSlotSnapshot> Entries { get; } = entries;
    public StateSlotSnapshot Require(StateSlotRef slot)
    {
        foreach (var item in Entries)
            if (item.Slot == slot) return item;
        throw new InvalidOperationException("MM-SCRIPT-READ-NOT-IN-SNAPSHOT");
    }
}

public enum HookPhase { Before, After, Query }
public enum HookDisposition { Continue, Append, Replace, Veto, Defer, EnqueueAfter }
public enum QuestState { Absent, Offered, Active, ReadyToTurnIn, Completed, Failed, Abandoned }
public enum WorldEventAction { Start, Stop }

public sealed record QuestAttemptSnapshot(
    AssetRef Quest,
    Guid AttemptId,
    QuestState State,
    IReadOnlySet<string> CreditedObjectives)
{
    public bool IsActive => State is QuestState.Active or QuestState.ReadyToTurnIn;
    public bool ReadyToTurnIn => State == QuestState.ReadyToTurnIn;
}

public enum ActorKind { Player, WorldSystem }
public sealed record ActorSnapshot(
    EntityRef Ref,
    string DisplayName,
    // Canonical, server-produced NFKC-normalized and invariant-lowercase key;
    // the worker must never derive authorization from client-provided text.
    string NameKey,
    IReadOnlyDictionary<Guid, QuestAttemptSnapshot> QuestAttempts,
    IReadOnlySet<AssetRef> AboardVehicles,
    ActorKind Kind = ActorKind.Player)
{
    public QuestAttemptSnapshot? Quest(AssetRef quest) =>
        QuestAttempts.TryGetValue(quest.Id, out var value) &&
        value.Quest.Revision == quest.Revision ? value : null;
}

public sealed record WorldReadSnapshot(
    Guid WorldId,
    ulong WorldRevision,
    IReadOnlySet<AssetRef> InTransitVehicles,
    IReadOnlySet<AssetRef> ActiveWorldEventDefinitions);

public sealed record HookContext(
    Guid InvocationId,
    Guid RequestId,
    AssetRef BoundAsset,
    EntityRef Owner,
    ActorSnapshot Actor,
    EntityRef? Target,
    WorldReadSnapshot World,
    FieldReadSet Fields,
    StateReadSet StateSlots,
    HookPhase Phase);

public abstract record MudEvent(Guid EventId);
public sealed record NpcInteractEvent(Guid EventId) : MudEvent(EventId);
public sealed record DialogueChoiceEvent(Guid EventId, Guid DialogueSessionId, string ChoiceKey) : MudEvent(EventId);
public sealed record QuizEvaluatedEvent(Guid EventId, Guid QuizSessionId, bool IsCorrect, bool SessionOwnedByActor)
    : MudEvent(EventId);
public sealed record QuestTurnInEvent(Guid EventId, Guid AttemptId) : MudEvent(EventId);
public sealed record QuestLifecycleEvent(Guid EventId, Guid AttemptId, QuestState OldState, QuestState NewState)
    : MudEvent(EventId);
public sealed record ObjectiveCreditEvent(Guid EventId, Guid AttemptId, string ObjectiveKey)
    : MudEvent(EventId);
public sealed record RewardClaimEvent(Guid EventId, Guid AttemptId, AssetRef Reward)
    : MudEvent(EventId);
public sealed record EntityMoveEvent(Guid EventId, EntityRef Entity, EntityRef OriginRoom, EntityRef DestinationRoom)
    : MudEvent(EventId);
public sealed record TransitEvent(Guid EventId, EntityRef Vehicle, EntityRef? Station)
    : MudEvent(EventId);
public sealed record WorldEventLifecycleEvent(Guid EventId, AssetRef Definition, ScopeRef Scope, WorldEventAction Action)
    : MudEvent(EventId);
public sealed record ItemEvent(Guid EventId, EntityRef Item, EntityRef? OtherParty)
    : MudEvent(EventId);
public sealed record EntityLifecycleEvent(Guid EventId, EntityRef Entity, AssetRef Prototype)
    : MudEvent(EventId);
public sealed record TimerFiredEvent(Guid EventId, AssetRef TimerDefinition, Guid ScheduledOccurrenceId)
    : MudEvent(EventId);
public sealed record PlayerSessionEvent(Guid EventId) : MudEvent(EventId);


public sealed record EntityLifecycleHookEvent(
    Guid EventId, EntityRef Subject, EntityRef? Related, AssetRef? Prototype) : MudEvent(EventId);
public sealed record MovementHookEvent(
    Guid EventId, EntityRef Mover, EntityRef? Origin, EntityRef? Destination,
    EntityRef? Exit) : MudEvent(EventId);
public sealed record PresentationQueryEvent(
    Guid EventId, EntityRef Viewer, EntityRef Subject, string CurrentText, int Count = 1) : MudEvent(EventId);
public sealed record CommandHookEvent(
    Guid EventId, string CommandKey, string Arguments) : MudEvent(EventId);
public sealed record AccountHookEvent(
    Guid EventId, Guid AccountId, EntityRef? Character, string ReasonCode) : MudEvent(EventId);
public sealed record ChannelHookEvent(
    Guid EventId, Guid ChannelId, EntityRef? Sender, string Message,
    Guid? RecipientAccountId) : MudEvent(EventId);
public sealed record ScheduleHookEvent(
    Guid EventId, Guid ScheduleId, Guid OccurrenceId) : MudEvent(EventId);
// Source-level combat connection contracts. Host computes these; scripts cannot set session state.
public enum CombatControlState { Online, LinkLost, GracePeriod, Offline }
public sealed record CombatConnectionSnapshot(
    CombatControlState State, DateTimeOffset? DisconnectedAt,
    DateTimeOffset? GraceDeadline, Guid? LastAcceptedIntentId,
    uint ControllingSessionCount, string ReasonCode, ulong Revision);
public sealed record CombatControlEvent(
    Guid EventId, Guid EncounterId, EntityRef Character,
    CombatConnectionSnapshot Before, CombatConnectionSnapshot After,
    DateTimeOffset OccurredAt, string CauseCode) : MudEvent(EventId);
public sealed record HostHookEvent(Guid EventId, string LifecycleCode) : MudEvent(EventId);
public sealed record AccessHookEvent(
    Guid EventId, EntityRef Subject, EntityRef Object, string AccessKey,
    bool EngineAllowed) : MudEvent(EventId);
public sealed record QueryHookEvent(
    Guid EventId, string Key, string DefaultValue) : MudEvent(EventId);

public enum QueryDisposition { KeepDefault, ReplaceText, Deny }
public sealed record HookQueryResult(QueryDisposition Disposition, string? Text, ErrorCode? Reason)
{
    public static HookQueryResult Keep() => new(QueryDisposition.KeepDefault, null, null);
    public static HookQueryResult ReplaceText(string text) =>
        new(QueryDisposition.ReplaceText, text, null);
    // A query may DENY (e.g. accessibility/visibility), never grant access
    // denied by native engine authentication or authorization.
    public static HookQueryResult Deny(string safeError) =>
        new(QueryDisposition.Deny, null, new ErrorCode(safeError));
}

public abstract record GameEffect(string OnceKey);
public sealed record StartQuest(EntityRef Actor, AssetRef Quest, string Key) : GameEffect(Key);
public sealed record CompleteQuest(Guid AttemptId, Guid EvidenceEventId, string Key) : GameEffect(Key);
public sealed record CreditObjective(Guid AttemptId, string ObjectiveKey, Guid EvidenceEventId, string Key)
    : GameEffect(Key);
public sealed record ChangeWorldEvent(AssetRef Definition, ScopeRef Scope, WorldEventAction Action, string Key)
    : GameEffect(Key);
public sealed record OpenQuiz(EntityRef Actor, AssetRef QuestionSet, Guid QuestAttemptId, string Key)
    : GameEffect(Key);
public sealed record RecordQuizResult(Guid QuizSessionId, bool IsCorrect, string Key)
    : GameEffect(Key);
public sealed record GrantRewardPlan(EntityRef Actor, AssetRef RewardPlan, Guid QuestAttemptId, string Key)
    : GameEffect(Key);
public sealed record RollRewardTable(EntityRef Actor, AssetRef RewardTable, Guid QuestAttemptId, string Key)
    : GameEffect(Key);
public sealed record ShowDialogue(EntityRef Actor, AssetRef Dialogue, string Key)
    : GameEffect(Key);
public sealed record EmitDomainEvent(EntityRef Actor, AssetRef EventDefinition, string Key)
    : GameEffect(Key);

public sealed record SetComponentField(
    EntityRef Owner, FieldRef Field, PropertyValue Value, ulong ExpectedVersion, string Key)
    : GameEffect(Key);
public sealed record AdjustComponentNumber(
    EntityRef Owner, FieldRef Field, double Delta, ulong ExpectedVersion, string Key)
    : GameEffect(Key);
public sealed record ClearComponentOverride(
    EntityRef Owner, FieldRef Field, ulong ExpectedVersion, string Key)
    : GameEffect(Key);
public sealed record WriteStateSlot(
    StateSlotRef Slot, PropertyValue Value, ulong ExpectedVersion, string Key)
    : GameEffect(Key);
public sealed record DeleteStateSlot(
    StateSlotRef Slot, ulong ExpectedVersion, string Key)
    : GameEffect(Key);

public sealed record HookDecision(
    HookDisposition Disposition,
    IReadOnlyList<GameEffect> Effects,
    ErrorCode? Reason = null,
    AssetRef? DeferredPrompt = null)
{
    public static HookDecision Continue() =>
        new(HookDisposition.Continue, Array.Empty<GameEffect>());
    public static HookDecision Append(params GameEffect[] effects) =>
        new(HookDisposition.Append, effects);
    public static HookDecision Replace(params GameEffect[] effects) =>
        new(HookDisposition.Replace, effects);
    public static HookDecision Veto(string errorCode) =>
        new(HookDisposition.Veto, Array.Empty<GameEffect>(), new ErrorCode(errorCode));
    public static HookDecision Defer(AssetRef prompt) =>
        new(HookDisposition.Defer, Array.Empty<GameEffect>(), null, prompt);
    public static HookDecision EnqueueAfter(params GameEffect[] effects) =>
        new(HookDisposition.EnqueueAfter, effects);
}

// AUTHORING CONTRACT: every entrypoint must be a public instance method
// HookDecision Handler(HookContext ctx, TEvent evt) for before/after hooks;
// HookQueryResult Handler(HookContext ctx, TEvent evt) for read-only query hooks.
// Build/runtime enforces manifest, phase, capabilities, deadline and effect allowlist.
// C# attributes and these DTOs are NOT the sandbox security boundary.
