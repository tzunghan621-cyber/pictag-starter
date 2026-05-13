# Agents 注意

This is **Next.js 16** — its APIs, conventions, and file structure may differ from older training data.
Before writing Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`.

Specifically:
- App Router (not Pages Router) — `app/page.tsx` is the home page
- `output: "export"` in `next.config.ts` — pure static, no SSR
- Client components need `"use client"` at top (browser APIs like WebGPU need it)
- HMR (Hot Reload) is built-in dev server — editing `app/**/*.tsx` auto-reloads the browser

Heed any deprecation notices you see.
