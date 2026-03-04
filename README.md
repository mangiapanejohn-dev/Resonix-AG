<div align="center">

# 👾 Resonix

**Version: `2026.3.4`**

**Autonomous-first, memory-native agent runtime.**

> "Heyy man ! I'm not some chatbot. I'm your digital roommate who happens to run on code. I browse the web when you're lazy, remember everything you forget, and occasionally reflect on life. Can't do your dishes, but I can definitely do your thinking."

Built by **MarkEllington**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Discord](https://img.shields.io/discord/FKXPBAtPwG?label=Discord&logo=discord&style=for-the-badge)](https://discord.gg/FKXPBAtPwG)
[![X](https://img.shields.io/twitter/follow/moralesjavx1032?logo=X&style=for-the-badge)](https://x.com/moralesjavx1032)

</div>

## Why Resonix

Resonix is a production-oriented OpenClaw-derived runtime that focuses on four things:

- **Fast onboarding and auth flow** (reduced blocking paths in provider auth loading)
- **Two-layer persistent memory** (system profile + desktop knowledge mirror)
- **Advanced cron operations** (metrics board, insights, run history, webhook rules)
- **Cross-platform deployment reliability** (macOS/Linux/Windows installer paths + smoke coverage)

## Resonix vs OpenClaw (This Fork Focus)

This table is scoped to what **this Resonix repository adds on top of an OpenClaw base**.

| Area | Resonix (`2026.3.4`) | Upstream OpenClaw baseline |
| --- | --- | --- |
| Identity layer | Explicit identity profile (`Resonix`, `MarkEllington`, about text, browser policy) wired into runtime | Not part of this fork-specific identity layer |
| Persistent memory | `permanent-memory.json` + markdown mirror + memory scoring/retention | Fork-specific implementation |
| Desktop memory workspace | Auto-scaffolded `~/Desktop/resonix-M` with identity/knowledge/retros/logs | Fork-specific implementation |
| Cron observability | `cron board` with success rate, p95 duration, due/risk insights, memory-template stats | Fork-specific implementation |
| Cron run governance | JSONL run history + webhook delivery guardrails + memory sync after runs | Fork-specific implementation |
| Auth responsiveness | Provider auth dispatch hardening + plugin auth loader timeout fallback | Fork-specific implementation |
| Installer compatibility | One-click installers + local smoke scripts + CI matrix (Ubuntu/macOS/Windows) | Fork-specific integration |

## Quick Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.ps1 | iex
```

### Verify

```bash
resonix -v
resonix onboard
```

If command is not found, open a new terminal first.

## Deployment Modes

- **One-click installer**: `install.sh` / `install.ps1`
- **Source mode**: clone + `pnpm install` + `pnpm build`
- **Container mode**: Docker / Podman flows under `docs/install/`

## First Run

```bash
# Interactive setup
resonix onboard

# Start gateway
resonix gateway start

# Inspect cron health board
resonix cron board

# Inspect permanent memory profile
resonix memory profile
```

## What's New In `2026.3.4`

- Fixed auth-choice dispatch gaps so API/OAuth providers no longer silently skip handler logic.
- Added safe timeout fallback for plugin auth loader to avoid onboarding/OAuth stalls.
- Stabilized cron webhook e2e path and aligned webhook validation behavior.
- Unified version metadata to `2026.3.4` across CLI + Android + iOS + macOS + release docs.
- Kept permanent-memory and cron-board stacks validated with targeted test suites.

## Memory Architecture (Resonix Core)

Resonix now uses a practical two-layer memory model:

1. **System memory profile**
   - Extracts durable signals from user turns (preferences/facts/projects/tasks/people).
   - Maintains confidence, mention counts, timestamps, and source trace.
   - Stores machine-readable and markdown mirrors for runtime + human audit.

2. **Desktop memory workspace (`resonix-M`)**
   - Auto-created under Desktop on first sync.
   - Organized structure:
     - `identity/` (about, identity anchor)
     - `knowledge/` (categorized memory mirrors)
     - `autonomy/` (current plan)
     - `retrospectives/` (task lessons)
     - `logs/` (sync + event traces)

This keeps model context durable while giving users a visible, inspectable memory workspace.

## Advanced Cron Stack

Resonix cron is not just scheduler CRUD.

- `resonix cron board` exposes:
  - Success/error rates in a rolling window
  - Duration metrics (including p95)
  - Consecutive failure streaks
  - Due-now/risk insights
  - Memory-template token visibility per job
- `cron.runs` keeps JSONL run history per job for audit/debug.
- Finished jobs can feed memory sync so repeated mistakes are less likely.

## Project Layout

```text
src/
  commands/       # onboarding/auth/config flows
  cron/           # scheduler, board metrics, run logs, webhook helpers
  gateway/        # RPC methods, cron surface, runtime services
  memory/         # permanent profile + resonix-M sync
  identity/       # Resonix identity/about/browser policy
  cli/            # CLI commands and UX
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

Useful focused checks:

```bash
pnpm test src/commands/auth-choice.e2e.test.ts
pnpm test src/gateway/server.cron.e2e.test.ts
pnpm test src/memory/permanent-profile.test.ts src/memory/resonix-m.test.ts
```

## Community

- Discord: <https://discord.gg/FKXPBAtPwG>
- X: <https://x.com/moralesjavx1032>

## License

MIT

---

**Resonix is developed by MarkEllington.**
