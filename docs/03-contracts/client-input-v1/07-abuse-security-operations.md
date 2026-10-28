# 07 — Internet Abuse, Host Safety and Operational Response

**DECIDED threat controls; not yet tested.** The host publishes **only locally authored game code**. Remote client text is data/commands and is never compiled. This is separate from a malicious/buggy host-owned script, which is isolated by the script worker. No software-only defense can absorb all volumetric floods on a home internet link.

## Threat matrix (owner / prevention / safe failure / evidence)
| Threat | Layer and prevention | Failure response / telemetry | Test |
|---|---|---|---|
| Connection floods or unauthenticated sockets | Edge admission, handshake deadline, global/preauth/IP caps, trusted proxy setup | close/deny early, counters and edge saturation warning | SYN/WebSocket upgrade load; no world actor delay |
| Auth guessing / session theft | TLS, credential defense, server-generated session/actor binding, revocation, source+principal throttles, browser Origin/CSRF policy | generic error, revoke; no account existence leak | wrong password / logout / replay |
| Many tiny packets / expensive fragmentation | maximum frame/assembly bytes, deadlines, per-source byte bucket | reject before allocating, record byte/packet class | fragmented frames, byte drip |
| Decompression bombs / parser depth | v1 WS compression disabled, bounded messages/depth/fields/arrays | invalid frame close; no memory growth | oversized JSON/protobuf / repeat fields |
| Spam and high fanout RP | per-chat/post rate and byte-weighted fanout budgets, bounded audience projection | 429/RATE_LIMITED and retryAfter; no half-save | 16KiB text to crowded room repeatedly |
| Script/permission injection | static local host bindings, no source upload, typed action whitelist, server-side actor ACL, no eval | deny/record violation; opaque errors | arbitrary hook names, forbidden effect fields |
| Command alias shadows | explicit override policy, reserved system actions, normalized alias collision check | reject release or safe ambiguity; no hidden leaks | shadow `logout`, `admin`, `north` |
| Hidden object guessing / quest phasing | validated world/gen references, observer filtering, server-only target selection | `TARGET_UNAVAILABLE` without NPC identity | two players in same room, only one sees Joe |
| Unicode and terminal injection | UTF-8 strict, typed field validation, sink-specific encoding, strip control sequences for terminal and logs | field error; do not execute or log raw control chars | bidi/OSC/ANSI/XSS/SQL tests |
| Resource starvation | fair queues per session/world, bounded ECS/worker work and outbound buffers | `SERVER_BUSY` with retry, no accepted state lost | one flooder alongside normal client |
| Replay / reordered input | idempotency ledgers, per-session sequence, compare-and-swap state versions | duplicate returns prior receipt, stale rejects | disconnect/retry during item transfer |
| Log / storage abuse | metadata-only bounded logging, quotas/retention, per-owner edit limits | rate limit and alert; never store full attack payload | long post and duplicate request storm |
| Sensitive data exposure | never emit credentials/raw tokens/hidden object refs; role-scoped operator UI | redacted structured audit; private fields encrypted/guarded | logs/admin UI access test |

## DDoS limits of responsibility
MudMaker server protects **application availability** with early rejects, budgets, no high-cost preauth work and queue fairness. **Network-volume DDoS** can still saturate a host connection before packets reach MudMaker. Local hosting help must recommend optional upstream reverse proxy/provider mitigation, rate limiting at TLS edge, provider firewall and secure port forwarding. No promise of DDoS immunity. If proxy used, only consume trusted proxy forwarded IP metadata; otherwise a forged header can evade caps.

## Host UI & alerts
A **Security / Traffic** panel shows connected sessions, authenticated vs unauthenticated, input rate by class, rejected frames, repeated auth failures, token bucket depletion, queue depth, work latency, slow consumers and protocol compatibility. Host can adjust gameplay limits within compiled protective hard ceilings, disconnect/kick, ban with audit, enable maintenance mode and save an incident diagnostic bundle **without private RP post bodies**. Normal players see a humane rate-limit reason and retry time; never see IP lists or internal signatures.

## Logging and alert rules
Every log has timestamp, host/world, connection trace, pseudonymous actor, request/action class, policy ID/revision, size, latency, rate bucket and rejection reason. Sensitive token, raw credentials, full user content and unescaped control bytes excluded. Support controlled rotating logs and retention; no blocking disk flush on world tick. Alerts use rate thresholds and avoid notification flood. Moderation and user reports are content-policy features separate from intrusion detection; accepting an RP post is not a guarantee it is appropriate.

## Exposed script API
The game host may attach custom commands and edit command-specific rate classes within host operator bounds. **No script effect** can disable gateway framing, auth/authorizer, audit logs, anti-flood limits, world ownership or critical system commands. Advanced host-operated code that explicitly invokes integration APIs still follows OS/worker isolation and capability review.

## Sources
OWASP [WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html), [Denial of Service](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html), [Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html), [XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html). All attack/capability scenarios remain integration-test obligations.
