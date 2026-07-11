import type { DemoUser, Permit } from '../types/domain'
import { isExecutorCrewAckDone, crewAckSignerDisplayName } from './crewAckComplete'
import { resolveExecutorDisplayName } from './abrDailyAck'
import { resolveUserBadgeNo } from './userBadgeNumbers'

export type PermitCrewRow = {
  id: string
  userUid: string
  fullName: string
  badgeNo: string
  dateIso: string
  acknowledged: boolean
  roleLabel: string
}

export function permitToolsAndEquipment(permit: Permit): string {
  return (
    permit.toolsAndEquipment?.trim() ||
    permit.ppr?.toolsAndEquipment?.trim() ||
    permit.asor?.equipmentMarkdown?.trim() ||
    ''
  )
}

/** Технический id учётной записи (Firebase uid, worker-N), не ФИО. */
export function isOpaqueAccountId(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/^worker-\d+$/i.test(t)) return true
  return /^[A-Za-z0-9]{20,}$/.test(t) && !/\s/.test(t)
}

function pickHumanExecutorName(...candidates: (string | undefined | null)[]): string {
  for (const c of candidates) {
    const t = c?.trim()
    if (!t || isOpaqueAccountId(t)) continue
    return t
  }
  return '—'
}

function permitRegistrationRef(permit: Permit): string {
  return permit.registrationRefNo?.trim() || permit.f02?.badgeNo?.trim() || ''
}

function crewBadgeNo(
  permit: Permit,
  uid: string,
  abrBadge: string,
  directory: DemoUser[],
): string {
  const fromDirectory = directory.length > 0 ? resolveUserBadgeNo(uid, directory) : ''
  const permitRef = permitRegistrationRef(permit)
  const candidates = [fromDirectory, abrBadge.trim()].filter(Boolean)
  for (const badge of candidates) {
    if (badge !== permitRef) return badge
  }
  return ''
}

function crewNameMatchesExecutor(
  permit: Permit,
  crewName: string,
  executorUid: string,
  directory: DemoUser[],
  resolveUser: (uid: string) => DemoUser | undefined,
): boolean {
  const text = crewName.trim()
  if (!text || isOpaqueAccountId(text)) return false
  const labels = [
    resolveUser(executorUid)?.displayName?.trim(),
    resolveExecutorDisplayName(executorUid, directory),
    crewAckSignerDisplayName(permit, executorUid, directory),
  ].filter(Boolean) as string[]
  const lower = text.toLowerCase()
  return labels.some((label) => {
    const l = label.toLowerCase()
    return l === lower || l.includes(lower) || lower.includes(l)
  })
}

function abrCrewPersonAt(
  permit: Permit,
  abrCrew: { fullName: string; badgeNo: string; roleLabel: string }[],
  index: number,
  uid: string,
  directory: DemoUser[],
  resolveUser: (uid: string) => DemoUser | undefined,
) {
  const byIndex = abrCrew[index]
  if (byIndex?.fullName.trim() && !isOpaqueAccountId(byIndex.fullName)) {
    return byIndex
  }
  return abrCrew.find((c) =>
    crewNameMatchesExecutor(permit, c.fullName, uid, directory, resolveUser),
  )
}

/** Бригада для ознакомления с АБР: executors НДПР + ФИО из АБР + статус ЭЦП. */
export function buildPermitCrewRows(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): PermitCrewRow[] {
  const abrCrew =
    permit.asor?.abr?.crewAcknowledgments?.filter((c) => c.fullName.trim()) ?? []

  const executorsWithUid = permit.executors.filter((ex) => ex.userUid.trim())
  if (executorsWithUid.length > 0) {
    return executorsWithUid.map((ex, i) => {
      const uid = ex.userUid.trim()
      const abrPerson = abrCrewPersonAt(permit, abrCrew, i, uid, directory, resolveUser)
      const sig = permit.crewAckSignatures?.[uid]
      return {
        id: ex.id,
        userUid: uid,
        fullName: pickHumanExecutorName(
          resolveExecutorDisplayName(uid, directory),
          crewAckSignerDisplayName(permit, uid, directory),
          abrPerson?.fullName,
          resolveUser(uid)?.displayName,
        ),
        badgeNo: crewBadgeNo(permit, uid, abrPerson?.badgeNo ?? '', directory),
        dateIso: sig?.signedAtIso
          ? new Date(sig.signedAtIso).toLocaleString('ru-RU')
          : ex.dateIso,
        acknowledged: isExecutorCrewAckDone(permit, uid, directory),
        roleLabel: abrPerson?.roleLabel.trim() || 'Работник',
      }
    })
  }

  if (abrCrew.length > 0) {
    return abrCrew.map((c, i) => ({
      id: `abr-${i}`,
      userUid: permit.executors[i]?.userUid.trim() ?? '',
      fullName: pickHumanExecutorName(c.fullName.trim()),
      badgeNo: crewBadgeNo(
        permit,
        permit.executors[i]?.userUid.trim() ?? '',
        c.badgeNo.trim(),
        directory,
      ),
      dateIso: '',
      acknowledged: false,
      roleLabel: c.roleLabel.trim() || 'Работник',
    }))
  }

  const teamRows =
    permit.asor?.declarationTeamRows.filter((r) => r.fullNamePrinted.trim()) ?? []
  if (teamRows.length > 0) {
    return teamRows.map((r) => ({
      id: r.id,
      userUid: '',
      fullName: pickHumanExecutorName(r.fullNamePrinted.trim()),
      badgeNo: r.badgeNo.trim(),
      dateIso: r.dateIso,
      acknowledged: r.signatureAcknowledged,
      roleLabel: r.rolePrinted.trim() || 'Работник',
    }))
  }

  return permit.executors
    .filter((ex) => ex.userUid.trim())
    .map((ex) => ({
      id: ex.id,
      userUid: ex.userUid,
      fullName: pickHumanExecutorName(
        resolveExecutorDisplayName(ex.userUid, directory),
        resolveUser(ex.userUid)?.displayName,
      ),
      badgeNo: crewBadgeNo(permit, ex.userUid, '', directory),
      dateIso: ex.dateIso,
      acknowledged: ex.briefingAcknowledged,
      roleLabel: 'Работник',
    }))
}
