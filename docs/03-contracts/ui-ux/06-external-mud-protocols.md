# 06 — Connecting to non-MudMaker MUDs: transport contracts

**Selected support target:** native MudMaker-protocol client + separate **Telnet/TLS MUD adapter** with optional GMCP, ANSI, CHARSET, NAWS, MCCP, MXP and MSDP compatibility where server negotiates them. Availability is detected, per-server and safe by default. A generic MUD cannot guarantee room identity or RP post semantics. [Mudlet supported protocols](https://wiki.mudlet.org/w/Manual:Supported_Protocols) and [Evennia web client](https://www.evennia.com/docs/latest/Components/Webclient.html) inform these boundaries.

## Adapter interface (same Client shell)
`ConnectionAdapter` defines `connect(endpoint,credentials?)`, `capabilities()`, `sendCommand(rawText)`, `sendStructuredAction(typedArgs)` **only for MudMaker adapter**, `disconnect/reconnect`, and streams normalized `ClientOutputEvent` with origin/capability/confidence. The Player shell never sees untrusted socket bytes or protocol negotiation tokens. `MudMakerAdapter` uses authenticated versioned ClientEnvelope and native structured projection; `TelnetMudAdapter` parses negotiated Telnet commands + ANSI and emits text/prompt/optional structured GMCP events. No third-party game loads C# or knows a MudMaker project ID.

## Parser safety
Bound each inbound TCP chunk, telnet subnegotiation length, compressed/decompressed output bytes, number of ANSI/OSC control sequences and CPU time (time-based deadline and byte cap); incremental state machine across fragmented IAC/ANSI/UTF-8. Reject malformed negotiation and compression bombs with disconnect/recoverable error. No arbitrary HTML or browser DOM execution from server. ANSI SGR is mapped to safe spans. OSC/terminal escape codes not on allowlist are ignored, and logs/screenreader remain clean. MXP formatting/actions require explicit trust and sanitized limited grammar; never turn server link into local file/openUrl without confirmation and allowed schemes. GMCP JSON has depth/array/bytes restrictions and allowlisted module names, server-reported character/room IDs scoped to that connection. External server may request protocol enable; user preference and capability gates still apply.

## Security/persistence
Profile credentials saved in platform secure storage where supported; password echo suppression; don't log or put credentials in exported profile files. TLS certificate validation required on secured connections, no silent bypass. Plain telnet can be chosen only with clear persistent warning and separate per-profile opt-in; never automatically downgrade from TLS to plain on connection failure. Untrusted plugins/packages/autoupdate code **disabled** for all remote servers unless a future separately audited consent flow exists (not in v1). Local aliases/triggers run as user-owned config and cannot touch OS files/network outside approved client actions.

## Capability progression
1. **Basic**: TCP/telnet text input/output, ANSI colors, history, search, copy, logging and manual map notes.
2. **Negotiated**: NAWS, CHARSET, MCCP, GMCP, timestamps/room/vitals if supplied, safe bounded parser and optional tabs.
3. **Optional extras**: MXP links, MSDP, server media metadata, server prompt customization with explicit trust, user enable/disable toggles and tests. Lack of a protocol must not block ordinary gameplay.
4. **MudMaker native**: exact typed action/quest/inventory/map events, authorization-aware buttons, world status, short RP/long builder-command distinction via explicit message kind.

## Acceptance
Connect to two different *non-MudMaker* server fixtures: bare telnet+ANSI and GMCP+compression+fragmentation; enter text, receive output, save profile, reconnect without exposing secrets. Third-party server forges an Admin toolbar command/theme/script package: UI ignores it. External mapping lacking room IDs shows manual/inferred state, not fictitious exact coordinates. TLS invalid cert fails securely; plain-text requires warning. High-volume spam cannot exhaust transcript DOM.
