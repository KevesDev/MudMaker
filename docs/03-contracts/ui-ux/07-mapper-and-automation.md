# 07 — Client-local mapper, aliases, triggers, timers and hotkeys

**Owner:** `ClientApp.PersonalMapStore` and `LocalAutomationEngine`. Both exist only in Player Client, never as Editor map/quest/script engine services.

## Mini mapper data
A `LocalRoom` has `profileId, localRoomId, displayName, area, seenAt, coordinateHint?, serverRoomKey?, source, confidence, notes, tags`; `LocalExit` has `from, to?, directionOrCommand, observedAt, source, verified, blocked?`. Source: `mudmakerVerified`, `thirdPartyStructured`, `textInferred`, `manual`. Confidence is explicit `confirmed/likely/unknown/conflict`. A real world may use non-Euclidean exits, teleporters, moving interiors, portal aliases, identical names or dynamic doors; **a 2D grid is a convenience, never authority**.

Mapper state machine: Unmapped → Observing → Candidate → Confirmed; conflicts enter Review and do not auto-merge rooms. For native MudMaker authorized location IDs map can be immediate as subject to fog-of-war/visibility; do not expose hidden exits. Third-party GMCP room identity may be stable when game defines it; check per profile. Text inferred room change remains candidate until distinct evidence or user confirms. Map auto-walk is opt-in, sequential **one navigation command per confirmed receipt/observation**; pause on uncertainty, combat, disconnect or rate limit. User can bookmark, annotate, manually connect/disconnect, undo edits and export maps without credential data.

## Client automation rules
- **Alias**: local typed-command macro from user input to another bounded text string or a small ordered batch with clear preview. Same user permission at remote game; never bypass rate limits.
- **Trigger**: match on sanitized text events (substring/anchored literal first; safe/timeout-limited regex optional), then highlight, color, route pane, notify, add map hint or explicitly approved auto-send.
- **Timer**: interval schedule with documented minimum, pause on disconnect and after app sleep; max queued actions bounded. No catch-up flood.
- **Hotkey/hotbutton**: user binds a validated action or literal command to key/UI button with scope and conflict check. Never interpret editor keyboard chords in Client.
- **Profile packages**: import/export *declarative client profiles* with preview/permissions and disabled auto-send by default. Not executable scripts. Downloaded Lua or other scripting packages are never silently run; future plugin sandbox requires its own owner-approved security design.
- **Dry-run simulator**: given sample server output, show which triggers match, what UI highlight/route occurs and what commands *would be sent*, but do **not** send until user explicitly tests live.

## Rich UX with no programming
Client Settings > Automation: tabs Aliases / Triggers / Timers / Hotkeys / Buttons; list with search/scope/Enabled and Add/Edit/Copy/Delete/Import/Export. Detail form has name, pattern, action, testing input, output preview, dry-run, active world and permission warning. Common recipes (highlight your name, direct tells to separate window, hotbutton for look, timer for reminder) work without scripts. MUSHclient documents aliases, triggers, timers and plugin grouping; Mudlet supports user customization and mapping. This is an accessible built-in version, not a C# client code executor.

## Safety and tests
No automatic connect/send after importing unknown package. Disabled triggers cannot run; recursive trigger loops and alias expansion have expansion/count/time ceilings. Dynamic external output cannot create local UI actions, privileged commands or filesystem access. A trigger that highlights a long RP line must not change what the server received; alias only transforms explicit outgoing command mode as configured. Fuzz regex budget, ANSI-stripped matching, multilingual text, excessive event volume and slow map inference. Stop Auto Walk button always visible when active. Offline notes/map remain accessible and editable.
