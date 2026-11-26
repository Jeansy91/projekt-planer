# Deployment

Every release publishes a Docker image to `ghcr.io/jeansy91/projekt-planer`. The image serves the app with NGINX and can prepare a Supabase project at start: apply migrations, deploy the Edge Functions and set their secrets.

## Image

The `Dockerfile` builds in two stages:

1. **Build** (`node` alpine image): `yarn install --immutable` and `yarn build`. The Supabase CLI binary comes from `node_modules` (the musl build pinned in `yarn.lock`), so the CLI in the image always matches the one used in development and CI.
2. **Runtime** (`nginx` alpine image): the built app, `docker/nginx.conf`, the migrations, the Edge Functions, `psql`, `curl` and the Supabase CLI. `docker/entrypoint.sh` is the entrypoint.

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

## Entrypoint

`docker/entrypoint.sh` runs these steps, each one only when its variables are set:

1. Write `env-config.js` with the Supabase URL and publishable key.
2. Apply pending migrations with `psql` (`DATABASE_URL`). Applied files are tracked in `public._migrations`.
3. Set the Supabase auth `site_url` (`PROJEKT_PLANER_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`).
4. Set the Edge Function secrets and deploy all functions (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`).
5. Start NGINX.

## NGINX

`docker/nginx.conf` serves the static files and falls back to `index.html` for every path, so React Router handles routes such as `/project/<id>`. The container listens on port 80 only; terminate TLS in a reverse proxy in front of it (Traefik, Caddy, NGINX).

## Production checklist

- `SUPABASE_PROJECT_URL` and `SUPABASE_PUBLISHABLE_KEY` set
- TLS terminated in a reverse proxy
- `PROJEKT_PLANER_URL` is the public URL, and the Supabase auth redirect URLs include it
- SMTP tested with an invitation to an unregistered address
- Edge Functions deployed (check the entrypoint log)
- Email templates from `supabase/email-templates/` set in the Supabase dashboard (Auth, Emails)
- The `service_role` key is never passed to the frontend
- AGPL-3.0: if you change the code and run it for others, link your modified source (the footer links to this repository by default, see `SOURCE_CODE_URL` in `src/utils/constants.js`)
