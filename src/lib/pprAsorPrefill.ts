import type { PermitDraft } from '../types/domain'
import type { AsorForm } from '../types/asor'
import {
  emptyAsorForm,
  emptyHazard,
  emptyPersonRow,
  emptyTask,
} from '../types/asor'
import type { PprForm } from '../types/ppr'
import { readPermitDraftTitleFromSession } from './newPermitDraftAutosave'
import { isLikelyFileNameTitle, pickNarjadShortTitle } from './narjadTitle'

function formatWorkDuration(start: string, end: string): string {
  if (start && end) return `с ${start} по ${end}`
  if (start) return `с ${start}`
  if (end) return `до ${end}`
  return ''
}

/** Подставляет задания ППР в блок «Задание №…» формы АСОР. */
export function prefillAsorFromPpr(ppr: PprForm, base?: AsorForm): AsorForm {
  const form = base ?? emptyAsorForm()
  const filledTasks = ppr.tasks.filter(
    (t) =>
      t.taskTitle.trim() !== '' ||
      t.workContent.trim() !== '' ||
      t.safetyMeasures.trim() !== '',
  )

  const cm = ppr.controlMeasures
  const attachment = ppr.attachment
  const attachmentNote = attachment
    ? `Приложен документ ППР: ${attachment.fileName}`
    : ''
  const ndTitle = readPermitDraftTitleFromSession()
  const attachmentName = attachment?.fileName

  let tasks = form.tasks

  if (cm && cm.items.length > 0) {
    tasks = cm.items.map((item, i) => ({
      ...emptyTask(i + 1),
      taskTitle: item.section.trim() || `Задание ${i + 1}`,
      hazards: item.controlMeasures.map((measure, hi) => ({
        ...emptyHazard(),
        ordinal: hi + 1,
        factorDescription: hi === 0 ? item.hazard.trim() : '',
        protectiveMeasures: measure,
      })),
    }))
  } else if (filledTasks.length > 0) {
    tasks = filledTasks.map((t, i) => ({
      ...emptyTask(i + 1),
      taskTitle: t.taskTitle.trim() || `Задание ${i + 1}`,
      hazards: [
        {
          ...emptyHazard(),
          ordinal: 1,
          protectiveMeasures: t.safetyMeasures.trim(),
        },
      ],
    }))
  } else if (attachment) {
    const taskTitle = pickNarjadShortTitle(ndTitle, ppr.workTitle, attachmentName) || 'ППР (файл)'
    tasks = [
      {
        ...emptyTask(1),
        taskTitle,
        hazards: [
          {
            ...emptyHazard(),
            ordinal: 1,
            factorDescription: 'См. приложенный документ ППР.',
          },
        ],
      },
    ]
  }

  const cmNote = cm
    ? `Меры контроля (файл ${cm.fileName}): извлечено ${cm.items.length} блок(ов).`
    : ''

  const places = [ppr.siteName, ppr.workArea].filter(Boolean).join('\n')
  const shortTitleForNarjad = pickNarjadShortTitle(
    ndTitle,
    form.shortTitleForNarjad.trim() ||
      (isLikelyFileNameTitle(ppr.workTitle, attachmentName) ? '' : ppr.workTitle.trim()) ||
      (cm?.workTitle && !isLikelyFileNameTitle(cm.workTitle, attachmentName)
        ? cm.workTitle.trim()
        : ''),
    attachmentName,
  )

  return {
    ...form,
    creationDateIso: ppr.preparationDateIso || form.creationDateIso,
    workDurationText: formatWorkDuration(ppr.periodStart, ppr.periodEnd),
    shortTitleForNarjad,
    workScopeMarkdown:
      ppr.workDescription.trim() ||
      cmNote ||
      attachmentNote ||
      form.workScopeMarkdown,
    workPlacesText: places || form.workPlacesText,
    tasks,
  }
}

/** Работники из НДПР → строки декларации АСОР. */
export function prefillAsorTeamFromNd(
  draft: PermitDraft,
  asor: AsorForm,
  resolveName: (uid: string) => string,
): AsorForm {
  if (asor.declarationTeamRows.some((r) => r.fullNamePrinted.trim())) {
    return asor
  }
  const rows = draft.executors
    .filter((ex) => ex.userUid.trim())
    .map((ex) => ({
      ...emptyPersonRow(),
      rolePrinted: 'Работник',
      fullNamePrinted: resolveName(ex.userUid),
      dateIso: ex.dateIso,
    }))
  if (rows.length === 0) return asor
  return { ...asor, declarationTeamRows: rows }
}

/** № бейджа из НДПР → АСОР и рег. номер наряда. */
export function prefillAsorBadgeFromNd(
  draft: PermitDraft,
  asor: AsorForm,
): AsorForm {
  const badge =
    draft.f02?.badgeNo?.trim() || draft.registrationRefNo?.trim()
  if (!badge) return asor

  const approvals = asor.approvals.map((row) =>
    row.badgeNo.trim() ? row : { ...row, badgeNo: badge },
  )

  const declarationTeamRows = asor.declarationTeamRows.map((row) =>
    row.badgeNo.trim() ? row : { ...row, badgeNo: badge },
  )

  return {
    ...asor,
    tentativeNdReference: badge,
    approvals,
    declarationTeamRows,
  }
}
