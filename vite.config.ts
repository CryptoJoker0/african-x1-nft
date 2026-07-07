import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

const stub = path.resolve(__dirname, "src/lib/empty-stub.ts");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    environments: {
      ssr: {
        resolve: {
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
