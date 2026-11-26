import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Check if the user's session meets AAL requirements.
 * If the user has verified MFA factors, their JWT must have aal=aal2.
 * Returns { ok: true } or { ok: false, response: Response } with 403.
 */
export async function checkAal(userJwt: string, userId: string, corsHeaders: Record<string, string>) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Check if user has verified MFA factors via admin API
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/factors`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
  });

  if (res.ok) {
    const factors = await res.json();
    const hasVerifiedTotp = Array.isArray(factors) && factors.some(
      (f: any) => f.factor_type === 'totp' && f.status === 'verified'
    );

    if (hasVerifiedTotp) {
      // Decode JWT to check AAL claim (JWT is base64url encoded)
      try {
        const payload = JSON.parse(atob(userJwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.aal !== 'aal2') {
          return {
            ok: false,
            response: new Response(JSON.stringify({ error: 'MFA verification required' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }),
          };
        }
      } catch {
        return {
          ok: false,
          response: new Response(JSON.stringify({ error: 'Invalid token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }),
        };
      }
    }
  }

  return { ok: true };
}
