# Source Audit — Earlier MudMaker and Deliberate Reset

**Status:** observed repo/doc facts; read-only, no legacy implementation restored. Date: 2026-10-28.

## GitHub master at audit
- Repository KevesDev/MudMaker, branch master, commit 30bafa9e44e6bc18a8beccfe7aa321a1507d563b (2026-04-13).
- Application root currently MudMaker/, Maven Java 21, Spring Boot 4.0.5, Spring WebMVC + JPA + H2 dependencies.
- Only application boot class, application name property and one Spring contextLoads() test with empty body.
- No current editor, ECS, world runtime, script runner, engine persistence, WebSocket session handler or docs directory.
- Existing GitHub issues #1–#5 are initialization and early ECS tasks; not evidence they have been implemented.

## Older git history
- January 2026 commit 3e839b008e909c9998e7f410f93a8eaceb9341b5 included a Java Swing editor with GamePanel/ConnectionPanel, raw TCP ServerSocket, CommandManager/Parser/Registry, and a MySQL room/character/item/exit schema.
- April 2026 commit 3be44a1a31d87399315b8b90c81866c98fb89e4a removed that source tree. User confirms the deletion was intentional due to poor code quality and desire to start over.
- Example old ownership flaw: network ClientHandler parsed through CommandManager while Swing GamePanel instantiated its own CommandParser, creating multiple input routes.
- Original SQL schema represented rooms, item ownership, static room exits and attribute bags; not adequate as proof of modern ECS, dynamic mobile-contained spaces, or extensible schema migration.

## Earlier Google Doc baseline
Google Doc "MudMaker" / “MudMaker Architecture & Design Document (v1.1)” describes headless Java/Spring engine, GraalPy scripts, Tauri/React editor, JSON workspace and SQLite via JPA, ECS entities/components/systems, AST graph evaluator, @MudNode annotations, event/tick logic and sandbox aspirations.
The broader, user-confirmed requirements now additionally make mobile/tablet creator UX, train containment and dynamic exits, visual cell map with data-rich inspector, robust Blueprint authoring, region-wide systems and one-click/CLI hosting first-class design goals.

## Audit rule
Do not cherry-pick or reintroduce deleted prototype code without an explicit approved decision and audit. Historic designs are evidence of intent, not an authorization to reuse broken ownership patterns or assert functionality exists.
