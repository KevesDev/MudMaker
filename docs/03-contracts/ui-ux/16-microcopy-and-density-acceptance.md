# 16 — Minimalist microcopy, information density, and anti-redundancy contract

**Owner binding visual/UX rule.** AI-generated UI often over-explains ordinary actions. MudMaker explicitly **prefers compact labels, meaningful layout and selective tooltips**, not instructional prose in cards, panels, banners or beside obvious controls. See [shared visual rules](10-visual-language-and-shared-shell.md) and [interaction/accessibility](02-interaction-state-and-accessibility.md).

## Default: show only what enables a decision or action
- **One label per intent.** A button already named `Create` does not need `Create a new world!` underneath; a visible `Settings` entry does not need `Customize your experience`. No repetitive headings echoing the same selected tool.
- **No automatic subtitle/explainer paragraphs** on Splash, toolbars, drawers, section headings, basic forms, or common actions. A world name, state, and relevant control are often sufficient.
- Do not produce AI-style prose like `Everything you need to bring your imagination to life`, `Manage your worlds with ease`, `Your adventure starts here`, or `Click a button below to get started` as app content. Marketing copy is not task UI.
- Do not write instructions **inside an empty text box**. Placeholder text may show a short example of expected format when needed; it is not documentation. Multiline editor/composer defaults to an unobtrusive blank entry area unless accessible name/format hint is essential.
- **No redundant state claims:** don't show `No world selected`, `Not hosting`, `Ready to begin`, `Disconnected` repeatedly when the current view or absence of an active session already communicates that. A state label is valid when its distinction affects a decision (e.g., connected vs reconnecting in Play).
- Feature grouping should express intent via location and familiar concise labels; avoid full-page tiled feature directories and walls of category tabs.

## Tooltip-first, not tooltip-only
- Tooltips explain **non-obvious meaning, shortcut, context, specific unavailable reason, or risk**. Use a short sentence or phrase. Do not merely repeat the control's visible label.
- Standard actions with clear labels need no extra visible description. Icon-only controls require an accessible name and accessible tooltip/help path. A tooltip must be keyboard/focus/touch discoverable and not the **sole** way to understand critical instructions.
- When safety, security, destructive consequence or required field validation is at stake, show the necessary warning **inline or in a confirmation** at point of action. Minimalism never removes important informed consent, error explanation or accessibility instructions.
- A complex form can include one concise explanatory sentence only if the user cannot predict the consequence from the labels; documentation lives in Help, not permanently beside every field.

## Concrete copy patterns

| Situation | Preferred visible copy | Avoid |
|---|---|---|
| Splash primary action | `Create` | `CREATE — Start building your own immersive world` |
| Splash active host | `Active World: Ashenvale` (only while active) | `Server Management Dashboard / Hosting Status / Your server is currently running!` |
| Creator save | `Save`; `Unsaved` only when necessary | `Save your changes to ensure your work is not lost` |
| Creator inspector | `Name`, `Type`, `Description` | paragraph instructions under every field |
| Play composer | `Message` (accessible label) and `Send` | `Type what you want your character to say or do here...` as text-area default |
| Play connection | `Connected` or `Reconnecting` when relevant | generic connection-health card with repetitive text |
| Host running | `Running`; `Stop` | `Your world is live! Monitor and manage it here` |
| Host network warning | `Public connections enabled` with relevant concrete risk detail | giant generic security lecture on every visit |
| Empty searchable library | `No saved worlds.` and `Add World` | multi-paragraph onboarding tutorial |
| Invalid port | `Enter a port from 1–65535.` | vague top-level `Something went wrong` banner |

Sample names and numbers above are **examples only**, not production default text or data.

## Layout density and text budget
- A toolbar should normally fit one row; workspace title, small frequent actions and the Settings/Go To pair. Do not add explanatory subtitles below toolbar commands.
- A section heading, if needed, is one concise line and should not repeat a button label, breadcrumb or selected item title immediately adjacent.
- Use **one** contextual hint for an unfamiliar empty state, maximum; prefer a clear action instead. Repeated hints on every return are prohibited.
- Do not insert arbitrary spacer blocks to make a minimalist design look grand; group related controls closely with consistent compact spacing and thin unobtrusive separators. Preserve responsive accessibility target sizing, legibility, focus ring and font scale.
- If copy can be removed without impairing task success, error recovery, safety, comprehension or accessibility, remove it.

## Agent review checklist / fail conditions
Before approving a screen, Builder and Auditor inspect every always-visible text string. For each ask: **Which user decision does it enable?** If answer is none, remove or demote to contextual Help. Specifically reject:
1. Subtitle repeating heading/button intent.
2. Instruction paragraph inside a card, panel or text entry.
3. Empty-state marketing or filler.
4. Redundant service status, data or labels.
5. Generic dashboard-style summary cards with no primary action.
6. Multiple tab strips for independent categories displayed permanently.
7. Tooltips that repeat the label word-for-word.
8. No accessibility label/keyboard help after removing visible prose.
9. Hiding required warnings, errors or confirmations under the pretext of minimalism.

**Evidence:** screenshot with visible-state text inventory; screen-reader names/help path; keyboard focus sequence; narrow-window/large-font comparison; examples of at least normal, empty, busy, error and guarded-exit states for applicable workspaces. These rules apply to new features added after this spec—never treat the existing control catalog as a license to render every control at once.
