# Test Coverage Analysis — TECHMED website

Scope: the whole repo as it exists on `main` today — the live static site at
the repo root plus the Astro rebuild scaffold under `web/`. (`web/` was
already merged into `main` via the `astro-foundation` PR; there is no
separate branch for it.) Written because payment and testimonials are being
ported from the old site into the Astro rebuild, so this also flags which
old-site logic is worth protecting with tests *before* it gets carried over.

## Baseline: 0% coverage, no test infrastructure anywhere

Before this branch, there was no test runner, no test files, and no root
`package.json` in the repo at all. `web/package.json` (the Astro app) has no
test dependency or script either. Every line of business logic — payment
handling, the admission-predictor formulas, the gamified quiz engine — has
shipped and been modified purely on manual QA.

## Risk-ranked inventory

| Area | Files | Size | Risk | Why |
|---|---|---|---|---|
| **Payment** | `supabase/functions/pay-initiate`, `pay-webhook` | ~350 lines | **High** | Handles real money via Paystack. Webhook signature verification, idempotency (a recent commit — "Guard against duplicate charges" — shows this has already bitten once), and server-side price enforcement all live here with zero regression protection. |
| **Admission Predictor** | `js/engine.js` | 3,505 lines | **High** | The core product. ~60 university-specific aggregate formulas, cutoffs, and admission-chance math (`calcAggregate`, `calcChanceV2`, `getPosition`, `getTargetScores`). Silent formula regressions would be very hard to notice by eye. |
| **Daily Challenge / gamification** | `intelligence.html` (embedded `<script>`) | 8,779 lines | **High** (untouched by this branch) | XP, streaks, Supabase reads/writes for player state. `exam-mode.js` depends directly on globals this file defines (`DC_SUBJECTS`, `sbFetch`, `dcEnsurePlayer`, …), so the two can't be tested independently. |
| **Custom Practice / Exam Mode** | `exam-mode.js` | 423 lines | Medium | XP formula, shuffling, scoring, and a save-with-one-retry pattern — all reasonable to test, but entirely coupled to DOM (`innerHTML` rendering) and to `intelligence.html`'s globals. |
| **Crossword clue generator** | `functions/api/crossword-clues.js` | 167 lines | Medium | Proxies Gemini, with real edge-case logic (truncated-JSON repair, answer sanitization/dedup). Low blast radius (a bonus mini-game) but the *only* file in the old site already structured as a plain, dependency-free function — cheapest place to get real coverage. |
| **Admin upload** | `supabase/functions/admin-upload` | 48 lines | Low | Explicitly a temporary, secret-gated one-off tool (comment in the file says to delete it after first use). |
| **Testimonials** | `testimonials.html` (embedded `<script>`) | 1,327 lines | Low | Lightbox, carousel-track duplication, theme toggle — presentational, no calculations or external calls. Low value to unit test; if it's worth protecting through the Astro port, a browser/E2E smoke test would catch more than unit tests would. |
| **Astro rebuild** | `web/src/**` | ~5 files | N/A yet | Just a layout, one `Hero.astro` component, and one page. No business logic has landed there yet — nothing to test until the payment/testimonials port actually starts. |

## What this branch adds

A working Vitest harness plus **50 passing tests** against the two highest-risk,
most tractable areas: the Paystack edge functions and the predictor engine's
calculation core.

```
npm install
npm test
```

- `tests/functions/crossword-clues.test.js` (12 tests) — validation errors,
  Gemini failure modes, the truncated-JSON repair path, and answer
  sanitization/dedup. Imports `functions/api/crossword-clues.js` directly; no
  shimming needed since it's already a plain, dependency-free function.

- `tests/supabase/pay-webhook.test.ts` (13 tests) — signature verification
  (missing/invalid/valid, using a real HMAC-SHA512 computed the same way
  Paystack does), the pending→paid idempotency guard (a webhook retry for an
  already-paid order must not send a second email), and the "a failed
  delivery email must never revert a confirmed payment" invariant the file's
  own comments call out.

