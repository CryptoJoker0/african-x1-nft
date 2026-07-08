import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

const stub = path.resolve(__dirname, "src/lib/empty-stub.ts");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
  },
  vite: {
    server: {
      port: 5000,
      host: "0.0.0.0",
      allowedHosts: true,
    },
    environments: {
      ssr: {
        resolve: {
          // @ts-expect-error — alias is valid at runtime but missing from EnvironmentResolveOptions types
          alias: {
            "@solana/web3.js": stub,
            "rpc-websockets": stub,
            "rpc-websockets/dist/index.browser.mjs": stub,
          },
        },
      },
    },
  },
});
