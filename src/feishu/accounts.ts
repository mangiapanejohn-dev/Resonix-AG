/**
 * Resonix FeiShu Accounts
 *
 * Manages FeiShu account configuration and authentication
 */

import { loadConfig } from "../config/config.js";
import { FeiShuApi } from "./api.js";

export interface FeiShuAccount {
  appId: string;
  appSecret: string;
  name: string;
  default?: boolean;
}

export async function getFeiShuAccounts(): Promise<FeiShuAccount[]> {
  const config = await loadConfig();
  return config.channels?.feishu?.accounts || [];
}

export async function getDefaultFeiShuAccount(): Promise<FeiShuAccount | null> {
  const accounts = await getFeiShuAccounts();
  return accounts.find((account) => account.default) || accounts[0] || null;
}

export async function createFeiShuApi(): Promise<FeiShuApi | null> {
  const account = await getDefaultFeiShuAccount();
  if (!account) {
    return null;
  }

  return new FeiShuApi({
    appId: account.appId,
    appSecret: account.appSecret,
  });
}

export async function validateFeiShuAccount(
  account: FeiShuAccount,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const api = new FeiShuApi({
      appId: account.appId,
      appSecret: account.appSecret,
    });

    await api.getAccessToken();
    api.stopTokenRefresh();

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: `Invalid FeiShu account: ${error.message}`,
    };
  }
}
