@AGENTS.md

# Garden Journal

Mobile-first web app for planning a garden visually, tracking the work, and
journalling progress with photos. Requirements (in Lithuanian) live in
[app_requirements/](app_requirements/) and are the source of truth for scope.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Language | TypeScript, strict |
| DB | Neon serverless Postgres + Drizzle ORM |
| Auth | Auth.js v5 — email/password (bcrypt) with JWT sessions; Google optional |
| i18n | next-intl — `lt` is the default (unprefixed), `en` is prefixed |
| UI | Tailwind v4 + shadcn/ui (radix-nova preset) + Lucide |
| Forms | Server Actions + Zod (`src/lib/validation.ts`) |
| Plan editor | CSS grid + dnd-kit (no canvas library) |
| Photos | Client-side compression → direct upload to Vercel Blob |
| Tests | Vitest, unit only, `src/**/*.test.ts` |

## Conventions

- **Access control**: every page loader and server action that touches garden
  data calls `requireGardenAccess(gardenId, action)` from `src/lib/guards.ts`.
  Roles are `owner > editor > viewer`; the matrix lives in
  `src/lib/permissions.ts`. Non-members get "not found", never "forbidden".
- **Server actions** live in `src/actions/` and return `ActionResult`
  (`src/lib/action-result.ts`) rather than throwing. `error` is always a key
  under `errors.*` in the message catalogs.
- **Copy** goes through `messages/lt.json` + `messages/en.json`. Never hardcode
  user-facing strings — both files must stay key-for-key identical.
- **Dates**: garden data is date-only (`yyyy-MM-dd`). The app pins to
  `Europe/Vilnius` via `src/lib/dates.ts`; do not use the device clock for
  "today".
- **Recurring tasks** are not expanded up front. The rule sits on the task row
  and completing an occurrence materialises the next one — see
  `src/lib/recurrence.ts` and `completeTask` in `src/actions/tasks.ts`.
- **Authentication**: email and password via the Auth.js Credentials provider.
  That provider cannot use database sessions, so the strategy is JWT and the
  `session` table sits unused (the adapter still needs it for OAuth). Google is
  added only when `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are set — see
  `googleEnabled` in `src/lib/auth.ts` — so the sign-in page never offers a
  method that is not configured.
- **Password rules**: hashing and reset-token handling live in
  `src/lib/passwords.ts`. Reset tokens are stored only as a SHA-256 hash;
  the raw token exists solely in the email. Sign-in and forgot-password must
  never reveal whether an address is registered — `authorize()` burns matching
  time on a miss, and `requestPasswordReset` always reports success.
- **Middleware is `src/proxy.ts`** (Next.js 16 renamed the convention). It does
  locale routing plus an optimistic cookie check only; real authorisation
  happens in the guards.
- **Design**: mobile-first, bottom tab bar + central FAB, 44px minimum touch
  targets, body text ≥16px, warm off-white base with sage primary and terracotta
  `harvest` accent, dark mode from day one. Glassmorphism is limited to floating
  layers (top bar, bottom nav, sheets). Skeletons, not spinners.

## Commands

```bash
npm run dev          # Next dev server
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest run
npm run db:generate  # drizzle-kit generate (after editing src/db/schema.ts)
npm run db:migrate   # apply migrations
npm run db:seed      # seed the Lithuanian plant catalog
```

## Environment

Copy `.env.example` to `.env.local`. `DATABASE_URL` points at a Neon **dev
branch** locally and the primary branch in production.
