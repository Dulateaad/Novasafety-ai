import type { PermitDraft } from '../types/domain'
import {
  applySpecialWorkActivity,
  coerceSpecialWorkActivity,
  coerceZoneClass,
  normalizeSpecialWorkActivities,
  primarySpecialWorkActivity,
} from '../types/domain'
import { normalizeAsorIncoming } from '../types/asor'
import { coercePtwSite } from '../config/ptwSites'
import { emptyF02, emptyPermitDraft } from '../uog/permitDefaults'
import { initialNdprResponses } from '../uog/ndprChecklistTemplate'
import { normalizeSitePhotos } from './sitePhotos'

export const NEW_PERMIT_DRAFT_AUTOSAVE_KEY = 'nova_new_permit_draft_v1'

function normalizeExecutorRowsForDraft(
  raw: unknown,
): PermitDraft['executors'] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((o) => {
      const id =
        typeof o.id === 'string' && o.id.trim() !== ''
          ? o.id
          : crypto.randomUUID()
      let userUid =
        typeof o.userUid === 'string' ? o.userUid : ''
      if (
        !userUid &&
        typeof (o as { executorUid?: unknown }).executorUid === 'string'
      ) {
        userUid = (o as { executorUid: string }).executorUid
      }
      const dateIso =
        typeof o.dateIso === 'string'
          ? o.dateIso.slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      const briefingAcknowledged =
        typeof o.briefingAcknowledged === 'boolean'
          ? o.briefingAcknowledged
          : false
      return { id, userUid, dateIso, briefingAcknowledged }
    })
}

/** Восстановление локального черновика НД (последовательность: НД → АСОР). */
export function parseStoredNewPermitDraft(json: unknown): PermitDraft | null {
  try {
    if (!json || typeof json !== 'object') return null
    const o = json as Partial<PermitDraft> & Record<string, unknown>
    const base = emptyPermitDraft()

    const permitTypeGuess =
      o.permitType === 'fire' || o.permitType === 'cold'
        ? o.permitType
        : base.permitType
    const specialWorkActivity = coerceSpecialWorkActivity(
      o.specialWorkActivity,
      permitTypeGuess,
    )
    const specialWorkActivities = normalizeSpecialWorkActivities(
      o.specialWorkActivities,
      { single: specialWorkActivity, permitType: permitTypeGuess },
    )
    const primaryActivity = primarySpecialWorkActivity(specialWorkActivities)
    const derived = applySpecialWorkActivity(primaryActivity)

    const merged: PermitDraft = {
      ...base,
      title: typeof o.title === 'string' ? o.title : base.title,
      permitType: derived.permitType,
      category: derived.category,
      specialWorkActivity: primaryActivity,
      specialWorkActivities,
      zoneClass: coerceZoneClass(o.zoneClass),
      siteName: coercePtwSite(
        typeof o.siteName === 'string' ? o.siteName : base.siteName,
      ),
      workDescription:
        typeof o.workDescription === 'string'
          ? o.workDescription
          : base.workDescription,
      workStages:
        typeof o.workStages === 'string' ? o.workStages : base.workStages,
      workVolume:
        typeof o.workVolume === 'string' ? o.workVolume : base.workVolume,
      toolsAndEquipment:
        typeof o.toolsAndEquipment === 'string'
          ? o.toolsAndEquipment
          : base.toolsAndEquipment,
      issuerUid:
        typeof o.issuerUid === 'string' ? o.issuerUid : base.issuerUid,
      permitterUid:
        typeof o.permitterUid === 'string' ? o.permitterUid : base.permitterUid,
      performerUid:
        typeof o.performerUid === 'string' ? o.performerUid : base.performerUid,
      leadExpertUid:
        typeof o.leadExpertUid === 'string'
          ? o.leadExpertUid
          : base.leadExpertUid,
      isContractorPermit:
        typeof o.isContractorPermit === 'boolean'
          ? o.isContractorPermit
          : base.isContractorPermit,
      samePersonException: {
        ...base.samePersonException,
        ...(typeof o.samePersonException === 'object' && o.samePersonException
          ? (o.samePersonException as PermitDraft['samePersonException'])
          : {}),
      },
      registrationRefNo:
        typeof o.registrationRefNo === 'string'
          ? o.registrationRefNo
          : base.registrationRefNo,
      f02: {
        ...emptyF02(),
        ...(typeof o.f02 === 'object' && o.f02 !== null ? o.f02 : {}),
      },
      executors: normalizeExecutorRowsForDraft(o.executors),
      ndprChecklist:
        Array.isArray(o.ndprChecklist) && o.ndprChecklist.length > 0
          ? (o.ndprChecklist as PermitDraft['ndprChecklist'])
          : initialNdprResponses(),
      asor: undefined,
      sitePhotos: normalizeSitePhotos(o.sitePhotos),
    }

    merged.asor =
      o.asor !== undefined && o.asor !== null
        ? normalizeAsorIncoming(o.asor) ?? undefined
        : undefined

    if (merged.permitType === 'fire') {
      if (typeof o.f04 === 'object' && o.f04 !== null) {
        merged.f04 = o.f04 as PermitDraft['f04']
      }
    } else {
      merged.f04 = undefined
    }

    return merged
  } catch {
    return null
  }
}

