# Centralized Input and Command Execution Contract

**Status:** REQUIRED unified ownership; PROPOSED interface. **Owner:** frontend Input Manager (physical) + server CommandService (game semantics).

## Different concerns
**Frontend Input Manager** owns keyboard focus, pointer/touch/pen gestures, shortcut scopes, panel activity, text composition, accessibility actions, editor undo/redo shortcut routing. It translates device events into semantic **UI intents** such as SelectCell, OpenPalette, EditExit, InvokeGameCommand. It is instantiated once per active editor shell, not inside random components.
**Server CommandService** owns game grammar, aliases, parsing, canonical action IDs, argument typing, permission and precondition validation, execution scheduling, errors and help metadata. Different clients and transport handlers may submit requests but cannot implement alternate game rules.
**ECS command executor** owns atomic state transitions invoked by validated command intents. Text command parser must not be reused as ad-hoc UI gesture parser.

## Proposed command envelope
Required fields: requestId (idempotency), worldId, sessionId, actorEntityId (if gameplay), actionId or rawText, typed arguments, expected world/subject version where appropriate, origin/client protocol version. Response: correlation/requestId, status (success / validation / permission / stale / unavailable / internal), structured user-facing details, affected entity references where authorized, new world revision.

## Pipeline
1. Physical input -> UI intent only when focus context allows.
2. Client serializes action request; does not claim authority or modify committed world.
3. Gateway authenticates session, enforces command size/rate budget.
4. CommandService resolves grammar/action/arguments; command registry is one lookup source.
5. Authorizer validates actor/session/entity context and domain capability.
6. Executor validates world state, capacity, exit conditions and other preconditions against current committed revision; applies one transaction.
7. Durable commit + ordered events; clients update view from events or confirmed response.
8. Errors retain state and provide meaningful reason.

## Required commands and extension
Game authors can declare commands with aliases, typed parameters, visibility/help, permissions, descriptions, rate/cooldown and graph/script handlers. System-built actions (Move, Interact, PickUp, Drop, Examine, Use, Enter, Leave) are capability-driven, not permanently hardcoded to a narrow game genre. Command IDs are namespaced; duplicate names/aliases resolve by declared precedence and conflict diagnostics, never silently shadow.

## Train-specific command contract
- Move within train car while route InTransit succeeds through internal exit.
- Use board exit at station only while Docked with correct platform match, doors open and actor authorized.
- Command that races a departure sees a single committed state and either succeeds before departure or fails after; cannot leave actor in two places.
- Rejected lock message and exit visibility must reflect configured policy; no information leak about hidden destinations.

## Negative cases
- Typing in name/description text field cannot send game command.
- Touch gesture cannot trigger a keyboard-only shortcut.
- Invalid or unauthorized entity references rejected without existence leak beyond policy.
- Replay duplicated requestId does not perform a second transfer/spawn.
- Unknown command returns structured help/error, not bare println/log.
- All client types call the exact same server command service and ECS executor.
