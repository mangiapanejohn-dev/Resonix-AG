---
summary: "Uninstall Resonix completely (CLI, service, state, workspace)"
read_when:
  - You want to remove Resonix from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `resonix` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
resonix uninstall
```

Non-interactive (automation / npx):

```bash
resonix uninstall --all --yes --non-interactive
npx -y resonix uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
resonix gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
resonix gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${RESONIX_STATE_DIR:-$HOME/.resonix}"
```

If you set `RESONIX_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.resonix/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g resonix
pnpm remove -g resonix
bun remove -g resonix
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/Resonix.app
```

Notes:

- If you used profiles (`--profile` / `RESONIX_PROFILE`), repeat step 3 for each state dir (defaults are `~/.resonix-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `resonix` is missing.

### macOS (launchd)

Default label is `bot.molt.gateway` (or `bot.molt.<profile>`; legacy `com.resonix.*` may still exist):

```bash
launchctl bootout gui/$UID/bot.molt.gateway
rm -f ~/Library/LaunchAgents/bot.molt.gateway.plist
```

If you used a profile, replace the label and plist name with `bot.molt.<profile>`. Remove any legacy `com.resonix.*` plists if present.

### Linux (systemd user unit)

Default unit name is `resonix-gateway.service` (or `resonix-gateway-<profile>.service`):

```bash
systemctl --user disable --now resonix-gateway.service
rm -f ~/.config/systemd/user/resonix-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `Resonix Gateway` (or `Resonix Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "Resonix Gateway"
Remove-Item -Force "$env:USERPROFILE\.resonix\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.resonix-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://resonix.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g resonix@latest`.
Remove it with `npm rm -g resonix` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `resonix ...` / `bun run resonix ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.
