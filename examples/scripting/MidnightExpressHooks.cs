// Source-level C# SDK v1 example. Compiles against Contracts.cs after SDK project setup,
// but NOT an executable game without worker, compiler, host and ECS implementations.
#nullable enable
using System;
using MudMaker.Scripting.V1;

namespace MudMaker.Examples;

[MudScript("mudmaker.examples.midnight-express")]
public sealed class MidnightExpressHooks
{
    // Version-pinned, editor-resolved asset GUIDs — never lookup by mutable display name.
    private static AssetRef Asset(string id) => new(Guid.Parse(id), 1);
    private static ScopeRef Scope(string id) => new(Guid.Parse(id), 1);
    private static string Once(HookContext ctx, string action) => $"{ctx.RequestId:N}:{action}";

    private static readonly AssetRef TalkToBob = Asset("0c000000-0000-4000-8000-000000000001");
    private static readonly AssetRef FindJoe = Asset("0c000000-0000-4000-8000-000000000002");
    private static readonly AssetRef Train = Asset("0c000000-0000-4000-8000-000000000003");
    private static readonly AssetRef Storm = Asset("0c000000-0000-4000-8000-000000000004");
    private static readonly AssetRef Quiz = Asset("0c000000-0000-4000-8000-000000000005");
    private static readonly AssetRef RailPass = Asset("0c000000-0000-4000-8000-000000000006");
    private static readonly AssetRef BonusTable = Asset("0c000000-0000-4000-8000-000000000007");
    private static readonly AssetRef WrongAnswerText = Asset("0c000000-0000-4000-8000-000000000008");
    private static readonly AssetRef CorrectAnswerText = Asset("0c000000-0000-4000-8000-000000000009");
    private static readonly ScopeRef HarborRegion = Scope("0c000000-0000-4000-8000-000000000010");

    // Binding target: Bob NPC, before an authored dialogue choice is committed.
    [MudHook("dialogue.choice.before")]
    public HookDecision BobAccept(HookContext ctx, DialogueChoiceEvent e)
    {
        var q = ctx.Actor.Quest(TalkToBob);
        if (e.ChoiceKey != "accept_rail_job" || q?.IsActive != true)
            return HookDecision.Continue();

        return HookDecision.Replace(
            new CompleteQuest(q.AttemptId, e.EventId, Once(ctx, "bob-complete")),
            new StartQuest(ctx.Actor.Ref, FindJoe, Once(ctx, "start-find-joe")),
            new ChangeWorldEvent(Storm, HarborRegion, WorldEventAction.Start,
                                 Once(ctx, "storm-start")));
    }

    // Binding target: Conductor NPC, before default interaction.
    [MudHook("npc.interact.before")]
    public HookDecision ConductorInteract(HookContext ctx, NpcInteractEvent e)
    {
        var q = ctx.Actor.Quest(FindJoe);
        if (q?.IsActive != true) return HookDecision.Continue();
        if (!ctx.Actor.AboardVehicles.Contains(Train))
            return HookDecision.Veto("TRAIN_BOARD_REQUIRED");
        if (!ctx.World.InTransitVehicles.Contains(Train))
            return HookDecision.Veto("TRAIN_NOT_MOVING");

        return HookDecision.Replace(
            new OpenQuiz(ctx.Actor.Ref, Quiz, q.AttemptId, Once(ctx, "conductor-quiz")));
    }

    // Binding target: server quiz-evaluation event, after sealed answer check.
    // No answer key or player-claimed "isCorrect" is trusted here.
    [MudHook("quiz.evaluated.before")]
    public HookDecision ConductorQuizResult(HookContext ctx, QuizEvaluatedEvent e)
    {
        var q = ctx.Actor.Quest(FindJoe);
        if (q?.IsActive != true || !e.SessionOwnedByActor)
            return HookDecision.Veto("QUIZ_SESSION_INVALID");

        if (!e.IsCorrect)
            return HookDecision.Replace(
                new RecordQuizResult(e.QuizSessionId, false, Once(ctx, "quiz-record")),
                new ShowDialogue(ctx.Actor.Ref, WrongAnswerText, Once(ctx, "quiz-wrong-text")));

        return HookDecision.Replace(
            new RecordQuizResult(e.QuizSessionId, true, Once(ctx, "quiz-record")),
            new CreditObjective(q.AttemptId, "pass_conductor_quiz",
                                e.EventId, Once(ctx, "quiz-credit")),
            new ShowDialogue(ctx.Actor.Ref, CorrectAnswerText, Once(ctx, "quiz-right-text")));
    }

    // Separate dialogue command credits the final TalkToJoe objective.
    // Only then does quest state become ReadyToTurnIn in the authoritative engine.
    [MudHook("dialogue.choice.before")]
    public HookDecision JoeGreeting(HookContext ctx, DialogueChoiceEvent e)
    {
        var q = ctx.Actor.Quest(FindJoe);
        if (q?.IsActive != true || e.ChoiceKey != "tell_joe_bob_sent_me")
            return HookDecision.Continue();

        return HookDecision.Append(
            new CreditObjective(q.AttemptId, "talk_to_joe",
                                e.EventId, Once(ctx, "joe-dialogue-credit")));
    }

    // Binding target: FindJoe quest turn-in at Joe's NPC.
    // Before hook can replace defaults only when ready-to-turn-in.
    [MudHook("quest.turn_in.before")]
    public HookDecision JoeTurnIn(HookContext ctx, QuestTurnInEvent e)
    {
        var q = ctx.Actor.Quest(FindJoe);
        if (q is null || !q.ReadyToTurnIn || q.AttemptId != e.AttemptId)
            return HookDecision.Veto("QUEST_NOT_READY");

        var completion = new System.Collections.Generic.List<GameEffect>
        {
            new CompleteQuest(q.AttemptId, e.EventId, Once(ctx, "finish-find-joe")),
            new ChangeWorldEvent(Storm, HarborRegion, WorldEventAction.Stop,
                                 Once(ctx, "storm-stop")),
            new GrantRewardPlan(ctx.Actor.Ref, RailPass, q.AttemptId, Once(ctx, "rail-pass"))
        };
        if (ctx.Actor.NameKey.StartsWith("A", StringComparison.Ordinal))
            completion.Add(new RollRewardTable(
                ctx.Actor.Ref, BonusTable, q.AttemptId, Once(ctx, "bonus-roll")));

        return HookDecision.Replace(completion.ToArray());
    }
}
