# 08 | Exact Local Host Script Loading and Player Input Contract

**DECIDED product boundary:** Every user can create their own game using MudMaker, run its hosted server locally or on their own provisioned host, and connect as a player to games other people host. The **game host** owns local source/project assets and explicit Publish/Host operations. Playing a game does not grant code authoring or scripting permissions over that game.

## Two independent paths

```mermaid
flowchart TB
  subgraph Owner["Local game owner / host"]
    E["Local editor creates ScriptAsset.cs and GraphAsset"] --> B["Local compile + validate"]
    B --> P["Owner publishes pinned world release"]
    P --> H["Host supervisor loads local release"]
    H --> S["Server authoritative ECS + local code worker"]
  end
  subgraph Players["Other players' MudMaker clients"]
    C["Client connects to remote host"] --> A["Authenticate; send typed gameplay input"]
    A --> G["Host's player command gateway"]
  end
  G --> V["Validate actor, room, phase and target"]
  V --> R["Select hook from host's installed release"]
  R --> S
  S --> T["Validate effect + commit and persist"]
  T --> O["Project visible result to players"]
  O --> C
```

**Network protocol disallows:** script source, C# assemblies, GraphAsset executable plans, filesystem paths instructing the host what to load, compiler directives, reflection targets, remote publish/deploy commands, arbitrary hook IDs submitted as trusted commands. Scripts are chosen from host-side pinned bindings after validating game input; the player cannot request an otherwise inaccessible hook.

**Security:** Bound input length/types, authenticate actors, apply rate limits, validate request IDs, reject hidden NPC guesses, malformed choices and fake success facts. Isolate the host's own code worker for fault containment and resource budgets. Host-approved field overrides are legitimate; player-initiated actions can trigger them only through game-defined authenticated permissions and release-bound hooks.

**Testing:** Connect two ordinary MudMaker clients to a host; exercise gameplay triggers and prove no endpoint reads or accepts script bytes from clients. The same local release runs through GUI host and headless host. No centrally managed game service is presumed.
