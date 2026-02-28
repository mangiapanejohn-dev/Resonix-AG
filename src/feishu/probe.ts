/**
 * Resonix FeiShu Probe
 *
 * Implements health check functionality for FeiShu channel
 */

import { createFeiShuApi } from "./accounts.js";

export async function probeFeiShuChannel(): Promise<{
  ok: boolean;
  status: string;
  details?: any;
}> {
  try {
    const api = await createFeiShuApi();
    if (!api) {
      return {
        ok: false,
        status: "No FeiShu account configured",
      };
    }

    // Test access token retrieval
    const token = await api.getAccessToken();
    if (!token) {
      return {
        ok: false,
        status: "Failed to get access token",
      };
    }

    return {
      ok: true,
      status: "FeiShu channel is working",
      details: {
        token: token.substring(0, 20) + "...", // Mask token for security
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      status: `FeiShu channel error: ${error.message}`,
      details: error,
    };
  }
}
