import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';
import { corsHeaders } from '../_shared/cors.ts';

const escapeHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const INVITE_HTML = (origin: string, registrationUrl: string, projectName?: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#0f172a;padding:32px 32px 28px;text-align:center;">
              <img src="${origin}/favicon.png" width="48" height="48" alt="Projekt-Planer" style="border-radius:12px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;" />
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Projekt-Planer</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;font-weight:700;">Projekteinladung</h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                Du wurdest zum Projekt ${projectName ? `&bdquo;<strong style="color:#1e293b;">${escapeHtml(projectName)}</strong>&ldquo; ` : ''}im Projekt-Planer eingeladen. Registriere dich, um Zugriff zu erhalten.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${registrationUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:10px;box-shadow:0 1px 2px rgba(59,130,246,0.3);">
                      Jetzt registrieren
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;text-align:center;">
                Nach der Registrierung erh&auml;ltst du automatisch Zugriff auf das geteilte Projekt.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;text-align:center;">
              <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
                <p style="margin:0;color:#cbd5e1;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Projekt-Planer</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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

    // Verify the calling user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, projectId } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ filter: email });
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email === email
    );

    if (existingUser) {
      const isGhost = !existingUser.last_sign_in_at;

      if (isGhost) {
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        await supabaseAdmin.from('profiles').delete().eq('id', existingUser.id);
      } else {
        return new Response(JSON.stringify({ success: true, registered: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch project name for the email
    let projectName: string | undefined;
    if (projectId) {
      const { data: project } = await supabaseAdmin.from('projects').select('title').eq('id', projectId).maybeSingle();
      projectName = project?.title;
    }

    // User not registered (or ghost was cleaned up) — send registration email via SMTP
    const origin = req.headers.get('origin') || Deno.env.get('PROJEKT_PLANER_URL');
    if (!origin) {
      return new Response(JSON.stringify({ success: false, error: 'Unknown app URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const params = new URLSearchParams();
    if (projectId) params.set('project', projectId);
    params.set('invite_email', email);
    const registrationUrl = `${origin}/?${params.toString()}`;

    const smtpHost = Deno.env.get('SMTP_HOSTNAME');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const smtpUser = Deno.env.get('SMTP_USERNAME');
    const smtpPass = Deno.env.get('SMTP_PASSWORD');
    const smtpFrom = Deno.env.get('SMTP_FROM');

    if (!smtpHost || !smtpFrom) {
      console.error('SMTP not configured');
      return new Response(JSON.stringify({ success: false, error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      // Local mail catchers such as Mailpit accept unauthenticated mail
      ...(smtpUser ? { auth: { user: smtpUser, pass: smtpPass } } : {}),
    });

    await transporter.sendMail({
      from: `Projekt-Planer <${smtpFrom}>`,
      to: email,
      subject: projectName ? `Einladung: ${projectName}` : 'Einladung zum Projekt-Planer',
      html: INVITE_HTML(origin, registrationUrl, projectName),
    });

    return new Response(JSON.stringify({ success: true, emailSent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('invite-user error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
