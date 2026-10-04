<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Persistent Project Memory

> Durable context for any agent working in this repo. Read this before touching code.
> Keep it updated when structure, conventions, or known issues change.

## 1. What this project is

**Social Post AI** (`package.json` name: `social-post`) — a self-hostable AI SaaS that
generates platform-native social media posts (LinkedIn, Twitter/X, Facebook, Instagram,
Reddit, LINE) with live feed mockups, credit billing, and optional direct-publish intents.

- **Generation engine:** MuAPI `any-llm` (`google/gemini-2.5-flash`) via `https://api.muapi.ai`.
- **Monetization:** Stripe Checkout (`mode: payment`) buys credit packs; generation costs
  **4 credits** (or **0** when the user supplies their own MuAPI key).
- **Auth:** NextAuth with Google OAuth **and** a MuAPI-key credentials provider.
- **Vertical slice:** no test suite, no CI. Feature work is UI + API route + Prisma model.

## 2. Stack (verified from `package.json`)

| Layer | Actual version |
| --- | --- |
| Next.js | **16.2.6** (App Router) |
| React | 19.2.4 |
| Language | **JavaScript** (`.js`, JSX). No TypeScript in `src/` |
| Styling | Tailwind CSS **v4** (CSS-first `@theme`, no `tailwind.config.js`) |
| DB / ORM | PostgreSQL via Prisma 7 (`@prisma/client` 7.8) + `@prisma/adapter-pg` |
| Auth | next-auth 4.24 + `@next-auth/prisma-adapter` |
| Payments | stripe 22 |
| Icons / UX | `react-icons`, `react-hot-toast`, `clsx`, `axios` |
| Lint | ESLint 9 flat config (`eslint.config.mjs`, extends `next/core-web-vitals`) |

**Path alias:** `@/*` → `./src/*` (`jsconfig.json`). Use `@/lib/...`, `@/components/...`.

## 3. Commands

```bash
npm run dev      # next dev  → http://localhost:3000
npm run build    # prisma generate && next build
npm run lint     # eslint
npx prisma db push      # sync schema (no auto-migrate on build)
npx prisma db pull      # introspect shared DB (see gotcha §7)
```

## 4. File & folder structure

```
prisma/
  schema.prisma            # User, Account, Session, VerificationToken, SocialPostCreation
  config.ts                # Prisma CLI datasource (DIRECT_URL || DATABASE_URL)
src/
  app/
    layout.js              # Root layout: Inter font, Providers, Navbar, theme attr, metadata
    providers.js           # "use client" — SessionProvider + sets data-theme on mount
    page.js                # MAIN STUDIO: generation form + live platform preview mockups
    globals.css            # Tailwind v4 @theme tokens + data-theme overrides + utilities
    login/page.js          # Google + API-key tabs, OAuth error toasts (Suspense-wrapped)
    gallery/page.js        # Grid of saved creations + detail modal, polls every 5s
    pricing/page.js        # Credit pack cards → POST /api/checkout → Stripe redirect
    api/
      auth/[...nextauth]/route.js   # NextAuth GET/POST handler
      creations/route.js            # GET list + poll status; POST start generation
      checkout/route.js             # POST → Stripe checkout URL (used by pricing page)
      billing/checkout/route.js     # POST → same as above (duplicate surface)
      billing/webhook/route.js      # Stripe webhook → credit grant
      webhook/stripe/route.js       # Duplicate Stripe webhook handler
      user/apikey/route.js          # POST save / DELETE clear user's MuAPI key
  components/
    Navbar.js              # Client nav: links, credits, profile menu, API-key modal
    Footer.js              # Only imported by pricing/page.js (NOT in root layout)
  lib/
    config.js              # SINGLE SOURCE for platforms, tones, languages, lengths,
                           # plans, ai model + creditCost. Import this, don't hardcode.
    auth.js                # authOptions: adapters, providers, jwt/session/redirect callbacks
    prisma.js              # Prisma singleton + PrismaPg pool adapter
    stripe.js              # Stripe client (placeholder key fallback for build)
    services/
      ai.js                # generateSocialPost() + checkStatus() polling + mock fallback
      billing.js           # createCheckoutSession() + handleWebhook()
      user.js              # getCredits/addCredits/deductCredits
```

