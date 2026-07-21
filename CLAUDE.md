# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a study/scratch folder (`Study-06`) that contains **two unrelated mini-projects** sharing one `package.json`. Treat them as independent — a change to one should not touch the other.

1. **쇼핑리스트 앱** — a single-file browser app (`index.html`) with a Playwright test (`test-shopping-list.mjs`). Published to GitHub at `github.com/byh0485/shopping-list-app`.
2. **AI 트렌드 슬라이드 생성기** — a Node script (`gen-ai-trends.mjs`) that generates `AI-기술트렌드-요약.pptx` via `pptxgenjs`.

The shared `package.json` declares `type: "commonjs"`, but both scripts are ES modules (`.mjs`) and run directly with `node`. Its `test` script is the npm placeholder and does **not** run the shopping-list test — use the commands below.

## Commands

```bash
# Shopping-list Playwright test (headless Chromium)
node test-shopping-list.mjs
# First-time setup for the test:
npm install && npx playwright install chromium

# Regenerate the PPTX from the trends script
node gen-ai-trends.mjs   # writes AI-기술트렌드-요약.pptx to the folder root
```

There is no build step or linter. The shopping-list app runs by opening `index.html` directly in a browser.

## Architecture notes

**Shopping-list app (`index.html`)** — self-contained: HTML, CSS, and JS in one file, no framework or bundler. State is an array of `{ name, done }` persisted to `localStorage` under the key `shopping-list-items`. The full render cycle is `save()` → `render()`, where `render()` rebuilds the entire `<ul>` from the `items` array on every mutation (add/toggle/remove/clearDone). Item identity is by **array index**, so any change to ordering or indexing must stay consistent across `toggle`/`remove` and the DOM event handlers.

**Shopping-list test (`test-shopping-list.mjs`)** — a standalone Playwright script (not a test-runner suite). It calls `localStorage.clear()` + reload before assertions, drives the real `index.html` via `file://`, tracks a custom `passed`/`failed` counter, and `process.exit(1)` on any failure. It also asserts **zero console/page errors** during the run. When you change the app's DOM structure or selectors (`#itemInput`, `#addBtn`, `#list li .check/.text/.del`, `#count`, `#clearDone`), update the matching locators here.

**Trends generator (`gen-ai-trends.mjs`)** — imperative `pptxgenjs` layout code for a single wide slide. Content lives in the `trends` array (6 cards in a 3×2 grid); card positions are computed from `cols/rows/gx/gy/startX/startY/cardW/cardH`, so edits to the grid math affect all cards. Colors are hardcoded hex constants near the top.
