# Edge Functions

The Supabase Edge Functions in `supabase/functions/`: purpose, endpoint, authentication and request and response format. They run on the Supabase Edge Runtime (Deno).

**Common pattern:** All functions accept `OPTIONS` preflight requests for CORS and respond with `Content-Type: application/json`. All protected operations first validate the Bearer token via `supabaseClient.auth.getUser()`.

## Shared Modules (\_shared)

### cors.ts

Exports the `corsHeaders` constant for all responses:

    Access-Control-Allow-Origin: *
    Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type

### aal.ts — `checkAal(userJwt, userId, corsHeaders)`

Checks whether the user satisfies AAL2 (MFA level 2) if they have verified TOTP factors. Uses the Supabase Admin API with the service role key.

- Returns `{ ok: true }` if no MFA enrolled or AAL2 confirmed
- Returns `{ ok: false, response: Response(403) }` if MFA enrolled but only AAL1
- Returns `{ ok: false, response: Response(401) }` if JWT is invalid

## change-email

| Property      | Value                                        |
|---------------|----------------------------------------------|
| Endpoint      | `POST /functions/v1/change-email`            |
| Auth required | Yes — Bearer token in `Authorization` header |
| AAL2 check    | Yes — for MFA users                          |

### Request Body

    {
      "newEmail": "new-email@example.com",
      "password": "current-password"
    }

### Flow

1.  Validate Bearer token → get user ID
2.  Check AAL2 (via `checkAal`)
3.  Verify current password via signInWithPassword
4.  Update email via Supabase Admin API (`updateUserById`)
5.  Sync email in `profiles` table

### Response

    { "success": true }
    { "error": "invalid_password" }  // 403
    { "error": "Unauthorized" }      // 401

## change-password

| Property      | Value                                |
|---------------|--------------------------------------|
| Endpoint      | `POST /functions/v1/change-password` |
| Auth required | Yes                                  |
| AAL2 check    | Yes — for MFA users                  |

### Request Body

    {
      "oldPassword": "current-password",
      "newPassword": "new-password",
      "verifyOnly": false  // optional: only verify, do not change
    }

## delete-account

| Property      | Value                               |
|---------------|-------------------------------------|
| Endpoint      | `POST /functions/v1/delete-account` |
| Auth required | Yes                                 |
| AAL2 check    | Yes — for MFA users                 |

### Flow

1.  Validate Bearer token
2.  Check AAL2
3.  Delete avatar files from `avatars` storage bucket
4.  Delete auth user via Admin API (cascades to profiles, owned projects, memberships)

### Response

    { "success": true }

## enroll-mfa

| Property      | Value                           |
|---------------|---------------------------------|
| Endpoint      | `POST /functions/v1/enroll-mfa` |
| Auth required | Yes                             |
| AAL2 check    | No (enrollment works at AAL1)   |

Supports four actions: `enroll`, `verify`, `unenroll`, `list`.

    // enroll response
    { "factorId": "uuid", "qr": "data:image/svg+xml;base64,...", "secret": "BASE32" }

    // list response
    { "factors": [ { "id": "uuid", "factor_type": "totp", "status": "verified" } ] }

**Note:** This function calls the GoTrue API directly with the service role key as `apikey` to bypass AAL restrictions during the enrollment phase.

## invite-user

| Property            | Value                            |
|---------------------|----------------------------------|
| Endpoint            | `POST /functions/v1/invite-user` |
| Auth required       | Yes                              |
| AAL2 check          | No                               |
| External dependency | SMTP server (nodemailer)         |

### Request Body

    {
      "email": "invited@example.com",
      "projectId": "uuid"  // optional
    }

### Response

    { "success": true, "registered": true }   // Already registered
    { "success": true, "emailSent": true }    // Email sent
    { "success": false, "error": "..." }      // 500 on SMTP error

## Deployment

```bash
# Deploy all functions to the linked project
yarn supabase functions deploy --no-verify-jwt --project-ref <ref>

# Secrets for invite-user
yarn supabase secrets set SMTP_HOSTNAME=smtp.example.com SMTP_PORT=465 \
  SMTP_USERNAME=<user> SMTP_PASSWORD=<secret> SMTP_FROM=noreply@example.com \
  PROJEKT_PLANER_URL=https://planner.example.com --project-ref <ref>
```

The functions validate the JWT themselves, hence `--no-verify-jwt`. The container entrypoint deploys them the same way when `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are set. In the local stack, `yarn supabase start` serves them automatically.
