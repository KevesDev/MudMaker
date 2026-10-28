# Scripting Language Semantics, Syntax and Ergonomic Shortcuts

**Status:** REQUIRED powerful code scripting and creator-friendly access; PROPOSED syntax experiments. **Owner:** Scripting Language/API + Editor Language Service. **Dependencies:** runtime-and-capabilities, ECS type registry, Inspector serialization, world clock and Hook ABI. **Decision gate:** engine language / script language / parser-DSL ADR.

## First decision: preserve native language vs invent a MudMaker grammar
If **C# chosen**, *keep valid C# as primary syntax*. Do not redefine `#`, `@`, `{` or `}` in contradictory ways. Use C# attributes, extension methods, typed generated bindings, autocomplete, source generators, custom analyzers and editor snippets rather than running a secret preprocessor that breaks normal C# diagnostics or developer tools. A small optional **expression builder** for condition fields can have its own grammar, but is not equivalent to writing a new full programming language.

If **MudMaker scripting DSL chosen**, formalize lexical grammar, AST/IR, static type checker, source map, debugger, versioning and security model before adoption. Syntax sugar must desugar unambiguously to typed registered ECS operations; never dynamic eval or raw SQL/C++ code generation from arbitrary strings. No casual "the compiler will figure it out."

## Evaluating #, @ and {} (examples only; DO NOT IMPLEMENT as an agreed grammar)
| Symbol | Potential design | Risks / design notes |
|---|---|---|
| `#` | Macro/comment/directive shorthand for registered event or component? | C# already uses `#if`, `#region`, `#nullable` at line start; reinterpretation in C# would break source semantics. For a DSL, choose whether # is comment/metadata/reserved type reference, never all ambiguously |
| `@` | Annotation/decorator for `@expose`, `@event`, `@persist`; or contextual reference `@actor`, `@target` | Godot uses `@export` annotations; C# `@` supports verbatim identifiers/strings, so `@actor` is already a valid identifier. In C#, prefer `[MudExpose]` and strongly typed `context.Actor` instead of a conflicting syntax rewrite |
| `{ }` | Interpolated variables in dialogue, script blocks or contextual scopes | C# uses braces for blocks and interpolation with `$"Hello {actor.Name}"`; a separate safe dialogue template `{actor.visibleName}` is useful but requires escaping, allowlisted fields, validation, localization and phase redaction |
| `$` (optional reference) | A path shorthand like Godot's `$Child` for authoring assets | Godot's $ resolves nodes in a scene tree, but MudMaker doesn't have an identical scene node tree; any ref must identify world, instance, entity ID and type, with stale/missing target handling. In C#, use generated asset refs, not fragile string path magic |
| `:` / `.` | Namespaced field or component access | Code binding must distinguish `EntityRef` vs `ComponentSnapshot`, no access to secret members. Use language-native member access wherever possible |

## C# representation (illustrative proposed API, not compilable shipping code)
```csharp
[MudBehavior("TicketDispenser")]
public sealed class TicketDispenser
{
    [MudExpose(Label = "Ticket Price", Tooltip = "Currency required to dispense one ticket.")]
    public int TicketPrice { get; init; }

    [MudOn("interact.committed")]
    public EffectPlan OnInteract(InteractionContext context)
    {
        // context.Actor is a validated EntityRef, not a C++ pointer
        var inventory = context.Read.Inventory(context.Actor);
        return context.Actions.Propose("tickets.dispense", context.Actor, TicketPrice);
    }
}
```
All identifiers and return types are **candidates**, not final schema or guaranteed C# syntax produced by MudMaker. The implementation can prefer composable script modules/functions over object class inheritance; native C# `override` only applies when actual class hierarchies require it. Quest-stage **override** means replacing configured behavior with a HookBinding, not monkey-patching C++ engine methods.

