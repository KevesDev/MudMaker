# 14 — Host Operations visual specification

**Purpose:** operator-facing mini-app for one active local hosted release, distinct from editing and playing. [Shared shell](10-visual-language-and-shared-shell.md), [Host ownership](01-workspaces-and-ownership.md), [Host catalog](../../../contracts/ui/v1/host-controls.v1.json), [hosting phase](../../05-sprints/specs/S17.md).

## Default screen
- Unified **compact top toolbar**: hosted world/release if selected, truthful host state, only a few frequent safe operations such as relevant Start/Stop where allowed; **Settings ▾** and **Go To ▾** at the same positions as the other workspaces.
- **Settings ▾ → Appearance** for host-scoped visual preferences; separate operational network/security configuration remains under clearly differentiated Host settings, not confused with cosmetic preferences. **Go To ▾ → Create, Play, Splash/Home** while in Host.
- **Primary operations area** centers on active/selected world and the next meaningful host action. Display concise actual health, players and listener state when available, not decorative metric cards. If stopped, show selected release and safe start/preflight path; if running, show state and stop/management controls.
- **Logs, active sessions/moderation, backups/recovery, networking/security and metrics** remain available in compact menu-led sections, contextual drawers or focused views. Do not show every tool as a permanently open column of data panels; do not hide dangerous actions behind ambiguous icons.
- Destructive operations, recovery, active players and network exposure require clear labels, verified pending/error state and proper confirmations. Nothing silently binds public ports.

## Lifetime and constraints
Only **one active hosted world** per running app instance, enforced by HostSupervisor; separate Editor drafts and Play connections may be used while hosting. Leaving Host for Create, Play or Splash may retain the same host process after the required guard; it must not duplicate/restart host. On Splash show `Active World: {world}` only if active. **Exiting the application stops the hosted service and disconnects players** (or Cancel prevents exit): no phantom detached host. Leaving Play separately disconnects client sockets, not this host.

## Acceptance
At a glance, operator can tell which world is hosted, whether running, and what action is safe. Start/stop/recovery cannot be mistaken for cosmetic toggles. No wall of statistics, card stacks or tab clutter.
