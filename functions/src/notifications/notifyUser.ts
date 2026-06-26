import type { Firestore } from 'firebase-admin/firestore'
import { sendEmailToUid } from './email'
import { sendPushToUid, type PushPayload } from './push'

export type NotifyOptions = {
  /** crew_ack — только push, без email (работники). */
  inviteType?: 'approval' | 'crew_ack' | string
  skipEmail?: boolean
}

/** Push + email (кроме работников и crew_ack). */
export async function notifyUser(
  db: Firestore,
  uid: string,
  payload: PushPayload,
  opts?: NotifyOptions,
): Promise<{ push: number; email: boolean }> {
  const push = await sendPushToUid(db, uid, payload)
  const skipEmail = opts?.skipEmail === true || opts?.inviteType === 'crew_ack'
  const email = skipEmail ? false : await sendEmailToUid(db, uid, payload)
  return { push, email }
}
