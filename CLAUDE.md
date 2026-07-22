# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-file browser shopping-list app (`index.html`) with a standalone Playwright test (`test-shopping-list.mjs`). No framework, no bundler, no build step — the app runs by opening `index.html` directly in a browser. Data is persisted to a **Supabase** Postgres table (`shopping_items`) via `@supabase/supabase-js` (loaded from CDN). Published to GitHub at `github.com/byh0485/shopping-list-app`.

## Commands

```bash
# Run the Playwright test (headless Chromium)
npm test                 # → node test-shopping-list.mjs

# First-time setup
npm install && npx playwright install chromium
```

There is no lint or build step.

## Architecture notes

**App (`index.html`)** — self-contained HTML/CSS/JS in one file (`<script type="module">`). State is an in-memory array of `{ id, name, done }` rows loaded from the Supabase `shopping_items` table on startup via `load()`. Item identity is the Supabase row **`id` (uuid)** — `toggle`/`remove` target rows by `id`, not array index. Each mutation is an async Supabase call (`insert`/`update`/`delete`) that, on success, updates the local `items` array and re-runs `render()`; `render()` rebuilds the entire `<ul>` from `items`. Errors are logged via `console.error` (which the test asserts against).

**Supabase config** — `SUPABASE_URL` and `SUPABASE_KEY` are constants near the top of the `<script>`. The key is a **publishable** (public client) key, safe to ship in the browser; data access is gated by Row Level Security policies on the table. The same values are mirrored in `.env` (gitignored) for reference. Table schema: `id uuid pk`, `name text`, `done boolean`, `created_at timestamptz`; RLS enabled with anon read/insert/update/delete policies (public demo app).

**Test (`test-shopping-list.mjs`)** — a standalone Playwright script, not a test-runner suite. Because state now lives in Supabase, it calls `resetDb()` (a REST `DELETE` against the table using the publishable key) before and after the run instead of `localStorage.clear()`. Mutations are async, so the test waits for DOM updates via `waitCount(n)` / `waitDone(i, bool)` (`page.waitForFunction`) before asserting. It drives the real `index.html` via `file://`, tracks a custom `passed`/`failed` counter, `process.exit(1)` on any failure, and asserts **zero console/page errors**. When you change the app's DOM structure or selectors (`#itemInput`, `#addBtn`, `#list li .check/.text/.del`, `#count`, `#clearDone`), or the table name/keys, update the matching locators and constants here.
