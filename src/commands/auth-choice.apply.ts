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

type AuthChoiceHandler = (p: ApplyAuthChoiceParams) => Promise<ApplyAuthChoiceResult | null>;

function resolveHandlers(authChoice: AuthChoice): AuthChoiceHandler[] {
  switch (authChoice) {
    case "setup-token":
    case "oauth":
    case "token":
      return [applyAuthChoiceAnthropic];
    case "apiKey":
      // Keep order: Anthropic/OpenAI first, then all other API providers.
      return [applyAuthChoiceAnthropic, applyAuthChoiceOpenAI, applyAuthChoiceApiProviders];
    case "openai-api-key":
    case "openai-codex":
      return [applyAuthChoiceOpenAI];
    case "chutes":
      return [applyAuthChoiceOAuth];
    case "google-antigravity":
      return [applyAuthChoiceGoogleAntigravity];
    case "google-gemini-cli":
      return [applyAuthChoiceGoogleGeminiCli];
    case "github-copilot":
      return [applyAuthChoiceGitHubCopilot];
    case "copilot-proxy":
      return [applyAuthChoiceCopilotProxy];
    case "qwen-portal":
      return [applyAuthChoiceQwenPortal];
    case "vllm":
      return [applyAuthChoiceVllm];
    case "xai-api-key":
      return [applyAuthChoiceXAI];
    case "minimax-cloud":
    case "minimax":
    case "minimax-api":
    case "minimax-api-key-cn":
    case "minimax-api-lightning":
    case "minimax-portal":
      return [applyAuthChoiceMiniMax];
    case "openrouter-api-key":
    case "litellm-api-key":
    case "ai-gateway-api-key":
    case "cloudflare-ai-gateway-api-key":
    case "moonshot-api-key":
    case "moonshot-api-key-cn":
    case "kimi-code-api-key":
    case "synthetic-api-key":
    case "venice-api-key":
    case "together-api-key":
    case "huggingface-api-key":
    case "gemini-api-key":
    case "zai-api-key":
    case "zai-coding-global":
    case "zai-coding-cn":
    case "zai-global":
    case "zai-cn":
    case "xiaomi-api-key":
    case "opencode-zen":
    case "qianfan-api-key":
      return [applyAuthChoiceApiProviders];
    default:
      return [];
  }
}

export async function applyAuthChoice(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult> {
  const handlers = resolveHandlers(params.authChoice);
  for (const handler of handlers) {
    const result = await handler(params);
    if (result) {
      return result;
    }
  }
  return { config: params.config };
}
