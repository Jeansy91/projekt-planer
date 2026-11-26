# Deployment

Every release publishes a Docker image to `ghcr.io/jeansy91/projekt-planer`. The image serves the app with NGINX and can prepare a Supabase project at start: apply migrations, deploy the Edge Functions and set their secrets.

## Image

The `Dockerfile` builds in two stages:

1. **Build** (`node` alpine image): `yarn install --immutable` and `yarn build`. The Supabase CLI binary comes from `node_modules` (the musl build pinned in `yarn.lock`), so the CLI in the image always matches the one used in development and CI.
2. **Runtime** (`nginx` alpine image): the built app, `docker/nginx.conf`, the migrations, the Edge Functions, the email templates (served under `/email-templates/` for self-hosted Supabase Auth), `psql`, `curl` and the Supabase CLI. `docker/entrypoint.sh` is the entrypoint.

Build it yourself with:

```bash
docker build -t projekt-planer .
```

## Start

With local projects only:

```bash
docker run -d -p 8080:80 ghcr.io/jeansy91/projekt-planer:latest
```

With a hosted Supabase project, preparing it at start:

```bash
docker run -d -p 8080:80 \
  -e SUPABASE_PROJECT_URL=https://<ref>.supabase.co \
  -e SUPABASE_PUBLISHABLE_KEY=<publishable-key> \
  -e DATABASE_URL=postgresql://... \
  -e SUPABASE_ACCESS_TOKEN=<access-token> \
  -e SUPABASE_PROJECT_REF=<ref> \
  -e PROJEKT_PLANER_URL=https://planner.example.com \
  -e SMTP_HOSTNAME=smtp.example.com \
  -e SMTP_PORT=465 \
  -e SMTP_USERNAME=<user> \
  -e SMTP_PASSWORD=<password> \
  -e SMTP_FROM=noreply@example.com \
  ghcr.io/jeansy91/projekt-planer:latest
```

All variables are described in [Configuration](configuration.md). Pin a version instead of `latest` (for example `ghcr.io/jeansy91/projekt-planer:<version>`); all versions are listed under [Releases](https://github.com/Jeansy91/projekt-planer/releases).

## Docker Compose

Two compose files cover the common setups: the app alone, or the app with its own Supabase.

### App only

`docker-compose.yml` in the repository root runs the app container. Use it with a hosted Supabase project, or without Supabase for local projects only:

```bash
cp .env.example .env    # fill in the Supabase values, or leave them empty
docker compose up -d
```

`PROJEKT_PLANER_VERSION` pins the image tag (default `latest`), `PROJEKT_PLANER_PORT` sets the host port (default `8080`).

### Self-hosted Supabase

`docker-compose.self-hosted.yml` runs Projekt-Planer with its own Supabase backend. It contains only the services the app uses:

| Service | Image | Purpose |
|---|---|---|
| `app` | `ghcr.io/jeansy91/projekt-planer` | The app; applies the migrations and installs the Edge Functions on start |
| `gateway` | Kong | Supabase API on one port: Auth, REST, Realtime, Storage, Functions |
| `db` | Supabase Postgres | Database |
| `auth` | GoTrue | Sign-up, login, MFA, mails |
| `rest` | PostgREST | Data API |
| `realtime` | Supabase Realtime | Live updates between collaborators |
| `storage` | Supabase Storage | Avatars, stored in a Docker volume |
| `functions` | Supabase Edge Runtime | The Projekt-Planer Edge Functions |

Studio, imgproxy, the connection pooler and the logging stack are left out. The gateway configuration, the database init scripts and the functions router come from the official Supabase Docker setup, see [`docker/supabase/README.md`](../docker/supabase/README.md).

Supabase names 4 GB of RAM as the minimum for its full stack; this one leaves out several services and needs less. Docker Compose 2.24 or later is required.

#### 1. Configure

```bash
git clone https://github.com/Jeansy91/projekt-planer.git
cd projekt-planer
cp .env.self-hosted.example .env
sh scripts/generate-supabase-secrets.sh
```

The script needs `openssl` (on Windows, run it in Git Bash) and writes a database password, the JWT secret, the anon and service role keys and the Realtime keys into `.env`. It refuses to overwrite existing secrets, because new ones lock you out of an existing database.

Then edit `.env`:

| Variable | Value |
|---|---|
| `PROJEKT_PLANER_URL` | Public URL of the app, for example `https://planner.example.com` |
| `SUPABASE_PUBLIC_URL` | Public URL of the Supabase API, for example `https://api.planner.example.com` |
| `SMTP_*` | Your mail server; sign-up confirmation, password reset and invitations need it |

For a quick test on one machine, keep the defaults `http://localhost:8080` and `http://localhost:8000`.

#### 2. Start

```bash
docker compose -f docker-compose.self-hosted.yml up -d
```

On the first start, Postgres initialises, Auth and Storage create their schemas, then the app applies the Projekt-Planer migrations and copies the Edge Functions into the edge runtime. The app is available once `docker compose -f docker-compose.self-hosted.yml ps` shows all services as healthy.

#### 3. Reverse proxy and TLS

Both URLs must be reachable from the browser, over HTTPS in production. Put a reverse proxy (Caddy, Traefik, NGINX) in front of port `8080` (app) and port `8000` (API), and bind the ports to `127.0.0.1` if the proxy runs on the same host. Realtime needs WebSocket support on the API host.

#### Updates and backups

- Update the app: `docker compose -f docker-compose.self-hosted.yml pull app && docker compose -f docker-compose.self-hosted.yml up -d`. New migrations run on start.
- Dependabot proposes updates of the Supabase images. They are never merged automatically; compare `docker/supabase/` with the official setup before merging.
- Data lives in the Docker volumes `db-data` and `storage-data`. Back up the database with `docker compose -f docker-compose.self-hosted.yml exec db pg_dump -U postgres postgres > backup.sql`.

## Entrypoint

`docker/entrypoint.sh` runs these steps, each one only when its variables are set:

1. Write `env-config.js` with the Supabase URL and publishable key.
2. Apply pending migrations with `psql` (`DATABASE_URL`). Applied files are tracked in `public._migrations`.
3. Set the Supabase auth `site_url` (`PROJEKT_PLANER_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`).
4. Copy the Edge Functions into the folder served by a self-hosted edge runtime (`FUNCTIONS_DIR`).
5. Set the Edge Function secrets and deploy all functions to a hosted project (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`).
6. Start NGINX.

## NGINX

`docker/nginx.conf` serves the static files and falls back to `index.html` for every path, so React Router handles routes such as `/project/<id>`. The container listens on port 80 only; terminate TLS in a reverse proxy in front of it (Traefik, Caddy, NGINX).

## Production checklist

- `SUPABASE_PROJECT_URL` and `SUPABASE_PUBLISHABLE_KEY` set
- TLS terminated in a reverse proxy
- `PROJEKT_PLANER_URL` is the public URL, and the Supabase auth redirect URLs include it
- SMTP tested with an invitation to an unregistered address
- Edge Functions deployed (check the entrypoint log)
- Email templates from `supabase/email-templates/` set in the Supabase dashboard (Auth, Emails); `docker-compose.self-hosted.yml` does this automatically
- The `service_role` key is never passed to the frontend
- AGPL-3.0: if you change the code and run it for others, link your modified source (the footer links to this repository by default, see `SOURCE_CODE_URL` in `src/utils/constants.js`)
