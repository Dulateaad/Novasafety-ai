import type { DemoUser, Permit } from '../types/domain'
import { isExecutorCrewAckDone } from './crewAckComplete'

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
      const abrPerson = abrCrew[i]
      const sig = permit.crewAckSignatures?.[uid]
      return {
        id: ex.id,
        userUid: uid,
        fullName:
          abrPerson?.fullName.trim() ||
          resolveUser(uid)?.displayName?.trim() ||
          uid,
        badgeNo: abrPerson?.badgeNo.trim() || '',
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
      fullName: c.fullName.trim(),
      badgeNo: c.badgeNo.trim(),
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
      fullName: r.fullNamePrinted.trim(),
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
      fullName: resolveUser(ex.userUid)?.displayName?.trim() || ex.userUid,
      badgeNo: '',
      dateIso: ex.dateIso,
      acknowledged: ex.briefingAcknowledged,
      roleLabel: 'Работник',
    }))
}
