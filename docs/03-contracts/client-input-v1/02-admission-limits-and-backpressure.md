# 02 — Connection Admission, Auth, Quotas and Backpressure

**DECIDED protocol/resource model; code and capacity measurements pending.** [Machine policy](../../../contracts/input/v1/default-policy.json) is source of numeric **initial product defaults**, not evidence of safe throughput. The host can tune within protected operator ceilings; calibrate with hardware/load tests in S07/S17/S18. All byte counts measured in **encoded UTF-8**, not UTF-16 code units.

## Connection state machine
`NEW → TLS_UPGRADE → AWAIT_AUTH → AUTHENTICATED → ATTACHED_TO_CHARACTER → CLOSED`. Require monotonically constrained transitions. `NEW` and `AWAIT_AUTH` have short handshake/auth timeouts, tiny input budgets, and global+source concurrency caps. No ECS world snapshot or character enumeration before auth. Browser WebSocket **Origin allowlist** at upgrade, cookies appropriately protected (SameSite and CSRF/token handling as applicable); native clients use authenticated TLS/channel binding policy. Revalidation on reconnect, logout, credentials change/ban, and session expiry. Never trust `X-Forwarded-For` except from explicitly configured trusted reverse proxies. Authenticate each typed message to current actor.

## Default policy matrix
Exact baseline values live in JSON and must be injected through `InputPolicy`, not repeated literals across parsers, UI or tests. Intentional initial UX:
- **CommandText**: one logical typed command, possibly long and multiline where its **host-published command grammar** explicitly supports that argument. The envelope's protective ceiling is not a heuristic for interpreting the message; a builder/moderator command can be long.
- **RP post** and **character description**: explicit `SubmitText` data kinds, permitted to be **short or long**; generous body limits, with line and paragraph caps as well as byte caps; do not truncate silently. GUI shows live counters and draft recovery.
- Authentication and chat have separate rate classes. Heavy writes, search, inventory query and message fanout have separate budgets; rate limits apply to action IDs even when UI bypasses typed command parser.
- All messages share a hard compressed/uncompressed framing bound. Reject size before allocation and re-check decoded content. No unbounded decompression, nested arrays, repeated fields, deep JSON objects or client-defined regex. v1 disables WebSocket compression on public player gateway unless it has dedicated tested decompression quotas.

## Resource admission strategy
1. Global open sockets + handshake sockets + sockets/IP (or proven principal) + account sessions; caps at gateway and host.
2. Pre-auth auth attempts/IP with sliding buckets and constant-cost failure path; add account-based counters but avoid unauthenticated username-based lockouts susceptible to nuisance denial.
3. Authenticated token buckets per principal and category: `navigation`, `interaction`, `chat`, `rp_post`, `profile_edit`, `search`, `admin`; separate **byte-work token bucket** charges processed bytes and expected fanout cost.
4. `queueDepthPerSession` and `queueDepthPerWorld` bounded with **weighted fair scheduling** so flooding one session cannot starve others; worker request concurrency and outbound mailbox bounds. No single player can reserve unlimited runtime jobs.
5. On soft budget exceed respond `RATE_LIMITED(retryAfter)` without invoking ECS/script; on sustained attempts throttle/close session and log reason. On hard queue saturation reject with `SERVER_BUSY`, preserve committed state and retryable idempotency; never silently drop an accepted state-changing command.
6. Outbound backpressure: capped per-connection output bytes/messages and send rate; coalesce superseded snapshots/presence updates, but **never silently coalesce transactional receipts, quest rewards, private dialogue choices, or critical events**. Slow consumers get resync marker or disconnect; reconnect snapshot + event cursor honors ACL.
7. Source fairness: NAT may place many legitimate players on one IP. Use account/session controls after auth and avoid a rigid per-IP player cap as sole rule. Host administration can see and tune limits but may not disable protective hard ceilings.
8. Upstream mitigation: network firewall/reverse proxy, optional CDN/proxy or provider's DDoS service, network bandwidth and kernel limits. A single home-hosted game process **cannot** guarantee defense against volumetric DDoS. Expose host warning and recommended proxy setup; no false safety claim.

## Time and retries
Request includes protocol revision, requestId (UUID), monotonically increasing session command sequence and typed action kind; replay requires dedupe keyed to authenticated principal/session/action semantic key, not only client claimed UUID. Network reconnect resumes from server-issued cursor, rechecks rights and snapshot. No replay of `SubmitText` to create duplicate RP posts when retrying after uncertain receipt. Host saves only bounded per-request metadata in dedupe ledger.

## Operational telemetry
Log structured event IDs, world ID, session-safe pseudonymous ID, abuse class, action kind, byte size, parse failure code, limit threshold, processing duration, queue length and status. **Do not log full RP posts/descriptions, passwords/tokens, client-provided format strings or raw terminal escape bytes.** Retain enough metrics to correlate hostile floods without replaying private content into log sinks.

## Tests
Two clients behind one NAT; flooder alongside ordinary player; slow-reader; malformed WS upgrade/browser Origin; compressed bomb; frame fragmentation; 64k permitted message vs hard limit; thousands of small frames; Unicode valid/invalid; reconnect and replay. Report machine, ingress p95/p99, memory ceiling, refusal policy and no world-writer starvation.

**Evidence:** [OWASP WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html), [OWASP DoS](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html). Numeric policy values are **MudMaker-selected starting defaults**, not sourced or guaranteed safe by OWASP/Evennia.

## Classification invariant (must be tested)
The first discriminator is the authenticated **message kind** (`CommandText`, `InvokeAction`, `SubmitText`), not string length, slash prefix or count of newlines. For a command, the release-pinned native grammar defines parameter byte/line limits (including privileged long or multiline builders' commands); no separate implicit command-type detection by length. For prose, the explicit target field definition determines size independently of whether text is short. Processing and anti-flood cost may depend on **bytes**, but syntax classification never does.
