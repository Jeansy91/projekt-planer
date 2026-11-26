# Security

Authentication flow, MFA and AAL2, secret management and an OWASP Top 10 review of this stack. To report a vulnerability, see [SECURITY.md](../SECURITY.md).

## Authentication Flow

    1. User enters email + password
       │
    2. Client calls supabase.auth.signInWithPassword()
       │
    3. GoTrue validates credentials, returns JWT
       │ JWT contains: sub (user_id), email, aal (aal1/aal2), exp
       │
    4. Client stores JWT in localStorage (Supabase SDK handles automatically)
       │
    5. All Supabase requests include Authorization: Bearer <JWT>
       │
    6. PostgREST extracts auth.uid() from the JWT
       │
    7. RLS policies check auth.uid() and return only permitted data
       │
    8. For sensitive operations (change password/email, delete account, MFA):
       └── Edge Functions verify JWT + AAL2 (for MFA users)

### Token Renewal

- JWT validity: 3600 seconds (1 hour) per `supabase/config.toml`
- Refresh token rotation enabled (`enable_refresh_token_rotation = true`)
- Refresh token reuse interval: 10 seconds (protection against race conditions)
- The Supabase JS SDK renews the token automatically in the background

## MFA and AAL2

The application supports TOTP-based multi-factor authentication (Google Authenticator, Authy, etc.).

### AAL Levels

- **AAL1**: Password only — access to all project data (RLS-controlled)
- **AAL2**: Password + TOTP — required for sensitive operations

### AAL2 Enforcement at Three Levels

| Level                 | Mechanism                                                                                         | Applies To                                                           |
|-----------------------|---------------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| Client-side           | `isAuthenticated = !!user && !mfaRequired` — MFA-required users redirected to 2FA page            | All protected pages/features                                         |
| Edge Functions        | `checkAal()` in `_shared/aal.ts` checks JWT claim `aal === 'aal2'` when TOTP factor exists        | change-email, change-password, delete-account, enroll-mfa (unenroll) |
| Database (historical) | `aal_check()` function exists but no longer in RLS policies (removed in migration 20260316000003) | Not active — removed due to timing issues with Supabase JS SDK       |

## Secret Management

| Secret                                | Where Stored                               | Who Has Access                    | Rotation                                                  |
|---------------------------------------|--------------------------------------------|-----------------------------------|-----------------------------------------------------------|
| `SUPABASE_SERVICE_ROLE_KEY`           | Supabase Edge Function Secrets (automatic) | Edge Functions only (server-side) | On compromise: Supabase Dashboard → API Settings → Rotate |
| `SUPABASE_PUBLISHABLE_KEY` (anon key) | .env, env-config.js (public)               | Client + Edge Functions           | Can be rotated — requires redeployment                    |
| SMTP credentials                      | Supabase Edge Function Secrets             | invite-user Edge Function only    | On SMTP provider rotation                                 |
| `DATABASE_URL`                        | Docker runtime env                         | Docker entrypoint (psql)          | Supabase Dashboard → Database → Reset Password            |

**Critical:** The `SUPABASE_SERVICE_ROLE_KEY` has full database access without RLS restrictions. It must never be embedded in the client build or exposed to the browser.

## OWASP Top 10 Checklist

| Risk                                           | Status   | Measure                                                                                                                               |
|------------------------------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------|
| A01 Broken Access Control                      | Secured  | RLS on all tables; helper functions for safe policy routing; role model (viewer/editor/admin/owner)                                   |
| A02 Cryptographic Failures                     | Secured  | Passwords via GoTrue (bcrypt); JWT HS256/RS256; HTTPS via reverse proxy TLS termination; secrets never in client                      |
| A03 Injection                                  | Secured  | Supabase JS SDK uses parameterized queries; no raw SQL strings from client; HTML in emails sanitized via `escapeHtml()`               |
| A04 Insecure Design                            | Secured  | Sensitive operations (password, email, delete account, MFA) only via Edge Functions; no direct Admin API calls from client            |
| A05 Security Misconfiguration                  | Note     | CORS in Edge Functions: `Access-Control-Allow-Origin: *` — should be restricted to own domain in production                           |
| A06 Vulnerable and Outdated Components         | Note     | Dependabot updates npm packages (including the Supabase CLI), base images and Actions weekly; `yarn npm audit` runs in CI           |
| A07 Identification and Authentication Failures | Secured  | TOTP MFA available and recommended; JWT rotation enabled; rate limiting configured in Supabase Auth                                   |
| A08 Software and Data Integrity Failures       | Secured  | Yarn lockfile in repository; `yarn install --immutable` in CI and Docker; Supabase CLI binary comes from the lockfile                 |
| A09 Security Logging and Monitoring Failures   | Partial  | Supabase provides auth logs in dashboard; Edge Functions log errors via `console.error`; application-level monitoring not configured  |
| A10 Server-Side Request Forgery (SSRF)         | Low risk | Edge Functions only make requests to Supabase-owned endpoints and configured SMTP servers; no user-controlled URLs in server requests |
