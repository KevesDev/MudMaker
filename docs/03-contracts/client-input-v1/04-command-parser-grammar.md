# 04 — Real Command Parser: Grammar, AST and Selection

**DECIDED contract; native parser not yet implemented.** Evennia's [cmdhandler](https://www.evennia.com/docs/latest/api/evennia.commands.cmdhandler.html) gathers command sets, resolves no-input/unknown/multiple matches, then runs pre/parse/func/post. Evennia's [cmdparser](https://www.evennia.com/docs/latest/api/evennia.commands.cmdparser.html) matches aliases, phrases and numeric disambiguators; [MuxCommand](https://github.com/evennia/evennia/blob/98b9df21c91b111dda7c51c8ab62f42faf4d9dae/evennia/commands/default/muxcommand.py#L48) parses switches and `lhs=rhs`. MudMaker **retains the capabilities** with versioned typed `CommandDefinition` assets, not an editable Python parser.

## Exact public input grammar
Only explicit message kind `CommandText` is parsed. **No classifier guesses command vs post by length, newline count or slash prefix.** Commands may be short or long; privileged builders' commands may contain long or multiline arguments when their published grammar declares them. A command is one logical invocation regardless of embedded line breaks; embedded text never becomes a second invocation. Inputs from `SubmitText` are **never** command lines. Built-in command keywords are case-insensitive via published Unicode normalization; **argument body case and whitespace are preserved unless that argument's declared codec explicitly trims/normalizes**.

```ebnf
CommandText  = spaces?, verb, (spaces, tail)?, spaces?;
verb         = alias-token, { spaces, alias-token };  // longest valid registered alias
tail         = argument-text;                         // may be multiline only if declared; parsed by selected Definition, NOT global split
spaces       = " ", { " " | "\t" };
quoted       = '"', { escaped | any-character-except-unescaped-quote }, '"';
escaped      = "\\", ('"' | "\\" | "n" | "t");
arg-value    = quoted | bare-token;
bare-token   = non-whitespace-non-control, { non-whitespace-non-control };
```

In practice the parser **does not greedily parse arbitrary free text before identifying the longest valid verb**: it uses an alias trie of the effective command set. It verifies token boundary so `look` cannot match `lookout`. Empty input produces `NO_INPUT` and optional system-provided help, not arbitrary script. Unknown returns `NO_MATCH` and safe suggestions drawn only from actor-visible available commands (bounded suggestions, no hidden admin commands). **No implicit shell**, semicolon commands, piping, substitutions, eval, glob or interpreting text as multiple commands.

## Typed argument codecs
Each `CommandDefinition` declares an `argGrammar` variant:
- `none`: zero args, extra text rejected;
- `restText`: one free text argument preserving quotes, emoji and spaces, bounded by category policy (use `SubmitText` for long RP/description);
- `positional`: ordered typed parameters: `word`, `quotedText`, `integer`, `decimal`, `boolean`, `enum`, `entitySelector`, `assetSelector` (editor only), `playerSelector`; optional/default and min/max;
- `named`: explicit switches `/mode`, `--mode=value`, allowlisted per definition, unknown or duplicate switches rejected; no global slash-trigger behavior;
- `split`: native supported `lhs=rhs` (first **unquoted, unescaped** separator), with typed left/right subgrammars and optional comma-separated side lists, bounded counts, nesting and token lengths.

Command definition declares max UTF-8 bytes, allowed newline/line count, and free-text mode; a single logical operation can contain multiline content but **never** executes the second line as a command. For long builder commands the GUI prefers `InvokeAction` with typed arguments, which follows exactly the same native authorization and effect pipeline. The AST is `CommandInvocation {commandDefinitionId, commandRevision, actorFromSession, args: TypedValue[], rawSourceSpan, requestId, sessionRevision}`—not `(string, dictionary<string,object>)` from client. Typed clients send action ID and typed args, **but the engine still validates them with this same command definition**. There is no command parser function passed from client; host-installed script/graph can add validated post-parse behavior only after the native parser has bounded inputs.

## Quotes, aliases and ambiguities
- `say "I saw Bob /give 30 coins"`: allowed as text; slash and embedded command names inside quoted free text cannot execute new actions.
- `give "silver key" = "Alex the Guard"`: `lhs=rhs` codec splits only **outside** quoted strings. The resolver handles inventory selector on left and actor-visible target selector on right.
- `look north window`: multiword alias possible if registered. Alias trie picks **longest complete keyword**; authorization and command-set collision policy is applied before match; hidden verbs never leak through suggestions.
- Ambiguous `take key`: server returns **redacted** player-visible candidates with opaque short-lived selection token, bound to session, actor/world/version/command and expiry. Client chooses token; native server **re-resolves and authorizes** at commit. Evennia-style `2-key` shorthand can be supported as an **explicit compatibility grammar**, not an identifier trust shortcut or global parser rule. Expired/foreign token returns `CHOICE_EXPIRED`.
- Duplicate alias available from two definitions: **not silently whichever was registered first**. Resolve via declared scoped precedence and explicit override/priority rules; ties cause publish-time conflict (static) or `COMMAND_AMBIGUOUS` (dynamic runtime). Protected commands cannot be shadowed by untrusted scripts or local room objects.
- Stable command keys use unique published IDs; human names are display metadata. Unicode confusables in identifiers must be checked for collisions under the fixed identifier canonicalization policy; body prose is preserved.

## World and lifecycle checks
Command registry is release-pinned. Effective command set is rebuilt or revision-cached per actor/session/world location/inventory/phase as needed. Cache invalidation tracks **room movement, inventory, account/character role, component state, quest phase and release**; no stale allow result. `AccessRule` and `TargetQuery` are evaluated with filtered ECS snapshots, budgeted cardinality, and repeated at commit. Command hooks `command.parse.query`, `command.execute.before`, `command.execute.after` are optional **host-authored** extensions; a query hook cannot grant permissions or mutate the AST to invoke restricted action IDs.

## Failure classification
`NO_INPUT`, `NO_MATCH`, `AMBIGUOUS_COMMAND`, `INVALID_SWITCH`, `MISSING_ARGUMENT`, `BAD_ARGUMENT_TYPE`, `TEXT_TOO_LONG`, `CHOICE_EXPIRED`, `TARGET_NOT_VISIBLE`, `PERMISSION_DENIED`, `STALE_WORLD`, `RATE_LIMITED`. Every error provides safe next-step or syntax (without revealing hidden targets).

## Parser algorithm — host-native implementation contract
```text
AcceptCommandText(authSession, rawFrame):
  enforce frame bytes / auth / command quota before decode
  decode strict UTF-8; enforce command-specific newline policy: reject CR/LF unless selected command's argument grammar permits them; never split into extra commands
  commandSet = ResolveAvailableCommands(authSession, worldRevision)
  alias = LongestCompleteVisibleAlias(commandSet, rawInput)
  if no input → NO_INPUT; if no alias → NO_MATCH and safe help
  if alias conflict unresolved → AMBIGUOUS_COMMAND (no execute)
  args = ParseByDefinition(alias.Definition.Grammar, untouchedRemainingInput)
  if error → typed structured failure, no ECS mutation
  actor = ResolveActorFromSession(authSession)
  typedInvocation = BuildInvocation(alias.Definition.Id, args, requestId, actor)
  authorize access, scope, cost, cooldown, ownership and target visibility
  worldActor.Submit(typedInvocation)  // recheck ACL and versions atomically
```
**Unbounded regex or user-authored arbitrary parser callbacks do not run at ingress.** Extensibility comes from typed grammar codecs and versioned local handler modules.

## Acceptance examples
`take key` ambiguous; `2-key` optional compatibility; `say hello\n@delete` rejected as command line but accepted as literal `SubmitText` RP body; hidden admin command not suggested; `go north` and GUI Exit click share authorization; Unicode quote/escaped `=` split; large 32-KiB bio bypasses command grammar only through typed, authorized text submission.
