import { registerLinearTools } from "./tools.js";
import type { PluginConfig } from "./types.js";

interface PluginAPI {
  config: PluginConfig;
  logger?: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
  registerTool: (
    schema: any,
    handler: (params: any) => Promise<any>,
    options?: { optional?: boolean }
  ) => void;
}

export default function register(api: PluginAPI): void {
  const config = api.config;

  if (!config.apiKey) {
    api.logger?.warn("Linear plugin: apiKey not configured");
    return;
  }

  api.logger?.info("Linear plugin: initializing...");
  registerLinearTools(api, config);
  api.logger?.info("Linear plugin: 6 tools registered");
}
