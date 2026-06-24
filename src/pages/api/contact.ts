export const prerender = false

import type { APIContext } from 'astro'

type ContactBody = {
  name: string
  email: string
  message: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST({ request, locals }: APIContext): Promise<Response> {
  let body: ContactBody
  try {
    body = await request.json() as ContactBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { name, email, message } = body

  if (!name?.trim()) return jsonResponse({ error: 'Name is required' }, 400)
  if (!email?.trim() || !isValidEmail(email)) return jsonResponse({ error: 'Valid email is required' }, 400)
  if (!message?.trim()) return jsonResponse({ error: 'Message is required' }, 400)

  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {}
  const resendKey = env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY
  const toEmail = env.CONTACT_TO_EMAIL ?? import.meta.env.CONTACT_TO_EMAIL ?? 'hoangphuc1662@gmail.com'

  if (!resendKey) {
    console.error('RESEND_API_KEY not set — contact form submission dropped')
    return jsonResponse({ success: true }, 200)
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'infra-folio <contact@noreply.phuctruong.dev>',
      to: [toEmail],
      subject: `Portfolio contact from ${escapeHtml(name)}`,
      html: `
        <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `,
      reply_to: email,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('Resend API error:', res.status, detail)
    return jsonResponse({ error: 'Failed to send message. Please try again.' }, 500)
  }

  return jsonResponse({ success: true }, 200)
}
