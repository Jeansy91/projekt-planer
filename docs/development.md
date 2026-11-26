# Development

## Requirements

- Node.js (the version used in CI is set in `.github/workflows/`)
- Docker, only for a local Supabase stack

Yarn is checked into the repository (`.yarn/releases/`), so `corepack enable` is enough. The Supabase CLI is a dev dependency and runs as `yarn supabase`. Always use `yarn`, never `npm`.

## Without Supabase

```bash
corepack enable
yarn install
yarn dev
```

The app runs on `http://localhost:5173` with local projects only (browser and file).

## With a local Supabase

```bash
yarn supabase start
```

This starts Postgres, Auth, PostgREST, Realtime, Storage, the Edge Runtime and the Mailpit mail catcher in Docker, and applies every migration from `supabase/migrations/`. Analytics is switched off in `supabase/config.toml` because nothing here uses it. Leave out services you do not need with `-x`, for example `yarn supabase start -x studio,imgproxy`.

`yarn supabase status` prints the API URL and the publishable (anon) key. Put them into `.env`:

```bash
SUPABASE_PROJECT_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<key from supabase status>
```

Restart `yarn dev` afterwards. Sign-ups are confirmed immediately in the local stack, and every mail the stack sends shows up in Mailpit (URL in `yarn supabase status`). Stop the stack with `yarn supabase stop`.

Every `SUPABASE_*` variable in `.env` ends up in the browser bundle (`envPrefix` in `vite.config.js`). Never put access tokens or database URLs there.

## With a hosted Supabase project

```bash
yarn supabase link --project-ref <project-ref>
yarn supabase db push
yarn supabase functions deploy --no-verify-jwt
yarn supabase secrets set SMTP_HOSTNAME=... SMTP_PORT=465 SMTP_USERNAME=... SMTP_PASSWORD=... SMTP_FROM=... PROJEKT_PLANER_URL=https://...
```

Then set `SUPABASE_PROJECT_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env` to the values from the dashboard. The Docker image can do the migrations and function deployment at start instead, see [Deployment](deployment.md).

## Tests

| Command | What it runs |
|---|---|
| `yarn test` | Unit tests (Vitest), files `src/**/*.test.js(x)` |
| `yarn test:e2e` | Playwright project `local`: local projects, no Supabase needed |
| `yarn test:e2e:cloud` | Playwright project `cloud`: registration, login, sharing and realtime, needs a local Supabase |
| `yarn test:e2e:headed` | Like `test:e2e`, with a visible browser |

The E2E tests expect the dev server on `http://localhost:5173` (override with `BASE_URL`). Install the browser once with `yarn playwright install --with-deps chromium`.

For the cloud tests, start the local Supabase, put its values into `.env` as described above, start `yarn dev`, then run `yarn test:e2e:cloud`. Each test registers fresh users with random addresses, so the tests do not depend on each other or on old data.

### Conventions

- Test names follow `should_<expected behavior>_when_<condition>`, the body follows Arrange, Act, Assert.
- Local specs seed LocalStorage with `setupProject()` from `e2e/helpers.js`. Cloud specs use the helpers in `e2e/cloud/helpers.js`.
- No `waitForTimeout`: wait for elements or use `waitForFunction`.
- No conditional assertions, no commented-out code, no duplicate tests.
- Prefer copying a short setup into the test over deep `beforeEach` chains.
- Select elements by `data-testid`.

## Screenshots

`yarn screenshots` regenerates the screenshots in `public/screenshots/` (light and dark) with demo data. The dev server must be running.

## Project conventions

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the code guidelines and the commit format, and [Architecture](architecture.md) for the structure.