- `tests/supabase/pay-initiate.test.ts` (12 tests) — price integrity (the
  server-side `PRODUCTS` table is what gets charged, confirmed by asserting
  the exact kobo amount sent to Paystack even when the request body includes
  a spoofed `amount`), input validation, and Paystack-failure / DB-failure
  handling.

- `tests/engine/predictor.test.js` (13 tests) — `olevelScore`,
  `hasFailingGrade`/`hasF9`, `getCourseTier`, `getCourseCutoff`, and
  `calcAggregate` for two of the ~20 formula types (UNILAG, LASU), each
  checked against the formula spelled out in the file's own comments.

### How the harness works around two real obstacles

1. **The Supabase functions are written for Deno**, importing the client via
   `jsr:@supabase/supabase-js@2` (unresolvable in Node) and registering a
   handler via a top-level `Deno.serve(handler)` call. `vitest.config.ts`
   aliases that exact import specifier to `tests/mocks/supabase-js.ts`, and
   `tests/setup/deno-shim.ts` stubs `Deno.serve`/`Deno.env.get` so the real
   `index.ts` files import unmodified and each test just calls the captured
   handler with a normal Web `Request`. No source file was changed to make
   this possible.

2. **`js/engine.js` is a non-module `<script>`** whose pure calculation
   functions sit above 3,000+ lines of DOM wiring registered inside a single
   `DOMContentLoaded` listener (including an `IntersectionObserver`, which
   jsdom doesn't implement). `tests/setup/load-engine.js` lets a blank jsdom
   document finish its load lifecycle *first* — so `DOMContentLoaded` fires
   and passes with nothing listening — and only then evaluates the script.
   Every top-level `function` declaration lands on `window` as it would from
   a real `<script>` tag; the DOM-wiring block registers a listener for an
   event that already fired, so it never runs. This gets real function-level
   testing without touching `engine.js` itself.

## Why coverage stops there: the architectural blockers

- **`js/engine.js`'s formula functions aren't fully pure.** `calcAggregate`
  reads `window.sits` as a fallback for a few formula types instead of
  taking it as a parameter, and the higher-level `calcChanceV2`/`getPosition`
  functions read/write several other `window.*` globals directly. The
  jsdom-eval trick above sidesteps this for the two formulas tested here, but
  testing all ~20 formula types and the chance/position math cleanly would
  need those functions to take their inputs as explicit parameters — a
  behavior-preserving refactor, not something to do silently as part of a
  coverage pass.
- **`exam-mode.js` and `intelligence.html`'s Daily Challenge engine are
  DOM-rendering + Supabase-client-call code, not calculation code.** Almost
  every function directly builds `innerHTML` strings and calls `sbFetch`/
  `dcUpdatePlayer` etc. There's very little pure logic to extract without a
  real refactor (e.g. splitting "compute the result" from "render the
  result").
- **No CI wiring yet.** `npm test` works locally now, but nothing runs it on
  push/PR. Worth adding once this settles, so regressions get caught instead
  of relying on someone remembering to run it.

## Recommendations, in priority order

1. **Keep the payment tests current through the Astro port.** As
   `pay-initiate`/`pay-webhook` (or their Astro/Cloudflare equivalents) move
   into the new site, carry these tests with them — they're the cheapest
   insurance against reintroducing the exact duplicate-charge class of bug
   the "Guard against duplicate charges" commit already had to fix once.
2. **Wire `npm test` into CI** (GitHub Actions) so this doesn't silently rot.
3. **If the predictor engine is also getting ported**, that's the moment to
   do the `window.*` → explicit-parameter refactor for `calcAggregate`/
   `calcChanceV2`/`getPosition` — it pays for itself immediately by making
   the remaining ~18 formula types (and the admission-chance math on top of
   them) testable the same way the two covered here are.
4. **Testimonials**: if it's carried over close to verbatim, a couple of
   Playwright smoke checks (lightbox opens, carousel doesn't visibly break)
   would catch more real regressions than unit tests would, given the file
   is almost entirely presentational.
5. **Daily Challenge / `intelligence.html`** is the largest untested surface
   in the repo (8.8k lines) but also the most expensive to make testable —
   treat it as a later, deliberate effort rather than folding it into this
   pass.
