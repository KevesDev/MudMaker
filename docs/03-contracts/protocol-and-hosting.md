# Client Protocol, Game Sessions and Hosting Interface

**Status:** PROPOSED. **Owner:** gateway + sessions + hosting supervisor. **Depends:** command pipeline, persistence, security.

## Interfaces
Proposed distinction: project/editor REST-style operations for CRUD, asset validation, preview and deployment; authenticated live WebSocket-style channel for commands and server-origin events; headless CLI for host operations. Transport implementations are candidates, not finalized technology commitments. Preserve the same domain payloads and validation for desktop/tablet/browser clients. Traditional telnet, SSH or other legacy MUD protocols are OPEN and should be adapter work, not alternate engine implementations.

## Mandatory protocol envelope
Message carries protocolVersion, type, world/instance ID, session ID (where applicable), request/correlation ID, monotonic sequence for live events, payload schema version and structured errors. Contract versioning and compatibility matrix are mandatory. Connection retry/resume semantics must never duplicate a command or expose unauthorized state.

## Per-observer phase and narration projection
Server-to-client room lists, targetability, dialogue choices, descriptions, player-facing action messages and subscriptions must be filtered per actor/observer and quest progress. Two players in same room may see different NPCs. Direct hidden entity ID requests are denied server-side. See [quest runtime](../02-architecture/quest-progression-and-phasing.md) and [narration](narration-and-observers.md).

## Sessions
- Authenticated player bound to authorized character entity. Socket address is not a secure identity.
- Single-account/multiple-client and multiple-character policies are OPEN.
- Disconnect, resume, reconnect, session expiry, character ownership and queued command cancellation have explicit state machine and tests.
- Authorization applies to editing, publishing, viewing world admin data, playing, scripting, and export/import.
- Event views are filtered by world, visibility, actor permissions and subscription; clients cannot subscribe to arbitrary private component data.
- Backpressure, message size and outbound queue behavior must be bounded, configurable and measured; disconnect reasons are structured.

## Data flows
Game client submits InvokeAction. Server validates session->world and command->ECS; engine publishes committed events; gateway maps these to client-visible event projections. Editor submits DraftChange with asset version; validator responds with diagnostics, then SaveDraft; Deploy requests a controlled release of a versioned project.

## Hosting contract
Define WorldPackage (project artifact+engine compatibility+dependencies+manifest+checksums), RuntimeConfig (network binds, visibility, secrets references, storage, resources, startup policy), and InstanceState (Stopped, Starting, Healthy, Degraded, Stopping, Failed). State transitions are observable and idempotent.
A GUI “Host” button and headless "mudmaker host ..." command MUST invoke the same underlying HostingSupervisor operations. Actual CLI spelling is PROPOSED pending tooling ADR; do not hardcode as final until accepted.
One-click host must handle preflight, published artifact consistency, port conflict detection, storage readiness, script compile/sandbox checks, address/status and error reporting, and persistence. Hosting cannot be treated as an editor-only UI toggle.

## Local and remote
Browser/tablet uses hosted runtime; does not require Java process on tablet. Desktop may optionally bundle local runtime. Server/cloud uses headless service. Network discovery, local NAT/port forwarding and managed-hosting offerings are OPEN: do not promise public reachability just because local process started. Connection instructions must distinguish localhost/LAN/public address and TLS requirements.

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
