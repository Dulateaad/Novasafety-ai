import type { Firestore } from 'firebase-admin/firestore'
import nodemailer from 'nodemailer'
import type { PushPayload } from './push'

const LOCAL_EMAIL = /@(?:nova\.local|localhost|example\.(?:com|org|net))$/i

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  )
}

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!smtpConfigured()) return null
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port: Number.isFinite(port) ? port : 587,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        pass: process.env.SMTP_PASS!.trim(),
      },
    })
  }
  return transporter
}

function isValidEmail(raw: string): boolean {
  const email = raw.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !LOCAL_EMAIL.test(email)
}

/** Почта для уведомлений: notificationEmail → email (не @nova.local). */
export function pickNotificationEmail(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null
  const preferred = String(data.notificationEmail ?? '').trim()
  if (isValidEmail(preferred)) return preferred
  const login = String(data.email ?? '').trim()
  if (isValidEmail(login)) return login
  return null
}

export async function getUserNotificationEmail(
  db: Firestore,
  uid: string,
): Promise<string | null> {
  const clean = uid.trim()
  if (!clean) return null
  const snap = await db.collection('users').doc(clean).get()
  if (!snap.exists) return null
  return pickNotificationEmail(snap.data())
}

export async function getUserRole(db: Firestore, uid: string): Promise<string | null> {
  const snap = await db.collection('users').doc(uid.trim()).get()
  if (!snap.exists) return null
  return String(snap.data()?.role ?? '').trim() || null
}

/** Все роли получают email, если указан notificationEmail. */
export function roleReceivesEmail(_role: string | null | undefined): boolean {
  return true
}

function publicAppUrl(): string {
  return (
    process.env.APP_PUBLIC_URL?.trim().replace(/\/$/, '') ||
    'https://naryad-67194.web.app'
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(payload: PushPayload): string {
  const link = payload.permitId
    ? `${publicAppUrl()}/p/${payload.permitId}`
    : publicAppUrl()
  const body = payload.body.trim() || payload.title
  return `<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0b2147">
<p style="margin:0 0 12px"><strong>${escapeHtml(payload.title)}</strong></p>
<p style="margin:0 0 16px">${escapeHtml(body)}</p>
<p style="margin:0"><a href="${link}">Открыть в NOVA SAFETY AI</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#666">Автоматическое письмо — не отвечайте на него.</p>
</body></html>`
}

/** Отправляет email пользователю, если настроен SMTP и указана рабочая почта. */
export async function sendEmailToUid(
  db: Firestore,
  uid: string,
  payload: PushPayload,
): Promise<boolean> {
  const transport = getTransporter()
  if (!transport) return false

  const role = await getUserRole(db, uid)
  if (!roleReceivesEmail(role)) return false

  const to = await getUserNotificationEmail(db, uid)
  if (!to) return false

  const from = process.env.EMAIL_FROM?.trim() || 'NOVA SAFETY AI <noreply@nova.local>'

  try {
    await transport.sendMail({
      from,
      to,
      subject: payload.title,
      text: payload.body
        ? `${payload.title}\n\n${payload.body}\n\n${publicAppUrl()}`
        : payload.title,
      html: buildHtml(payload),
    })
    return true
  } catch (e) {
    console.warn('[NOVA] email send failed', uid, e)
    return false
  }
}
