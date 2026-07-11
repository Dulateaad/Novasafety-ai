import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
  type FirestoreSettings,
} from 'firebase/firestore'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY

export const firebaseConfigured = Boolean(apiKey)

/** Firestore с IndexedDB-кэшем (оффлайн чтение и очередь записей). */
export let firestoreOfflineCache = false

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

function firestoreTransportSettings(): Pick<
  FirestoreSettings,
  'experimentalForceLongPolling' | 'experimentalAutoDetectLongPolling'
> {
  const force =
    import.meta.env.VITE_FIRESTORE_FORCE_LONG_POLLING?.trim() === '1' ||
    import.meta.env.VITE_FIRESTORE_FORCE_LONG_POLLING?.trim()?.toLowerCase() === 'true'
  if (force) {
    return { experimentalForceLongPolling: true }
  }
  /** Обходит ERR_QUIC_PROTOCOL_ERROR / QUIC_TOO_MANY_RTOS в браузере. */
  return { experimentalAutoDetectLongPolling: true }
}

function initDb(firebaseApp: FirebaseApp): Firestore {
  const transport = firestoreTransportSettings()
  try {
    const instance = initializeFirestore(firebaseApp, {
      ...transport,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
    firestoreOfflineCache = true
    return instance
  } catch (e) {
    console.warn('[NOVA] Firestore offline cache unavailable, using online-only mode', e)
    try {
      return initializeFirestore(firebaseApp, transport)
    } catch {
      return getFirestore(firebaseApp)
    }
  }
}

if (firebaseConfigured) {
  app = initializeApp({
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  auth = getAuth(app)
  db = initDb(app)
}

export { app, auth, db }
