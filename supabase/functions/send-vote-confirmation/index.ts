import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { league_id, league_name, email, ranking } = await req.json()

    if (!league_id || !league_name || !email || !ranking) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')!
    const appUrl = Deno.env.get('APP_URL')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create vote token in DB
    const { data: voteToken, error: dbError } = await supabase
      .from('vote_tokens')
      .insert({ league_id, league_name, email, ranking })
      .select('token')
      .single()

    if (dbError || !voteToken) {
      console.error('DB insert error:', JSON.stringify(dbError))
      return new Response(JSON.stringify({ error: dbError?.message ?? 'DB error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const confirmUrl = `${appUrl}/confirm/${voteToken.token}`

    // Build ranking HTML for email
    const rankingRows = ranking
      .map(
        (entry: { position: number; team_name: string }) =>
          `<tr>
            <td style="padding:6px 12px;font-weight:bold;color:#6b7280;">${entry.position}.</td>
            <td style="padding:6px 12px;">${entry.team_name}</td>
          </tr>`
      )
      .join('')

    const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#dc2626;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;">Liga Ranking</h1>
            <p style="margin:4px 0 0;color:#fecaca;font-size:14px;">${league_name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Deine Prognose bestätigen</h2>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
              Klicke auf den Button unten, um deinen Tipp zu bestätigen.
              Der Link ist 24 Stunden gültig.
            </p>

            <table cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;width:100%;margin-bottom:28px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#9ca3af;font-weight:600;">#</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#9ca3af;font-weight:600;">MANNSCHAFT</th>
                </tr>
              </thead>
              <tbody>${rankingRows}</tbody>
            </table>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="${confirmUrl}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-weight:bold;font-size:16px;text-decoration:none;">
                    Tipp jetzt bestätigen
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
              Falls du diesen Tipp nicht abgeschickt hast, kannst du diese E-Mail ignorieren.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    // Send email via SendGrid
    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'rene.kofler@xibears.com', name: 'Liga Ranking' },
        subject: `Tipp bestätigen – ${league_name}`,
        content: [{ type: 'text/html', value: emailHtml }],
      }),
    })

    if (!sgRes.ok) {
      const sgError = await sgRes.text()
      return new Response(JSON.stringify({ error: `SendGrid error: ${sgError}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
