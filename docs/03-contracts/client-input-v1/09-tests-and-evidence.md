# 09 — Client Input/Commands Safety & Hands-On Verification Matrix

**Test contract; not implemented nor passed.** Every phase listed below requires **one Builder and one independent scoped Auditor**, real executable output, a user-testable demonstration and no unresolved correctness/security defects. Negative cases are critical exit criteria.

| ID / earliest phase | Real test and user milestone | Auditor / failure oracle |
|---|---|---|
| IN-01 S06 | Create command `look` and `look through window` with alias trie; keyboard client gets correct longest complete match | No `lookout` prefix match; hidden alias never suggested |
| IN-02 S06 | Parse `give "silver key" = "Joe Smith"` to typed item/target selectors | Escaped `=`, commas, malformed quotes, unknown switches rejected without execute |
| IN-03 S06 | Add/remove scoped command sets when actor moves, holds tool, changes quest status | No stale cache/permissions; reserved auth/logout not shadowable |
| IN-04 S06 | Two targets `key` yield redacted candidate selector with token | Expired/foreign actor token unusable; revalidate target after movement |
| IN-05 S06 | Typed GUI button and raw text both produce same canonical action and ECS result | No second authorization path/cooldown bypass |
| IN-06 S07 | Plain `CommandText` rejects embedded newline, control escapes and excessive bytes | `"look\nadmin"` never executes second action; zero ECS effects |
| IN-07 S07 | Long RP post with LF, emoji, quotes, slash and C#-looking text; description text saved, shown to two authorized players | Exactly one content write; no accidental command execution; Unicode/line/byte caps |
| IN-08 S07 | Player session login/reconnect and role-specific command access | Forged actor/world, expired session and invalid browser Origin rejected |
| IN-09 S07 | Flooder sends tiny frames, compressed/oversize frames, duplicate requests while other user interacts | Normal user meets fairness target; no unbounded queue/memory; no duplicate action |
| IN-10 S07 | Rapid 16-KiB RP posts to crowded room; test slow recipient | Fanout charge; throttled/rejected safely; critical receipts retained/replayable |
| IN-11 S07 | Submit Markdown/text with HTML tags, OSC/ANSI and bidi markers; inspect rendered view and logs | No script/terminal execution, safe context rendering, no raw secret/control log |
| IN-12 S09 | Create a no-code `ring bell` command in built-in editor with scope+condition+native effect; run test world | No script file needed, typed args and visibility enforced, collisions flagged |
| IN-13 S09 | Edit command/aliases/access; save/reopen, publish bad rule then correct rule | Revision/link migration, undo/redo and precise diagnostics; bad publish blocked |
| IN-14 S13 | Bind custom C# hook and visual graph to commands via local published release, test both | Same ECS validator and typed effects; remote player cannot submit executable binding |
| IN-15 S17 | Stop server, change command definition, publish, start GUI/headless and join remotely | Identical release/capability results; old invalid release never half-starts |
| IN-16 S17 | Run host traffic dashboard and simulate repeated malformed frames, brute force, slow-readers | Logs bounded/redacted, counters accurate; upstream network mitigation assumptions explicit |
| IN-17 S18 | Benchmark configurable limits and Fuzz/properties of parser, tokenizers and message schemas | Exact hardware/OS commands, p95/p99 and peak memory; no fabricated PASS |

## Specific property/fuzz assertions
- Encoded bytes <= framing policy, decoded text consistent with strict UTF-8, grapheme/line counting bounded; invalid sequences always reject with same structured result (no crash).
- For any `SubmitText(body)`, **zero command dispatches**, regardless of slashes, quotes, newlines or semicolons; no command parser ever sees body. Each successful submission creates at most one content revision per idempotency key.
- For any `CommandText` newline, process **only** under the matched command's explicit multiline grammar; never split into a new command. For same valid command line vs typed invocation, identical commandDefinition ID, permissions and ECS event type.
- For any invalid command alias source or access policy, cannot shadow SystemProtected action. Query/help cannot reveal phased/hidden object or unauthorized command.
- For any source exceeding token/byte/queue budget, actor world tick does not starve when a compliant second client issues commands; monitor bounded memory and CPU.
- Disconnected session or invalid request ID cannot replay a gift/quest/description write twice; content body never enters structured logging.
- Hosts can set higher RP limits only within protective host ceilings and logged policy migration. The UI counter matches server UTF-8 byte/grapheme policy and never silently truncates.

## Reporting
Auditor records `Phase ID | build/test command | client/OS/version | expected | actual | p95/p99/peak memory if measured | defect(s) | PASS/FAIL | user demo link`. **Do not check sprint phase or claim DDoS protection** until actual security test/limit calibrations and operator documentation are delivered.

## Narrow prerequisites
S06 parser does not require network. S07 network must satisfy admission/rejection before internet exposure. S09 command editor depends S04 schemas + S02 editor shell and can execute native built-in commands before S13 advanced script binding. S13 extends command behaviors with locally authored C#/Graph. S17 operating public host proves restart and traffic dashboards. S18 repeats systemic abuse/performance audit.

- Test a **single-word RP post** through `SubmitText` and a **long authorized builder/moderator command** (> common short text limits) through `InvokeAction` or multiline-declared `CommandText`. Confirm no length-based classification, correct separate rate classes and world effects. The same bytes submitted as post vs command must not route to the other operation.
