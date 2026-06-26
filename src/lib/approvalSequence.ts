import { assigneeUidForRole } from './signatureStatus'
import type { AsorForm } from '../types/asor'
import { defaultApprovalRows } from '../types/asor'
import type { AsorApprovalRow } from '../types/asor'
import type { Permit, PermitDraft } from '../types/domain'
import type { EgovSignRole, StoredEgovSignature } from '../types/egovSignature'
import {
  buildPdfSignatureStatusCell,
  buildPdfSignatureColumnHeader,
  isPdfEgovSigned,
  PDF_EGOV_SIG_COLORS,
  pdfSignaturePlainText,
} from './pdfEgovSignatureCell'
import { allCrewAcknowledged, crewAckGateMessage } from './crewAckComplete'
import { isRoleSigned } from './signatureStatus'
import { permitRequiresErtApproval } from './fireWorkApproval'
import { localeMessages, fillTemplate } from '../i18n/getLocale'

const CORE_SIGNING_ORDER: EgovSignRole[] = [
  'performer',
  'issuer',
  'permitter',
  'leadExpert',
]

/** Очередь подписания ЭЦП: производитель → [ERT при огневых] → выдающий → допускающий → утверждающий. */
export function signingRoleOrder(
  permit: Pick<Permit, 'specialWorkActivities' | 'specialWorkActivity' | 'permitType'>,
): EgovSignRole[] {
  if (permitRequiresErtApproval(permit)) {
    return ['performer', 'ert', 'issuer', 'permitter', 'leadExpert']
  }
  return [...CORE_SIGNING_ORDER]
}

/** @deprecated Используйте signingRoleOrder(permit) */
export const SIGNING_ROLE_ORDER: EgovSignRole[] = [...CORE_SIGNING_ORDER]

/** Согласующие после производителя (без ERT). */
export const APPROVER_SIGNING_ROLES: EgovSignRole[] = [
  'issuer',
  'permitter',
  'leadExpert',
]

/** Согласующие после бригады с учётом ERT для огневых работ. */
export function approverSigningRoles(
  permit: Pick<Permit, 'specialWorkActivities' | 'specialWorkActivity' | 'permitType'>,
): EgovSignRole[] {
  if (permitRequiresErtApproval(permit)) {
    return ['ert', 'issuer', 'permitter', 'leadExpert']
  }
  return [...APPROVER_SIGNING_ROLES]
}

/** Порядок строк в бланке PR-007 (п. 10.1 → 10.4) и в ASOR. */
export const DOCUMENT_APPROVAL_ROLE_ORDER: EgovSignRole[] = [
  'permitter',
  'issuer',
  'performer',
  'leadExpert',
]

/** @deprecated Используйте SIGNING_ROLE_ORDER или DOCUMENT_APPROVAL_ROLE_ORDER */
export const APPROVAL_ROLE_ORDER = SIGNING_ROLE_ORDER

const ROLE_TO_APPROVAL_INDEX: Partial<Record<EgovSignRole, number>> = {
  permitter: 0,
  issuer: 1,
  performer: 2,
  leadExpert: 3,
}

export function approvalIndexForRole(role: EgovSignRole): number {
  return ROLE_TO_APPROVAL_INDEX[role] ?? -1
}

/** Роли, обязательные для выдачи наряда. */
export function requiredSignRoles(permit: Permit): EgovSignRole[] {
  return signingRoleOrder(permit)
}

/** Производитель подписал, но бригада ещё не ознакомилась — блокируем согласующих. */
export function isCrewAckPhaseActive(permit: Permit): boolean {
  if (permit.status !== 'on_approval') return false
  if (!isRoleSigned(permit, 'performer')) return false
  return !allCrewAcknowledged(permit)
}

export function signingQueueBlockedReason(permit: Permit): string | null {
  if (!isCrewAckPhaseActive(permit)) return null
  return crewAckGateMessage(permit) ?? localeMessages().signing.crewBlocked
}

export function nextRoleToSign(permit: Permit): EgovSignRole | null {
  if (permit.status !== 'on_approval') return null
  if (!isRoleSigned(permit, 'performer')) return 'performer'
  if (!allCrewAcknowledged(permit)) return null
  for (const role of requiredSignRoles(permit)) {
    if (role === 'performer') continue
    if (!isRoleSigned(permit, role)) return role
  }
  return null
}

export function canSignRoleNow(permit: Permit, role: EgovSignRole): boolean {
  if (permit.status !== 'on_approval') return false
  if (isRoleSigned(permit, role)) return false
  if (!requiredSignRoles(permit).includes(role)) return false
  return nextRoleToSign(permit) === role
}

export function pdfApprovalRoleLabel(role: EgovSignRole): string {
  const s = localeMessages().signing
  const pdfLabels: Record<EgovSignRole, string> = {
    performer: `FILLED WP — ${s.caption.performer}`,
    permitter: `APPROVED — ${s.caption.permitter}`,
    issuer: `ISSUED — ${s.caption.issuer}`,
    leadExpert: `AUTHORIZED — ${s.caption.leadExpert}`,
    ert: `ERT APPROVED — ${s.caption.ert}`,
  }
  return pdfLabels[role]
}

