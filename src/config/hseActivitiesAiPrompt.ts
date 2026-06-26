import { HSE_ACTIVITY_TEMPLATES } from './hseActivityTemplates'
import { SPECIAL_WORK_ACTIVITY_LABELS } from '../types/domain'
import type { PermitDraft } from '../types/domain'
import type { PprForm } from '../types/ppr'

export const HSE_ACTIVITIES_AI_SYSTEM_PROMPT = `Ты — эксперт по ОТ, ТБ и ООС ТОО «Урал Ойл энд Газ» (UOG).
По данным НДПР и документу ППР выбери применимые шаблоны мероприятий.

Ответ — ТОЛЬКО валидный JSON без markdown:
{
  "templateIds": ["work-fire", "work-height"],
  "rationale": "краткое обоснование на русском (1–3 предложения)"
}

Правила:
- templateIds — только id из каталога ниже, без выдуманных id.
- Выбирай все реально применимые шаблоны (огневые, высота, ЗПО, газ, электрика и т.д.).
- Если в ППР и НДПР явно огневые работы на высоте — включи work-fire и work-height (или work-fire-height).
- Минимум 1 шаблон, если работы описаны; не дублируй близкие без необходимости.
- Язык rationale: русский.`

export function buildHseActivitiesCatalogForPrompt(): string {
  return HSE_ACTIVITY_TEMPLATES.map((t) => `- ${t.id}: ${t.title}`).join('\n')
}

export function buildHseActivitiesUserPrompt(input: {
  ndpr: PermitDraft
  ppr: PprForm
  pprExcerpt: string
}): string {
  const { ndpr, ppr, pprExcerpt } = input
  const f02 = ndpr.f02
  const workers = ndpr.executors.filter((e) => e.userUid.trim()).length

  const ndBlock = [
    '=== НДПР ===',
    `Наименование работ: ${ndpr.title || '—'}`,
    `Объект / локация: ${ndpr.siteName || '—'}`,
    `Особый вид работ: ${SPECIAL_WORK_ACTIVITY_LABELS[ndpr.specialWorkActivity]}`,
    `Класс зоны: ${ndpr.zoneClass}`,
    `Тип наряда: ${ndpr.permitType === 'fire' ? 'огневой' : 'холодный'}, категория ${ndpr.category}`,
    `Описание: ${ndpr.workDescription || '—'}`,
    `Инструменты и оборудование: ${ndpr.toolsAndEquipment || '—'}`,
    `№ бейджа: ${f02.badgeNo || '—'}`,
    `Срок: ${f02.startDate || '—'} — ${f02.endDate || '—'}`,
    `Работников в составе: ${workers}`,
  ].join('\n')

  const pprBlock = [
    '=== ППР (файл) ===',
    `Файл: ${ppr.attachment?.fileName ?? 'не загружен'}`,
    `Наименование (из файла): ${ppr.workTitle || '—'}`,
    ppr.controlMeasures?.items.length
      ? `Извлечённые меры контроля (${ppr.controlMeasures.items.length} блоков):\n${ppr.controlMeasures.items
          .slice(0, 12)
          .map(
            (i) =>
              `• ${i.section}: ${i.hazard} → ${i.controlMeasures.slice(0, 2).join('; ')}`,
          )
          .join('\n')}`
      : '',
    pprExcerpt
      ? `Фрагмент текста ППР:\n---\n${pprExcerpt}\n---`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return `${ndBlock}\n\n${pprBlock}\n\nКаталог шаблонов (templateIds):\n${buildHseActivitiesCatalogForPrompt()}\n\nВыбери templateIds и верни JSON.`
}
