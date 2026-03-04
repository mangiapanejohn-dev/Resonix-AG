<div align="center">

# 👾 Resonix

**Version `2026.3.4`**

**An autonomous agent runtime with a real persistent memory core.**

> "Heyy man! I'm not some chatbot. I'm your digital roommate who happens to run on code. I browse when you're lazy, remember what matters, and keep learning from every mission."

Built by **MarkEllington**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Discord](https://img.shields.io/discord/FKXPBAtPwG?label=Discord&logo=discord&style=for-the-badge)](https://discord.gg/FKXPBAtPwG)
[![X](https://img.shields.io/twitter/follow/moralesjavx1032?logo=X&style=for-the-badge)](https://x.com/moralesjavx1032)

</div>

## What Resonix Is

Resonix is a production-focused autonomous agent runtime forked from the OpenClaw ecosystem and evolved with a different priority: **long-term continuity**.

The key idea is simple:
- Not just a session bot.
- Not just short-term context.
- A system that can keep identity, retain knowledge, and improve over time.

## Core Strengths

- **Two-layer permanent memory architecture**
  - Runtime memory profile for durable facts/preferences/projects.
  - Desktop knowledge base mirror (`resonix-M`) for human-visible persistence.
- **Faster onboarding/auth experience**
  - Hardened provider auth dispatch.
  - Timeout fallback for plugin-based auth loading.
- **Operational cron system, not basic cron CRUD**
  - `cron board` insights (success/error trend, p95 duration, failure streaks, due-risk view).
  - Run-history governance + memory-sync hooks.
- **Cross-platform deployment paths**
  - macOS/Linux one-line install.
  - Windows one-line PowerShell install (startup hardening included).
  - New Termux one-line installer.

## Quick Deploy

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.ps1 | iex
```

### Termux (Android)

```bash
curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install-termux.sh | bash
```

### Verify

```bash
resonix -v
resonix onboard
```

If command lookup has not refreshed yet, open a new terminal session.

## Two-Layer Permanent Memory Architecture

Resonix permanent memory is built as a **dual-plane system**.

### Layer A: System Memory Plane

Implemented in runtime memory modules (`src/memory/permanent-profile.ts`).

Responsibilities:
- Extract durable user signals from interactions.
- Score confidence and retention strength.
- Track update history and source traces.
- Keep machine-readable state for fast retrieval in future runs.

### Layer B: Human-Visible Knowledge Plane

Implemented by `resonix-M` sync (`src/memory/resonix-m.ts`).

Responsibilities:
- Auto-create a structured knowledge workspace on Desktop.
- Write organized markdown artifacts for auditability.
- Sync key outcomes (preferences, project facts, retrospectives, identity anchors).

Default structure:

```text
~/Desktop/resonix-M/
  identity/
  knowledge/
  autonomy/
  retrospectives/
  logs/
```

This is why Resonix memory is designed as **permanent knowledge continuity**, not temporary in-memory context.

## Runtime Architecture (High Level)

```text
User / Channel
   -> Gateway / Routing
   -> Agent Runtime
      -> Tooling + Safety + Policy
      -> Memory Plane A (system profile)
      -> Memory Plane B (resonix-M mirror)
   -> Channels / UI / Cron / Hooks
```

## Operations and CLI Essentials

```bash
# first-time setup
resonix onboard

# gateway lifecycle
resonix gateway start
resonix gateway status

# memory inspection
resonix memory profile

# cron intelligence board
resonix cron board
```

## Resonix vs OpenClaw (Fork Direction)

| Area | Resonix 2026.3.4 | Typical OpenClaw baseline |
| --- | --- | --- |
| Persistent memory strategy | Two-layer permanent memory + Desktop mirror (`resonix-M`) | Primarily runtime/session-centric memory flow |
| Identity anchoring | Explicit Resonix identity profile wired into gateway and prompts | No fork-specific identity profile by default |
| Cron operations | Board-level observability + run-governance integration | Core scheduler flow |
| Auth onboarding resilience | Dispatch hardening + plugin-auth timeout fallback | Standard auth flow without these fork-specific guards |
| Installer posture | One-line macOS/Linux/Windows + Termux script in-repo | Varies by upstream release track |

## Repository Layout

```text
src/
  cli/             # command-line surfaces
  commands/        # onboarding, auth, config orchestration
  gateway/         # RPC, services, protocol handlers
  cron/            # scheduler, board metrics, run-state
  memory/          # permanent profile + resonix-M sync
  identity/        # Resonix identity model
  channels/        # channel adapters and routing integration
extensions/        # optional channel/feature plugins
docs/              # documentation
```

## Local Development

```bash
pnpm install
pnpm build
pnpm test
```

Targeted checks for critical paths:

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
