# Visual Scripting | Tabs / Subtabs

**Status:** Required no-code authoring, PROPOSED detailed UX and execution. **Read budget:** open ONE subtab + relevant compiler contract; don't load all code-editor pages.

| Tab | Subtab | Read |
|---|---|---|
| Visual A | Modern node canvas, toolbar, palette, ports, shortcuts, drag/pan, inspector and tooltips | [Node editor UX](../02-visual-graph-editor.md) |
| Visual B | Graph type/typed nodes, execution order, event/data/action and compile rules | [Graph execution contract](../../../03-contracts/scripting-and-graph.md) |
| Visual C | Visual Blueprint composition, exposed properties and instance overrides | [Blueprint editor](../../blueprint-editor.md) |
| Visual D | Quest chain, dialogue, condition, multiple-choice and reward graphs | [Quest feature index](../../quests/INDEX.md) |
| Visual E | Attach visual graph to ECS item, NPC, room, exit, quest or world system | [Bindings and live behavior](../03-authoring-to-live-runtime.md) |
| Visual F | Custom script functions as typed nodes, graph/code interplay | [Runtime and callable nodes](../../../03-contracts/scripting-runtime-and-capabilities.md) |
| Visual G | Full create-to-host process and test failure path | [Lifecycle diagrams](../00-end-to-end-lifecycle.md) |
| Visual H | Visual editor/graph acceptance, touch and accessibility | [Verification](../05-scripting-ux-test-matrix.md) |

**Engine rule:** the graph editor creates typed versioned GraphAssets; the server validates and compiles them into an execution plan. A graph is not a second ECS world engine or a workaround for code sandboxing.

**Visual stance:** sleek professional visual tool, purposeful color/shape and hover-independent readable names, contextual tooltips and progressive disclosure. No old-fashioned unstyled boxes and arbitrary spaghetti wires.

**Companion:** [Code Scripting](../code/INDEX.md); code functions exposed as nodes inherit their typed signatures and capability manifests.
