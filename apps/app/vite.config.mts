import { defineConfig } from "vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import angular from "@analogjs/vite-plugin-angular";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  envPrefix: ["VITE_", "APP_"],
  root: `${__dirname}/src`,
  publicDir: `${__dirname}/public`,
  plugins: [
    varlockVitePlugin(),
    angular({ tsconfig: `${__dirname}/tsconfig.app.json` }),
    tsconfigPaths()
  ],
  build: {
    outDir: `${__dirname}/../../dist`
  },
  resolve: {
    mainFields: ["module"]
  },
  server: {
    port: 4200
  }
});
