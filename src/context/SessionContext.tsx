import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import type {
  DemoUser,
  JournalEntry,
  Permit,
  PermitDraft,
  PermitStatus,
} from '../types/domain'
import { enrichUserDirectoryWithDefaultSigners } from '../config/defaultNdprSigners'
import { enrichUserDirectoryWithDefaultWorkers } from '../config/defaultWorkers'
import { DEMO_USERS, resolveUserDirectoryEntry } from '../demoUsers'
import { ensureDefaultWorkersClient, mergeEnsuredWorkersIntoDirectory } from '../lib/ensureDefaultWorkers'
import {
  ensureDefaultNdprSignersClient,
  mergeEnsuredSignersIntoDirectory,
  mergeEnsuredInspectorIntoDirectory,
  mergeEnsuredErtIntoDirectory,
} from '../lib/ensureDefaultNdprSigners'
import { auth, db, firebaseConfigured } from '../lib/firebase'
import { profileDocToDemoUser } from '../lib/userProfile'
import { canUserDeletePermit } from '../lib/permitDelete'
import { resetSessionUser, syncSessionUser, clearPackageSession } from '../lib/packageSession'
import { NEW_PERMIT_DRAFT_AUTOSAVE_KEY } from '../lib/newPermitDraftAutosave'
import { readResumePermitId } from '../lib/resumePermitPackage'
import { createRepository } from '../storage/repositoryFactory'
import type { PermitRepository } from '../storage/types'
import type { WorkStopResolveAction } from '../lib/workStopFunctions'
import type { InspectorRejectedAction } from '../lib/inspectorRejectedPermit'
import { notifyWorkStopAlertsRefresh } from '../lib/refreshWorkStopAlerts'
import { disablePushOnSignOut } from '../components/PushNotificationsToggle'
import { fetchInspectorSettings } from '../lib/inspectorSettings'
import { isInspectorUser } from '../lib/inspectorAccess'
import type { WorkStopPhoto } from '../types/workStop'

export type AuthMode = 'local' | 'firebase'

function applyKnownAccountProfile(me: DemoUser): DemoUser {
  const email = me.email.trim().toLowerCase()
  const template = DEMO_USERS.find((u) => u.email.trim().toLowerCase() === email)
  if (!template) return me
  return {
    ...me,
    displayName: template.displayName,
    badgeNo: me.badgeNo?.trim() || template.badgeNo,
    role: template.role === 'safety' ? 'safety' : me.role,
  }
}

interface SessionValue {
  authMode: AuthMode
  /** Пока слушаем Firebase Auth в первый раз */
  authReady: boolean
  /** Текущий пользователь для действий с НД; в режиме Firebase — после входа */
  user: DemoUser | null
  /** Участники для выбора в формах (Firebase: коллекция users) */
  userDirectory: DemoUser[]
  profileError: string | null
  resolveUser: (id: string) => DemoUser | undefined
  setUserId: (id: string) => void
  signInWithEmailPassword: (email: string, password: string) => Promise<void>
  signOutSession: () => Promise<void>
  permits: Permit[]
  repo: PermitRepository
  refresh: () => Promise<void>
  createPermit: (draft: PermitDraft) => Promise<Permit>
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  transition: (id: string, next: PermitStatus) => Promise<void>
  deletePermit: (id: string) => Promise<void>
  deleteAllPermits: () => Promise<void>
  requestWorkStop: (id: string, reason: string, photo?: WorkStopPhoto) => Promise<void>
  resolveWorkStop: (
    id: string,
    action: WorkStopResolveAction,
    comment: string,
  ) => Promise<void>
  resolveRejectedPermit: (
    id: string,
    action: InspectorRejectedAction,
    comment: string,
  ) => Promise<void>
  error: string | null
  clearError: () => void
}

