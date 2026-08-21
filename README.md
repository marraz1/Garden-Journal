# Sodo žurnalas / Garden Journal

Mobile-first web app for planning a garden visually, tracking the work, and
journalling progress with photos. Interface in Lithuanian (default) and English.

Requirements documents (Lithuanian): [app_requirements/](app_requirements/).

## Features (v1)

- **Plan** — drag-and-drop grid editor for beds, coloured by plant family
- **Plants** — pick from a seeded Lithuanian catalog (sowing/harvest windows,
  care notes, days to maturity) or type your own
- **Tasks** — list and calendar views, overdue/today/week grouping, recurring
  tasks, one-tap completion with undo
- **Progress** — photo timeline with camera capture, browser-side compression
  and optional harvest/height measurements
- **Sharing** — invite a household or community garden by link, with
  owner / editor / viewer roles
- **Accounts** — email and password sign-up, sign-in and a forgot-password
  flow; Google sign-in appears only if you configure it
- Dark mode, installable to the home screen, WCAG-AA contrast, 44px touch targets

## Install it on your phone

The app ships a web manifest ([`src/app/manifest.ts`](src/app/manifest.ts)) and
icons, so both phone platforms can add it to the home screen. It then opens
full-screen, without browser chrome — same as a native app, from the same URL.

Open the deployed address on the phone first (`https://…`). Installing needs
HTTPS, so a `http://192.168.x.x:3000` dev server will not offer it.

### iOS / iPadOS (Safari)

1. Open the app in **Safari** — Chrome and Firefox on iOS can do this too, but
   Safari is the reliable path.
2. Tap the **Share** button (the square with an arrow, in the bottom toolbar).
3. Scroll down the share sheet and tap **Add to Home Screen**.
4. Edit the name if you like — it defaults to **Sodas** — then tap **Add**.

The icon appears on the home screen and the app opens standalone, in portrait.

**Worth knowing:** iOS keeps a separate cookie jar for home-screen web apps, so
the first launch will most likely ask you to sign in again, even if you are
signed in inside Safari. That is expected, not a bug.

### Android (Chrome)

1. Open the app in **Chrome**.
2. Tap the **⋮** menu (top right).
3. Tap **Add to Home screen** / **Install app**.
4. Confirm with **Install** / **Add**.

Chrome often also shows an install prompt in the address bar or as a bottom
banner after a couple of visits — that button does exactly the same thing.

On **Samsung Internet**: menu (☰) → **Add page to** → **Home screen**.
On **Firefox**: menu (⋮) → **Add to Home screen** (or **Install**).

The menu wording shifts between browser versions and phone languages — on a
Lithuanian phone look for "pradžios ekraną" / "pagrindinį ekraną".

### No offline mode yet

There is **no offline mode in v1** — the app has no service worker, so an
installed copy still needs a connection. Offline is deliberately left to a later
phase; see the comment in [`src/app/manifest.ts`](src/app/manifest.ts).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Drizzle ORM on
Neon Postgres · Auth.js v5 (email + password) · next-intl · Vercel Blob · Vitest

## Requirements

- **Node 24** (npm 11). `package-lock.json` is written by npm 11, and npm 10 —
  the one bundled with Node 22 — rejects it as out of sync, so `npm ci` fails
  with `Missing: esbuild@0.28.2 from lock file`. CI and the Vercel runtime are
  both pinned to Node 24 for the same reason.
- A **Neon** Postgres project (free tier is enough). Use a Neon *dev branch*
  locally so experiments cannot reach live data.

## Getting started

```bash
npm ci                       # npm install also works; npm ci needs Node 24
cp .env.example .env.local   # then fill in the values below
npm run db:migrate           # create the schema
npm run db:seed              # load the plant catalog
npm run dev
```

Then open http://localhost:3000 and sign up with an email and password.

Without any secrets at all you can still run the checks — `npm ci && npm run
lint && npm run typecheck && npm test` need no environment. `npm run build`
needs `AUTH_SECRET`, and anything that reads data needs `DATABASE_URL`.

