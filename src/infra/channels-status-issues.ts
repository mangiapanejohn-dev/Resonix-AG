import { listChannelPlugins } from "../channels/plugins/index.js";
import type { ChannelAccountSnapshot, ChannelStatusIssue } from "../channels/plugins/types.js";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildGenericProbeFailureMessage(probe: unknown): string | null {
  if (!probe || typeof probe !== "object") {
    return null;
  }

  const raw = probe as { ok?: unknown; error?: unknown; message?: unknown; status?: unknown };
  if (raw.ok !== false) {
    return null;
  }

  const errorMessage = asNonEmptyString(raw.error) ?? asNonEmptyString(raw.message);
  if (errorMessage) {
    return `Probe failed: ${errorMessage}`;
  }
  if (typeof raw.status === "number" && Number.isFinite(raw.status)) {
    return `Probe failed (HTTP ${raw.status}).`;
  }
  return "Probe failed.";
}

export function collectChannelStatusIssues(payload: Record<string, unknown>): ChannelStatusIssue[] {
  const issues: ChannelStatusIssue[] = [];
  const accountsByChannel = payload.channelAccounts as Record<string, unknown> | undefined;
  for (const plugin of listChannelPlugins()) {
    const collect = plugin.status?.collectStatusIssues;
    const raw = accountsByChannel?.[plugin.id];
    if (!Array.isArray(raw)) {
      continue;
    }
    const snapshots = raw as ChannelAccountSnapshot[];
    const pluginIssues = collect ? collect(snapshots) : [];
    issues.push(...pluginIssues);

    const runtimeIssueAccounts = new Set(
      pluginIssues.filter((issue) => issue.kind === "runtime").map((issue) => issue.accountId),
    );

    for (const account of snapshots) {
      if (runtimeIssueAccounts.has(account.accountId)) {
        continue;
      }
      const message = buildGenericProbeFailureMessage(account.probe);
      if (!message) {
        continue;
      }
      issues.push({
        channel: plugin.id,
        accountId: account.accountId,
        kind: "runtime",
        message,
      });
    }
  }
  return issues;
}
