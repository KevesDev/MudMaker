# Client Protocol, Game Sessions and Hosting Interface

**Status:** binding transport/hosting responsibilities; runtime pending. **Owner:** gateway + sessions + hosting supervisor. **Depends:** command pipeline, persistence, security.

## Interfaces
Project/editor requests use authenticated typed local service operations for CRUD, preview and publishing; live game commands/events use an authenticated versioned bidirectional channel, with pluggable adapters including telnet/structured protocols where supported. Headless hosting uses the same HostSupervisor as GUI hosting. Preserve the same domain payloads and validation for desktop/tablet/browser clients. Traditional telnet, SSH or other legacy MUD protocols are OPEN and should be adapter work, not alternate engine implementations.

## Mandatory protocol envelope
Message carries protocolVersion, type, world/instance ID, session ID (where applicable), request/correlation ID, monotonic sequence for live events, payload schema version and structured errors. Contract versioning and compatibility matrix are mandatory. Connection retry/resume semantics must never duplicate a command or expose unauthorized state.

## Per-observer phase and narration projection
Server-to-client room lists, targetability, dialogue choices, descriptions, player-facing action messages and subscriptions must be filtered per actor/observer and quest progress. Two players in same room may see different NPCs. Direct hidden entity ID requests are denied server-side. See [quest runtime](../02-architecture/quest-progression-and-phasing.md) and [narration](narration-and-observers.md).

## Sessions
- Authenticated player bound to authorized character entity. Socket address is not a secure identity.
- A single account may authorize multiple sessions and multiple character records; character control must be explicit per session, and conflicting control follows owner-published policy with host-exclusive intent admission and audit.
- Disconnect, resume, reconnect, session expiry, character ownership and queued command cancellation have explicit state machine and tests.
- Authorization applies to editing, publishing, viewing world admin data, playing, scripting, and export/import.
- Event views are filtered by world, visibility, actor permissions and subscription; clients cannot subscribe to arbitrary private component data.
- Backpressure, message size and outbound queue behavior must be bounded, configurable and measured; disconnect reasons are structured.

## Data flows
Game client submits InvokeAction. Server validates session->world and command->ECS; engine publishes committed events; gateway maps these to client-visible event projections. Editor submits DraftChange with asset version; validator responds with diagnostics, then SaveDraft; Deploy requests a controlled release of a versioned project.

## Hosting contract
Define WorldPackage (project artifact+engine compatibility+dependencies+manifest+checksums), RuntimeConfig (network binds, visibility, secrets references, storage, resources, startup policy), and InstanceState (Stopped, Starting, Healthy, Degraded, Stopping, Failed). State transitions are observable and idempotent.
A GUI “Host” button and headless "mudmaker host ..." command MUST invoke the same underlying HostingSupervisor operations. The canonical CLI entry is `mudmaker host --project <project-path> --release <release-id>` with validated arguments, local owner credentials and explicit lifecycle result codes.
One-click host must handle preflight, published artifact consistency, port conflict detection, storage readiness, script compile/sandbox checks, address/status and error reporting, and persistence. Hosting cannot be treated as an editor-only UI toggle.

## Local and remote
Browser/tablet uses hosted runtime; does not require Java process on tablet. Desktop may optionally bundle local runtime. Server/cloud uses headless service. Host must clearly distinguish loopback/LAN/public reachability, test actual listener/TLS conditions and present manual networking diagnostics. Managed hosting is not a v1 dependency; no public reachability claim follows from local startup. Connection instructions must distinguish localhost/LAN/public address and TLS requirements.

## Deployment and operations
- No deployment of invalid graph/components; exact failures shown to creator.
- Immutable published project revision; active instances pin revision until explicit controlled upgrade.
- Backup prior to deploy/migration; health, crash recovery, restart and rollback plans; status/logs without secrets.
- Administrative controls for session kick/roles, pause, safe shutdown, data export, audit logs and resource budgets.
- Metrics for instance starts, connect/auth latency, tick duration, queue lengths, event lag, memory, errors, DB/snapshot lag and script budgets.

## Tests
Run exact same sample project via desktop Host and headless CLI; multiple clients connect; session reconnect/idempotency; invalid port/script gives actionable failure; restart recovers train and players; unauthorized admin actions fail; public internet claim only when actual network test proves it.

## Host-owned local scripts and game-client protocol (selected)
Every user can make and host their own MudMaker game or join another host's game as a player. The hosting server reads **only that host's locally authored and explicitly published scripts**, from an immutable local release. Remote player connections may send authenticated typed gameplay actions and dialogue choices; **never** script source, compiled modules, executable graph plans, paths instructing the server to load code, or hook names granting arbitrary dispatch. The native host chooses applicable hooks from its installed binding registry after command authentication/target/phase checks. GUI and headless hosts run the same local release. Full technical contract: [local host integration](scripting-v1/08-local-host-integration.md).