export function restoreNewPermitDraftFromSession(): PermitDraft {
  try {
    const raw = sessionStorage.getItem(NEW_PERMIT_DRAFT_AUTOSAVE_KEY)
    if (!raw) return emptyPermitDraft()
    const parsed = parseStoredNewPermitDraft(JSON.parse(raw))
    return parsed ?? emptyPermitDraft()
  } catch {
    return emptyPermitDraft()
  }
}

/**
 * Готовит НД-черновик к записи в sessionStorage.
 *
 * Поле `ppr` несёт исходный документ ППР вместе с вложением (base64). У PDF это
 * вложение крупное и уже хранится отдельно под PPR_FORM_STORAGE_KEY, поэтому
 * дублирование внутри НД-черновика переполняет квоту sessionStorage: setItem
 * падает с QuotaExceededError, запись молча теряется (catch ниже), и список
 * работников, введённый пользователем, не попадает в сессию. На странице оценки
 * риска восстанавливается старый черновик с executors: [] и валидация ошибочно
 * требует «минимум двух работников» — но только для PDF (DOCX меньше и влезает в
 * квоту). parseStoredNewPermitDraft это поле всё равно не восстанавливает, так
 * что в сессию его писать незачем.
 */
function stripDraftForSession(draft: PermitDraft): PermitDraft {
  if (draft.ppr === undefined) return draft
  return { ...draft, ppr: undefined }
}

export function saveNewPermitDraftToSession(draft: PermitDraft): void {
  try {
    sessionStorage.setItem(
      NEW_PERMIT_DRAFT_AUTOSAVE_KEY,
      JSON.stringify(stripDraftForSession(draft)),
    )
  } catch {
    /* storage full / private mode */
  }
}

/** Сохраняет в sessionStorage поля, по которым проходит проверка НДПР. */
export function mergePreparedNdprDraftForSession(
  draft: PermitDraft,
  prepared: PermitDraft,
): PermitDraft {
  return {
    ...draft,
    siteName: prepared.siteName,
    title: prepared.title,
    workStages: prepared.workStages,
    toolsAndEquipment: prepared.toolsAndEquipment,
    performerUid: prepared.performerUid,
    permitterUid: prepared.permitterUid,
    issuerUid: prepared.issuerUid,
    leadExpertUid: prepared.leadExpertUid,
    executors: prepared.executors,
    f02: { ...draft.f02, ...prepared.f02 },
  }
}

/** «Наименование работ» из шага НДПР (краткое название наряда). */
export function readPermitDraftTitleFromSession(): string {
  return restoreNewPermitDraftFromSession().title.trim()
}