## Optional expression language (separate from code)
In visual rule fields, shorthand may offer:
```text
actor.name startsWith "A"
quest("Find Joe").active
world.event("HarvestFestival").running
```
These are **non-final design sketches**, subject to typed syntax and security review; UI displays plain-language equivalent and a builder. Expression evaluator is pure/read-only, validates authorized actor fields and rejects undeclared syntax. It must not bypass runtime permissions or phase checks. Avoid introducing a second independent condition engine.

## References to engine/world data
- Use stable typed `EntityRef`, `BlueprintRef`, `QuestRef`, `LocationRef`, `WorldEventRef`, `ComponentTypeRef` with world/instance ID, generation/version and permission scope. No raw memory pointer or direct mutable C++ reference survives a script callback.
- `self` = bound entity; `actor` = authenticated initiator; `target` = interaction target; `world` = authorized world scope; `event` = immutable typed event; `owner` = quest/party/account owner as explicitly configured. These exist only in supported handler context; missing values are typed optional or explicit error.
- Assets: choose stable ID via editor picker; autocomplete displays friendly name and component schema; renamed asset keeps ID, deleting informs usages, unavailable reference gives validation error.
- Engine component properties are read via typed validated read facade and written via authorized ECS actions/EffectPlan, never by direct pointer or arbitrary field setter.

## Variables, scope and persistence
| Scope | Lifetime | Save/restore | Owner |
|---|---|---|---|
| Function local | One handler invocation | No (unless durable continuation stores explicit state) | Script runtime |
| Script configuration / exported variable | Asset default + bound instance override | Versioned authoring asset and binding, not global shared mutable state | Script Asset / Binding Registry |
| Entity component data | Entity lifetime/world | Yes if schema marked persistent | ECS World Registry and persistence |
| Quest attempt flags / progress | Owner+attempt lifetime | Yes | ECS Quest Progression |
| Session/dialogue/quiz state | Explicit session or durable workflow lifetime | According to declared policy; transient vs durable clear | Dialogue/Workflow manager |
| Region/world state | World instance lifetime | Configured and durable | World System ECS |
| User/account data | Auth account scope, not local game object | Must use authorized service boundary; not visible by default | Auth/Accounts |
| Script static/global field | Generally prohibit per-world mutable static as authoritative state | No implicit persistence; reject or guard | Script worker (non-authoritative) |

Every exported variable requires type, default, optional/nullable rule, allowed range, asset permissions, serialization, per-instance override precedence and editor widget metadata. Changing its type/version requires migration; no silent conversions. Multiple worlds loading same code must not share mutable script globals.

## Language safety
- For C# scripts, prohibit arbitrary unsafe compilation, P/Invoke, reflection/Assembly.Load, file/process/network and unapproved dependencies **through capability and OS sandbox**, not code text matching alone; restrictions are enforced, tested and audited.
- For custom DSL, forbid pointer arithmetic and unbounded recursion by design; every operation has explicit runtime budget and typed effect model.
- No client can supply executable script code or choose hidden quiz correctness in gameplay message; only authorized creator can publish a signed/versioned script release.
- Error handling uses typed exceptions/results plus creator trace; game players see safe messages. All event handlers bound to one scheduler and mutation gateway.

## UX expectations
Code editor: autocomplete and API docs for `context.Actor`, `context.Read...`, `context.Actions...`; hovering or keyboard focus shows a short tooltip + more. `[MudExpose]` appears as Inspector property; click "Expose to Graph" yields a typed node. If optional DSL, editor shows symbol/reference grammar, examples, lint, quick fixes and side-by-side expansion into typed intent. Do not build hundreds of ad hoc magic shortcuts that only original agent understands.

## Open questions
C# vs custom DSL, class vs function style, whether runtime proxies or generated source bindings, desired shorthand set, expression syntax, numeric type system, nullable semantics, asset reference notation, state lifetime defaults, hot reload migration. Propose ADR with examples and parser tests, owner approves before syntax freeze.
