import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from 'firebase/messaging'
import { arrayRemove, arrayUnion, doc, setDoc } from 'firebase/firestore'
import { app, db, firebaseConfigured } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
const TOKEN_STORAGE_KEY = 'nova_push_token_v1'
const SW_PATH = 'firebase-cloud-messaging-push-scope/firebase-messaging-sw.js'
const SW_SCOPE = '/firebase-cloud-messaging-push-scope/'

export type ForegroundPush = {
  title: string
  body: string
  permitId?: string
}

export type EnablePushResult = {
  ok: boolean
  reason?: 'unsupported' | 'denied' | 'default' | 'no-token' | 'error'
}

/** Push настроен на уровне сборки (есть Firebase и VAPID-ключ). */
export function pushConfigured(): boolean {
  return Boolean(firebaseConfigured && app && db && VAPID_KEY)
}

export async function pushSupported(): Promise<boolean> {
  if (!pushConfigured()) return false
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return false
  try {
    return await isSupported()
  } catch {
    return false
  }
}

export function currentPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function pushEnabledLocally(): boolean {
  try {
    return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY))
  } catch {
    return false
  }
}

function swRegistrationUrl(): string {
  const params = new URLSearchParams({
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) ?? '',
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) ?? '',
    messagingSenderId:
      (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) ?? '',
    appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) ?? '',
  })
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}${SW_PATH}?${params.toString()}`
}

async function registerMessagingSw(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(swRegistrationUrl(), { scope: SW_SCOPE })
}

let foregroundBound = false

function bindForeground(onForeground?: (n: ForegroundPush) => void): void {
  if (foregroundBound || !onForeground || !app) return
  foregroundBound = true
  const messaging = getMessaging(app)
  onMessage(messaging, (payload) => {
    const data = (payload.data ?? {}) as Record<string, string>
    onForeground({
      title: data.title ?? payload.notification?.title ?? 'NOVA SAFETY AI',
      body: data.body ?? payload.notification?.body ?? '',
      permitId: data.permitId,
    })
  })
}

/** Запрашивает разрешение, получает токен и сохраняет его в fcmTokens/{uid}. */
export async function enablePush(
  uid: string,
  onForeground?: (n: ForegroundPush) => void,
): Promise<EnablePushResult> {
  if (!uid.trim() || !(await pushSupported()) || !app || !db) {
    return { ok: false, reason: 'unsupported' }
  }

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') {
    return { ok: false, reason: permission === 'denied' ? 'denied' : 'default' }
  }

  try {
    const registration = await registerMessagingSw()
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return { ok: false, reason: 'no-token' }

    await setDoc(
      doc(db, 'fcmTokens', uid),
      { tokens: arrayUnion(token), updatedAtIso: new Date().toISOString() },
      { merge: true },
    )
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch {
      /* приватный режим */
    }
    bindForeground(onForeground)
    return { ok: true }
  } catch (e) {
    console.warn('[NOVA] enablePush failed', e)
    return { ok: false, reason: 'error' }
  }
}

/** Удаляет токен устройства локально и из fcmTokens/{uid}. */
export async function disablePush(uid: string): Promise<void> {
  let token: string | null = null
  try {
    token = localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    token = null
  }
  try {
    if (app) await deleteToken(getMessaging(app))
  } catch {
    /* токен мог быть уже отозван */
  }
  try {
    if (db && token) {
      await setDoc(
        doc(db, 'fcmTokens', uid),
        { tokens: arrayRemove(token) },
        { merge: true },
      )
    }
  } catch {
    /* офлайн — очистим хотя бы локально */
  }
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
