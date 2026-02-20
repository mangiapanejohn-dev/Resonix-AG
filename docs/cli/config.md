---
summary: "CLI reference for `resonix config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `resonix config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `resonix configure`).

## Examples

```bash
resonix config get browser.executablePath
resonix config set browser.executablePath "/usr/bin/google-chrome"
resonix config set agents.defaults.heartbeat.every "2h"
resonix config set agents.list[0].tools.exec.node "node-id-or-name"
resonix config unset tools.web.search.apiKey
```

## Paths

Paths use dot or bracket notation:

```bash
resonix config get agents.defaults.workspace
resonix config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
resonix config get agents.list
resonix config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--strict-json` to require JSON5 parsing. `--json` remains supported as a legacy alias.

```bash
resonix config set agents.defaults.heartbeat.every "0m"
resonix config set gateway.port 19001 --strict-json
resonix config set channels.whatsapp.groups '["*"]' --strict-json
```

Restart the gateway after edits.
