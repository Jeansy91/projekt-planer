# Troubleshooting

Symptoms, causes and fixes for migrations, auth, tests, builds, Edge Functions and Docker.

## Migration Errors

| Symptom                                            | Cause                                                       | Fix                                                                                                                                                                                       |
|----------------------------------------------------|-------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ERROR: relation "public.profiles" already exists` | Migration already applied; not all SQL uses `IF NOT EXISTS` | Migration was already applied. The Docker entrypoint prevents this via `public._migrations` tracking. For Supabase CLI: `yarn supabase db reset` (local) or mark migration as already applied. |
| `ERROR: syntax error at or near ...`               | Syntax error in the SQL migration file                      | Test the SQL directly in the Supabase SQL Editor. Fix the error, then re-run the migration.                                                                                               |
| Migration applied locally but not on remote        | Ran `supabase db push` without `--linked`                   | Run `yarn supabase db push --linked`; link the project first via `yarn supabase link`.                                                                                                              |
| Docker entrypoint skips migration                  | Migration already in `public._migrations`                   | Normal behavior. To re-run: `DELETE FROM public._migrations WHERE name = 'filename.sql';` and restart the container.                                                                      |
| `psql: error: connection to server ... failed`     | `DATABASE_URL` incorrect or database unreachable            | Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`; verify network access.                                                                                      |

## Auth Errors

| Symptom                                             | Cause                                                                  | Fix                                                                                                                                                    |
|-----------------------------------------------------|------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| `401 Unauthorized` on API requests                  | JWT missing, expired, or invalid                                       | Re-sign in; check JWT expiry (`jwt_expiry = 3600`); ensure Supabase SDK is correctly initialized.                                                      |
| `403 Forbidden: MFA verification required`          | User has MFA enrolled but only AAL1 (no 2FA code entered)              | Expected behavior. User must enter TOTP code and start an AAL2 session.                                                                                |
| User sees empty project list after MFA verification | Known timing issue: PostgREST still uses AAL1 token after mfa.verify() | Reload the page. The Supabase SDK updates the token and RLS works correctly after reload. (Reason AAL2 check was removed from RLS.)                    |
| Email confirmation link does not work               | `site_url` in Supabase Auth not set to the correct domain              | Set Site URL and Redirect URLs in Supabase Dashboard → Authentication → URL Configuration. Or via Docker entrypoint with `PROJEKT_PLANER_URL`.         |
| New user has no profile after registration          | Trigger `on_auth_user_created` not active or failed                    | Check in Supabase Dashboard → Database → Triggers whether `on_auth_user_created` exists. If not: re-run migration `20260306000001_initial_schema.sql`. |

## E2E Test Errors

| Symptom                                        | Cause                                                                            | Fix                                                                                                                                              |
|------------------------------------------------|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| `Error: connect ECONNREFUSED 127.0.0.1:5173`   | Dev server not running                                                           | Start `yarn dev` in a separate terminal and wait for the server to be ready.                                                                     |
| Tests fail due to stale localStorage data      | Previous test runs left data in browser localStorage                             | The `setupProject` helper should overwrite localStorage on setup. If not: clear browser cache manually or delete Playwright's profile directory. |
| `Timeout exceeded while waiting for element`   | UI element does not appear within 30 seconds                                     | Analyze test logs and screenshots in `test-results/`. Common causes: wrong selector, element behind modal, animation not yet complete.           |
| Tests fail in CI but not locally               | Timing differences between local and CI environment; missing system dependencies | Analyze Playwright traces in CI artifacts. Ensure `npx playwright install --with-deps` runs in CI.                                               |
| `browserType.launch: Executable doesn't exist` | Playwright browsers not installed                                                | Run `yarn playwright install --with-deps chromium`.                                                                                                       |

## Build Errors

| Symptom                                            | Cause                                                    | Fix                                                                                                 |
|----------------------------------------------------|----------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| `Cannot find module 'X'`                           | Dependency not installed                                 | Run `yarn install`; delete `node_modules` and reinstall if needed.                                  |
| Vite outputs `SUPABASE_PROJECT_URL is not defined` | `.env` file missing or variable name incorrect           | Create `.env` in the project root with `SUPABASE_PROJECT_URL=...`; restart the Vite dev server.     |
| Docker build fails at `yarn install`               | `yarn.lock` out of date or not in the build context      | Run `yarn install` locally and commit `yarn.lock`; check `.dockerignore`.                            |

## Edge Function Errors

| Symptom                                                              | Cause                                               | Fix                                                                                                  |
|----------------------------------------------------------------------|-----------------------------------------------------|------------------------------------------------------------------------------------------------------|
| `FunctionsFetchError: Failed to send a request to the Edge Function` | Edge Function not deployed or wrong URL             | Deploy functions: `yarn supabase functions deploy --no-verify-jwt --project-ref <ref>`; check URL in client code.         |
| `500 Internal Server Error` from Edge Function                       | Unhandled exception in function; missing secrets    | Check Supabase Dashboard → Edge Functions → Logs; ensure all secrets are set (`SMTP_HOSTNAME` etc.). |
| `Email service not configured`                                       | `SMTP_HOSTNAME` or `SMTP_FROM` not set for the `invite-user` function | Set SMTP secrets: `yarn supabase secrets set SMTP_HOSTNAME=... SMTP_FROM=... --project-ref <ref>`                       |

## Docker Errors

| Symptom                                       | Cause                                                             | Fix                                                                                                                                                       |
|-----------------------------------------------|-------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| Container starts but app shows blank page     | `window.__ENV` not correctly injected; `env-config.js` not loaded | Check container logs: `docker logs <container-id>`. Ensure `SUPABASE_PROJECT_URL` and `SUPABASE_PUBLISHABLE_KEY` are set as Docker environment variables. |
| nginx returns `404` for all routes except `/` | SPA fallback not configured in nginx                              | Check `try_files $uri $uri/ /index.html` in `docker/nginx.conf`.                                                                  |
| Edge Functions not deployed                   | `SUPABASE_ACCESS_TOKEN` or `SUPABASE_PROJECT_REF` missing         | Set both variables as Docker env; check entrypoint logs.                                                                                                  |
