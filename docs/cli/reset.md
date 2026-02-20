---
summary: "CLI reference for `resonix reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `resonix reset`

Reset local config/state (keeps the CLI installed).

```bash
resonix reset
resonix reset --dry-run
resonix reset --scope config+creds+sessions --yes --non-interactive
```