function signingActionLabel(role: EgovSignRole): string {
  return localeMessages().signing.action[role]
}

function signingRoleCaption(role: EgovSignRole): string {
  return localeMessages().signing.caption[role]
}

/** @deprecated use localeMessages().signing.action */
export const SIGNING_ACTION_LABEL: Record<EgovSignRole, string> = {
  performer: 'Заполнил НДПР',
  permitter: 'Допустил',
  issuer: 'Выдал',
  leadExpert: 'Утвердил',
  ert: 'Согласовал (ERT)',
}

/** Имя без суффикса роли («Абылай — производитель работ» → «Абылай»). */
export function signerShortName(displayName: string | undefined): string {
  const raw = displayName?.trim()
  if (!raw) return '—'
  const dash = raw.indexOf(' — ')
  if (dash === -1) return raw
  return raw.slice(0, dash).trim() || raw
}

export function signingStepNumber(
  role: EgovSignRole,
  permit?: Pick<Permit, 'specialWorkActivities' | 'specialWorkActivity' | 'permitType'>,
): number {
  const order = permit ? signingRoleOrder(permit) : SIGNING_ROLE_ORDER
  const i = order.indexOf(role)
  return i >= 0 ? i + 1 : 1
}

export function approvalStepLabel(
  role: EgovSignRole,
  permit?: Permit,
  resolveUser?: (uid: string) => { displayName: string } | undefined,
): string {
  const n = signingStepNumber(role, permit)

  const name = permit
    ? signerShortName(resolveUser?.(assigneeUidForRole(permit, role))?.displayName)
    : '—'

  const action = signingActionLabel(role)

  return `${localeMessages().signing.stepPrefix} ${n}: ${action} — ${name} — ${signingRoleCaption(role)}`
}

/** Краткая очередь с ФИО для блока согласования (всегда 4 участника). */
export function approvalQueueSummary(
  permit: Permit,
  resolveUser?: (uid: string) => { displayName: string } | undefined,
): string {
  return signingRoleOrder(permit).map((role, i) => {
    const name = signerShortName(
      resolveUser?.(assigneeUidForRole(permit, role))?.displayName,
    )
    const action = signingActionLabel(role)
    return `${i + 1}. ${action} — ${name}`
  }).join(' → ')
}

export function waitingHint(
  permit: Permit,
  role: EgovSignRole,
  resolveUser?: (uid: string) => { displayName: string } | undefined,
): string | null {
  if (isRoleSigned(permit, role)) return null
  const crewBlock = signingQueueBlockedReason(permit)
  if (crewBlock && role !== 'performer') return crewBlock
  const next = nextRoleToSign(permit)
  if (!next) return crewBlock
  if (next === role) return null
  return fillTemplate(localeMessages().signing.waitingFirst, {
    step: approvalStepLabel(next, permit, resolveUser),
  })
}

export function patchAsorApprovalRow(
  approvals: AsorApprovalRow[],
  role: EgovSignRole,
  input: {
    fullNamePrinted: string
    badgeNo?: string
    signedAtIso: string
  },
): AsorApprovalRow[] {
  const idx = approvalIndexForRole(role)
  if (idx < 0 || !approvals[idx]) return approvals
  return approvals.map((row, i) =>
    i === idx
      ? {
          ...row,
          fullNamePrinted: input.fullNamePrinted.trim() || row.fullNamePrinted,
          badgeNo: input.badgeNo?.trim() || row.badgeNo,
          dateIso: input.signedAtIso.slice(0, 10),
          acknowledged: true,
        }
      : row,
  )
}

function performerUidForRole(permit: Permit, role: EgovSignRole): string {
  switch (role) {
    case 'performer':
      return permit.performerUid
    case 'permitter':
      return permit.permitterUid
    case 'issuer':
      return permit.issuerUid
    case 'leadExpert':
      return permit.leadExpertUid
    case 'ert':
      return permit.ertUid ?? ''
    default:
      return ''
  }
}

export function mergePermitAfterEgovSign(
  permit: Permit,
  role: EgovSignRole,
  sig: StoredEgovSignature,
  resolveBadge?: (uid: string) => string,
): Pick<Permit, 'egovSignatures' | 'signatures' | 'asor'> {
  const flagKey =
    role === 'performer'
      ? 'performerSigned'
      : role === 'permitter'
        ? 'permitterSigned'
        : role === 'issuer'
          ? 'issuerSigned'
          : role === 'ert'
            ? 'ertSigned'
            : 'leadExpertSigned'

  const badge =
    resolveBadge?.(performerUidForRole(permit, role)) ||
    permit.f02?.badgeNo?.trim() ||
    permit.registrationRefNo?.trim() ||
    ''

  const asor =
    role === 'ert' || !permit.asor
      ? permit.asor
      : {
          ...permit.asor,
          approvals: patchAsorApprovalRow(permit.asor.approvals, role, {
            fullNamePrinted: sig.signedByDisplayName,
            badgeNo: badge,
            signedAtIso: sig.signedAtIso,
          }),
        }

  return {
    egovSignatures: { ...permit.egovSignatures, [role]: sig },
    signatures: { ...permit.signatures, [flagKey]: true },
    asor,
  }
}

