import type { MsgContext } from "../auto-reply/templating.js";
import type { ResonixConfig } from "../config/config.js";
import { transcribeFirstAudio } from "./audio-preflight.js";
import type { ActiveMediaModel } from "./runner.js";
import type { MediaUnderstandingProvider } from "./types.js";

export type RuntimeTranscribeAudioFileParams = {
  filePath: string;
  cfg: ResonixConfig;
  provider?: string;
  model?: string;
  mime?: string;
  accountId?: string;
  agentDir?: string;
  providers?: Record<string, MediaUnderstandingProvider>;
};

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export async function transcribeAudioFile(
  params: RuntimeTranscribeAudioFileParams,
): Promise<string | undefined> {
  const filePath = normalizeOptionalString(params.filePath);
  if (!filePath) {
    return undefined;
  }

  const provider = normalizeOptionalString(params.provider);
  const model = normalizeOptionalString(params.model);
  const activeModel: ActiveMediaModel | undefined = provider ? { provider, model } : undefined;

  const ctx: MsgContext = {
    MediaPath: filePath,
    MediaType: normalizeOptionalString(params.mime),
    AccountId: normalizeOptionalString(params.accountId),
  };

  return transcribeFirstAudio({
    ctx,
    cfg: params.cfg,
    agentDir: params.agentDir,
    providers: params.providers,
    activeModel,
  });
}
