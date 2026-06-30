import type { DemoUser, PermitDraft, UserRole } from '../types/domain'
import type { NdprApprovalSource } from '../lib/ndprApprovalPeople'

export type NdprParticipantSlot = 'performer' | 'permitter' | 'issuer' | 'leadExpert'

export type DefaultSignerSpec = {
  slot: NdprParticipantSlot
  displayName: string
  emails: string[]
  demoIds: string[]
  roles: UserRole[]
  namePatterns?: RegExp[]
  iin?: string
}

/** Дополнительные производители работ (не подставляются в слот по умолчанию). */
export const ADDITIONAL_NDPR_PERFORMERS: DefaultSignerSpec[] = [
  {
    slot: 'performer',
    displayName: 'Нурхан Каниев',
    emails: ['nurkhan@nova.local'],
    demoIds: ['u-performer-nurkhan'],
    roles: ['performer'],
    namePatterns: [/нурхан/i, /каниев/i],
  },
]

/** Стандартные подписанты НДПР после загрузки ППР. */
export const DEFAULT_NDPR_SIGNERS: DefaultSignerSpec[] = [
  {
    slot: 'performer',
    displayName: 'Абылай Акмалиев',
    emails: ['abylay2@nova.local', 'abylay@nova.local'],
    demoIds: ['u-performer-abylay', 'u-performer-6'],
    roles: ['performer'],
    namePatterns: [/акмали/i, /абылай/i],
  },
  {
    slot: 'permitter',
    displayName: 'Ибат Габитжан',
    emails: ['permitter@nova.local'],
    demoIds: ['u-permitter'],
    roles: ['permitter', 'coordinator'],
    namePatterns: [/ибат/i, /габитжан/i],
  },
  {
    slot: 'issuer',
    displayName: 'Темирлан Усеинов',
    emails: ['temirlan@nova.local'],
    demoIds: ['u-issuer-temirlan'],
    roles: ['issuer'],
    namePatterns: [/темирлан/i, /усеинов/i, /уахитов/i],
  },
  {
    slot: 'leadExpert',
    displayName: 'Али Зайнуллин',
    emails: ['lead@nova.local'],
    demoIds: ['u-lead'],
    roles: ['leadExpert'],
    namePatterns: [/зайнуллин/i],
  },
]

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase()
}

function withProfileDefaults(user: DemoUser, spec: DefaultSignerSpec): DemoUser {
  return {
    ...user,
    displayName: spec.displayName,
    iin: user.iin ?? spec.iin,
  }
}

function matchesNamePatterns(displayName: string, patterns?: RegExp[]): boolean {
  if (!patterns?.length) return false
  const text = displayName.trim()
  if (!text) return false
  return patterns.some((pattern) => pattern.test(text))
}

function findUserForSpec(
  directory: DemoUser[],
  spec: DefaultSignerSpec,
): DemoUser | undefined {
  const byEmail = new Map(
    directory.map((u) => [normalizedEmail(u.email ?? ''), u]),
  )
  for (const email of spec.emails) {
    const hit = byEmail.get(normalizedEmail(email))
    if (hit) return withProfileDefaults(hit, spec)
  }
  for (const id of spec.demoIds) {
    const hit = directory.find((u) => u.id === id)
    if (hit) return withProfileDefaults(hit, spec)
  }
  for (const user of directory) {
    if (matchesNamePatterns(user.displayName, spec.namePatterns)) {
      return withProfileDefaults(user, spec)
    }
  }
  return undefined
}

/** UID подписанта: только если роль совпадает, иначе — шаблон по умолчанию. */
export function resolveNdprSignerUid(
  directory: DemoUser[],
  slot: NdprParticipantSlot,
  draftUid?: string,
): string {
  const enriched = enrichUserDirectoryWithDefaultSigners(directory)
  const spec = DEFAULT_NDPR_SIGNERS.find((s) => s.slot === slot)!
  const fallback =
    findUserForSpec(enriched, spec)?.id ??
    enriched.find((u) => u.id === `default-${slot}`)?.id ??
    ''
  const uid = draftUid?.trim() ?? ''
  if (!uid) return fallback
  const user = enriched.find((u) => u.id === uid)
  if (!user || !spec.roles.includes(user.role)) return fallback
  if (slot === 'performer' && user.role === 'executor') return fallback
  return uid
}

