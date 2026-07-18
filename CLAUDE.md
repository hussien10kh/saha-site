# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"ساحة" (Saaha) — a Syrian Arabic-language classifieds marketplace (real estate, cars, misc), RTL throughout. Static HTML/CSS/vanilla-JS site (no build step, no bundler, no package.json/node_modules) backed by Supabase (Postgres + Auth + Storage), deployed to production at saaha.net via Netlify.

## Commands

There is no build, lint, or test tooling in this repo (no `package.json`). To verify changes locally:
- Spin up a throwaway static file server (e.g. a small PowerShell script using `System.Net.HttpListener`, or any static server) and browse the pages directly — see `WORKFLOW-NOTES.md` for the caching gotchas this surfaces.
- There are no automated tests; verification is manual, in-browser, per page/flow touched.

## Architecture

**Everything shares one global JS load order**, present at the bottom of every page:
```html
<script src="js/vendor/supabase.js"></script>   <!-- vendored Supabase JS client (pinned version, see below) -->
<script src="js/supabase-client.js"></script>   <!-- creates the `sb` client + hybrid session storage -->
<script src="js/app.js"></script>               <!-- all shared data/rendering helpers, ~1300 lines -->
<script> ...page-specific inline script... </script>
```
`js/app.js` is the real core of the codebase — it holds the `ICONS` map, `CITY_GROUPS`/`CITIES`, all Supabase data-access functions (`getActiveAds`, `addAd`, `updateAd`, `deleteAd`, `toggleFavorite`, `getComments`, auth helpers, etc.), `renderHeader`/`renderFooter`/`renderMobileNav` (injected into every page's `#site-header`/`#site-footer`/`#mobile-nav` divs), the PWA install-prompt/theme/last-page-tracking logic, and the client-side spam/gibberish/rate-limit heuristics for ad posting. Every HTML page is a thin shell that calls into these shared functions rather than duplicating logic — when changing shared behavior (icons, ad card markup, validation, favorites, etc.), the fix almost always belongs in `app.js`, not the individual page.

`js/admin.js` (loaded only by `admin.html`) is the admin-dashboard equivalent, built on top of the same `app.js` helpers. Admin write access is enforced server-side by Postgres RLS checking `profiles.is_admin`, not just by hiding UI client-side.

**Supabase**: schema lives outside this repo at `../backup/supabase_schema.sql` (not tracked in this git repo) — run once in the Supabase SQL editor. Tables: `profiles` (1:1 with `auth.users`, auto-created via trigger, holds `name`/`phone`/`avatar_url`/`is_admin`), `ads`, `favorites`, `comments`. RLS: public read on `ads`/`comments`/`profiles`; writes restricted to the owning `auth.uid()` or an admin. Ad photos and avatars go to the `sahat-media` Storage bucket under `<uid>/...` paths, enforced by storage RLS policies keyed off the path's first folder segment. Auth supports real email/password, Google OAuth (via Google Identity Services, needs `GOOGLE_CLIENT_ID` in `login.html`), and anonymous "guest" sessions (name+phone only, no password) — there is no phone-based login/recovery, only email.

**PWA / Service Worker** (`sw.js`): precaches the app shell, stale-while-revalidate for other same-origin GET requests, network-first for navigations. Background cache writes are deliberately wrapped in `event.waitUntil()` but kept OUT of the promise chain that `event.respondWith()` waits on — cache freshness must never add latency to page loads. `CACHE_NAME` must be bumped whenever `PRECACHE_URLS` changes. `js/app.js` shows a small dismissible "update available" banner (`showUpdateNotice`) on `controllerchange` rather than forcing a reload.

**Netlify**: `netlify.toml` publishes the repo root as-is (`publish = "."`) with one function, `netlify/functions/sitemap.js` (generates `sitemap.xml` live from the `ads` table, falling back to static pages only if Supabase is unreachable). See `WORKFLOW-NOTES.md` for the credit-billing model (production deploys are expensive — batch fixes into fewer merges to `master`) and the git branch workflow (feature branches → Netlify deploy preview → merge to `master` → auto-deploy to saaha.net).

## Conventions worth knowing before editing

- RTL layout: in flexbox/grid contexts with `dir="rtl"`, the first DOM child renders at the visual right; this matters constantly when reasoning about left/right positioning in the footer, lightbox nav, etc.
- User-generated text is always passed through `escapeHTML()` before going into template strings destined for `innerHTML`.
- Phone numbers are normalized through `normalizePhone`/`toAsciiDigits` (in `app.js`) to convert Arabic/Persian digits to ASCII before storage/display/dialing.
- Any Supabase mutation helper in `app.js` should check `{ error }` and `throw` on failure — several older ones didn't (silent failures were a recurring bug class found in a full-codebase audit); callers should wrap calls in `try/catch` and show a real error toast rather than assuming success.
