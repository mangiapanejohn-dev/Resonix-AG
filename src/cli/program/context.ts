import { resolveCliChannelOptions } from "../channel-options.js";

export type ProgramContext = {
  programVersion: string;
  channelOptions: string[];
  messageChannelOptions: string;
  agentChannelOptions: string;
};

function formatDateVersion(now = new Date()): string {
  return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;
}

export function createProgramContext(): ProgramContext {
  const channelOptions = resolveCliChannelOptions();
  return {
    programVersion: formatDateVersion(),
    channelOptions,
    messageChannelOptions: channelOptions.join("|"),
    agentChannelOptions: ["last", ...channelOptions].join("|"),
  };
}
