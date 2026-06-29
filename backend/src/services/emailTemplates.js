function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character])
}

export function stripHtml(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function baseTemplate({
  preheader,
  title,
  intro,
  body = '',
  button,
  footer = 'You received this email because you use NexTurn Smart Queue Prediction System.',
}) {
  const safeTitle = escapeHtml(title)
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${safeTitle}</title>
    </head>
    <body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#102a43;">
      <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(preheader || title)}</span>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;">
              <tr>
                <td style="background:#123c69;padding:26px 28px;color:#ffffff;">
                  <div style="font-size:24px;font-weight:800;letter-spacing:.2px;">NexTurn</div>
                  <div style="font-size:13px;margin-top:4px;color:#c8f7f0;">Smart Queue Prediction System</div>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 28px;">
                  <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#102a43;">${safeTitle}</h1>
                  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#486581;">${intro}</p>
                  ${body}
                  ${button ? `<p style="margin:28px 0 0;"><a href="${escapeHtml(button.href)}" style="display:inline-block;background:#123c69;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px;">${escapeHtml(button.label)}</a></p>` : ''}
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #e2e8f0;padding:18px 28px;font-size:12px;line-height:1.6;color:#829ab1;">
                  ${escapeHtml(footer)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`
}

function detailsTable(rows) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:22px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    ${rows.map(([label, value]) => `<tr>
      <td style="padding:13px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;color:#627d98;">${escapeHtml(label)}</td>
      <td style="padding:13px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;color:#102a43;">${escapeHtml(value ?? '—')}</td>
    </tr>`).join('')}
  </table>`
}

const templates = {
  EMAIL_VERIFICATION: ({ name, otp, expiresInMinutes }) => ({
    subject: `${otp} is your NexTurn verification code`,
    html: baseTemplate({
      preheader: `${otp} is your NexTurn verification code.`,
      title: 'Verify your email',
      intro: `Hello ${escapeHtml(name)}, use this one-time code to finish creating your NexTurn account.`,
      body: `<div style="margin:22px 0;padding:22px;border-radius:16px;background:#f1f5f9;text-align:center;">
        <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#123c69;">${escapeHtml(otp)}</div>
        <div style="margin-top:10px;font-size:13px;color:#627d98;">This code expires in ${escapeHtml(expiresInMinutes)} minutes.</div>
      </div>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#627d98;">Do not share this code with anyone. If you did not request this account, you can safely ignore this email.</p>`,
    }),
  }),

  WELCOME: ({ name }) => ({
    subject: 'Welcome to NexTurn',
    html: baseTemplate({
      preheader: 'Welcome to NexTurn.',
      title: 'Welcome to NexTurn',
      intro: `Hello ${escapeHtml(name)}, your account is ready. You can now discover services, reserve queue tokens, and follow live wait-time predictions.`,
    }),
  }),

  PASSWORD_RESET: ({ name, resetUrl, expiresInMinutes }) => ({
    subject: 'Reset your NexTurn password',
    html: baseTemplate({
      preheader: 'Reset your NexTurn password.',
      title: 'Reset your password',
      intro: `Hello ${escapeHtml(name)}, use the secure button below to set a new password for your NexTurn account.`,
      body: `<p style="font-size:14px;line-height:1.7;color:#627d98;">This link expires in ${escapeHtml(expiresInMinutes)} minutes. If you did not request a password reset, no action is needed.</p>`,
      button: { href: resetUrl, label: 'Reset password' },
    }),
  }),

  TOKEN_CREATED: ({ name, queueNumber, serviceName, estimatedWaitingTime, bookingDateTime }) => ({
    subject: `NexTurn booking confirmed: ${queueNumber}`,
    html: baseTemplate({
      preheader: `Your NexTurn token ${queueNumber} is confirmed.`,
      title: 'Queue booking confirmed',
      intro: `Hello ${escapeHtml(name)}, your place in the queue has been reserved successfully.`,
      body: detailsTable([
        ['Queue number', queueNumber],
        ['Service', serviceName],
        ['Estimated waiting time', `${estimatedWaitingTime} minutes`],
        ['Booking date/time', bookingDateTime],
      ]),
    }),
  }),

  TURN_REMINDER: ({ name, queueNumber, serviceName, peopleAhead = 0 }) => ({
    subject: `Your NexTurn turn is approaching: ${queueNumber}`,
    html: baseTemplate({
      preheader: `Your turn is approaching for ${serviceName}.`,
      title: 'Your turn is approaching',
      intro: `Hello ${escapeHtml(name)}, please be ready. Your queue position is moving forward.`,
      body: detailsTable([
        ['Queue number', queueNumber],
        ['Service', serviceName],
        ['People ahead', peopleAhead],
      ]),
    }),
  }),

  TOKEN_CANCELLED: ({ name, queueNumber, serviceName, reason, cancelledBy }) => ({
    subject: `NexTurn token cancelled: ${queueNumber}`,
    html: baseTemplate({
      preheader: `Your token ${queueNumber} was cancelled.`,
      title: 'Token cancelled',
      intro: `Hello ${escapeHtml(name)}, this confirms that your queue token has been cancelled.`,
      body: detailsTable([
        ['Queue number', queueNumber],
        ['Service', serviceName],
        ['Cancelled by', cancelledBy],
        ['Reason', reason],
      ]),
    }),
  }),

  MANAGER_ALERT: ({ name, branchName, title, message }) => ({
    subject: `NexTurn manager alert: ${title}`,
    html: baseTemplate({
      preheader: `${title} at ${branchName}.`,
      title,
      intro: `Hello ${escapeHtml(name)}, NexTurn detected an operational alert for ${escapeHtml(branchName)}.`,
      body: `<div style="margin-top:20px;padding:18px;border-radius:16px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:15px;line-height:1.7;">${escapeHtml(message)}</div>`,
    }),
  }),
}

export function renderEmailTemplate(template, data = {}) {
  const renderer = templates[template]
  if (!renderer) {
    throw Object.assign(new Error(`Unknown email template: ${template}`), {
      status: 500,
      code: 'EMAIL_TEMPLATE_UNKNOWN',
    })
  }
  const rendered = renderer(data)
  return { ...rendered, text: rendered.text || stripHtml(rendered.html) }
}

export const emailTemplateNames = Object.freeze(Object.keys(templates))
