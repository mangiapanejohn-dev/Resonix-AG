---
summary: "CLI reference for `resonix agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `resonix agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
resonix agents list
resonix agents add work --workspace ~/.resonix/workspace-work
resonix agents set-identity --workspace ~/.resonix/workspace --from-identity
resonix agents set-identity --agent main --avatar avatars/resonix.png
resonix agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.resonix/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
resonix agents set-identity --workspace ~/.resonix/workspace --from-identity
```

Override fields explicitly:

```bash
resonix agents set-identity --agent main --name "Resonix" --emoji "👾" --avatar avatars/resonix.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Resonix",
          theme: "space lobster",
          emoji: "👾",
          avatar: "avatars/resonix.png",
        },
      },
    ],
  },
}
```
