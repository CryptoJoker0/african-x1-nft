---
name: Node.js 22 required
description: TanStack Start requires Node 22+; Bus error on Node 20; fix is clean reinstall after upgrading runtime.
---

# Node.js 22 Required for TanStack Start

## The rule
TanStack Start (with Vite 8 + Nitro) requires Node.js ≥ 22.12.0. Running on Node 20 causes a Bus error (SIGBUS) when Vite tries to start.

**Why:** Native bindings (Rollup's `@rollup/rollup-linux-x64-gnu`) compiled for Node 20 are binary-incompatible with Node 22, and vice versa. Even after upgrading Node, if node_modules still has Node-20-compiled binaries, you get Bus error.

**How to apply:**
1. `installProgrammingLanguage({ language: "nodejs-22" })` via CodeExecution
2. `rm -rf node_modules package-lock.json && npm install` — full clean rebuild of all native bindings
3. Restart the workflow — should come up clean in ~1.5s

**Symptom:** `Bus error` in workflow logs, exit code 135 when running `vite dev`.
**Confirm fix:** `node node_modules/.bin/vite --version` should print `vite/8.x.x ... node-v22.x.x` with no crash.
