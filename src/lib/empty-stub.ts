// Empty stub for server-side bundling.
// @solana/web3.js and rpc-websockets are browser-only and not workerd-compatible.
// The mint transfer code that uses them runs only in the browser (via
// createIsomorphicFn().client()), so on the server we alias these modules to
// this file to keep the SSR / Cloudflare Workers bundle clean.
export default {};
