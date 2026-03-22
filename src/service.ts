// Trace viewer service - minimal service for compatibility
// Main trace collection is done via hooks in the plugin entry

import type { OpenClawPluginService } from "openclaw/plugin-sdk/core";

export function createTraceViewerService(): OpenClawPluginService {
  return {
    id: "trace-viewer",
    async start(_ctx) {
      // Trace collection is handled via hooks in the plugin entry
      // This service exists for potential future background processing needs
    },
    async stop(_ctx) {
      // Cleanup if needed
    },
  };
}
