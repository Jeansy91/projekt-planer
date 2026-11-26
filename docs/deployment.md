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

Two compose files cover the common setups.

### App only

`docker-compose.yml` in the repository root runs the app container. Use it with a hosted Supabase project, or without Supabase for local projects only:

```bash
cp .env.example .env    # fill in the Supabase values, or leave them empty
docker compose up -d
```

`PROJEKT_PLANER_VERSION` pins the image tag (default `latest`), `PROJEKT_PLANER_PORT` sets the host port (default `8080`).

### Self-hosted Supabase

`docker/compose.self-hosted.yml` runs Projekt-Planer together with your own Supabase. It extends the [official Supabase Docker setup](https://supabase.com/docs/guides/self-hosting/docker) instead of copying it, so Supabase keeps its own update path. Docker Compose 2.24.4 or later is required.

1. Set up Supabase as described in its guide:

   ```bash
   git clone --depth 1 https://github.com/supabase/supabase
   cd supabase/docker
   cp .env.example .env
   ```

   Generate your own secrets and keys as the guide explains; never run with the example values.

2. Adjust these values in `supabase/docker/.env`:

   | Variable | Value |
   |---|---|
   | `SITE_URL` | URL of Projekt-Planer, for example `http://localhost:8080` |
   | `ADDITIONAL_REDIRECT_URLS` | The same URL |
   | `SUPABASE_PUBLIC_URL` | URL of the Supabase API gateway, reachable from the browser |
   | `SMTP_*` | Your mail server, used by Supabase Auth and by the invitation function |

3. Start both together:

   ```bash
   docker compose -f docker-compose.yml \
     -f /path/to/projekt-planer/docker/compose.self-hosted.yml up -d
   ```

What the extension file does:

- Adds the `projekt-planer` container on port `8080` (`PROJEKT_PLANER_PORT`). It applies the migrations to the Supabase database on every start and copies the Edge Functions into `volumes/functions/`, where the edge runtime serves them.
- Passes the SMTP settings and the app URL to the Edge Functions.
- Points Supabase Auth to the Projekt-Planer email templates and enables TOTP MFA.
- Leaves out imgproxy and the Supavisor pooler, which Projekt-Planer does not use. Start them with `--profile imgproxy` or `--profile pooler` if you need them for something else.

Studio stays part of the stack, because the official API gateway waits for it. It also gives you a database UI on the gateway port.

Update Supabase with its own tooling (`update.sh` in `supabase/docker`), and Projekt-Planer by pulling a new image (`docker compose ... pull projekt-planer`).

## Entrypoint

`docker/entrypoint.sh` runs these steps, each one only when its variables are set:

1. Write `env-config.js` with the Supabase URL and publishable key.
2. Apply pending migrations with `psql` (`DATABASE_URL`). Applied files are tracked in `public._migrations`.
3. Set the Supabase auth `site_url` (`PROJEKT_PLANER_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`).
4. Copy the Edge Functions into a folder served by a self-hosted edge runtime (`FUNCTIONS_DIR`).
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
- Email templates from `supabase/email-templates/` set in the Supabase dashboard (Auth, Emails); the self-hosted setup does this automatically
- The `service_role` key is never passed to the frontend
- AGPL-3.0: if you change the code and run it for others, link your modified source (the footer links to this repository by default, see `SOURCE_CODE_URL` in `src/utils/constants.js`)
