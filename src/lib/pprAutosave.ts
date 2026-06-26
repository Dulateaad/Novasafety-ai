import { SOURCE_DOCUMENT_LABEL } from '../config/branding'
import { coercePtwSite } from '../config/ptwSites'
import {
  emptyPprForm,
  normalizePprForm,
  PPR_FORM_STORAGE_KEY,
  type PprForm,
} from '../types/ppr'
import { clearPprRiskAssessmentContextCache } from './pprRiskContext'
import { NEW_PERMIT_DRAFT_AUTOSAVE_KEY } from './newPermitDraftAutosave'
import { isLikelyFileNameTitle, normalizePprWorkTitle } from './narjadTitle'

export function loadPprForm(): PprForm {
  try {
    const raw = sessionStorage.getItem(PPR_FORM_STORAGE_KEY)
    if (raw) {
      const parsed = normalizePprForm(JSON.parse(raw))
      if (parsed) return parsed
    }
  } catch {
    /* ignore */
  }
  return prefillFromPermitDraft(emptyPprForm())
}

export function savePprForm(form: PprForm): void {
  try {
    const toSave: PprForm = {
      ...form,
      controlMeasures: form.controlMeasures
        ? {
            ...form.controlMeasures,
            pdfBase64: undefined,
          }
        : undefined,
    }
    sessionStorage.setItem(PPR_FORM_STORAGE_KEY, JSON.stringify(toSave))
    clearPprRiskAssessmentContextCache()
  } catch {
    /* ignore quota */
  }
}

/**
 * ППР для Firestore: без base64-вложения и тяжёлых PDF-полей.
 * Исходный файл остаётся в sessionStorage (PPR_FORM_STORAGE_KEY) на время сессии;
 * в документе наряда сохраняются только метаданные (имя, размер, дата).
 */
export function pprForFirestore(form: PprForm | undefined): PprForm | undefined {
  if (!form) return undefined
  const { attachment, controlMeasures, ...rest } = form
  const lite: PprForm = { ...rest }
  if (attachment) {
    lite.attachment = {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedAtIso: attachment.uploadedAtIso,
      dataBase64: '',
    }
  }
  if (controlMeasures) {
    const { pdfBase64: _pdf, geminiPdfDocument: _gem, ...cm } = controlMeasures
    lite.controlMeasures = cm
  }
  return lite
}

export function clearPprForm(): void {
  try {
    sessionStorage.removeItem(PPR_FORM_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Подставляет поля из черновика НДПР, если ППР ещё пустая. */
function prefillFromPermitDraft(form: PprForm): PprForm {
  try {
    const raw = sessionStorage.getItem(NEW_PERMIT_DRAFT_AUTOSAVE_KEY)
    if (!raw) return form
    const draft = JSON.parse(raw) as Record<string, unknown>
    const f02 = draft.f02 as { company?: string; startDate?: string; endDate?: string } | undefined
    const executors = Array.isArray(draft.executors) ? draft.executors : []
    const workerCount = executors.filter(
      (e) =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as { userUid?: string }).userUid === 'string' &&
        (e as { userUid: string }).userUid.trim() !== '',
    ).length
    const personnelNote =
      workerCount > 0 ? `Работников в составе: ${workerCount}` : form.personnel
    const ndTitle = normalizePprWorkTitle(String(draft.title ?? ''))
    const attachmentName =
      typeof form.attachment?.fileName === 'string' ? form.attachment.fileName : undefined
    const currentWorkTitle = normalizePprWorkTitle(form.workTitle)
    const workTitle =
      ndTitle && (!currentWorkTitle || isLikelyFileNameTitle(currentWorkTitle, attachmentName))
        ? ndTitle
        : currentWorkTitle || ndTitle

    return {
      ...form,
      workTitle,
      siteName: form.siteName || coercePtwSite(String(draft.siteName ?? '')),
      workDescription: form.workDescription || String(draft.workDescription ?? ''),
      toolsAndEquipment:
        form.toolsAndEquipment || String(draft.toolsAndEquipment ?? ''),
      contractorOrg: form.contractorOrg || String(f02?.company ?? form.contractorOrg),
      periodStart: form.periodStart || String(f02?.startDate ?? '').slice(0, 10),
      periodEnd: form.periodEnd || String(f02?.endDate ?? '').slice(0, 10),
      personnel: form.personnel || personnelNote,
    }
  } catch {
    return form
  }
}

/** Есть данные ППР для подстановки в НДПР (файл или извлечённые поля). */
export function pprHasNdprSource(form: PprForm): boolean {
  return Boolean(
    form.attachment?.dataBase64 ||
      form.workTitle.trim() ||
      form.workStagesText.trim() ||
      form.tasks.some((t) => t.taskTitle.trim() || t.workContent.trim()),
  )
}

export function validatePprForm(
  form: PprForm,
  opts?: { extracting?: boolean },
): string | null {
  const hasAttachment = !!form.attachment?.dataBase64

  if (hasAttachment && opts?.extracting) {
    return 'Дождитесь завершения извлечения мер контроля из документа.'
  }
  if (hasAttachment && !form.controlMeasures?.items.length) {
    return 'Не удалось сформировать меры контроля — загрузите документ заново или нажмите «Повторить».'
  }

  if (!form.workTitle.trim() && !hasAttachment) {
    return 'Укажите наименование работ или загрузите документ ППР.'
  }
  if (!form.siteName.trim()) return 'Укажите объект / локацию.'
  if (!form.periodStart.trim() || !form.periodEnd.trim()) {
    return 'Укажите срок выполнения работ (начало и окончание).'
  }
  if (!hasAttachment && !form.workDescription.trim()) {
    return 'Заполните описание и объём работ или загрузите документ ППР.'
  }
  if (!form.preparedBy.trim()) return 'Укажите, кто составил ППР (ФИО).'

  if (hasAttachment) return null

  const hasTask = form.tasks.some(
    (t) =>
      t.taskTitle.trim() !== '' ||
      t.workContent.trim() !== '' ||
      t.safetyMeasures.trim() !== '',
  )
  if (!hasTask) {
    return 'Добавьте хотя бы одно задание или загрузите документ ППР (файл).'
  }
  return null
}

/** ППР с вложением: анализ мер контроля завершён и можно переходить к НДПР. */
export function isPprAnalysisComplete(
  form: PprForm,
  opts?: { extracting?: boolean },
): boolean {
  if (opts?.extracting) return false
  if (!form.attachment?.dataBase64) return validatePprForm(form) === null
  return Boolean(form.controlMeasures?.items.length)
}

/** Ручной путь: достаточно загруженного файла ППР. */
export function validatePprFormManual(form: PprForm): string | null {
  if (!form.attachment?.dataBase64) {
    return `Загрузите ${SOURCE_DOCUMENT_LABEL} (файл .docx или .pdf).`
  }
  return null
}
