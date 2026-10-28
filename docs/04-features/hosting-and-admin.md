# One-Click Hosting, Headless Operation and Administration

**Status:** REQUIRED one-click and command-run hosting; binding hosting lifecycle and UI. **Owner:** hosting supervisor + admin UI + CLI.

## Outcome
A nontechnical creator can click **Host World**, receive an accurate ready/failed state and connection details, and run the game with minimal setup. A Linux/cloud operator performs the same lifecycle via a documented headless command, config and service model. Editor is not required at runtime. Hosting is a product capability, not a demo socket server with a Start button.

## GUI journey
1. Select saved world + published release or invoke **Publish & Host** wizard; validate project dependencies, component schemas, graph compile, scripts, host permissions, engine version and resource requirements.
2. Choose hosting target (supported local machine or configured remote/managed host); choose private/LAN/public visibility only where supported. Resolve port/TLS/storage configuration and show limitations.
3. Start -> show phases: validating, packaging, provisioning, loading state, binding, healthy, reachable; failure message states which phase and how to correct.
4. Once healthy, show join URL/host, connected clients, uptime, resource status, recent game errors and actions: stop/restart, backup, rollback, publish update, manage players.
5. Graceful stop broadcasts notice, rejects new commands, drains in-flight world transactions, takes consistent checkpoint, closes sessions and reports completion or timeout.
6. Failed restart or incompatible schema leaves prior working release and recoverable backup rather than corrupting data.

## Headless parity
Canonical operator command surface: mudmaker validate PROJECT; mudmaker host PROJECT --config FILE; mudmaker status INSTANCE; mudmaker stop INSTANCE; mudmaker backup INSTANCE; mudmaker restore INSTANCE BACKUP. Exact spelling is not locked; commands must use same supervisor and validation pipeline as GUI. Document all config keys, required environment variables, secret storage, nonzero exit codes and stdout/stderr format; no default production secret keys.

## Instance lifecycle
States: Stopped, Validating, Starting, Loading, Healthy, Degraded, Stopping, Failed (canonical). Idempotent start/stop; world ID + release pin + instance ID unique. Hosting supervisor manages process/service; runtime manages ECS; gateway manages sessions. Health needs functional readiness, not just port open: verify world loaded and commands can be processed.

## Remote hosting
Local host cannot guarantee an external public address through NAT. The UI explains accessibility and may guide port/TLS setup or managed connection path when implemented. Do not claim one-click public internet availability until actual supported transport is in place. Multiple instances, quotas, log retention, hot updates, persistent volumes, restart policies and backup destinations require operational architecture decisions.

## Admin and safety
Creator roles: owner, admin, editor, moderator, player and guest as configured; least privilege, audit log and multi-user changes. Never expose private player data or script secrets in logs. Admin mutations go through authorized command gateway. Backups encrypted/protected according to deployment policy. Restore and live schema migration require confirm and dry-run compatibility check.

## Acceptance
- Same game package launches from GUI and CLI with equivalent simulation behavior.
- Local desktop creator starts a valid world and joins with second client; on a headless Linux host only CLI/config are needed.
- Bad port, invalid graph, bad database migration, lost permissions and failing script cause accurate failure and no half-deployed world.
- Graceful stop/restart preserves train progress, passenger location, inventory, scheduled NPC/resource/weather systems and published version.
- Admin can observe failed script with meaningful trace; authenticated non-admin cannot control server or inspect private state.
- Cross-OS packaging has actual tested matrix and documented unsupported targets.
