# Where this project stands

Working notes for picking the work back up — including from a fresh session
that has only the repository. Read [CLAUDE.md](CLAUDE.md) for conventions and
[REVIEW.md](REVIEW.md) for what to check in a pull request.

_Last updated: 21 August 2026._

## State

- **v1 is built and merged to `main`** (PR #1): email/password accounts, visual
  bed planner, plant catalog, recurring tasks, photo journal, garden sharing.
- **Lint, CI and automated PR review are merged** (PR #2): reviewdog posts
  ESLint findings inline, `lint` runs at `--max-warnings=0`.
- **Deployed to preview only.** Production has never been published.
  Latest preview: `garden-journal-cyo4i8ld1-mr-hobby.vercel.app`
- **Database is live** — Neon project `garden-journal`, schema migrated and the
  41-entry plant catalog seeded.

## What still needs doing

1. **Branch protection — still absent.** No ruleset exists on `main`. Add one
   requiring the **`verify`** and **`eslint-review`** checks. Until then the
   gate is advisory: CI failed on PR #1 and it merged anyway.
2. **`RESEND_API_KEY` is unset.** Password-reset emails are not sent; the reset
   link is written to the server log instead. Fine locally, not in production.
3. **Google sign-in is off.** No `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, so the
   button is hidden by design. Email/password is unaffected.
4. **Local dev points at the Neon `production` branch.** A dev branch was
   planned so local experiments cannot reach live data — never created.
5. **Production deploy** is a deliberate hold, pending the items above.

## Known issues, deliberately not fixed

- **`esbuild` version conflict.** `vitest → vite@8` wants
  `esbuild ^0.27 || ^0.28` but resolves `0.25.12`, deduped from the copy
  `drizzle-kit` pins. `npm ls esbuild` exits with `ELSPROBLEMS`. It does not
  block `npm ci` and all tests pass; forcing an override risks breaking
  `drizzle-kit` for no observed gain.

## Traps worth knowing

- **CI must stay on Node 24.** `package-lock.json` is written by npm 11; npm 10
  (bundled with Node 22) rejects it as out of sync and `npm ci` fails with
  `Missing: esbuild@0.28.2 from lock file`. The lockfile is fine — the npm
  versions are not. Reproduce with `npx npm@10 ci --dry-run`.
- **`npm ci --dry-run` only validates against the npm running it**, so it
  cannot catch that skew. Verify with a real `npm ci`.
- **Middleware is `src/proxy.ts`**, not `middleware.ts` — renamed in Next.js 16.
- **Kill stray `next dev` processes before `npm ci`** on Windows; they hold file
  locks and the install fails part-way through deleting `node_modules`.

## Running it without secrets

A session with only the repo — a cloud session, or a fresh clone — can do:

```bash
npm ci && npm run lint && npm run typecheck && npm test
```

These need no environment at all. Anything below needs `.env.local`
(see `.env.example`):

| Needs | Why |
|---|---|
| `npm run build` | Auth.js requires `AUTH_SECRET` |
| `npm run dev` | Sign-in and every data query need `DATABASE_URL` |
| `npm run db:migrate` / `db:seed` | `DATABASE_URL` |
| Photo upload | `BLOB_READ_WRITE_TOKEN` |

Pull the deployment's values with `npx vercel env pull .env.local`, or the
database alone with `npx neon env pull`.