### Environment

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon → project → pooled connection string (use a **dev branch** locally) |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | **Optional.** Google Cloud → Credentials → OAuth client (Web). Redirect URI: `http://localhost:3000/api/auth/callback/google`. Omit them and the Google button is hidden |
| `RESEND_API_KEY` / `EMAIL_FROM` | **Optional locally.** Sends password-reset emails. Without a key the reset link is logged to the server console instead |
| `BLOB_READ_WRITE_TOKEN` | Vercel project → Storage → Blob |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; the deployment URL in production. Used for invite links |

Already deployed? `npx vercel env pull .env.local` pulls the whole set, and
`npx neon env pull` pulls the database URL alone.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint at `--max-warnings=0` |
| `npm run lint:fix` | ESLint with `--fix` |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run format` | Prettier (writes) |
| `npm run format:check` | Prettier check — CI runs this one |
| `npm run db:generate` | Generate a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push the schema straight to the database (dev branches only) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Seed/refresh the plant catalog (idempotent) |

## Project layout

```
src/
  app/[locale]/(app)/   dashboard · plan · tasks · progress · beds · gardens · settings
  app/[locale]/         sign-in · sign-up · forgot-password · reset-password · join
  app/api/              Auth.js route handler, Blob upload token
  app/manifest.ts       web manifest (home-screen install)
  actions/              server actions — one file per domain
  components/           feature components + shadcn/ui in components/ui
  db/                   Drizzle schema, client and the plant-catalog seed
  i18n/                 next-intl routing and locale-aware path helpers
  lib/                  guards, permissions, validation, dates, recurrence, passwords
  proxy.ts              middleware (renamed from middleware.ts in Next.js 16)
drizzle/                generated SQL migrations — never edited by hand
messages/               lt.json + en.json, key-for-key identical
```

## Languages and URLs

Lithuanian is the default and stays **unprefixed** (`/plan`, `/tasks`); English
is **prefixed** (`/en/plan`). The language switch — and the light/dark/system
theme switch — lives in the profile menu in the top bar. All user-facing copy
comes from `messages/lt.json` and `messages/en.json`; the two files must stay
key-for-key identical.

Garden data is date-only (`yyyy-MM-dd`) and pinned to `Europe/Vilnius` via
`src/lib/dates.ts`, so "today" does not depend on the device clock.

## Roles

Each garden has members; the invite link carries the role.

| Role | Can |
|---|---|
| **viewer** | View the plan, tasks, plants and progress |
| **editor** | Everything a viewer can, plus edit beds, plants, tasks and progress entries |
| **owner** | Everything an editor can, plus invite/remove members, change roles, rename, resize or delete the garden |

Every page loader and server action that touches garden data goes through
`requireGardenAccess()` in `src/lib/guards.ts`. Non-members get "not found",
never "forbidden".

## Testing

`npm test` runs Vitest over `src/**/*.test.ts` — unit tests only, no database
and no environment needed. They cover the parts where a mistake is silent:
permissions, recurrence, date handling, password/reset-token handling and
locale-aware paths.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests and
`format:check` on every pull request and push to `main`. A second workflow
posts ESLint findings inline on pull requests.

## Deployment

Vercel, region `fra1`, configured in [`vercel.json`](vercel.json). Production
builds run `npm run db:migrate` before `next build`, so a merged migration is
applied on deploy; preview builds skip it. Set the same environment variables
in the Vercel project, with `NEXT_PUBLIC_APP_URL` pointing at the deployment
and `DATABASE_URL` at the Neon primary branch.

Current status, open items and traps worth knowing are tracked in
[NEXT-STEPS.md](NEXT-STEPS.md).

## Architecture notes

See [CLAUDE.md](CLAUDE.md) for the conventions that matter when changing this
codebase — access control, server-action shape, i18n rules, date handling and
how recurring tasks work. [REVIEW.md](REVIEW.md) is the pull-request checklist.
