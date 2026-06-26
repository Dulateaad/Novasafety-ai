import type { DemoUser, PermitDraft, UserRole } from '../types/domain'
import { emptyPermitDraft } from '../uog/permitDefaults'

function pickUid(directory: DemoUser[], roles: UserRole[]): string {
  const hit = directory.find((u) => roles.includes(u.role))
  return hit?.id ?? ''
}

/** Подставляет реальные Firebase UID из справочника users вместо демо-id. */
export function draftFromDirectory(directory: DemoUser[]): PermitDraft {
  const base = emptyPermitDraft()
  if (directory.length === 0) return base

  const issuerUid = pickUid(directory, ['issuer']) || pickUid(directory, ['coordinator'])
  const permitterUid =
    pickUid(directory, ['permitter']) || pickUid(directory, ['coordinator'])
  const performerUid =
    pickUid(directory, ['performer', 'contractor']) ||
    pickUid(directory, ['coordinator'])
  const leadExpertUid =
    pickUid(directory, ['leadExpert']) || pickUid(directory, ['coordinator'])

  return {
    ...base,
    issuerUid,
    permitterUid,
    performerUid,
    leadExpertUid,
  }
}

/** Заменяет демо-id (u-issuer и т.п.) на uid из каталога, если они ещё в черновике. */
export function remapDemoUidsInDraft(
  draft: PermitDraft,
  directory: DemoUser[],
): PermitDraft {
  if (directory.length === 0) return draft
  const defaults = draftFromDirectory(directory)
  const isDemo = (id: string) => id.startsWith('u-')

  return {
    ...draft,
    issuerUid: isDemo(draft.issuerUid) ? defaults.issuerUid : draft.issuerUid,
    permitterUid: isDemo(draft.permitterUid)
      ? defaults.permitterUid
      : draft.permitterUid,
    performerUid: isDemo(draft.performerUid)
      ? defaults.performerUid
      : draft.performerUid,
    leadExpertUid: isDemo(draft.leadExpertUid)
      ? defaults.leadExpertUid
      : draft.leadExpertUid,
    executors: draft.executors.map((ex) =>
      ex.userUid && isDemo(ex.userUid)
        ? {
            ...ex,
            userUid:
              pickUid(directory, ['executor']) ||
              pickUid(directory, ['coordinator']) ||
              ex.userUid,
          }
        : ex,
    ),
  }
}
