# 09 — External UI/client research: findings vs selected MudMaker behavior

**Research completed 2026-10-28.** These are source-grounded features from official client documentation and current product material; MudMaker choices are separately listed in the "Decided" column. Sources do not establish MudMaker's implementation or guarantee every third-party MUD behaves identically.

| Source-backed precedent | Direct reference | MudMaker selected design |
|---|---|---|
| Mudlet's modern **Base UI** offers a movable/hideable starting map, chat and status bars; preferences and keyboard shortcuts are configurable | [Mudlet UI](https://wiki.mudlet.org/w/Manual:Mudlet_User_Interface); [Profile Preferences](https://wiki.mudlet.org/w/Manual:Profile_Preferences) | A useful out-of-box Client transcript/composer/map layout with dockable modules and user-replaceable preferences, **not requiring scripting** |
| Mudlet's Mapper is a directed room/exit graph with special exits, area navigation, manual editing, A* pathing and game-dependent mapping scripts; generic fallback may require adaptation | [Mudlet Mapper](https://wiki.mudlet.org/w/Manual:Mapper) | Native authorized room events when connected to MudMaker; confidence-qualified GMCP/inferred/manual map for other MUDs; no pretend exact geometry |
| Mudlet script editor supports triggers, aliases, scripts, timers, keys, variables and buttons and diagnostic views | [Mudlet Technical Manual](https://wiki.mudlet.org/w/Manual:Technical_Manual) | No-code visual local Client automation for triggers/aliases/timers/hotbuttons, advanced code not required to play |
| MUSHclient exposes alias expansion, trigger highlighting/gag/notifications, timers, MiniWindows, keyboard macros, plugins and configurable colors | [MUSHclient Docs](https://mushclient.com/mushclient/doc/), [Triggers](https://mushclient.com/mushclient/doc/general/triggers.html), [MiniWindows](https://www.mushclient.com/mushclient/doc/general/miniwindows.html) | Typed local automation with bounded matching and user trust; multiple transcript panes and readable default UI |
| BeipMU supports saved Worlds/Characters, multiline entry, triggers, aliases, macros with global/world/character scope | [BeipMU Getting Started](https://github.com/BeipDev/BeipMU/blob/master/Documentation/GettingStarted.md) | Profile hierarchy with independent theme, notes, triggers, key mappings and multiline composer |
| Evennia's web client has a plugin/transport separation, history, split routing, text/font, notifications, hotbuttons and dock layout | [Evennia Web Client](https://www.evennia.com/docs/latest/Components/Webclient.html) | Shared Client shell, narrow protocol adapter interface, no remote server installation of client-side executable extensions |
| Mudlet supports Telnet protocol negotiation including GMCP, MSDP, CHARSET, NAWS, MXP and TLS | [Supported Protocols](https://wiki.mudlet.org/w/Manual:Supported_Protocols) | Separate Telnet/TLS adapter with optional negotiated protocols and strict parser/markup safety |
| Mudlet 5.0 provides a guided tour and starter interface; customization remains open | [Mudlet official site](https://www.mudlet.org/) | On first Client launch, profile wizard + one-click connect + starter side panels; advanced automation discoverable later |

## Direct design decisions
1. **Editor and Client are separate workspaces**; share UI primitives, central ThemeManager schema, accessibility and focus infrastructure, but not editor authoring services or the client transcript/connection state.
2. **Non-MudMaker game support is first-class**: generic Telnet/TLS text terminal and ANSI input works without game-specific mapping scripts; optional GMCP/other metadata improves status and mapper.
3. **No server-executed local code**: a third-party server may send untrusted protocol text and metadata, never client plugin source or Editor commands. Imported client automation profiles are declarative, previewed and opt-in for network sends.
4. **Client mini mapper is personal, not world-editor geometry**; conflicting sources and unknown areas are visibly shown as tentative.
5. **Users decide display**: theme/fonts/ANSI policy/scrollback/hotkeys per profile, separate from Editor; host cannot mandate local UI colors or content renderers.
6. **No length-derived input classification**: native MudMaker messages have explicit typed kinds; non-MudMaker textual protocols remain opaque commands interpreted by the remote MUD according to its own grammar.
7. **Human usability is an acceptance oracle**, not a substitute for code correctness. Most actions discoverable in menus, tooltips, and onboarding; code remains an advanced option in Creator Editor only.

## Engineering caveats researched rather than assumed
- A third-party server often provides only text; room IDs and coordinates may be absent even when a parser recognizes common exit phrases. Never claim accurate autowalk/map unless evidence.
- Some MUD clients permit installed scripts/plugins, but **this does not justify** accepting executable server-provided code or treating MXP/HTML as trusted.
- Protocol features are negotiated per connection; an external MUD cannot be forced to implement MudMaker command schemas or private/typed RP semantics.
- Desktop/tablet text editing and focus/IME interplay requires hands-on review; documentation alone cannot prove it.
