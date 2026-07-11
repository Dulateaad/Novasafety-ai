import { getMessaging } from 'firebase-admin/messaging'
import { FieldValue, type Firestore } from 'firebase-admin/firestore'

export type PushPayload = {
  title: string
  body: string
  permitId?: string
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

/** Отправляет web-push на все устройства пользователя; чистит протухшие токены. */
export async function sendPushToUid(
  db: Firestore,
  uid: string,
  payload: PushPayload,
): Promise<number> {
  const cleanUid = uid.trim()
  if (!cleanUid) return 0

  const snap = await db.collection('fcmTokens').doc(cleanUid).get()
  const raw = snap.data()?.tokens
  const tokens: string[] = Array.isArray(raw)
    ? raw.filter((t): t is string => typeof t === 'string' && t.length > 0)
    : []
  if (tokens.length === 0) return 0

  const link = payload.permitId ? `/p/${payload.permitId}` : '/'
  const data: Record<string, string> = {
    title: payload.title,
    body: payload.body,
  }
  if (payload.permitId) data.permitId = payload.permitId

  let res
  try {
    res = await getMessaging().sendEachForMulticast({
      tokens,
      data,
      webpush: {
        fcmOptions: { link },
        headers: { Urgency: 'high' },
      },
    })
  } catch (e) {
    console.warn('[NOVA] push send failed', e)
    return 0
  }

  const invalid: string[] = []
  res.responses.forEach((r, i) => {
    if (!r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code)) {
      invalid.push(tokens[i])
    }
  })
  if (invalid.length > 0) {
    await db
      .collection('fcmTokens')
      .doc(cleanUid)
      .set({ tokens: FieldValue.arrayRemove(...invalid) }, { merge: true })
  }

  return res.successCount
}
