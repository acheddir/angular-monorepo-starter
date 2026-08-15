import angular from "@analogjs/vite-plugin-angular";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [angular({ jit: true, tsconfig: "tsconfig.json" }), tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["libs/**/*.spec.ts", "apps/**/*.spec.ts"],
    setupFiles: ["./test-setup.ts"],
    pool: "vmThreads"
  }
});
