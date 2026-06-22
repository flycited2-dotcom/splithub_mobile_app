# Catalog Auto-Refresh Design

## Goal

Keep catalog prices and availability in the SplitHub application aligned with the
published site catalog whenever the app starts or returns to the foreground.

## Root Cause

The mobile app already requests `api/mobile.php?action=catalog` when its catalog
provider mounts. The production endpoint served `products.json` dated 2026-06-02,
while the storefront served `products.js` dated 2026-06-22. The app therefore
received stale data from a stale server-side catalog, rather than from its local
cache.

## Design

1. The server catalog pipeline treats `products.js` as the source of truth and
   generates `products.json` from exactly that file. Catalog deployment uploads
   both files together and verifies that product IDs and prices match.
2. The app fetches the remote catalog on cold start and whenever the app becomes
   active after being backgrounded. Its local snapshot remains an offline fallback
   only; it never intentionally delays an online refresh for 24 hours.
3. The existing pull-to-refresh actions remain a manual immediate refresh.
4. If a remote request fails, the app continues to show the last valid cached
   snapshot and marks it as offline. It does not erase usable catalog data.

## Non-Goals

- No storefront UI or order-flow changes.
- No background scheduler: Android and iOS do not guarantee exact background
  execution, while a foreground refresh matches the user-visible requirement.
- No automatic price edits in the app; all pricing stays server-authoritative.

## Verification

- Unit tests prove foreground activation triggers a catalog refresh.
- Unit tests prove catalog JSON generated from a `products.js` fixture preserves
  the same IDs and prices.
- Production verification compares live `products.js` with the mobile API result,
  then runs the mandatory storefront `send.php` smoke test after deployment.
