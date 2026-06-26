/**
 * Push notifications (FCM) — заготовка для следующего этапа.
 *
 * План:
 * 1. firebase-messaging-sw.js + VAPID key в Firebase Console
 * 2. Коллекция fcmTokens/{uid} — device tokens
 * 3. Cloud Function onWrite permitNotices → sendEachForMulticast
 * 4. Типы: issued, closure_saved, signing_invite, work_stop
 *
 * @see docs/ROADMAP_EN_2026.md
 */
export type PushTopic = 'permit_issued' | 'permit_closure' | 'signing' | 'work_stop'

export function pushNotificationsEnabled(): boolean {
  return false
}
