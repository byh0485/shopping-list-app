# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-file browser shopping-list app (`index.html`) with a standalone Playwright test (`test-shopping-list.mjs`). No framework, no bundler, no build step — the app runs by opening `index.html` directly in a browser.

`package.json` declares `type: "commonjs"`, but the test is an ES module (`.mjs`) run directly with `node`.

## Commands

```bash
# Run the Playwright test (headless Chromium)
npm test                 # → node test-shopping-list.mjs

# First-time setup
npm install && npx playwright install chromium
```

There is no lint or build step.

## Architecture notes

**App (`index.html`)** — self-contained HTML/CSS/JS in one file. State is an array of `{ name, done }` persisted to `localStorage` under the key `shopping-list-items`. Every mutation (add/toggle/remove/clearDone) runs `save()` → `render()`, and `render()` rebuilds the entire `<ul>` from the `items` array. Item identity is by **array index**, so any change to ordering or indexing must stay consistent across `toggle`/`remove` and their DOM event handlers.

**Test (`test-shopping-list.mjs`)** — a standalone Playwright script, not a test-runner suite. It calls `localStorage.clear()` + reload before assertions, drives the real `index.html` via `file://`, tracks a custom `passed`/`failed` counter, and `process.exit(1)` on any failure. It also asserts **zero console/page errors** during the run. When you change the app's DOM structure or selectors (`#itemInput`, `#addBtn`, `#list li .check/.text/.del`, `#count`, `#clearDone`), update the matching locators here.
