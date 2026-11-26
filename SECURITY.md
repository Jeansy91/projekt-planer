# Security Policy

## Supported Versions

Only the latest release (and the `latest` image on ghcr.io) receives security fixes. Every relevant merge to `main` creates a new release automatically.

## Reporting a Vulnerability

Please **do not** open a public issue for security problems.

- If the repository's **Security** tab offers **Report a vulnerability**, use it to send a private report.
- Otherwise, contact the maintainer [@Jeansy91](https://github.com/Jeansy91) directly on GitHub.

Please include what is affected, how to reproduce it, and the impact you expect. You will get an answer within 7 days.

## Automated Checks

- **Dependabot** (`.github/dependabot.yml`) keeps npm packages (including the Supabase CLI), GitHub Actions and the Docker base images up to date. Patch and minor updates are merged automatically once CI passes; major updates wait for a manual review.
- **Security workflow** (`.github/workflows/security.yml`) runs on every push to `main`, on every pull request (as part of the build) and weekly:
  - `yarn npm audit` checks `yarn.lock` for known vulnerabilities (severity high and above).
  - `gitleaks` scans the whole Git history for committed secrets.

## Operating Projekt-Planer Securely

- `SUPABASE_PUBLISHABLE_KEY` is meant to be public; access control happens through Row Level Security in `supabase/migrations/`. Never use the `service_role` key in the frontend.
- `DATABASE_URL`, `SUPABASE_ACCESS_TOKEN` and the SMTP credentials are only read by the container entrypoint. Pass them as environment variables or Docker secrets, never bake them into the image.
- Never commit `.env`. It is listed in `.gitignore`.
