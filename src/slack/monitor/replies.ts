import type { ChunkMode } from "../../auto-reply/chunk.js";
import { chunkMarkdownTextWithMode } from "../../auto-reply/chunk.js";
import { createReplyReferencePlanner } from "../../auto-reply/reply/reply-reference.js";
import { isSilentReplyText, SILENT_REPLY_TOKEN } from "../../auto-reply/tokens.js";
import type { ReplyPayload } from "../../auto-reply/types.js";
import type { MarkdownTableMode } from "../../config/types.base.js";
import type { RuntimeEnv } from "../../runtime.js";
import { markdownToSlackMrkdwnChunks } from "../format.js";
import { sendMessageSlack } from "../send.js";

function normalizeReplyText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return "";
}

function normalizeMediaUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function resolveReplyMediaUrls(payload: ReplyPayload): string[] {
  const mediaUrls = normalizeMediaUrlList(payload.mediaUrls);
  if (mediaUrls.length > 0) {
    return mediaUrls;
  }
  const single = typeof payload.mediaUrl === "string" ? payload.mediaUrl.trim() : "";
  return single ? [single] : [];
}

export async function deliverReplies(params: {
  replies: ReplyPayload[];
  target: string;
  token: string;
  accountId?: string;
  runtime: RuntimeEnv;
  textLimit: number;
  replyThreadTs?: string;
}) {
  for (const payload of params.replies) {
    const threadTs = payload.replyToId ?? params.replyThreadTs;
    const mediaList = resolveReplyMediaUrls(payload);
    const text = normalizeReplyText(payload.text);
    if (!text && mediaList.length === 0) {
      continue;
    }

    if (mediaList.length === 0) {
      const trimmed = text.trim();
      if (!trimmed || isSilentReplyText(trimmed, SILENT_REPLY_TOKEN)) {
        continue;
      }
      await sendMessageSlack(params.target, trimmed, {
        token: params.token,
        threadTs,
        accountId: params.accountId,
      });
    } else {
      let first = true;
      for (const mediaUrl of mediaList) {
        const caption = first ? text : "";
        first = false;
        await sendMessageSlack(params.target, caption, {
          token: params.token,
          mediaUrl,
          threadTs,
          accountId: params.accountId,
        });
      }
    }
    params.runtime.log?.(`delivered reply to ${params.target}`);
  }
}

export type SlackRespondFn = (payload: {
  text: string;
  response_type?: "ephemeral" | "in_channel";
}) => Promise<unknown>;

/**
 * Compute effective threadTs for a Slack reply based on replyToMode.
 * - "off": stay in thread if already in one, otherwise main channel
 * - "first": first reply goes to thread, subsequent replies to main channel
 * - "all": all replies go to thread
 */
export function resolveSlackThreadTs(params: {
  replyToMode: "off" | "first" | "all";
  incomingThreadTs: string | undefined;
  messageTs: string | undefined;
  hasReplied: boolean;
}): string | undefined {
  const planner = createSlackReplyReferencePlanner({
    replyToMode: params.replyToMode,
    incomingThreadTs: params.incomingThreadTs,
    messageTs: params.messageTs,
    hasReplied: params.hasReplied,
  });
  return planner.use();
}

type SlackReplyDeliveryPlan = {
  nextThreadTs: () => string | undefined;
  markSent: () => void;
};

function createSlackReplyReferencePlanner(params: {
  replyToMode: "off" | "first" | "all";
  incomingThreadTs: string | undefined;
  messageTs: string | undefined;
  hasReplied?: boolean;
}) {
  // When already inside a Slack thread, always stay in it regardless of
  // replyToMode — thread_ts is required to keep messages in the thread.
  const effectiveMode = params.incomingThreadTs ? "all" : params.replyToMode;
  return createReplyReferencePlanner({
    replyToMode: effectiveMode,
    existingId: params.incomingThreadTs,
    startId: params.messageTs,
    hasReplied: params.hasReplied,
  });
}

export function createSlackReplyDeliveryPlan(params: {
  replyToMode: "off" | "first" | "all";
  incomingThreadTs: string | undefined;
  messageTs: string | undefined;
  hasRepliedRef: { value: boolean };
}): SlackReplyDeliveryPlan {
  const replyReference = createSlackReplyReferencePlanner({
    replyToMode: params.replyToMode,
    incomingThreadTs: params.incomingThreadTs,
    messageTs: params.messageTs,
    hasReplied: params.hasRepliedRef.value,
  });
  return {
    nextThreadTs: () => replyReference.use(),
    markSent: () => {
      replyReference.markSent();
      params.hasRepliedRef.value = replyReference.hasReplied();
    },
  };
}

export async function deliverSlackSlashReplies(params: {
  replies: ReplyPayload[];
  respond: SlackRespondFn;
  ephemeral: boolean;
  textLimit: number;
  tableMode?: MarkdownTableMode;
  chunkMode?: ChunkMode;
}) {
  const messages: string[] = [];
  const chunkLimit = Math.min(params.textLimit, 4000);
  for (const payload of params.replies) {
    const textRaw = normalizeReplyText(payload.text).trim();
    const text = textRaw && !isSilentReplyText(textRaw, SILENT_REPLY_TOKEN) ? textRaw : undefined;
    const mediaList = resolveReplyMediaUrls(payload);
    const combined = [text ?? "", ...mediaList].filter(Boolean).join("\n");
    if (!combined) {
      continue;
    }
    const chunkMode = params.chunkMode ?? "length";
    const markdownChunks =
      chunkMode === "newline"
        ? chunkMarkdownTextWithMode(combined, chunkLimit, chunkMode)
        : [combined];
    const chunks = markdownChunks.flatMap((markdown) =>
      markdownToSlackMrkdwnChunks(markdown, chunkLimit, { tableMode: params.tableMode }),
    );
    if (!chunks.length && combined) {
      chunks.push(combined);
    }
    for (const chunk of chunks) {
      messages.push(chunk);
    }
  }

  if (messages.length === 0) {
    return;
  }

  // Slack slash command responses can be multi-part by sending follow-ups via response_url.
  const responseType = params.ephemeral ? "ephemeral" : "in_channel";
  for (const text of messages) {
    await params.respond({ text, response_type: responseType });
  }
}
