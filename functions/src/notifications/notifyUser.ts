import type { Firestore } from 'firebase-admin/firestore'
import { sendEmailToUid } from './email'
import { sendPushToUid, type PushPayload } from './push'

export type NotifyOptions = {
  inviteType?: 'approval' | 'crew_ack' | string
  skipEmail?: boolean
}

/** Push + email (если не skipEmail и указана рабочая почта). */
export async function notifyUser(
  db: Firestore,
  uid: string,
  payload: PushPayload,
  opts?: NotifyOptions,
): Promise<{ push: number; email: boolean }> {
  const push = await sendPushToUid(db, uid, payload)
  const email =
    opts?.skipEmail === true ? false : await sendEmailToUid(db, uid, payload)
  return { push, email }
}
