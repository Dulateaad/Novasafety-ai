import type { EgovSignRole } from '../types/egovSignature'
import type { PermitNoticeKind } from '../types/permitNotice'
import type { SpecialWorkActivity, UserRole } from '../types/domain'
import type { WorkPermissionKind } from '../types/workPermissions'
import { en } from './locales/en'
import { ru, type LanguageCode, type Locale } from './locales/ru'

export type { LanguageCode }

const STORAGE_KEY = 'nova_lang_v1'

const LOCALES: Record<LanguageCode, Locale> = { ru, en }

export function getLanguageCode(): LanguageCode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'en' ? 'en' : 'ru'
  } catch {
    return 'ru'
  }
}

export function localeMessages(code?: LanguageCode): Locale {
  const lang = code ?? getLanguageCode()
  return LOCALES[lang]
}

export function statusLabel(status: keyof Locale['status'], code?: LanguageCode): string {
  return localeMessages(code).status[status]
}

/** Replace `{key}` placeholders in a locale template string. */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? `{${key}}`),
  )
}

export function roleLabel(role: UserRole | EgovSignRole, code?: LanguageCode): string {
  const m = localeMessages(code)
  if (role in m.roles) return m.roles[role as UserRole]
  if (role in m.egovRoles) return m.egovRoles[role as EgovSignRole]
  return role
}

export function egovRoleLabel(role: EgovSignRole, code?: LanguageCode): string {
  return localeMessages(code).egovRoles[role]
}

export function specialWorkLabel(
  activity: SpecialWorkActivity,
  code?: LanguageCode,
): string {
  return localeMessages(code).specialWork[activity]
}

export function formatSpecialWorkLabelsLocalized(
  activities: SpecialWorkActivity[] | undefined,
  fallback: SpecialWorkActivity | undefined,
  code?: LanguageCode,
): string {
  const m = localeMessages(code)
  const list = activities?.length
    ? activities
    : fallback
      ? [fallback]
      : []
  if (!list.length) return '—'
  return list.map((a) => m.specialWork[a]).join('; ')
}

export function workPermissionKindLabel(
  kind: WorkPermissionKind,
  code?: LanguageCode,
): string {
  return localeMessages(code).workPermissionKinds[kind]
}

export function noticeDisplay(
  kind: PermitNoticeKind,
  regNo: string,
  code?: LanguageCode,
): { title: string; message: string } {
  const m = localeMessages(code)
  const label = regNo ? `№ ${regNo}` : m.branding.workPermitFallback
  switch (kind) {
    case 'issued':
      return {
        title: m.notices.issuedTitle,
        message: fillTemplate(m.notices.issuedMessage, { label }),
      }
    case 'closure_saved':
      return {
        title: m.notices.closureTitle,
        message: fillTemplate(m.notices.closureMessage, { label }),
      }
    default:
      return {
        title: m.notices.infoTitle,
        message: fillTemplate(m.notices.infoMessage, { label }),
      }
  }
}

export function crewAckInviteLabelLocalized(
  inviteType: 'crew_ack' | 'sign' | undefined,
  code?: LanguageCode,
): string {
  const c = localeMessages(code).crew
  return inviteType === 'crew_ack' ? c.label : c.inviteApproval
}