## 5. Architecture & data flow

**Generation lifecycle (optimistic + polling):**
1. `POST /api/creations` — validates session + credits, calls `AIService.generateSocialPost()`.
2. `generateSocialPost` deducts credits (unless custom key), submits to MuAPI, stores a
   `SocialPostCreation` row with `status: "processing"` and a `requestId`.
3. Client stores the `requestId` and polls `GET /api/creations?requestId=...` every 3s.
4. `AIService.checkStatus()` hits MuAPI's result endpoint, parses JSON, writes
   `resultText` (a JSON string `{ postText, headline, suggestedHashtags }`), sets
   `status: "completed"`. On failure it sets `status: "failed"` and **refunds credits**.
5. `GET /api/creations` also self-heals: any still-`processing` rows are re-polled.

**Credit model:** `User.credits` (Int). Cost = `config.ai.model.creditCost` (4). Custom
MuAPI key ⇒ cost 0. Failed predictions refund via `UserService.addCredits`.

**Mock fallback:** if `MU_API_KEY` is missing/invalid, or MuAPI submit throws,
`ai.js` creates a `requestId` prefixed `mock_` and synthesizes a per-platform post after
a ~3s delay. This lets the app run end-to-end with zero external keys.

**resultText contract:** always stored as a JSON **string**. Always read it through a
parse helper (see `getParsedText` in `page.js`) with a plain-text fallback.

## 6. Implementation guidelines

- **JavaScript only.** Match existing `.js` + JSX style; no TypeScript conversions.
- **Client vs server:** interactive pages/components use `"use client"`. API routes use
  `getServerSession(authOptions)` for auth — never trust client-supplied `userId`.
- **Config is central:** platforms/tones/languages/lengths/plans live in `@/lib/config`.
  Never hardcode a new platform, plan, or price in a page — extend `config.js`.
- **Services pattern:** DB/money logic belongs in `src/lib/services/*`. Routes stay thin
  (auth → parse → delegate → JSON/error). Reuse `UserService` for all credit mutations.
- **Errors:** routes return `new NextResponse(msg, { status })` or
  `NextResponse.json({ error })`; UI surfaces failures via `react-hot-toast` and inline
  banners. Keep whatever the file already uses.
- **Styling:** reuse existing Tailwind utility patterns and the `glass-panel` /
  `glass-dropdown` / `scrollbar-subtle` / `animate-*` helpers in `globals.css`.
  Prefer the semantic tokens (`bg-bg-page`, `bg-bg-card`, `text-primary-text`,
  `text-secondary-text`, `border-divider`, `bg-primary`) as the newer pages do.
- **No new dependencies** without a strong reason — the stack already covers UI, HTTP,
  icons, toasts, and payments.
- Comments: do not add explanatory comments to code you didn't need to explain.

## 7. Design system

Two coexisting layers — know which one you're extending:

**A. Token layer (preferred for new/refactored UI).** Tailwind v4 `@theme` in
`globals.css` defines CSS variables and matching utilities:
`--color-bg-page`, `--color-bg-card`, `--color-bg-card-hover`, `--color-bg-elevated`,
`--color-divider`, `--color-primary`, `--color-primary-hover`, `--color-primary-text`,
`--color-secondary-text`, `--color-primary-btn-text`. Default look is dark
("slate-indigo", bg `#09090b`, primary `#8b5cf6`). Alternate themes are activated by
`data-theme` on `<html>`: `cyberpunk`, `emerald`, `sunset`, `midnight`. Theme is set in
`layout.js` and re-applied on mount in `providers.js` from `config.theme` (default).
Used by: `layout.js`, `providers.js`, `Navbar.js`, `login/page.js`, `pricing/page.js`,
`Footer.js`.

