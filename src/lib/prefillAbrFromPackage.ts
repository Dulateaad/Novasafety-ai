import { PERFORMER_DOCUMENT_ROLE_LABEL } from '../config/branding'
import type { PermitDraft } from '../types/domain'
import type { AbrForm } from '../types/abr'
import type { PprForm } from '../types/ppr'
import {
  ndprApprovalPeopleFromNd,
  type NdprApprovalSource,
} from './ndprApprovalPeople'

export type AbrNdPeopleSource = Pick<
  PermitDraft,
  | 'executors'
  | 'performerUid'
  | 'permitterUid'
  | 'issuerUid'
  | 'leadExpertUid'
  | 'f02'
  | 'registrationRefNo'
>

/** Шапка АБР из ППР и черновика НДПР (наряд, дата, смена). */
export function prefillAbrHeaderFromPprNd(
  ppr: PprForm,
  nd?: Pick<PermitDraft, 'registrationRefNo' | 'f02'> | null,
): Pick<
  AbrForm,
  'workLocation' | 'permitNo' | 'dateIso' | 'shiftDay' | 'shiftNight' | 'jobDescription'
> {
  const permitNo =
    nd?.registrationRefNo?.trim() || nd?.f02?.badgeNo?.trim() || ''
  const dateIso =
    ppr.periodStart ||
    nd?.f02?.startDate?.slice(0, 10) ||
    ppr.preparationDateIso ||
    new Date().toISOString().slice(0, 10)
  const shift = nd?.f02?.shift ?? ''
  const location = [ppr.siteName, ppr.workArea].filter((s) => s.trim()).join(', ')

  return {
    workLocation: location || ppr.siteName,
    permitNo,
    dateIso,
    shiftDay: shift !== 'night',
    shiftNight: shift === 'night',
    jobDescription: ppr.workTitle.trim() || ppr.workDescription.trim(),
  }
}

/** ФИО и роли в конце АБР — из черновика НДПР (4 участника согласования). */
export function prefillAbrPeopleFromNd(
  nd: AbrNdPeopleSource | null | undefined,
  resolveName: (uid: string) => string,
  resolveBadge?: (uid: string) => string,
): Pick<
  AbrForm,
  'crewAcknowledgments' | 'workSupervisor' | 'areaPermitter' | 'approvalSigners'
> {
  const badgeFor = (uid: string) =>
    resolveBadge?.(uid)?.trim() ||
    nd?.f02?.badgeNo?.trim() ||
    nd?.registrationRefNo?.trim() ||
    ''

  const crewAcknowledgments = (nd?.executors ?? [])
    .filter((ex) => ex.userUid.trim())
    .map((ex) => ({
      fullName: resolveName(ex.userUid),
      badgeNo: badgeFor(ex.userUid),
      roleLabel: 'Работник',
    }))

  const approvalSigners = ndprApprovalPeopleFromNd(
    nd as NdprApprovalSource | null | undefined,
    resolveName,
    resolveBadge,
  )

  return {
    crewAcknowledgments,
    approvalSigners,
    workSupervisor: approvalSigners[0] ?? {
      fullName: '',
      badgeNo: '',
      roleLabel: PERFORMER_DOCUMENT_ROLE_LABEL,
    },
    areaPermitter: {
      ...(approvalSigners[1] ?? {
        fullName: '',
        badgeNo: '',
        roleLabel: 'Допускающий',
      }),
      roleLabel: 'Ежедневная проверка Допускающий на участке',
    },
  }
}

/** Актуальные поля шапки АБР из ППР и НДПР (наряд, дата, смена, место, описание). */
export function applyAbrHeaderFromPprNd(
  abr: AbrForm,
  ppr: PprForm,
  nd?: Pick<PermitDraft, 'registrationRefNo' | 'f02'> | null,
): AbrForm {
  return { ...abr, ...prefillAbrHeaderFromPprNd(ppr, nd) }
}

function mergeNamedPerson(
  current: AbrForm['workSupervisor'],
  fresh: AbrForm['workSupervisor'],
  roleLabel: string,
): AbrForm['workSupervisor'] {
  return {
    roleLabel,
    fullName: current.fullName.trim() || fresh.fullName,
    badgeNo: current.badgeNo.trim() || fresh.badgeNo,
  }
}

/** Подставляет людей из НДПР, если в АБР ещё пусто. */
export function mergeAbrPeopleFromNd(
  abr: AbrForm,
  nd: AbrNdPeopleSource | null | undefined,
  resolveName: (uid: string) => string,
  resolveBadge?: (uid: string) => string,
): AbrForm {
  const fresh = prefillAbrPeopleFromNd(nd, resolveName, resolveBadge)
  const approvalSigners = fresh.approvalSigners.map((person, i) => {
    const current = abr.approvalSigners[i]
    if (!current) return person
    return {
      roleLabel: person.roleLabel,
      fullName: current.fullName.trim() || person.fullName,
      badgeNo: current.badgeNo.trim() || person.badgeNo,
    }
  })
  return {
    ...abr,
    crewAcknowledgments: abr.crewAcknowledgments.some((p) => p.fullName.trim())
      ? abr.crewAcknowledgments
      : fresh.crewAcknowledgments,
    approvalSigners,
    workSupervisor: mergeNamedPerson(
      abr.workSupervisor,
      fresh.workSupervisor,
      PERFORMER_DOCUMENT_ROLE_LABEL,
    ),
    areaPermitter: mergeNamedPerson(
      abr.areaPermitter,
      fresh.areaPermitter,
      'Ежедневная проверка Допускающий на участке',
    ),
  }
}
