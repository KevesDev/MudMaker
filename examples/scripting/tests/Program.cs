// Runnable source-level behavior assertions against real C# v1 SDK examples.
// Does NOT claim integration with C++ ECS, host supervisor or persistent storage.
// Run: dotnet run --project examples/scripting/tests/MudMaker.ScriptContractChecks.csproj
#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using MudMaker.Examples;
using MudMaker.Examples.HookFamilies;
using MudMaker.Scripting.V1;

namespace MudMaker.Examples.Tests;

internal static class Program
{
    private static int _checks;
    private static AssetRef Asset(string id) => new(Guid.Parse(id), 1);
    private static EntityRef Entity(Guid worldId, ulong id) => new(worldId, id, 1);
    private static void Check(bool assertion, string caseName)
    {
        if (!assertion) throw new Exception("FAIL: " + caseName);
        _checks++;
        Console.WriteLine("PASS: " + caseName);
    }

    private static HookContext Context(
        Guid worldId, Guid requestId, string name,
        QuestAttemptSnapshot? q1, QuestAttemptSnapshot? q2,
        bool aboard = false, bool transit = false, bool ready = false)
    {
        var dictionary = new Dictionary<Guid, QuestAttemptSnapshot>();
        if (q1 != null) dictionary.Add(q1.Quest.Id, q1);
        if (q2 != null) dictionary.Add(q2.Quest.Id, q2);
        var train = Asset("0c000000-0000-4000-8000-000000000003");
        return new HookContext(
            Guid.NewGuid(), requestId, Asset("00000000-0000-4000-8000-000000000001"),
            Entity(worldId, 101),
            new ActorSnapshot(Entity(worldId, 202), name, name.ToLowerInvariant(),
                dictionary, aboard ? new HashSet<AssetRef> { train } : new HashSet<AssetRef>()),
            Entity(worldId, 303),
            new WorldReadSnapshot(worldId, 51,
                transit ? new HashSet<AssetRef> { train } : new HashSet<AssetRef>(),
                new HashSet<AssetRef>()),
            new FieldReadSet(Array.Empty<ComponentFieldSnapshot>()),
            new StateReadSet(Array.Empty<StateSlotSnapshot>()),
            HookPhase.Before);
    }

    private static int Main()
    {
        var world = Guid.NewGuid();
        var request = Guid.NewGuid();
        var eventId = Guid.NewGuid();
        var q1Def = Asset("0c000000-0000-4000-8000-000000000001");
        var q2Def = Asset("0c000000-0000-4000-8000-000000000002");
        var q1 = new QuestAttemptSnapshot(q1Def, Guid.NewGuid(), QuestState.Active,
            new HashSet<string>());
        var q2 = new QuestAttemptSnapshot(q2Def, Guid.NewGuid(), QuestState.Active,
            new HashSet<string> { "board_midnight_express" });

        var scripts = new MidnightExpressHooks();
        var bobContext = Context(world, request, "Alice", q1, null);
        var bob = scripts.BobAccept(bobContext,
            new DialogueChoiceEvent(eventId, Guid.NewGuid(), "accept_rail_job"));
        Check(bob.Disposition == HookDisposition.Replace &&
              bob.Effects.OfType<CompleteQuest>().Count() == 1 &&
              bob.Effects.OfType<StartQuest>().Count() == 1 &&
              bob.Effects.OfType<ChangeWorldEvent>().Count() == 1,
              "Bob accepts and proposes Q1 completion + Q2 start + storm");
        Check(scripts.BobAccept(bobContext,
            new DialogueChoiceEvent(eventId, Guid.NewGuid(), "unknown")).Disposition ==
              HookDisposition.Continue, "Bob unrelated choice continues default");

        var aboard = Context(world, request, "Alice", null, q2, aboard: true, transit: true);
        var conductor = scripts.ConductorInteract(aboard, new NpcInteractEvent(eventId));
        Check(conductor.Disposition == HookDisposition.Replace &&
              conductor.Effects.Single() is OpenQuiz, "Conductor opens quiz while moving");
        var station = Context(world, request, "Alice", null, q2, aboard: false);
        Check(scripts.ConductorInteract(station, new NpcInteractEvent(eventId)).Disposition ==
              HookDisposition.Veto, "Conductor refuses quiz if player not aboard");

        var wrong = scripts.ConductorQuizResult(aboard,
            new QuizEvaluatedEvent(eventId, Guid.NewGuid(), false, true));
        Check(wrong.Effects.OfType<CreditObjective>().Count() == 0,
              "Wrong answer cannot credit objective");
        var right = scripts.ConductorQuizResult(aboard,
            new QuizEvaluatedEvent(eventId, Guid.NewGuid(), true, true));
        Check(right.Effects.OfType<CreditObjective>().Count() == 1,
              "Correct server-checked answer proposes objective credit");
        var forged = scripts.ConductorQuizResult(aboard,
            new QuizEvaluatedEvent(eventId, Guid.NewGuid(), true, false));
        Check(forged.Disposition == HookDisposition.Veto,
              "Unowned quiz session is refused");

        var joe = scripts.JoeGreeting(aboard,
            new DialogueChoiceEvent(eventId, Guid.NewGuid(), "tell_joe_bob_sent_me"));
        Check(joe.Disposition == HookDisposition.Append &&
              joe.Effects.OfType<CreditObjective>().Count() == 1,
              "Joe dialogue credits last objective");
        var q2Ready = q2 with { State = QuestState.ReadyToTurnIn };
        var alice = Context(world, request, "Alice", null, q2Ready);
        var pat = Context(world, request, "Pat", null, q2Ready);
        var turnedIn = scripts.JoeTurnIn(alice, new QuestTurnInEvent(eventId, q2.AttemptId));
        Check(turnedIn.Effects.OfType<RollRewardTable>().Count() == 1 &&
              turnedIn.Effects.OfType<GrantRewardPlan>().Count() == 1 &&
              turnedIn.Effects.OfType<ChangeWorldEvent>().Count() == 1,
              "Alice turn-in requests optional bonus, base pass, storm stop");
        var sameRequest = scripts.JoeTurnIn(alice, new QuestTurnInEvent(eventId, q2.AttemptId));
        Check(turnedIn.Effects.Select(x => x.OnceKey).SequenceEqual(
              sameRequest.Effects.Select(x => x.OnceKey)),
              "Repeated request produces identical onceKeys");
        Check(!scripts.JoeTurnIn(pat, new QuestTurnInEvent(eventId, q2.AttemptId))
              .Effects.Any(x => x is RollRewardTable),
              "Pat receives no name-based bonus roll");
        Check(scripts.JoeTurnIn(aboard,
            new QuestTurnInEvent(eventId, q2.AttemptId)).Disposition == HookDisposition.Veto,
            "Joe turn-in requires ready quest state");

        var moderator = new ChannelsAndMessages();
        Check(moderator.ModerateMessage(aboard,
            new ChannelHookEvent(eventId, Guid.NewGuid(), aboard.Actor.Ref,
                new string('x', 501), null)).Disposition == HookDisposition.Veto,
            "Oversized channel message is vetoed");
        var command = new AccountsAndCommands();
        Check(command.PreventTeleportCommand(aboard,
            new CommandHookEvent(eventId, "teleport", "harbor")).Disposition ==
                HookDisposition.Veto,
            "Host command intercept disables teleport");
        Console.WriteLine($"Source-level SDK behavior checks passed: {_checks}");
        return 0;
    }
}