**B. Hardcoded layer (the main Studio).** `src/app/page.js` uses literal Tailwind colors
(`bg-zinc-950`, `zinc-800/900`, `purple-*`, `emerald-*`) instead of tokens, so the Studio
does **not** currently respond to `data-theme`. The per-platform preview mockups also use
real brand colors (LinkedIn `#0a66c2`, X `zinc-300`, Facebook `#1877f2`, Instagram
`#e1306c`, Reddit `#ff4500`, LINE `#06c755`).

**UX conventions:** rounded-lg/xl cards, gradient primary CTA
(`from-purple-600 via-fuchsia-600 to-indigo-600`), custom dropdowns with chevron +
click-outside close (`overscroll-contain`), toggle switches for flags, animated
skeletons while `processing`, `animate-scale-up` / `animate-slide-up` / `animate-pulse-glow`
/ `animate-gradient-x` entrance effects. Icons come from `react-icons` (`fa`, `fi`, `io5`).

## 8. Environment variables (`.env`, gitignored; template in `.env.example`)

`DATABASE_URL` (pooled), `DIRECT_URL` (direct/migrations), `NEXTAUTH_URL`,
`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MU_API_KEY`,
`WEBHOOK_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_WEBHOOK_SECRET`.

`.env*` is gitignored except `.env.example`. Never commit or log secrets. `opencode.json`
currently contains a live Coolify token — treat it as a secret and scrub before public push.

## 9. Gotchas / known issues (read before changing)

- **Pricing UI ↔ backend mismatch:** `pricing/page.js` hardcodes its `PLANS` (Basic $5/100
  credits … Business $50/2000) while `config.stripe.plans` (used by
  `BillingService.createCheckoutSession`) defines Basic 500¢/1000 … Business 5000¢/10000.
  Checkout charges the **backend** amounts. Reconcile via `config.js` if pricing matters.
- **Duplicate routes:** `/api/checkout` and `/api/billing/checkout` are the same operation;
  `/api/billing/webhook` and `/api/webhook/stripe` are the same handler. Prefer
  `/api/checkout` + `/api/billing/webhook`, but do not delete blindly — confirm references.
- **`Navbar` `/app/<id>` branch** builds nested links that have no matching routes in this
  repo (template leftover). Top-level `/`, `/gallery`, `/pricing` are the real routes.
- **Prisma 7 adapter:** `auth.js` overrides `getUserByAccount` with `findFirst` because the
  stock adapter's compound-unique selector is rejected. Preserve this override.
- **Shared database:** the README warns this Postgres instance is shared with other apps.
  Use the `db pull → edit → db push → strip → generate` cycle; do **not** wipe the DB.
- **Prisma client output:** generator is `prisma-client-js`; run `npx prisma generate`
  after schema edits (build does it automatically).
- **Layout:** only `Navbar` is global. `Footer` must be added per-page (currently pricing).
- **Widget-hygiene script:** `layout.js` `<head>` strips `bis_*` attributes injected by
  browser extensions to avoid hydration warnings — leave it alone.

## 10. Current session state (recent work)

- Removed the `Deploy`/Vercel button from `Navbar.js` (desktop + mobile) and its unused
  `SiVercel` import.
- Google OAuth fixes: sanitized the `next` redirect in `login/page.js`, added
  `callbacks.redirect` + `pages.error: "/login"` in `auth.js`, and toasts for OAuth errors.
- Repo initialized on branch `main`; remote `hansondev/ai-social-media-post-generation-app`.
- README refreshed (upstream badges, hosted demo, and one-click deploy button removed) and
  version/structure references corrected to match the code.
- Lint baseline: `npm run lint` has pre-existing errors/warnings (e.g. `setState in effect`,
  `<img>` vs `next/image`, unused vars). New work should not add more.