/** ФИО согласующих из карточки наряда (до ЭЦП). */
export function seedApprovalNamesFromPermit(
  asor: AsorForm,
  permit: Pick<
    PermitDraft,
    'performerUid' | 'permitterUid' | 'issuerUid' | 'leadExpertUid' | 'f02' | 'registrationRefNo'
  >,
  resolveUser: (uid: string) => { displayName: string } | undefined,
  resolveBadge?: (uid: string) => string,
): AsorForm {
  const fallbackBadge =
    permit.f02?.badgeNo?.trim() || permit.registrationRefNo?.trim() || ''
  const badgeFor = (uid: string) =>
    resolveBadge?.(uid)?.trim() || fallbackBadge
  const uids = [
    permit.permitterUid,
    permit.issuerUid,
    permit.performerUid,
    permit.leadExpertUid,
  ]
  const approvals = asor.approvals.map((row, i) => {
    const name = resolveUser(uids[i])?.displayName?.trim()
    return {
      ...row,
      fullNamePrinted: name || row.fullNamePrinted,
      badgeNo: row.badgeNo.trim() || badgeFor(uids[i] || ''),
      roleLabelRu: pdfApprovalRoleLabel(
        (['permitter', 'issuer', 'performer', 'leadExpert'] as const)[i],
      ),
    }
  })
  return { ...asor, approvals }
}

export function pdfSignatureCell(
  permit: Permit,
  role: EgovSignRole,
  row: AsorApprovalRow,
): string {
  return pdfSignaturePlainText(permit, role, row)
}

function defaultApprovalRow(role: EgovSignRole): AsorApprovalRow {
  const row = defaultApprovalRows()[approvalIndexForRole(role)]
  return row ?? {
    roleKey: 'filled_work_permitter',
    roleLabelRu: pdfApprovalRoleLabel(role),
    fullNamePrinted: '',
    badgeNo: '',
    dateIso: '',
    acknowledged: false,
  }
}

function approvalRowForRole(permit: Permit, role: EgovSignRole): AsorApprovalRow {
  const idx = approvalIndexForRole(role)
  return permit.asor?.approvals[idx] ?? defaultApprovalRow(role)
}

const PDF_TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#333333',
  vLineColor: () => '#333333',
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
}

/** Блок «кто подписал / согласовал» — в начале PDF-пакета и частей. */
export function buildPdfApprovalSummaryBlock(
  permit: Permit,
  resolveUser: (uid: string) => { displayName: string } | undefined,
): Record<string, unknown> {
  const body: unknown[][] = [
    [
      {
        text: 'Согласование и подписи НДПР',
        colSpan: 4,
        bold: true,
        fontSize: 10,
        fillColor: '#0b2147',
        color: '#ffffff',
        margin: [6, 4, 6, 4],
      },
      {},
      {},
      {},
    ],
    [
      { text: '№', bold: true, fillColor: '#f0f0f0', fontSize: 8, alignment: 'center' },
      { text: 'Действие', bold: true, fillColor: '#f0f0f0', fontSize: 8 },
      { text: 'Ф.И.О.', bold: true, fillColor: '#f0f0f0', fontSize: 8 },
      buildPdfSignatureColumnHeader('Подпись / статус', { align: 'left', fontSize: 8 }),
    ],
  ]

  signingRoleOrder(permit).forEach((role, i) => {
    const row = approvalRowForRole(permit, role)
    const uid = assigneeUidForRole(permit, role)
    const name =
      signerShortName(resolveUser(uid)?.displayName) ||
      row.fullNamePrinted.trim() ||
      '—'
    const signed = isPdfEgovSigned(permit, role) || (row.acknowledged && row.fullNamePrinted.trim())
    const rowFill = signed ? PDF_EGOV_SIG_COLORS.signedRowTint : undefined
    body.push([
      { text: String(i + 1), fontSize: 8, alignment: 'center', fillColor: rowFill },
      { text: signingActionLabel(role), fontSize: 8, fillColor: rowFill },
      { text: name, fontSize: 8, fillColor: rowFill },
      buildPdfSignatureStatusCell(permit, role, {
        ...row,
        fullNamePrinted: name === '—' ? '' : name,
      }),
    ])
  })

  return {
    table: { headerRows: 2, widths: [22, '*', 90, 125], body },
    layout: PDF_TABLE_LAYOUT,
    margin: [0, 0, 0, 12],
  }
}

export function pdfApprovalSignatureText(
  permit: Permit | undefined,
  role: EgovSignRole,
  fallbackName?: string,
): string {
  if (!permit) return ''
  const row = approvalRowForRole(permit, role)
  const name = fallbackName?.trim() || row.fullNamePrinted.trim()
  return pdfSignatureCell(permit, role, { ...row, fullNamePrinted: name })
}