const SessionCtx = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => createRepository(), [])
  const authMode: AuthMode = firebaseConfigured && auth && db ? 'firebase' : 'local'

  const [authReady, setAuthReady] = useState(authMode === 'local')
  const [firebaseActor, setFirebaseActor] = useState<DemoUser | null>(null)
  const [userDirectory, setUserDirectory] = useState<DemoUser[]>(() =>
    enrichUserDirectoryWithDefaultWorkers(
      enrichUserDirectoryWithDefaultSigners(DEMO_USERS),
    ),
  )
  const [profileError, setProfileError] = useState<string | null>(null)
  const [localUserId, setLocalUserId] = useState(DEMO_USERS[0].id)

  const [permits, setPermits] = useState<Permit[]>([])
  const [error, setError] = useState<string | null>(null)

  const user: DemoUser | null =
    authMode === 'firebase'
      ? firebaseActor
      : (DEMO_USERS.find((u) => u.id === localUserId) ?? DEMO_USERS[0])

  const resolveUser = useCallback(
    (id: string) => resolveUserDirectoryEntry(id, userDirectory),
    [userDirectory],
  )

  useEffect(() => {
    if (authMode !== 'firebase' || !auth || !db) return
    const authInstance = auth
    const firestore = db

    const unsub = onAuthStateChanged(authInstance, async (fbUser) => {
      if (!fbUser) {
        setFirebaseActor(null)
        setUserDirectory([])
        setAuthReady(true)
        return
      }

      setProfileError(null)
      try {
        const ref = doc(firestore, 'users', fbUser.uid)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          setFirebaseActor(null)
          setUserDirectory([])
          setProfileError(
            'Нет профиля в Firestore (коллекция users). Администратор должен создать документ users/' +
              fbUser.uid +
              ' с полями displayName и role.',
          )
          setAuthReady(true)
          await signOut(authInstance)
          return
        }
        const me = applyKnownAccountProfile(
          profileDocToDemoUser(
            fbUser.uid,
            snap.data() as Record<string, unknown>,
            fbUser.email ?? '',
          ),
        )
        setFirebaseActor(me)

        const dirSnap = await getDocs(collection(firestore, 'users'))
        const dir: DemoUser[] = []
        dirSnap.forEach((d) => {
          dir.push(
            profileDocToDemoUser(
              d.id,
              d.data() as Record<string, unknown>,
              String((d.data() as { email?: string }).email ?? ''),
            ),
          )
        })
        const enriched = enrichUserDirectoryWithDefaultWorkers(
          enrichUserDirectoryWithDefaultSigners(dir),
        )
        enriched.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'))
        setUserDirectory(enriched)

        void ensureDefaultWorkersClient()
          .then((workers) => {
            if (!workers?.length) return
            setUserDirectory((prev) => {
              const merged = mergeEnsuredWorkersIntoDirectory(prev, workers)
              merged.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'))
              return merged
            })
          })
          .catch(() => {})

        void ensureDefaultNdprSignersClient()
          .then((result) => {
            if (!result?.accounts?.length) return
            setUserDirectory((prev) => {
              let merged = mergeEnsuredSignersIntoDirectory(prev, result.accounts)
              if (result.inspector) {
                merged = mergeEnsuredInspectorIntoDirectory(merged, result.inspector)
              }
              if (result.ert) {
                merged = mergeEnsuredErtIntoDirectory(merged, result.ert)
              }
              merged.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'))
              return merged
            })
          })
          .catch(() => {})
      } catch (e) {
        setFirebaseActor(null)
        setProfileError(
          e instanceof Error ? e.message : 'Не удалось загрузить профиль',
        )
        setUserDirectory([])
        await signOut(auth!)
      }
      setAuthReady(true)
    })

    return () => unsub()
  }, [authMode, auth, db])

  useEffect(() => {
    if (!authReady) return
    syncSessionUser(user)
  }, [authReady, user])

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      setPermits([])
      return
    }
    return repo.subscribePermits(setPermits)
  }, [repo, authReady, user])

  const refresh = useCallback(async () => {
    setPermits(await repo.list())
  }, [repo])

  const setUserId = useCallback(
    (id: string) => {
      if (authMode === 'firebase') return
      const next = DEMO_USERS.find((u) => u.id === id)
      if (next) setLocalUserId(id)
    },
    [authMode],
  )

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (authMode !== 'firebase' || !auth) return
      setError(null)
      setProfileError(null)
      await signInWithEmailAndPassword(auth, email.trim(), password)
    },
    [authMode, auth],
  )

  const signOutSession = useCallback(async () => {
    if (authMode !== 'firebase' || !auth) return
    setError(null)
    const uid = user?.id
    if (uid) {
      try {
        await disablePushOnSignOut(uid)
      } catch {
        /* не блокируем выход */
      }
    }
    resetSessionUser()
    await signOut(auth)
  }, [authMode, auth, user?.id])

  const createPermit = useCallback(
    async (draft: PermitDraft) => {
      if (!user) throw new Error('Нет пользователя сессии')
      setError(null)
      try {
        return await repo.create(draft, user)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
    },
    [repo, user],
  )

  const updatePermit = useCallback(
    async (id: string, patch: Partial<Permit>) => {
      if (!user) throw new Error('Нет пользователя сессии')
      setError(null)
      try {
        await repo.updateFields(id, patch, user)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
    },
    [repo, user],
  )

  const transition = useCallback(
    async (id: string, next: PermitStatus) => {
      if (!user) throw new Error('Нет пользователя сессии')
      setError(null)
      try {
        await repo.transition(id, next, user)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
    },
    [repo, user],
  )

  const deletePermit = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Нет пользователя сессии')
      if (!canUserDeletePermit(user)) {
        throw new Error('Недостаточно прав для удаления наряда')
      }
      setError(null)
      try {
        await repo.deletePermit(id, user)
        if (readResumePermitId() === id) {
          clearPackageSession()
        } else {
          // Сброс устаревшего номера в черновике (иначе новый наряд получит «003» вместо «001»).
          try {
            const raw = sessionStorage.getItem(NEW_PERMIT_DRAFT_AUTOSAVE_KEY)
            if (raw) {
              const parsed = JSON.parse(raw) as { registrationRefNo?: string }
              if (parsed.registrationRefNo?.trim()) {
                parsed.registrationRefNo = ''
                sessionStorage.setItem(NEW_PERMIT_DRAFT_AUTOSAVE_KEY, JSON.stringify(parsed))
              }
            }
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
    },
    [repo, user],
  )

  const deleteAllPermits = useCallback(async () => {
    if (!user) throw new Error('Нет пользователя сессии')
    if (!canUserDeletePermit(user)) {
      throw new Error('Недостаточно прав для удаления нарядов')
    }
    setError(null)
    try {
      await repo.deleteAllPermits(user)
      clearPackageSession()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }, [repo, user])

  const requestWorkStop = useCallback(
    async (id: string, reason: string, photo?: WorkStopPhoto) => {
      if (!user) throw new Error('Нет пользователя сессии')
      setError(null)
      try {
        const settings = await fetchInspectorSettings()
        await repo.requestWorkStop(
          id,
          {
            reason,
            photo,
            directory: userDirectory,
            inspectorNotifyMode: settings.inspectorNotifyMode,
          },
          user,
        )
        notifyWorkStopAlertsRefresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
    },
    [repo, user, userDirectory],
  )

  const resolveWorkStop = useCallback(
    async (id: string, action: WorkStopResolveAction, comment: string) => {
      if (!user) throw new Error('Нет пользователя сессии')
      if (!isInspectorUser(user)) {
        throw new Error(
          'Решение по остановке работ доступно только инженеру по ОТ, ТБ и ООС (temirlan-safety@nova.local).',
        )
      }
      setError(null)
      try {
        await repo.resolveWorkStop(id, { action, comment }, user)
        notifyWorkStopAlertsRefresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
    },
    [repo, user],
  )

  const resolveRejectedPermit = useCallback(
    async (id: string, action: InspectorRejectedAction, comment: string) => {
      if (!user) throw new Error('Нет пользователя сессии')
      if (!isInspectorUser(user)) {
        throw new Error(
          'Решение по отклонённому пакету доступно только инженеру по ОТ, ТБ и ООС.',
        )
      }
      setError(null)
      try {
        await repo.resolveRejectedPermit(id, { action, comment }, user)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
    },
    [repo, user],
  )

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<SessionValue>(
    () => ({
      authMode,
      authReady,
      user,
      userDirectory,
      profileError,
      resolveUser,
      setUserId,
      signInWithEmailPassword,
      signOutSession,
      permits,
      repo,
      refresh,
      createPermit,
      updatePermit,
      transition,
      deletePermit,
      deleteAllPermits,
      requestWorkStop,
      resolveWorkStop,
      resolveRejectedPermit,
      error,
      clearError,
    }),
    [
      authMode,
      authReady,
      user,
      userDirectory,
      profileError,
      resolveUser,
      setUserId,
      signInWithEmailPassword,
      signOutSession,
      permits,
      repo,
      refresh,
      createPermit,
      updatePermit,
      transition,
      error,
      clearError,
    ],
  )

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession() {
  const v = useContext(SessionCtx)
  if (!v) throw new Error('useSession outside SessionProvider')
  return v
}

export function useJournal(permitId: string | undefined) {
  const { repo } = useSession()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  useEffect(() => {
    if (!permitId) {
      setEntries([])
      return
    }
    return repo.journalSubscribe(permitId, setEntries)
  }, [repo, permitId])
  return entries
}
