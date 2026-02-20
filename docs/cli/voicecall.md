---
summary: "CLI reference for `resonix voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `resonix voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
resonix voicecall status --call-id <id>
resonix voicecall call --to "+15555550123" --message "Hello" --mode notify
resonix voicecall continue --call-id <id> --message "Any questions?"
resonix voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
resonix voicecall expose --mode serve
resonix voicecall expose --mode funnel
resonix voicecall unexpose
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.
