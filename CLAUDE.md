# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-file browser shopping-list app (`index.html`) with a standalone Playwright test (`test-shopping-list.mjs`). No framework, no bundler, no build step — the app runs by opening `index.html` directly in a browser. Users sign in with **Supabase Auth** (email/password); each user's data is persisted to and isolated in a **Supabase** Postgres table (`shopping_items`) via `@supabase/supabase-js` (loaded from CDN). Published to GitHub at `github.com/byh0485/shopping-list-app`.

## Commands

```bash
# Run the Playwright test (headless Chromium)
npm test                 # → node test-shopping-list.mjs

# First-time setup
npm install && npx playwright install chromium
```

There is no lint or build step.

## Architecture notes

**App (`index.html`)** — self-contained HTML/CSS/JS in one file (`<script type="module">`). Two views toggle via the `.hidden` class: `#authView` (login/signup) and `#appView` (the list). `supabase.auth.onAuthStateChange` + an initial `getSession()` drive `applySession(session)`, which swaps views and, when logged in, runs `load()`. `applySession` is guarded by `currentUserId` so the double INITIAL_SESSION/getSession fire doesn't double-load. `login`/`signup`/`logout` never flip views directly — they let the auth-state callback do it.

State is an in-memory array of `{ id, name, done }` rows loaded from `shopping_items` on login via `load()`. Item identity is the Supabase row **`id` (uuid)** — `toggle`/`remove` target rows by `id`, not array index. Each mutation is an async Supabase call (`insert`/`update`/`delete`) that, on success, updates the local `items` array and re-runs `render()`. `insert` omits `user_id` — the column defaults to `auth.uid()`. Errors are logged via `console.error` (which the test asserts against).

**Supabase config & schema** — `SUPABASE_URL` and `SUPABASE_KEY` are constants near the top of the `<script>`. The key is a **publishable** (public client) key, safe to ship in the browser; data access is gated by RLS. The same values are mirrored in `.env` (gitignored). Table: `id uuid pk`, `name text`, `done boolean`, `created_at timestamptz`, `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`. RLS is **per-user**: four policies (`select`/`insert`/`update`/`delete`) for role `authenticated`, all scoped to `auth.uid() = user_id`. **Email confirmation must be OFF** in the Supabase dashboard (Auth → Email provider → Confirm email) so signup returns a session immediately; otherwise signup only sends a confirmation email and the test can't self-provision.

**Test (`test-shopping-list.mjs`)** — a standalone Playwright script, not a test-runner suite. RLS requires auth, so it first calls `getTestToken()` (signs in a dedicated test account `shopping.list.tester@proton.me`, self-provisioning via `/auth/v1/signup` on first run) and `resetDb(token)` (REST `DELETE` scoped by the user's token) before and after the run. It logs in through the real UI via `loginViaUI()`, then drives `index.html` via `file://`. Async mutations are awaited via `waitCount(n)` / `waitDone(i, bool)` (`page.waitForFunction`). It tracks a custom `passed`/`failed` counter, `process.exit(1)` on any failure, and asserts **zero console/page errors**. When you change the app's DOM structure or selectors (`#authView`, `#appView`, `#emailInput`, `#passwordInput`, `#loginBtn`, `#logoutBtn`, `#userEmail`, `#itemInput`, `#addBtn`, `#list li .check/.text/.del`, `#count`, `#clearDone`), the table name/keys, or the test credentials, update the matching locators and constants here.
