# Configuration

All settings come from environment variables. [`.env.example`](../.env.example) is a template. Never commit `.env`, it is listed in `.gitignore`.

## Frontend

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_PROJECT_URL` | For cloud projects | Supabase API URL, for example `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | For cloud projects | Publishable (anon) key. Safe in the browser, access is controlled by Row Level Security |

Without these two values the app runs with local projects only.

In development, Vite reads them from `.env` or the shell. Vite exposes every variable with the prefix `VITE_` or `SUPABASE_` to the browser (`envPrefix` in `vite.config.js`), so keep secrets out of the environment you run `yarn dev` or `yarn build` in.

In the Docker image, `docker/entrypoint.sh` writes them to `env-config.js` at container start. The image itself contains no environment-specific values.

## Container start

These variables are read only by `docker/entrypoint.sh`. Leave a variable empty to skip the step that needs it.

| Variable | Step |
|---|---|
| `DATABASE_URL` | Applies pending migrations from `supabase/migrations/`, tracked in `public._migrations` |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | Deploys the Edge Functions and sets their secrets through the Management API |
| `PROJEKT_PLANER_URL` | Public URL of the instance. Set as the Supabase auth `site_url` and as the fallback link target in invitation mails |
| `SMTP_HOSTNAME`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` | Stored as Edge Function secrets for `invite-user` |
| `FUNCTIONS_DIR` | Self-hosted Supabase: copies the Edge Functions into this folder, which the edge runtime serves |

## Docker Compose

| Variable | Default | Description |
|---|---|---|
| `PROJEKT_PLANER_VERSION` | `latest` | Image tag of `ghcr.io/jeansy91/projekt-planer` |
| `PROJEKT_PLANER_PORT` | `8080` | Host port of the app |

`docker-compose.self-hosted.yml` reads its own set of variables, described in [`.env.self-hosted.example`](../.env.self-hosted.example) and in [Deployment](deployment.md#self-hosted-supabase).

## Edge Function secrets

| Secret | Used by | Description |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | all | Provided by Supabase |
| `SMTP_HOSTNAME`, `SMTP_PORT` | invite-user | SMTP server, port 465 uses TLS |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | invite-user | Optional, leave out for servers without authentication |
| `SMTP_FROM` | invite-user | Sender address, required |
| `PROJEKT_PLANER_URL` | invite-user | App URL for the registration link when the request has no `Origin` header |

Set them with `yarn supabase secrets set NAME=value --project-ref <ref>` or let the container entrypoint do it.

## Playwright

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:5173` | URL the E2E tests open |
| `CI` | – | When set, failed tests are retried twice instead of once |
