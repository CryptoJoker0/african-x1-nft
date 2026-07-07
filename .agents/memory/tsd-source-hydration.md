---
name: TanStack devtools hydration warning
description: data-tsd-source attributes injected by @tanstack/devtools-vite cause hydration mismatch in dev mode; why and what to do about it.
---

The `@lovable.dev/vite-tanstack-config` loads `@tanstack/devtools-vite` with `injectSource: { enabled: true }` when `mode === "development"`. This plugin adds `data-tsd-source="<file>:<line>:<col>"` to every JSX element as an AST transform. Because the SSR and client transforms run in different contexts, they calculate different line/column numbers for the same elements, causing React to print a hydration mismatch warning.

**Why:** The plugin is hardcoded inside the Lovable wrapper and can't be disabled via vite.config.ts options.

**Effect:** Dev-only browser console warning. No functional impact. Production builds (`npm run build`) do not run the plugin and are fully clean.

**How to apply:** `suppressHydrationWarning` was added to `<html>`, `<head>`, and `<body>` in `RootShell` (`src/routes/__root.tsx`) to suppress warnings for those root elements. Deeper elements still warn in dev; this is acceptable.

**Future fix (if needed):** Add a custom Vite SSR plugin that strips `data-tsd-source` props from SSR code, or pin `@lovable.dev/vite-tanstack-config` to a version that supports `injectSource: { enabled: false }`.
