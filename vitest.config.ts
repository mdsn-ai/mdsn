import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@mdsnai/sdk/core": fileURLToPath(new URL("./sdk/src/core/index.ts", import.meta.url)),
      "@mdsnai/sdk/server": fileURLToPath(new URL("./sdk/src/server/index.ts", import.meta.url)),
      "@mdsnai/sdk/web": fileURLToPath(new URL("./sdk/src/web/index.ts", import.meta.url)),
      "@mdsnai/sdk/elements": fileURLToPath(new URL("./sdk/src/elements/index.ts", import.meta.url)),
      "@mdsnai/sdk": fileURLToPath(new URL("./sdk/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    include: ["sdk/test/**/*.test.ts", "sdk/create-mdsn/test/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
