import type { ResonixConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { applyAuthChoiceAnthropic } from "./auth-choice.apply.anthropic.js";
import { applyAuthChoiceApiProviders } from "./auth-choice.apply.api-providers.js";
import { applyAuthChoiceCopilotProxy } from "./auth-choice.apply.copilot-proxy.js";
import { applyAuthChoiceGitHubCopilot } from "./auth-choice.apply.github-copilot.js";
import { applyAuthChoiceGoogleAntigravity } from "./auth-choice.apply.google-antigravity.js";
import { applyAuthChoiceGoogleGeminiCli } from "./auth-choice.apply.google-gemini-cli.js";
import { applyAuthChoiceMiniMax } from "./auth-choice.apply.minimax.js";
import { applyAuthChoiceOAuth } from "./auth-choice.apply.oauth.js";
import { applyAuthChoiceOpenAI } from "./auth-choice.apply.openai.js";
import { applyAuthChoiceQwenPortal } from "./auth-choice.apply.qwen-portal.js";
import { applyAuthChoiceVllm } from "./auth-choice.apply.vllm.js";
import { applyAuthChoiceXAI } from "./auth-choice.apply.xai.js";
import type { AuthChoice } from "./onboard-types.js";

export type ApplyAuthChoiceParams = {
  authChoice: AuthChoice;
  config: ResonixConfig;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
  agentDir?: string;
  setDefaultModel: boolean;
  agentId?: string;
  opts?: {
    tokenProvider?: string;
    token?: string;
    cloudflareAiGatewayAccountId?: string;
    cloudflareAiGatewayGatewayId?: string;
    cloudflareAiGatewayApiKey?: string;
    xaiApiKey?: string;
  };
};

export type ApplyAuthChoiceResult = {
  config: ResonixConfig;
  agentModelOverride?: string;
};

// Direct dispatch map - only loads the selected handler
const HANDLERS: Record<string, (p: ApplyAuthChoiceParams) => Promise<ApplyAuthChoiceResult | null>> = {
  anthropic: applyAuthChoiceAnthropic,
  "api-key": applyAuthChoiceApiProviders,
  "cloudflare-aigateway": applyAuthChoiceApiProviders,
  copilot: applyAuthChoiceCopilotProxy,
  "github-copilot": applyAuthChoiceGitHubCopilot,
  "google-antigravity": applyAuthChoiceGoogleAntigravity,
  "google-gemini-cli": applyAuthChoiceGoogleGeminiCli,
  "minimax-cloud": applyAuthChoiceMiniMax,
  "minimax-portal": applyAuthChoiceMiniMax,
  "minimax-api": applyAuthChoiceMiniMax,
  "minimax-api-key-cn": applyAuthChoiceMiniMax,
  "minimax-api-lightning": applyAuthChoiceMiniMax,
  "minimax": applyAuthChoiceMiniMax,
  oauth: applyAuthChoiceOAuth,
  "oauth-cn": applyAuthChoiceOAuth,
  openai: applyAuthChoiceOpenAI,
  "openai-codex": applyAuthChoiceOpenAI,
  "qwen-portal": applyAuthChoiceQwenPortal,
  vllm: applyAuthChoiceVllm,
  xai: applyAuthChoiceXAI,
};

export async function applyAuthChoice(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult> {
  const handler = HANDLERS[params.authChoice];
  if (handler) {
    const result = await handler(params);
    if (result) {
      return result;
    }
  }
  return { config: params.config };
}
