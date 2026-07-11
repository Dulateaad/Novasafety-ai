/** Программа производства работ (ППР) — ручное заполнение перед АСОР. */

import type { SpecialWorkActivity } from './domain'
import { normalizeSpecialWorkActivities } from './domain'

export interface PprAttachment {
  fileName: string
  mimeType: string
  sizeBytes: number
  uploadedAtIso: string
  /** Base64 содержимого файла (docx/pdf). */
  dataBase64: string
}

/** Одна группа мер контроля (для АСОР и отдельного файла). */
export interface PprControlMeasuresItem {
  section: string
  hazard: string
  controlMeasures: string[]
}

/** Блок PDF-документа, полностью сформированный Gemini. */
export type GeminiPdfBlockType = 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol'

export interface GeminiPdfBlock {
  type: GeminiPdfBlockType
  text?: string
  items?: string[]
}

export interface GeminiPdfDocument {
  blocks: GeminiPdfBlock[]
}

/** Отдельный документ «Меры контроля», сформированный ИИ или автоматически. */
export interface PprControlMeasuresDoc {
  fileName: string
  markdown: string
  /** PDF, сформированный из документа Gemini (pdfmake). */
  pdfBase64?: string
  /** Полная структура PDF — контент от Gemini. */
  geminiPdfDocument?: GeminiPdfDocument
  generatedAtIso: string
  sourceAttachmentName: string
  workTitle: string
  items: PprControlMeasuresItem[]
  method: 'gemini' | 'ai' | 'rules'
}

export interface PprTaskBlock {
  id: string
  ordinal: number
  /** Заголовок задания (как «Задание №1» на бланке). */
  taskTitle: string
  /** Содержание работ по заданию. */
  workContent: string
  /** Меры безопасности на данном задании. */
  safetyMeasures: string
}

export interface PprForm {
  /** Наименование работ */
  workTitle: string
  /** Объект / локация */
  siteName: string
  /** Участок, место проведения */
  workArea: string
  /** Организация-исполнитель / подрядчик */
  contractorOrg: string
  /** Организация-заказчик (поле «Организация» в НДПР) */
  customerOrg: string
  periodStart: string
  periodEnd: string
  /** Описание работ (из ППР / ИИ). */
  workDescription: string
  /** Этапы работ — текст для НДПР (из ИИ или из tasks). */
  workStagesText: string
  /** Объём работ (из ППР / ИИ). */
  workVolume: string
  /** Инструмент, оборудование, механизмы */
  toolsAndEquipment: string
  /** Состав бригады / численность */
  personnel: string
  /** Общие меры безопасности и охраны труда */
  safetyMeasures: string
  /** Задания (этапы) выполнения работ — как на бланке ППР. */
  tasks: PprTaskBlock[]
  /** Загруженный файл ППР (Method Statement и т. п.). */
  attachment?: PprAttachment
  /** Меры контроля — отдельный файл, извлечённый из attachment. */
  controlMeasures?: PprControlMeasuresDoc
  /** Виды работ — из ИИ / rule-based после анализа ППР. */
  specialWorkActivities: SpecialWorkActivity[]
  /** Прикреплённые процедуры UOG-HSE (автоподбор по ППР). */
  linkedCertificateIds?: string[]
  preparedBy: string
  preparationDateIso: string
}

export const PPR_FORM_STORAGE_KEY = 'nova_ppr_form_v2'

export const PPR_ATTACHMENT_ACCEPT =
  '.doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf'

export const PPR_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024

export function emptyPprTask(order = 1): PprTaskBlock {
  return {
    id: crypto.randomUUID(),
    ordinal: order,
    taskTitle: '',
    workContent: '',
    safetyMeasures: '',
  }
}

export function emptyPprForm(): PprForm {
  return {
    workTitle: '',
    siteName: '',
    workArea: '',
    contractorOrg: '',
    customerOrg: '',
    periodStart: '',
    periodEnd: '',
    workDescription: '',
    workStagesText: '',
    workVolume: '',
    toolsAndEquipment: '',
    personnel: '',
    safetyMeasures: '',
    tasks: [emptyPprTask(1)],
    specialWorkActivities: [],
    linkedCertificateIds: [],
    preparedBy: '',
    preparationDateIso: new Date().toISOString().slice(0, 10),
  }
}

function normalizeTasks(raw: unknown, fallback: PprTaskBlock[]): PprTaskBlock[] {
  if (!Array.isArray(raw)) return fallback
  const tasks = raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((row, i) => ({
        id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
        ordinal: typeof row.ordinal === 'number' ? row.ordinal : i + 1,
        taskTitle: typeof row.taskTitle === 'string' ? row.taskTitle : '',
        workContent:
          typeof row.workContent === 'string'
            ? row.workContent
            : typeof row.description === 'string'
              ? row.description
              : '',
        safetyMeasures: typeof row.safetyMeasures === 'string' ? row.safetyMeasures : '',
    }))
  return tasks.length > 0 ? tasks : fallback
}

/** Миграция старых «этапов» в задания. */
function tasksFromLegacyStages(raw: unknown): PprTaskBlock[] | null {
  if (!Array.isArray(raw)) return null
  const tasks = raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s, i) => ({
      id: typeof s.id === 'string' ? s.id : crypto.randomUUID(),
      ordinal: i + 1,
      taskTitle: typeof s.stage === 'string' ? s.stage : `Задание ${i + 1}`,
      workContent: typeof s.description === 'string' ? s.description : '',
      safetyMeasures: '',
    }))
  return tasks.length > 0 ? tasks : null
}

