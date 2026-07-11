import {
  DEFAULT_NDPR_SIGNERS,
  enrichUserDirectoryWithDefaultSigners,
} from '../config/defaultNdprSigners'
import {
  DEFAULT_WORKERS,
  enrichUserDirectoryWithDefaultWorkers,
} from '../config/defaultWorkers'
import type { DemoUser } from '../types/domain'

const RAW_ID_RE =
  /^[A-Za-z0-9_-]{18,}$|^w-worker-\d+$|^default-(performer|permitter|issuer|leadExpert|worker)/

export function enrichParticipantDirectory(directory: DemoUser[]): DemoUser[] {
  return enrichUserDirectoryWithDefaultWorkers(
    enrichUserDirectoryWithDefaultSigners(directory),
  )
}

export function looksLikeRawPersonId(text: string): boolean {
  return RAW_ID_RE.test(text.trim())
}

function workerSpecByUid(uid: string, directory: DemoUser[]): (typeof DEFAULT_WORKERS)[number] | undefined {
  const enriched = enrichParticipantDirectory(directory)
  const user = enriched.find((u) => u.id === uid)
  if (!user) {
    return DEFAULT_WORKERS.find((spec) => spec.demoIds.includes(uid))
  }
  return DEFAULT_WORKERS.find(
    (spec) =>
      spec.demoIds.includes(user.id) ||
      spec.emails.some(
        (email) => email.toLowerCase() === (user.email ?? '').trim().toLowerCase(),
      ) ||
      spec.namePatterns?.some((pattern) => pattern.test(user.displayName)),
  )
}

/** ФИО из справочника; без сырого Firebase UID в PDF. */
export function resolveDisplayNameForUid(
  uid: string,
  directory: DemoUser[],
  fallback?: (id: string) => string,
): string {
  const trimmed = uid.trim()
  if (!trimmed) return ''

  const enriched = enrichParticipantDirectory(directory)
  const user = enriched.find((u) => u.id === trimmed)
  if (user?.displayName.trim()) return user.displayName.trim()

  const workerSpec = workerSpecByUid(trimmed, directory)
  if (workerSpec) return workerSpec.displayName

  const signerSpec = DEFAULT_NDPR_SIGNERS.find(
    (spec) =>
      spec.demoIds.includes(trimmed) ||
      spec.emails.some(
        (email) => email.toLowerCase() === (user?.email ?? '').trim().toLowerCase(),
      ),
  )
  if (signerSpec) return signerSpec.displayName

  const fromFallback = fallback?.(trimmed)?.trim() ?? ''
  if (fromFallback && !looksLikeRawPersonId(fromFallback)) return fromFallback

  return ''
}
