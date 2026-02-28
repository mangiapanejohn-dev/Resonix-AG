/**
 * Resonix FeiShu Send
 *
 * Implements message sending functionality for FeiShu platform
 */

import { FeiShuApi, FeiShuMessage } from "./api.js";

export interface ChannelSendParams {
  message: string;
  target: string;
  mediaUrl?: string;
  accountId?: string;
}

export async function sendFeiShuMessage(
  params: ChannelSendParams,
  api: FeiShuApi,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Prepare message content
    const content = {
      text: params.message,
    };

    // Determine receive_id_type based on target format
    let receiveIdType: "chat_id" | "open_id" | "user_id" = "chat_id";
    let receiveId = params.target;

    // Check if target is an open_id or user_id
    if (params.target.startsWith("ou_")) {
      receiveIdType = "open_id";
    } else if (params.target.match(/^[a-zA-Z0-9]{1,32}$/)) {
      receiveIdType = "user_id";
    }

    const message: FeiShuMessage = {
      receive_id_type: receiveIdType,
      content: JSON.stringify(content),
      msg_type: "text",
    };

    // Send message
    const response = await api.sendMessage(message);

    if (response.code === 0) {
      return {
        success: true,
        messageId: response.data?.message_id,
      };
    } else {
      return {
        success: false,
        error: `Failed to send message: ${response.msg}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Error sending message: ${error.message}`,
    };
  }
}

/**
 * Send rich text message
 */
export async function sendFeiShuRichMessage(
  params: ChannelSendParams,
  api: FeiShuApi,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Prepare rich text content
    const content = {
      elements: [
        {
          tag: "div",
          text: {
            content: params.message,
            tag: "lark_md",
          },
        },
      ],
    };

    // Determine receive_id_type based on target format
    let receiveIdType: "chat_id" | "open_id" | "user_id" = "chat_id";
    let receiveId = params.target;

    // Check if target is an open_id or user_id
    if (params.target.startsWith("ou_")) {
      receiveIdType = "open_id";
    } else if (params.target.match(/^[a-zA-Z0-9]{1,32}$/)) {
      receiveIdType = "user_id";
    }

    const message: FeiShuMessage = {
      receive_id_type: receiveIdType,
      content: JSON.stringify(content),
      msg_type: "interactive",
    };

    // Send message
    const response = await api.sendMessage(message);

    if (response.code === 0) {
      return {
        success: true,
        messageId: response.data?.message_id,
      };
    } else {
      return {
        success: false,
        error: `Failed to send rich message: ${response.msg}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Error sending rich message: ${error.message}`,
    };
  }
}
