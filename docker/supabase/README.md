# Supabase configuration for the self-hosted stack

These files are used by [`docker-compose.self-hosted.yml`](../../docker-compose.self-hosted.yml).
They come from the official [Supabase Docker setup](https://github.com/supabase/supabase/tree/master/docker),
commit `a522111d516e`, licensed under the [Apache License 2.0](https://github.com/supabase/supabase/blob/master/LICENSE).

| File | Purpose | Changes |
|---|---|---|
| `kong.yml` | API gateway routes for Auth, REST, Realtime, Storage and Functions | Studio, pg-meta, MCP and analytics routes and the dashboard login removed |
| `kong-entrypoint.sh` | Renders `kong.yml` with the API keys | none |
| `realtime-entrypoint.sh` | Generates the Erlang cookie for Realtime | none |
| `db/*.sql` | Database init: role passwords, JWT expiry, Realtime schema, webhooks | none |
| `functions/main/`, `functions/deno.jsonc` | Edge Runtime router that serves the Projekt-Planer functions | none |

When updating the image versions in the compose file, compare these files with the
same version of the official setup.
