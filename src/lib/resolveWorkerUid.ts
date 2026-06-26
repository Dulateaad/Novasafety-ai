import { DEFAULT_WORKERS } from '../config/defaultWorkers'
import type { DemoUser, PermitDraft } from '../types/domain'

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isDemoWorkerId(id: string): boolean {
  return /^w-worker-\d+$/.test(id) || id.startsWith('default-worker')
}

function workerSpecForUid(uid: string): (typeof DEFAULT_WORKERS)[number] | undefined {
  return DEFAULT_WORKERS.find((spec) => spec.demoIds.includes(uid))
}

/** Demo-id (w-worker-N) → Firebase UID из справочника по email шаблона. */
export function resolveWorkerUid(directory: DemoUser[], draftUid: string): string {
  const uid = draftUid.trim()
  if (!uid) return ''

  if (!isDemoWorkerId(uid)) {
    const hit = directory.find((u) => u.id === uid)
    return hit?.id ?? uid
  }

  const spec = workerSpecForUid(uid)
  if (!spec) return uid

  for (const email of spec.emails) {
    const hit = directory.find(
      (u) =>
        u.role === 'executor' &&
        normalizedEmail(u.email ?? '') === normalizedEmail(email) &&
        !isDemoWorkerId(u.id),
    )
    if (hit) return hit.id
  }

  for (const email of spec.emails) {
    const hit = directory.find(
      (u) => normalizedEmail(u.email ?? '') === normalizedEmail(email),
    )
    if (hit && !isDemoWorkerId(hit.id)) return hit.id
  }

  return uid
}

export function resolveExecutorRows(
  executors: PermitDraft['executors'],
  directory: DemoUser[],
): PermitDraft['executors'] {
  return executors.map((ex) => ({
    ...ex,
    userUid: resolveWorkerUid(directory, ex.userUid),
  }))
}
