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


## Complete registered-feature placement and access map

This section maps **every currently registered control** to a visual home. It is a **default-layout and discoverability contract**, not a requirement that every control be visible simultaneously. The canonical catalog continues to define action IDs, permission, states and tests; each listed ID retains its contract. No new feature or unregistered action is implied by a menu grouping. Menu destinations which require new UI controls must be registered during implementation.

### host.dashboard

**Where:** Host → primary Operations screen.

**Presentation:** Selected world, running state and Start/Stop/Restart as primary; sessions/traffic/logs/backups/release offered through one Section selector, not permanent five tabs.

**Registered features (12):** `host.dashboard.01` Hosted World; `host.dashboard.02` Server Status; `host.dashboard.03` Start Server; `host.dashboard.04` Stop Server; `host.dashboard.05` Restart; `host.dashboard.06` Open Client; `host.dashboard.07` Copy Join Instructions; `host.dashboard.08` Player Sessions; `host.dashboard.09` Traffic; `host.dashboard.10` Logs; `host.dashboard.11` Backups; `host.dashboard.12` Release.

### host.network

**Where:** Host → Operations menu → Network.

**Presentation:** Focused network configuration view; security and exposure warning adjacent to binding/TLS inputs.

**Registered features (9):** `host.network.01` Bind Address; `host.network.02` Port; `host.network.03` TLS Certificate; `host.network.04` Require TLS; `host.network.05` Reverse Proxy; `host.network.06` Trusted Proxies; `host.network.07` Verify Port; `host.network.08` Apply Network Settings; `host.network.09` Public Exposure Warning.

### host.security

**Where:** Host → Operations menu → Players & Security.

**Presentation:** Player list primary; per-player kick/ban in contextual actions; rates/limits and incidents in compact secondary section.

**Registered features (9):** `host.security.01` Player List; `host.security.02` Kick Session; `host.security.03` Ban; `host.security.04` Unban; `host.security.05` Rate Policy; `host.security.06` Edit Limits; `host.security.07` Save Incident Report; `host.security.08` Maintenance Mode; `host.security.09` Overload Alert.

### host.recovery

**Where:** Host → Operations menu → Releases & Recovery.

**Presentation:** Release list and validation primary; backup/restore/rollback as deliberate actions with impact dialogs.

**Registered features (8):** `host.recovery.01` Releases; `host.recovery.02` Validate Release; `host.recovery.03` Activate Release; `host.recovery.04` Backup Now; `host.recovery.05` Restore Backup; `host.recovery.06` Rollback; `host.recovery.07` Migration Result; `host.recovery.08` Affected Worlds.

### host.preferences

**Where:** Settings → Appearance / Host Preferences / Help.

**Presentation:** Host layout, alerts, diagnostic export and help; Appearance uses ThemeManager host scope.

**Registered features (5):** `host.preferences.01` Host Layout; `host.preferences.02` Alerts; `host.preferences.03` Export Diagnostics; `host.preferences.04` Open Hosting Help; `host.preferences.05` Reset Host View.

### host.navigation

**Where:** Top toolbar → Go To (Create / Play / Home).

**Presentation:** No clickable Host item; hosted project selector and single-host lock live in Host, not in a duplicated nav rail.

**Registered features (8):** `host.navigation.01` Go To; `host.navigation.02` Create; `host.navigation.03` Play; `host.navigation.04` Host; `host.navigation.05` Splash; `host.navigation.06` Current Hosted Project; `host.navigation.07` Project to Host; `host.navigation.08` Single Host Lock.

### host.navigationGuard

**Where:** Go To while hosting → Keep Hosting & Switch / Stop Hosting & Switch / Cancel.

**Presentation:** Mention connected players; second confirmation for destructive stop; app exit always Stop & Exit / Cancel.

**Registered features (8):** `host.navigationGuard.01` Keep Hosting in the Background?; `host.navigationGuard.02` Keep Hosting and Switch; `host.navigationGuard.03` Stop Hosting and Switch; `host.navigationGuard.04` Cancel; `host.navigationGuard.05` Players Will Disconnect; `host.navigationGuard.06` Confirm Stop Hosting; `host.navigationGuard.07` Keep Hosting; `host.navigationGuard.08` Hosting Operation.

### host.hostConflict

**Where:** Trying to host another world → conflict dialog.

**Presentation:** Go to Existing Host / Stop Existing Host… / Cancel; never silently replace.

**Registered features (4):** `host.hostConflict.01` Another Project Is Already Hosted; `host.hostConflict.02` Go to Existing Host; `host.hostConflict.03` Stop Existing Host…; `host.hostConflict.04` Cancel.

## Visual audit rule for this workspace

A Builder must demonstrate a discoverable route to each registered feature, with valid disabled/error states and keyboard access, without promoting every control to the main toolbar or leaving every panel visible. Existing contract-mandated tabs represent document/session or contextual mode switching; default navigation must not become a permanently stacked tab wall. Any mismatch between this map and a feature contract is resolved through an explicit indexed documentation change, not agent invention.

## Owner implementation decisions (2026-10-30)
- The section chooser (Player Sessions, Traffic, Logs, Backups, Release) is a row of bordered buttons in the same style as the splash action buttons, one selected at a time, with no underlines or tab styling.
- An empty list (releases, players) draws no box; only its short empty cue shows.
