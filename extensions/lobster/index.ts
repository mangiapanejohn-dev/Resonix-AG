import type {
  AnyAgentTool,
  ResonixPluginApi,
  ResonixPluginToolFactory,
} from "../../src/plugins/types.js";
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: ResonixPluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as ResonixPluginToolFactory,
    { optional: true },
  );
}
