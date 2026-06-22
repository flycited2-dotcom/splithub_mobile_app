# Catalog Auto-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the app catalog whenever the user opens or returns to the app, while making the site deployment pipeline keep the mobile catalog synchronized with the storefront source.

**Architecture:** `CatalogProvider` remains the single owner of visible catalog state. It will subscribe to React Native `AppState` and reuse its existing `refresh()` operation when the application becomes active. The backend pipeline will generate `products.json` from `products.js`, compare the two snapshots by ID and price, and upload them as a pair.

**Tech Stack:** React Native AppState, React/TypeScript, Jest, Python standard library, Paramiko deployment script.

## Global Constraints

- Mobile work uses only `api/mobile.php` and does not change `send.php` or `index.html`.
- `products.js` is the catalog source of truth; `products.json` is generated from it.
- A catalog deploy uploads `products.js` and `products.json` together.
- Preserve the fail-open storefront order intake and Telegram force-IP configuration.
- Cached catalog data is offline fallback, not a 24-hour online refresh delay.

---

### Task 1: Refresh the Mobile Catalog on Foreground Activation

**Files:**
- Modify: `src/features/catalog/catalog-context.tsx`
- Test: `__tests__/catalog-context.test.tsx`

**Interfaces:**
- Consumes: `AppState.addEventListener('change', listener)` and existing `refresh(): Promise<void>`.
- Produces: a foreground transition from `background` or `inactive` to `active` invokes `refresh()` once.

- [ ] **Step 1: Write the failing test**

Create a mocked AppState subscription, render `CatalogProvider`, invoke the registered listener with `background` and then `active`, and assert that `loadCatalog` was called twice: once on mount and once on foreground return.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --runInBand --runTestsByPath __tests__\\catalog-context.test.tsx`

Expected: FAIL because the provider currently has no AppState listener.

- [ ] **Step 3: Implement the minimal subscription**

Import `AppState`, remember the previous state in a ref, subscribe during provider lifetime, and call `void refresh()` only when the state changes from a non-active state to `active`. Remove the listener on unmount.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm.cmd test -- --runInBand --runTestsByPath __tests__\\catalog-context.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run the mobile regression suite**

Run: `npm.cmd test -- --runInBand --ci`, `npm.cmd run typecheck`, and `npm.cmd run lint`.

Expected: all commands exit 0.

### Task 2: Synchronize the Server Catalog Pair

**Files:**
- Create: `tools/catalog_sync.py` in the SplitHub server repository
- Create: `tests/test_catalog_sync.py` in the SplitHub server repository
- Modify: `converter/deploy.py` in the SplitHub server repository
- Modify: `converter/convert.py` in the SplitHub server repository

**Interfaces:**
- Consumes: a UTF-8 `products.js` beginning with `var PRODUCTS =`.
- Produces: valid `products.json` and `assert_catalogs_match(products_js, products_json)` that fails on a missing ID or price mismatch.

- [ ] **Step 1: Write a failing Python test**

Use a two-product `products.js` fixture. Assert the conversion writes valid JSON with matching IDs/prices. Add a separate assertion that a changed JSON price raises an explicit mismatch error.

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m unittest tests.test_catalog_sync -v`

Expected: FAIL because `tools/catalog_sync.py` does not exist.

- [ ] **Step 3: Implement parsing and verification**

Implement `parse_products_js`, `write_products_json`, and `assert_catalogs_match` using only Python standard library JSON parsing. Compare ID sets and each matched product price.

- [ ] **Step 4: Generate and verify before deployment**

Update `converter/deploy.py` to require both output files and validate them before any SFTP upload. Update converter instructions so they no longer advise uploading only `products.js` or unpacking `deploy.zip` in production.

- [ ] **Step 5: Run the focused server test**

Run: `python -m unittest tests.test_catalog_sync -v`

Expected: PASS.

### Task 3: Repair and Verify Production Catalog Data

**Files:**
- Production only: `products.json` generated from the currently deployed `products.js`

**Interfaces:**
- Consumes: live `https://splithub.ru/products.js`.
- Produces: `https://splithub.ru/api/mobile.php?action=catalog` with the same product count, IDs, and prices.

- [ ] **Step 1: Fetch the live source and generate a temporary JSON file**

Run the catalog sync script against a downloaded copy of live `products.js`; do not modify `products.js` and do not unpack `deploy.zip`.

- [ ] **Step 2: Verify the generated pair before upload**

Run the sync comparison and confirm the generated JSON has 238 products and matches the live JavaScript catalog exactly.

- [ ] **Step 3: Upload only the generated `products.json` with a timestamped backup**

Use the existing deployment credential file and SFTP. Preserve the live `products.js` unchanged.

- [ ] **Step 4: Verify the live API and storefront**

Compare production API catalog IDs/prices to live `products.js`, then send the required live-shape POST to `send.php` with an item without `id` and verify `{"ok":true}`.

- [ ] **Step 5: Commit focused changes separately**

Commit mobile foreground-refresh code in the mobile repository and catalog pipeline code in the server repository. Do not stage credentials, generated files, APKs, backups, or unrelated user changes.