function normalizeAttachment(raw: unknown): PprAttachment | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Partial<PprAttachment>
  if (typeof o.fileName !== 'string' || !o.fileName.trim()) {
    return undefined
  }
  const dataBase64 = typeof o.dataBase64 === 'string' ? o.dataBase64 : ''
  return {
    fileName: o.fileName.trim(),
    mimeType:
      typeof o.mimeType === 'string' && o.mimeType.trim()
        ? o.mimeType.trim()
        : 'application/octet-stream',
    sizeBytes: typeof o.sizeBytes === 'number' ? o.sizeBytes : 0,
    uploadedAtIso:
      typeof o.uploadedAtIso === 'string'
        ? o.uploadedAtIso
        : new Date().toISOString(),
    dataBase64,
  }
}

function normalizeGeminiPdfDocument(raw: unknown): GeminiPdfDocument | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as { blocks?: unknown }
  if (!Array.isArray(o.blocks)) return undefined
  const blocks = o.blocks
    .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
    .map((b) => {
      const type = String(b.type ?? 'p') as GeminiPdfBlock['type']
      const valid: GeminiPdfBlock['type'][] = ['h1', 'h2', 'h3', 'p', 'ul', 'ol']
      const blockType = valid.includes(type) ? type : 'p'
      return {
        type: blockType,
        text: typeof b.text === 'string' ? b.text : undefined,
        items: Array.isArray(b.items)
          ? b.items.map((x) => String(x)).filter(Boolean)
          : undefined,
      }
    })
    .filter((b) => (b.text?.trim()?.length ?? 0) > 0 || (b.items?.length ?? 0) > 0)
  return blocks.length > 0 ? { blocks } : undefined
}

function normalizeControlMeasures(raw: unknown): PprControlMeasuresDoc | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Partial<PprControlMeasuresDoc>
  if (typeof o.markdown !== 'string' || !o.markdown.trim()) return undefined
  const rawItems = Array.isArray(o.items) ? (o.items as unknown[]) : []
  const items = rawItems
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((row) => ({
      section: typeof row.section === 'string' ? row.section : '',
      hazard: typeof row.hazard === 'string' ? row.hazard : '',
      controlMeasures: Array.isArray(row.controlMeasures)
        ? row.controlMeasures.map((m) => String(m)).filter(Boolean)
        : [],
    }))
    .filter((row) => row.controlMeasures.length > 0)
  return {
    fileName:
      typeof o.fileName === 'string' && o.fileName.trim()
        ? o.fileName.trim()
        : 'Оценка-риска.pdf',
    markdown: o.markdown,
    pdfBase64:
      typeof o.pdfBase64 === 'string' && o.pdfBase64.trim()
        ? o.pdfBase64.trim()
        : undefined,
    geminiPdfDocument: normalizeGeminiPdfDocument(o.geminiPdfDocument),
    generatedAtIso:
      typeof o.generatedAtIso === 'string'
        ? o.generatedAtIso
        : new Date().toISOString(),
    sourceAttachmentName:
      typeof o.sourceAttachmentName === 'string' ? o.sourceAttachmentName : '',
    workTitle: typeof o.workTitle === 'string' ? o.workTitle : '',
    items,
    method:
      o.method === 'gemini' || o.method === 'ai' || o.method === 'rules'
        ? o.method
        : 'rules',
  }
}

export function normalizePprForm(raw: unknown): PprForm | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<PprForm> & { stages?: unknown }
  const base = emptyPprForm()
  const legacy = tasksFromLegacyStages(o.stages)
  const tasks = legacy ?? normalizeTasks(o.tasks, base.tasks)
  return {
    workTitle: typeof o.workTitle === 'string' ? o.workTitle : '',
    siteName: typeof o.siteName === 'string' ? o.siteName : '',
    workArea: typeof o.workArea === 'string' ? o.workArea : '',
    contractorOrg: typeof o.contractorOrg === 'string' ? o.contractorOrg : base.contractorOrg,
    customerOrg: typeof o.customerOrg === 'string' ? o.customerOrg : base.customerOrg,
    periodStart: typeof o.periodStart === 'string' ? o.periodStart.slice(0, 10) : '',
    periodEnd: typeof o.periodEnd === 'string' ? o.periodEnd.slice(0, 10) : '',
    workDescription: typeof o.workDescription === 'string' ? o.workDescription : '',
    workStagesText:
      typeof o.workStagesText === 'string'
        ? o.workStagesText
        : typeof (o as { workStages?: unknown }).workStages === 'string'
          ? String((o as { workStages: string }).workStages)
          : '',
    workVolume: typeof o.workVolume === 'string' ? o.workVolume : '',
    toolsAndEquipment: typeof o.toolsAndEquipment === 'string' ? o.toolsAndEquipment : '',
    personnel: typeof o.personnel === 'string' ? o.personnel : '',
    safetyMeasures: typeof o.safetyMeasures === 'string' ? o.safetyMeasures : '',
    tasks,
    attachment: normalizeAttachment(o.attachment),
    controlMeasures: normalizeControlMeasures(o.controlMeasures),
    linkedCertificateIds: Array.isArray(o.linkedCertificateIds)
      ? o.linkedCertificateIds.filter((x): x is string => typeof x === 'string')
      : [],
    specialWorkActivities: normalizeSpecialWorkActivities(o.specialWorkActivities),
    preparedBy: typeof o.preparedBy === 'string' ? o.preparedBy : '',
    preparationDateIso:
      typeof o.preparationDateIso === 'string'
        ? o.preparationDateIso.slice(0, 10)
        : base.preparationDateIso,
  }
}
