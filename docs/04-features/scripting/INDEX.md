# Scripting UX & Runtime | Indexed Tabs and Subtabs

**Status:** owner-required two modes, PROPOSED detailed UI design. Open only the requested subtab; Markdown is technical authority.

| Tab | Topic / exact questions | Read |
|---|---|---|
| 1. Script workspace | Creating/writing a Unity-like code script, exact controls, inline help, script attachment and debugging | [01 Code Editor](01-code-editor.md) |
| 2. Visual scripting | Modern node canvas, design language, toolbars, contextual palette, typed ports, grouping and touch controls | [02 Node Graph Editor](02-visual-graph-editor.md) |
| 3. Connect to game | Attach to NPC/entity/quest/exit/world, compile, test, preview, publish and live runtime, versioning | [03 Binding to Runtime](03-authoring-to-live-runtime.md) |
| 4. Consistent UX | UI token design, tooltip policy, popovers, dropdown/forms, validation, accessibility, responsive behavior | [04 Design System + Tooltips](04-ui-components-and-tooltips.md) |
| 5. Acceptance | C# vs custom language ADR, interactive UI, custom exposed graph node and game runtime tests | [05 Verification Matrix](05-scripting-ux-test-matrix.md) |

## Technical and research references
- [Scripting runtime/ABI contract](../../03-contracts/scripting-runtime-and-capabilities.md) (single ECS authority, code/graph behavior, security).
- [Generic graph contract](../../03-contracts/scripting-and-graph.md).
- [Quest-specific hook modes](../quests/09-custom-scripts-and-event-hooks.md).
- [C# / custom DSL / runtime research](../../08-research/scripting-engine-research.md).
- [Open ADRs](../../07-decisions/OPEN_DECISIONS.md).
- [Agent cost rules](../../06-quality/token-and-dispatch-policy.md).

## Hard boundaries
- Code editing interface and visual graph are peers: a creator may call exposed code functions from graphs, or call an approved graph as action (where designed), but they never bypass engine transaction ownership.
- Node graph editor is a view/authoring tool, *not* a separate game engine.
- ECS Blueprint composition view differs from runtime behavior graph, dialogue graph, quest chain graph and world-system graph. Each uses shared graph interaction vocabulary but own validation/semantics.
- Device/browser code editing need not run compiler locally; the host can provide compile/diagnostics/test service.
- C# is a strong candidate, **not selected**; do not introduce .NET runtime/package into project without approved ADR and measured integration/security evidence.
