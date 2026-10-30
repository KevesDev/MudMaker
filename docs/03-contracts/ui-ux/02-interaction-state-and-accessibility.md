# 02 — Shared primitives, intent, state, accessibility and error semantics

**One visual/interaction component library; no second host/Client implementations.** Each component is theme-token driven and receives data/action descriptors from its workspace. No network, database, project mutation or ECS write inside UI primitives.

## Primitive contracts
`AppShell`, `WorkspaceNavigation`, `DockPanel`, `TabStrip`, `Toolbar`, `CommandBar`, `Button`, `IconButton`, `Menu`, `Dropdown`, `Combobox`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `NumberField`, `TextField`, `MultilineEditor`, `RichTextPreview`, `List`, `VirtualTree`, `DataGrid`, `InspectorField`, `Tooltip`, `Popover`, `Dialog`, `ContextMenu`, `Toast`, `Progress`, `StatusIndicator`, `SplitView`, `VirtualTranscript`, `MapViewport`, `GraphViewport`, `LogViewer`, `SearchResults`. Each exposes typed value/change/commit/cancel, semantic label and visible focus; no default behavior that emits a network command.

## Universal state machine
Every visible control registers: `hidden / visible-disabled / ready / focused / pending / success / validation-error / denied / unavailable / recoverable-error`; where meaningful, `empty / loading / populated / disconnected / stale`. A mutation must show `pending` until confirmed by the owning service; do not optimistically show "Saved", "Connected" or "Published". Clicking again during pending is idempotent or disabled with explicit explanation, not silent duplicate work. Input errors preserve user-entered text. Escape/cancel closes non-destructive dialogs; destructive edit opens Impact/Confirm with affected refs and undo/recovery policy. Notifications have stable error codes and accessible announcements without spam.

## Catalog state vocabulary
A control's `stateVariants` in the catalogs lists the states that control can show, in catalog words: `error` means `recoverable-error`; `visible`, `empty` and `loading` are display states; every other word equals the state of the same name above. Controls never show states outside their listed variants.

## Interaction registry rules
One `ActionId` per user intent, namespaced `ui.<domain>.<name>` exactly as in [actions.v1.json](../../../contracts/ui/v1/actions.v1.json); the owning router (Home, Editor, Client, Host, WorkspaceNavigator) is recorded in the action, not in the prefix. `UIControl` uses an action ID or `null` for passive text; passive visual blocks have a content source and accessibility label. Every registry entry records stable ID, workspace/surface, type, visible label/i18n key, tooltip/help text, action, state owner, required permission, conditional availability, keyboard/accessibility, and test ID. Renderer and localized string table are generated/validated against this registry; **missing control metadata blocks phase audit**. Focus path keyboard and touch alternative is mandatory for every activation. Icon-only controls have text accessible name and tooltip.

## Focus & keyboard conflicts
Shared `FocusMediator` dispatches key events only to focused workspace and active scope; `MultilineEditor`, code editor and transcript selection own text/IME shortcuts before global actions. Input Manager handles pointer/keyboard/pen/touch; Editor/Client/Host routers own semantic intents. Shortcut customization validates collisions **within scope**, displays conflicts, imports/exports profile settings and can reset defaults. A client can bind a command/hotkey in its own profile but cannot steal the Editor's delete or publish shortcut; global emergency disconnect is always accessible. No hover-only or right-click-only command.

## Sizing/accessibility
WCAG 2.2 AA is the intended acceptance baseline for applicable user-facing views; keyboard, screen readers, visible focus, sufficient contrast and reflow/zoom are non-negotiable. Tablet UI uses drawer/stack, not permanently offscreen right inspector; pointer target min-size and line height from ThemeManager design tokens and accessibility adjustments. No content solely color-coded; real text labels accompany statuses. Console ANSI color is filtered/translated into semantic spans with user overrides; emoji/combining text and wrapped long posts preserve read order. Reduced motion, font scale, scroll behavior and notification sounds live in preferences, not game authority.

## Tooltip display rule (owner, binds with [16 microcopy](16-microcopy-and-density-acceptance.md))
A tooltip is shown only where a user would expect to need one: (1) a disabled or unavailable control, to state the specific reason; (2) an icon-only control, as its name; (3) a control with an assigned shortcut, to show it; (4) a control whose catalog entry sets `showHelp` true because its meaning or risk is not obvious from its label. An ordinary control with a clear label (for example Create, Save, Quit) shows no tooltip and exposes no extra description to assistive technology. The catalog `tooltip` text stays as help content for Help and documentation but is not rendered for such controls. Keyboard and touch reach the same help when it exists.

## Text and tooltip contract
Tooltip: **label + short explanation + why disabled (when disabled) + shortcut (when assigned)**, with keyboard/touch Help path, never hover-only. Field: purpose, validation constraints and errors shown adjacent. Empty panel: what belongs here + one visible action to populate it, or explicit read-only status. Loading: skeleton/progress and cancel if safe. Offline state: show last known local items and honest stale marker, never stale "connected". Rich text from servers is sanitized in the sink-specific renderer; raw user content is inert.

## Checkable tests
For every registry entry, assert it renders (or visible condition explains hiding), has label/tooltip or passive role, maps to registered ActionId, handles enabled/disabled/pending/errors, and has keyboard/touch path and test. Negative cases: rapid double click, modal focus trap, screen reader name, IME text composition, permission revoked while modal open, parent panel closed during pending, theme switch during animation, multiwindow shortcut collision.

## Handler contract
Action handlers must honour the `AbortSignal` they receive and settle promptly after it fires. The bus keeps an action blocked until its handler settles, so a handler that never settles after abort is an owner defect.
