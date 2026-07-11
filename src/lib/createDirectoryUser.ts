import { getFunctions, httpsCallable } from 'firebase/functions'
import type { UserRole } from '../types/domain'
import { app, firebaseConfigured } from './firebase'

const REGION = 'europe-west1'

export const DIRECTORY_CREATABLE_ROLES = [
  'performer',
  'permitter',
  'issuer',
  'leadExpert',
  'ert',
  'executor',
  'safety',
  'contractor',
] as const satisfies readonly UserRole[]

export const DIRECTORY_EDITABLE_ROLES = [
  ...DIRECTORY_CREATABLE_ROLES,
  'coordinator',
] as const satisfies readonly UserRole[]

export type DirectoryCreatableRole = (typeof DIRECTORY_CREATABLE_ROLES)[number]
export type DirectoryEditableRole = (typeof DIRECTORY_EDITABLE_ROLES)[number]

export type CreateDirectoryUserRequest = {
  displayName: string
  role: DirectoryCreatableRole
  email: string
  password?: string
  position?: string
  iin?: string
  badgeNo?: string
}

export type CreateDirectoryUserResponse = {
  uid: string
  email: string
  displayName: string
  role: DirectoryCreatableRole
  badgeNo: string
  created: boolean
  temporaryPassword?: string
}

export async function createDirectoryUserClient(
  payload: CreateDirectoryUserRequest,
): Promise<CreateDirectoryUserResponse> {
  if (!firebaseConfigured || !app) {
    throw new Error('Firebase недоступен')
  }
  const fn = httpsCallable<CreateDirectoryUserRequest, CreateDirectoryUserResponse>(
    getFunctions(app, REGION),
    'createDirectoryUserFn',
  )
  const res = await fn(payload)
  return res.data
}

export type DeleteDirectoryUserResponse = {
  uid: string
  email: string
  deletedAuth: boolean
  deletedProfile: boolean
}

export async function deleteDirectoryUserClient(
  uid: string,
): Promise<DeleteDirectoryUserResponse> {
  if (!firebaseConfigured || !app) {
    throw new Error('Firebase недоступен')
  }
  const fn = httpsCallable<{ uid: string }, DeleteDirectoryUserResponse>(
    getFunctions(app, REGION),
    'deleteDirectoryUserFn',
  )
  const res = await fn({ uid })
  return res.data
}

export function directoryCallableErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message: unknown }).message ?? '').trim()
    if (message) return message
  }
  return err instanceof Error ? err.message : 'Не удалось выполнить операцию'
}

export type UpdateDirectoryUserRequest = {
  uid: string
  displayName: string
  role: DirectoryEditableRole
  email: string
  password?: string
  position?: string
  iin?: string
  badgeNo?: string
}

export type UpdateDirectoryUserResponse = {
  uid: string
  email: string
  displayName: string
  role: DirectoryEditableRole
  badgeNo: string
  passwordChanged: boolean
  temporaryPassword?: string
}

export async function updateDirectoryUserClient(
  payload: UpdateDirectoryUserRequest,
): Promise<UpdateDirectoryUserResponse> {
  if (!firebaseConfigured || !app) {
    throw new Error('Firebase недоступен')
  }
  const fn = httpsCallable<UpdateDirectoryUserRequest, UpdateDirectoryUserResponse>(
    getFunctions(app, REGION),
    'updateDirectoryUserFn',
  )
  const res = await fn(payload)
  return res.data
}
