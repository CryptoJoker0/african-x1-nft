---
name: Solana SSR stub configuration
description: @solana/web3.js and rpc-websockets are browser-only; how they are kept out of the SSR bundle.
---

@solana/web3.js uses Node.js APIs (`node:buffer`, WebSocket via rpc-websockets) that are not available in the SSR environment (Cloudflare Workers / Nitro).

**Fix:** `vite.config.ts` aliases these packages to `src/lib/empty-stub.ts` in the `ssr` environment:
```ts
environments.ssr.resolve.alias = {
  "@solana/web3.js": stub,
  "rpc-websockets": stub,
  "rpc-websockets/dist/index.browser.mjs": stub,
}
```

**Runtime safety:** The actual mint transfer (`submitMintTransfer` in `src/lib/mint-tx.ts`) uses `createIsomorphicFn().client()`, so the dynamic `import("@solana/web3.js")` only runs in the browser. The server variant throws immediately if called.

**How to apply:** If new Solana-dependent packages are added, add them to the SSR alias list in `vite.config.ts`.
