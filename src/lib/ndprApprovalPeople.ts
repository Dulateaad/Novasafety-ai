import type { AbrNamedPerson } from '../types/abr'
import { emptyAbrNamedPerson } from '../types/abr'
import type { AsorForm, AsorNeboshSignatureRow } from '../types/asor'
import type { PermitDraft } from '../types/domain'

export const NDPR_APPROVAL_ROLE_LABELS = [
  'Производитель работ',
  'Допускающий',
  'Выдающий НД',
  'Утверждающий НД',
] as const

export type NdprApprovalSource = Pick<
  PermitDraft,
  | 'performerUid'
  | 'permitterUid'
  | 'issuerUid'
  | 'leadExpertUid'
  | 'f02'
  | 'registrationRefNo'
>

const NDPR_APPROVAL_UID_KEYS: (keyof NdprApprovalSource)[] = [
  'performerUid',
  'permitterUid',
  'issuerUid',
  'leadExpertUid',
]

export function ndprApprovalPeopleFromNd(
  nd: NdprApprovalSource | null | undefined,
  resolveName: (uid: string) => string,
  resolveBadge?: (uid: string) => string,
): AbrNamedPerson[] {
  const fallbackBadge =
    nd?.f02?.badgeNo?.trim() || nd?.registrationRefNo?.trim() || ''
  const badgeFor = (uid: string) =>
    resolveBadge?.(uid)?.trim() || fallbackBadge

  return NDPR_APPROVAL_ROLE_LABELS.map((roleLabel, i) => {
    const uid = String(nd?.[NDPR_APPROVAL_UID_KEYS[i]] ?? '').trim()
    return {
      fullName: uid ? resolveName(uid).trim() : '',
      badgeNo: uid ? badgeFor(uid) : '',
      roleLabel,
    }
  })
}

export function ndprApprovalSignatureRows(
  nd: NdprApprovalSource | null | undefined,
  resolveName: (uid: string) => string,
  dateIso?: string,
): AsorNeboshSignatureRow[] {
  const date =
    dateIso?.trim() ||
    nd?.f02?.startDate?.slice(0, 10) ||
    new Date().toISOString().slice(0, 10)
  return ndprApprovalPeopleFromNd(nd, resolveName).map((person) => ({
    role: person.roleLabel,
    fullName: person.fullName,
    dateIso: date,
  }))
}

export function emptyNdprApprovalPeople(): AbrNamedPerson[] {
  return NDPR_APPROVAL_ROLE_LABELS.map((roleLabel) => ({
    ...emptyAbrNamedPerson(),
    roleLabel,
  }))
}

/** Подставляет подписантов оценки риска из полей НДПР, если в форме ещё пусто. */
export function mergeNeboshApprovalPeopleFromNd(
  asor: AsorForm,
  permit: NdprApprovalSource,
  resolveName: (uid: string) => string,
  resolveBadge?: (uid: string) => string,
): AsorForm {
  const people = ndprApprovalPeopleFromNd(permit, resolveName, resolveBadge)
  const rows = ndprApprovalSignatureRows(
    permit,
    resolveName,
    asor.nebosh.assessmentDateIso,
  )
  return {
    ...asor,
    nebosh: {
      ...asor.nebosh,
      signatureRows:
        asor.nebosh.signatureRows.length > 0 ? asor.nebosh.signatureRows : rows,
      preparedBy: asor.nebosh.preparedBy.trim() || people[0]?.fullName || '',
      approvedBy:
        asor.nebosh.approvedBy.trim() ||
        people[3]?.fullName ||
        people[2]?.fullName ||
        '',
    },
  }
}
