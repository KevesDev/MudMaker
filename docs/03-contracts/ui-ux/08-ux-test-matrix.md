# 08 — UI/UX verification, screen inventory and user journey matrix

**Status:** specified test oracles, not yet passed. **Control inventory** [the versioned UI inventory in four scoped catalogs](../../../contracts/ui/v1/INDEX.md). Each new interactive control added by Builder requires an indexed visible label, tooltip/help, stable action, current state owner, permission, keyboard/touch/reader path and real error feedback, not just component render.

| Earliest sprint/phase | Creator can actually demonstrate | Independent Auditor rejects when |
|---|---|---|
| S00 docs gate | Find named UI screen, action, owner, tooltip, permission and S08 phase by index in under two docs | broken links, absent command owner, unfixed contradictions |
| S02 SharedUI | One themed button/field/dialog, focus, enable/error and pending state | duplicate widget/theme service; mislabeled or inert button |
| S02 Theme | Switch theme in Editor and Client-preview separately | Client theme forced from Editor; imported data changes scripts |
| S02 Editor navigation | Open map/Blueprint/graph from Project Hub; return preserving selection | focus crossover, dirty change silently lost |
| S02 tablet | Map action menu works without hover/right-click and respects IME | inaccessible tool, touch pan accidentally edits world |
| S08 Player library | Save Telnet/TLS and native profiles; connect via two adapters | wrong protocol selected, insecure silent downgrade |
| S08 Transcript | Scroll up while new output arrives, search/copy; theme/font changes live | forced jump, DOM growth or ANSI/OSC execution |
| S08 Composer | Send one-word RP in MudMaker native mode and long builder command; third-party fallback sends opaque text only | length-based route, newline command injection, duplicate send |
| S08 Global/per-world keymap | Bind same keys separately in Editor and Client, restart | shortcut leaks, IME collision, accidental remote send |
| S08 Mini mapper | Use authoritative native location; third-party GMCP room; plain telnet text-only/manual | unsupported map falsely shown complete or hidden-room leaked |
| S08 Automation | Create no-code alias, trigger highlight, timer and hotbutton; dry-run imported rules | imported package auto-sends or executes scripts |
| S08 Adapter security | Receive malformed IAC/ANSI/MXP/GMCP and compressed abuse fixtures | memory growth, raw HTML execution, unsafe URL/open file |
| S09 No-code commands | Create 'ring bell' with scope/access and inspect help | UI bypasses native command service, unknown asset publish |
| S13 Code/graph | Bind C# and graph to same world effect; observe actual results | source-only fake run or second Ecs write path |
| S15/Q Authoring | Draw weather/quest/branch and test with two actor perspectives | duplicated Editor graph renderer or player UI permission leak |
| S17 Hosting | Start hosted world in Host panel then join from separate Player Client | Host controls visible to remote client or unvalidated release |
| S18 Accessibility | Keyboard, tablet, screen reader, high contrast/reduced motion across all active surfaces | unlabeled control, focus trap, insufficient contrast |
| S18 Registry parity | Enumerate all rendered controls and check UI registry reverse mappings | any unregistered JSX/widget, orphan ActionId, untranslated copy |

## UI registry static gates
1. IDs unique across all catalog partitions, all nonempty tooltip/accessibility descriptions, action or passive role, owning router/workspace, enabled/hidden predicate, test ID; every ActionId resolves exactly once in action table.
2. Within active implementation, **each** registered entry has at least one visible state test and one off-nominal state test (disabled/permission/pending/error). Passive labels bind real data source, not misleading fake status.
3. Every call path resolves through **one owner**; shared components have no direct protocol/network/engine import; only Editor can draft/publish and only Host can start server; Player Client can never mutate host project state.
4. Theme changes do not mutate ECS, local user styles override host ANSI appearance, imported theme cannot execute code, Editor graph paper stays continuous lines.
5. Human reviewer can complete a 10-minute Editor workflow and a 10-minute third-party Client workflow **without technical instructions**. Screen width desktop/tablet and relevant native packaging verified on supported real targets, not imaginary hardware.

## Cross-surface complete-path journeys
**Creator:** Home > Create Project > Map cell > room inspector > Blueprint > typed Command > Validate > Test in isolated Client > return to Editor > Publish while stopped > Host/Start > play from Client. Verify recovery from invalid asset, conflict/undo, error logs and backed-up release.

**External-game player:** Home > Play > New World > Telnet/TLS (or explicitly acknowledged plain) > Connect > read/wrap/copy/search transcript > configure font/theme > local alias/triggers/hotkeys > manual/GMCP mapper > disconnect/reconnect; never see Builder UI.

**MudMaker player:** world profile > native authenticated connect > choose explicit Say/RP/Command mode > post short RP and long typed builder command with permissions > side panels and map use only authorized game projection > reconnect with dedupe.

**Access needs:** use keyboard only and accessible room list/command list; no essential tooltip only on hover. Touch client can send, switch composer mode, open map, navigate panel drawer, access Stop Auto Walk and disconnect without a hardware keyboard.

## Evidence and process
For each implementation phase, Lead selects the relevant verification appropriate to the deliverable. Builder supplies actual evidence; one different Auditor reports PASS/FAIL within the dispatched scope. Human workflows are used when the work is user-facing, not compelled for every phase. **No implementation milestone is marked DONE solely because registry/spec exists**; S00 documentation checks may be sent to AUDIT with links, but no independent signoff is presumed. [Tracker](../../SPRINT-TRACKING.md) is the only status location.
