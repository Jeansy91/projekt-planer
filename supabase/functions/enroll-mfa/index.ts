import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Call GoTrue user API with service role key as apikey to bypass AAL restrictions
async function gotrueRequest(path: string, method: string, userJwt: string, body?: unknown) {
  const headers: Record<string, string> = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${userJwt}`,
    'Content-Type': 'application/json',
  };
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${supabaseUrl}/auth/v1${path}`, opts);
}

// Call GoTrue admin API with service role key for privileged operations
async function gotrueAdminRequest(path: string, method: string, body?: unknown) {
  const headers: Record<string, string> = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${supabaseUrl}/auth/v1${path}`, opts);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userJwt = authHeader.replace('Bearer ', '');
    const { action, factorId, code } = await req.json();

    // Verify the calling user's session
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userJwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'enroll') {
      // Clean up existing factors via admin API (bypasses AAL restrictions)
      const listRes = await gotrueAdminRequest(`/admin/users/${user.id}/factors`, 'GET');
      if (listRes.ok) {
        const factors = await listRes.json();
        if (Array.isArray(factors)) {
          for (const f of factors.filter((f: any) => f.factor_type === 'totp')) {
            await gotrueAdminRequest(`/admin/users/${user.id}/factors/${f.id}`, 'DELETE');
          }
        }
      }

      // Enroll via direct GoTrue API call with service role key
      const enrollRes = await gotrueRequest('/factors', 'POST', userJwt, {
        factor_type: 'totp',
        friendly_name: 'Projekt-Planer',
      });
      const enrollData = await enrollRes.json();

      if (!enrollRes.ok) {
        return new Response(JSON.stringify({ error: enrollData.error_description || enrollData.msg || 'Enrollment failed' }), {
          status: enrollRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        factorId: enrollData.id,
        qr: (() => {
          const raw = enrollData.totp?.qr_code || enrollData.totp?.uri || '';
          if (raw.startsWith('data:') || raw.startsWith('http')) return raw;
          // Convert raw SVG to data URI
          return `data:image/svg+xml;base64,${btoa(raw)}`;
        })(),
        secret: enrollData.totp?.secret,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      if (!factorId || !code) {
        return new Response(JSON.stringify({ error: 'factorId and code required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Challenge
      const challengeRes = await gotrueRequest(`/factors/${factorId}/challenge`, 'POST', userJwt);
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) {
        return new Response(JSON.stringify({ error: challengeData.error_description || challengeData.msg || 'Challenge failed' }), {
          status: challengeRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Verify
      const verifyRes = await gotrueRequest(`/factors/${factorId}/verify`, 'POST', userJwt, {
        challenge_id: challengeData.id,
        code,
      });
      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json();
        return new Response(JSON.stringify({ error: verifyData.error_description || verifyData.msg || 'Verification failed' }), {
          status: verifyRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'unenroll') {
      if (!factorId) {
        return new Response(JSON.stringify({ error: 'factorId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const deleteRes = await gotrueAdminRequest(`/admin/users/${user.id}/factors/${factorId}`, 'DELETE');
      if (!deleteRes.ok) {
        const deleteData = await deleteRes.json();
        return new Response(JSON.stringify({ error: deleteData.error_description || deleteData.msg || 'Unenroll failed' }), {
          status: deleteRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      const listRes = await gotrueAdminRequest(`/admin/users/${user.id}/factors`, 'GET');
      const factors = listRes.ok ? await listRes.json() : [];
      const totp = Array.isArray(factors) ? factors.filter((f: any) => f.factor_type === 'totp') : [];
      return new Response(JSON.stringify({ factors: totp }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
