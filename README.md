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
- Dark mode, installable to the home screen, WCAG-AA contrast, 44px touch targets

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Drizzle ORM on
Neon Postgres · Auth.js v5 (Google) · next-intl · Vercel Blob · Vitest

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run db:migrate           # create the schema
npm run db:seed              # load the plant catalog
npm run dev
```

### Environment

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon → project → pooled connection string (use a **dev branch** locally) |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud → Credentials → OAuth client (Web). Redirect URI: `http://localhost:3000/api/auth/callback/google` |
| `BLOB_READ_WRITE_TOKEN` | Vercel project → Storage → Blob |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; the deployment URL in production |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run format` | Prettier |
| `npm run db:generate` | Generate a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Seed/refresh the plant catalog (idempotent) |

## Architecture notes

See [CLAUDE.md](CLAUDE.md) for the conventions that matter when changing this
codebase — access control, server-action shape, i18n rules, date handling and
how recurring tasks work.
