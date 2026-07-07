# AFRICA X1 NFT Platform

## Project Overview

AFRICA X1 NFT is a full-stack NFT minting and marketplace platform built on the X1 Blockchain (Solana fork). It is a magazine-editorial-styled web application celebrating African culture, mythology, and heritage through on-chain digital art.

**Stack:**
- **Framework:** TanStack Start (React SSR) with TanStack Router (file-based routing)
- **Frontend:** React 19, Tailwind CSS v4, shadcn/ui, Framer Motion
- **Backend:** TanStack Start server functions + Nitro (Cloudflare Workers target)
- **Database / Auth:** Supabase (PostgreSQL + Auth)
- **Blockchain:** X1 Mainnet (Solana fork) via `@solana/web3.js` (browser-only)
- **Build tool:** Vite 8

## Running the Application

```bash
npm install
npm run dev     # development server on port 5000
npm run build   # production build → .output/
```

The dev server runs on **port 5000** with `host: "0.0.0.0"` so it is accessible in Replit's preview pane.

## Routes

| Route | Description |
|---|---|
| `/` | Home / landing page (hero, story, roadmap, FAQ) |
| `/auth` | Sign-in / sign-up (email + Google OAuth via Lovable Auth) |
| `/collection` | Browse all 50 NFTs with filter/search |
| `/mint` | Mint page — connects wallet, initiates on-chain transfer |
| `/marketplace` | Secondary market listings (toggles via `collection_config.marketplace_enabled`) |
| `/dashboard` | Holder dashboard — owned NFTs, transaction history, profile |
| `/admin` | Admin panel — mint controls, config, whitelist (admin role required) |
| `/sitemap.xml` | Dynamic XML sitemap |

## Architecture Notes

### SSR Safety
- `@solana/web3.js` and `rpc-websockets` are aliased to an empty stub in the SSR/server environment (see `vite.config.ts`)
- Wallet connection, localStorage, `window`, and `navigator` access are all gated inside `useEffect` or click handlers — never executed server-side
- The mint transfer (`submitMintTransfer`) uses `createIsomorphicFn().client()` so it only ever runs in the browser

### Wallet Layer
`src/lib/wallet.tsx` supports Phantom, Backpack, and X1 Web Wallet (all Solana-style injected providers). Falls back to a simulated ephemeral address for dev preview when no wallet is installed.

### Mint Flow
1. Client: build + sign + submit treasury transfer via `@solana/web3.js` (browser only)
2. Server: `claimMint` server function verifies the transaction on-chain via raw JSON-RPC, checks whitelist/supply limits, then assigns available NFTs to the user

### Environment Variables (required)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `VITE_SUPABASE_URL` | Same as above, exposed to client build |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as above, exposed to client build |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** — Supabase service role key (server-only, for admin NFT assignment) |

The `SUPABASE_SERVICE_ROLE_KEY` is needed for the `claimMint` server function to bypass RLS when assigning NFTs. Set it as a Replit Secret.

### Images / Assets
- `src/assets/pre-reveal.jpg` — local pre-reveal placeholder image
- `public/pre-reveal.jpg` — same image served statically at `/pre-reveal.jpg`
- `src/assets/*.asset.json` — asset descriptor files; `url` field points to `/pre-reveal.jpg` as the placeholder. Replace with real CDN URLs when the collection is revealed.

## Known Dev-Mode Behaviour

The `@tanstack/devtools-vite` plugin (loaded via `@lovable.dev/vite-tanstack-config`) injects `data-tsd-source` attributes onto every JSX element in development mode. Because SSR and client transforms calculate different line numbers, React prints a hydration mismatch warning in the browser console during development. This is **dev-only** — production builds (`npm run build`) are fully clean and do not exhibit this behaviour.

## User Preferences

- Lead engineer role: stabilise and finish the existing application
- Do NOT redesign the UI or branding
- Do NOT add features beyond what is already planned/implemented
- Focus on clean, production-ready builds