export function sanitizeNdprApprovalUids(
  nd: NdprApprovalSource,
  directory: DemoUser[],
): NdprApprovalSource {
  return {
    ...nd,
    performerUid: resolveNdprSignerUid(directory, 'performer', nd?.performerUid),
    permitterUid: resolveNdprSignerUid(directory, 'permitter', nd?.permitterUid),
    issuerUid: resolveNdprSignerUid(directory, 'issuer', nd?.issuerUid),
    leadExpertUid: resolveNdprSignerUid(directory, 'leadExpert', nd?.leadExpertUid),
  }
}

export function enrichUserDirectoryWithDefaultSigners(
  directory: DemoUser[],
): DemoUser[] {
  const patched = directory.map((user) => {
    const spec =
      DEFAULT_NDPR_SIGNERS.find(
        (s) =>
          s.emails.some(
            (email) => normalizedEmail(email) === normalizedEmail(user.email ?? ''),
          ) ||
          s.demoIds.includes(user.id) ||
          matchesNamePatterns(user.displayName, s.namePatterns),
      ) ??
      ADDITIONAL_NDPR_PERFORMERS.find(
        (s) =>
          s.emails.some(
            (email) => normalizedEmail(email) === normalizedEmail(user.email ?? ''),
          ) ||
          s.demoIds.includes(user.id) ||
          matchesNamePatterns(user.displayName, s.namePatterns),
      )
    return spec ? withProfileDefaults(user, spec) : user
  })

  for (const spec of DEFAULT_NDPR_SIGNERS) {
    if (findUserForSpec(patched, spec)) continue
    patched.push({
      id: `default-${spec.slot}`,
      displayName: spec.displayName,
      email: spec.emails[0] ?? '',
      role: spec.roles[0],
      badgeNo: '',
      iin: spec.iin,
    })
  }

  for (const spec of ADDITIONAL_NDPR_PERFORMERS) {
    if (findUserForSpec(patched, spec)) continue
    patched.push({
      id: spec.demoIds[0] ?? `default-${spec.slot}-extra`,
      displayName: spec.displayName,
      email: spec.emails[0] ?? '',
      role: spec.roles[0],
      badgeNo: '',
      iin: spec.iin,
    })
  }

  return patched
}

export function resolveDefaultErtUid(directory: DemoUser[]): string {
  const enriched = enrichUserDirectoryWithDefaultSigners(directory)
  const ert = enriched.find((u) => u.role === 'ert')
  return ert?.id ?? 'u-ert'
}

export function resolveErtSignerUid(
  directory: DemoUser[],
  draftUid?: string,
): string {
  const fallback = resolveDefaultErtUid(directory)
  const uid = draftUid?.trim() ?? ''
  if (!uid) return fallback
  const user = directory.find((u) => u.id === uid)
  if (!user || user.role !== 'ert') return fallback
  return uid
}

export function resolveDefaultNdprParticipantUids(
  directory: DemoUser[],
): Pick<
  PermitDraft,
  'performerUid' | 'permitterUid' | 'issuerUid' | 'leadExpertUid' | 'ertUid'
> {
  const enriched = enrichUserDirectoryWithDefaultSigners(directory)
  const pick = (slot: NdprParticipantSlot) => {
    const spec = DEFAULT_NDPR_SIGNERS.find((s) => s.slot === slot)!
    const user = findUserForSpec(enriched, spec)
    return user?.id ?? enriched.find((u) => u.id === `default-${slot}`)?.id ?? ''
  }

  return {
    performerUid: pick('performer'),
    permitterUid: pick('permitter'),
    issuerUid: pick('issuer'),
    leadExpertUid: pick('leadExpert'),
    ertUid: resolveDefaultErtUid(enriched),
  }
}
