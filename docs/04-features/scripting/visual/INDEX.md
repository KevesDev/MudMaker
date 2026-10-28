# Visual Scripting | Tabs / Subtabs

**Status:** v1 typed effect semantics DECIDED; graph editor UX and compiler implementation pending. Begin at [v1 graph contract](../../../03-contracts/scripting-v1/06-graph-parity-and-publishing.md). **Read budget:** open ONE subtab + relevant compiler contract; don't load all code-editor pages.

| Tab | Subtab | Read |
|---|---|---|
| Visual A | Modern node canvas, toolbar, palette, ports, shortcuts, drag/pan, inspector and tooltips | [Node editor UX](../02-visual-graph-editor.md) |
| Visual B | Typed event/data/flow/effect nodes and compiler plan | [v1 Graph Contract](../../../03-contracts/scripting-v1/06-graph-parity-and-publishing.md) |
| Visual C | Visual Blueprint composition, exposed properties and instance overrides | [Blueprint editor](../../blueprint-editor.md) |
| Visual D | Quest chain, dialogue, condition, multiple-choice and reward graphs | [Quest feature index](../../quests/INDEX.md) |
| Visual E | Attach visual graph to ECS item, NPC, room, exit, quest or world system | [Bindings and live behavior](../03-authoring-to-live-runtime.md) |
| Visual F | Custom typed C# callable nodes and engine field overrides | [v1 SDK](../../../03-contracts/scripting-v1/02-code-sdk.md) and [references](../../../03-contracts/scripting-v1/04-references-and-state.md) |
| Visual G | Full create-to-host process and test failure path | [Lifecycle diagrams](../00-end-to-end-lifecycle.md) |
| Visual H | Visual editor/graph acceptance, touch and accessibility | [Verification](../05-scripting-ux-test-matrix.md) |

**Engine rule:** the graph editor creates typed versioned GraphAssets; the server validates and compiles them into an execution plan. A graph is not a second ECS world engine or a workaround for code sandboxing.

**Visual stance:** sleek professional visual tool, purposeful color/shape and hover-independent readable names, contextual tooltips and progressive disclosure. No old-fashioned unstyled boxes and arbitrary spaghetti wires.

**Companion:** [Code Scripting](../code/INDEX.md); code functions exposed as nodes inherit their typed signatures and capability manifests.

## Complete visual-graph execution example
- [Midnight Express: Conductor quiz graph, code-to-graph equivalence, bindings, compiler plan and live effects](../07-midnight-express-technical-case-study.md). This example includes authoritative quiz correctness and quest credit.
