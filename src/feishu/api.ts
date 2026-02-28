/**
 * Resonix FeiShu API
 *
 * Implements basic API calls to FeiShu (Lark) platform
 */

import { fetchWithTimeout } from "../utils/fetch-timeout.js";

export interface FeiShuApiConfig {
  appId: string;
  appSecret: string;
  accessToken?: string;
  tokenExpiry?: number;
}

export interface FeiShuMessage {
  receive_id_type: "chat_id" | "open_id" | "user_id";
  content: string;
  msg_type: string;
}

export interface FeiShuResponse {
  code: number;
  msg: string;
  data?: any;
}

export class FeiShuApi {
  private config: FeiShuApiConfig;
  private tokenRefreshInterval: NodeJS.Timeout | null = null;

  constructor(config: FeiShuApiConfig) {
    this.config = config;
    this.startTokenRefresh();
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string> {
    if (
      this.config.accessToken &&
      this.config.tokenExpiry &&
      Date.now() < this.config.tokenExpiry
    ) {
      return this.config.accessToken;
    }

    const token = await this.refreshAccessToken();
    return token;
  }

  async refreshAccessToken(): Promise<string> {
    const url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/";
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        }),
      },
      10000,
    );

    const data: FeiShuResponse = await response.json();
    if (data.code !== 0) {
      throw new Error(`Failed to refresh access token: ${data.msg}`);
    }

    this.config.accessToken = data.data.tenant_access_token;
    this.config.tokenExpiry = Date.now() + (data.data.expire - 300) * 1000; // Refresh 5 minutes before expiry

    return this.config.accessToken as string;
  }

  /**
   * Send message
   */
  async sendMessage(message: FeiShuMessage): Promise<FeiShuResponse> {
    const token = await this.getAccessToken();
    const url = "https://open.feishu.cn/open-apis/im/v1/messages";

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(message),
      },
      10000,
    );

    return response.json();
  }

  /**
   * Get chat info
   */
  async getChatInfo(chatId: string): Promise<FeiShuResponse> {
    const token = await this.getAccessToken();
    const url = `https://open.feishu.cn/open-apis/im/v1/chats/${chatId}`;

    const response = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      10000,
    );

    return response.json();
  }

  /**
   * Start token refresh interval
   */
  private startTokenRefresh(): void {
    this.tokenRefreshInterval = setInterval(
      async () => {
        try {
          await this.refreshAccessToken();
        } catch (error) {
          console.error("Failed to refresh FeiShu access token:", error);
        }
      },
      30 * 60 * 1000,
    ); // Refresh every 30 minutes
  }

  /**
   * Stop token refresh interval
   */
  stopTokenRefresh(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }
}
