import type { Response as FetchResponse } from 'node-fetch'

const RESEND_API_URL = 'https://api.resend.com/emails'

type SendPasswordResetEmailInput = {
  to: string
  resetUrl: string
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  // fix code_x: mail transport is optional; when env is missing, caller can fallback to dev resetUrl flow.
  if (!apiKey || !from) {
    return false
  }

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">Відновлення пароля Starway</h2>
      <p style="margin: 0 0 16px;">
        Натисніть кнопку нижче, щоб встановити новий пароль. Посилання дійсне 30 хвилин.
      </p>
      <a
        href="${input.resetUrl}"
        style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0a2446;color:#fff;text-decoration:none;font-weight:600;"
      >
        Встановити новий пароль
      </a>
      <p style="margin: 16px 0 0; font-size: 13px; color: #475569;">
        Якщо ви не запитували зміну пароля, просто проігноруйте цей лист.
      </p>
    </div>
  `

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: 'Відновлення пароля Starway',
      html,
    }),
  })

  const typedResponse = response as FetchResponse
  if (!typedResponse.ok) {
    const text = await typedResponse.text().catch(() => '')
    console.error('❌ [Mail] Resend error:', typedResponse.status, text)
    return false
  }

  return true
}
