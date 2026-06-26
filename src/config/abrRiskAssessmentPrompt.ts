import { abrCatalogForPrompt } from './abrCatalog'

export const ABR_RISK_ASSESSMENT_SYSTEM_PROMPT = `Ты — инженер по ОТ/ТБ ТОО «Урал Ойл энд Газ».
Составь Анализ Безопасности Работ (АБР) по программе производства работ (ППР).

ВАЖНО — анализируй документ как инженер:
1. Каждый этап ППР (п. 3.1, 3.2, 3.3…) — отдельный stage в АБР (до 6 этапов)
2. Для каждого этапа определи опасности по тексту операций и разделу ТБ/HSE
3. Номера опасностей и мер — ТОЛЬКО из справочника бланка (1–54, при необходимости 55–58)
4. Для газоопасных/давление/пиг/азот работ — обязательно 7, 19, 46, 52 и меры LOTO, газоанализ, СИЗ
5. Не выдумывай операции и оборудование, которых нет в ППР

Формат — корпоративный бланк АБР:
- Место проведения работ, наряд-допуск, дата, смена
- Описание задания
- До 6 этапов; в каждом — hazardNumbers и controlNumbers из справочника
- briefing и postWork — пустые строки

Ответ — ТОЛЬКО JSON:
{
  "workLocation": "место/объект",
  "permitNo": "№ НД или пусто",
  "dateIso": "YYYY-MM-DD",
  "shiftDay": true,
  "shiftNight": false,
  "jobDescription": "краткое описание задания",
  "stages": [
    {
      "order": 1,
      "title": "название этапа из ППР (3.1 …)",
      "hazardNumbers": [7, 19, 46],
      "controlNumbers": [18, 27, 46, 47]
    }
  ],
  "briefing": {
    "topHazardsAndControls": "",
    "stopScenarios": "",
    "morMentors": ""
  },
  "postWork": {
    "doneWell": "",
    "doneWrong": "",
    "improvements": "",
    "pprUsage": ""
  }
}

Правила:
- stages — из этапов ППР (п. 3.x), порядок как в документе, не более 6
- В каждом этапе 2–6 hazardNumbers и 3–8 controlNumbers по фактическим рискам этапа
- briefing и postWork — пустые строки`

export type AbrRiskPromptInput = {
  workTitle: string
  workStages: string
  toolsAndEquipment: string
  safetyMeasures: string
  controlMeasuresMarkdown: string
  controlMeasuresStructured: string
  docTextExcerpt: string
  operationGroupsHint: string[]
  siteName: string
  permitNo: string
  contractorOrg: string
  dateIso?: string
  shiftDay?: boolean
  shiftNight?: boolean
}

export function buildAbrRiskAssessmentUserPrompt(input: AbrRiskPromptInput): string {
  const shift =
    input.shiftDay && input.shiftNight
      ? 'день и ночь'
      : input.shiftNight
        ? 'ночь'
        : input.shiftDay
          ? 'день'
          : '—'

  const stagesHint =
    input.operationGroupsHint.length > 0
      ? input.operationGroupsHint.map((g, i) => `${i + 1}. ${g}`).join('\n')
      : '— (определи из этапов ниже)'

  const docBlock = input.docTextExcerpt.trim()
    ? input.docTextExcerpt
    : input.controlMeasuresMarkdown.slice(0, 12000)

  const structuredBlock = input.controlMeasuresStructured.trim() || '—'

  return `Наименование работ: ${input.workTitle || '—'}

Объект: ${input.siteName || '—'}
Наряд-допуск: ${input.permitNo || '—'}
Дата: ${input.dateIso || '—'}
Смена: ${shift}
Подрядчик: ${input.contractorOrg || '—'}

Этапы АБР (создай stage на каждый пункт):
${stagesHint}

Этапы работ из ППР:
${input.workStages || '—'}

Оборудование:
${input.toolsAndEquipment || '—'}

Меры безопасности:
${input.safetyMeasures || '—'}

Структурированные меры контроля:
---
${structuredBlock.slice(0, 14000)}
---

Текст ППР (операции + ТБ):
---
${docBlock}
---

${abrCatalogForPrompt()}

Сформируй АБР в JSON: один stage на каждый этап 3.x, номера из справочника по рискам этапа.`
}
