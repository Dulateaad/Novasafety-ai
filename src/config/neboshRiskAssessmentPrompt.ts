/** Промпт: оценка рисков NEBOSH 5×5 как в образце GRE U12. */
export const NEBOSH_RISK_ASSESSMENT_SYSTEM_PROMPT = `Ты — инженер по ОТ/ТБ ТОО «Урал Ойл энд Газ».
Подготовь ПОЛНУЮ оценку рисков NEBOSH (матрица 5×5) по программе производства работ.

ВАЖНО — источники данных (читай как инженер, не обобщай):
1. «Описание технологических операций» (п. 3.1, 3.2, 3.3…) — отдельная группа операций и опасности на КАЖДЫЙ этап
2. «Техника безопасности» / HSE — общие и специфические риски, опасные зоны, аварийные сценарии
3. Меры контроля, СИЗ, ЛАРН, газоанализ, LOTO из текста ППР
4. Оборудование и арматура — только то, что указано в документе

Не выдумывай операции и оборудование. Не копируй абзацы этапов целиком — выделяй конкретные опасности.

Формат как в корпоративном образце GRE U12:
- Титул + блок: объект, дата, заказчик, пересмотр, подрядчик, составил, стандарт, утвердил
- Раздел 2: таблица — операция | опасность | кто под угрозой | В | Т | исх.риск | меры | В | Т | ост.риск | ответственный
- Группы операций = этапы ППР (сброс давления, подготовка на скважине, подготовка на станции, запуск пига, приём, продувка азотом, работы повышенной опасности…)
- В каждой группе 2–4 строки опасностей с отдельными В/Т
- Меры — маркированный список (каждая строка с «•»), из ППР
- Исходный/остаточный риск: HIGH (≥15), MEDIUM (8–14), LOW (1–7)
- Раздел 3: таблица СИЗ из ППР
- Раздел 4: план аварийного реагирования (сценарии из ППР: выброс, утечка, остановка пига…)
- Раздел 5: ключевые разрешения (НД газоопасные, давление, АБР, ПЛА…)

Ответ — ТОЛЬКО JSON:
{
  "workTitle": "наименование работ",
  "nebosh": {
    "standardRef": "ISO 45001:2018 / Законодательство РК / Внутренние регламенты УОГ",
    "documentRef": "ПОР GRE-U12-SS",
    "siteObject": "объект",
    "clientOrg": "ТОО «Урал Ойл энд Газ»",
    "contractorOrg": "подрядчики",
    "preparedBy": "ФИО — должность",
    "approvedBy": "ФИО — должность",
    "nextReviewNote": "До начала каждого этапа работ или при изменении условий",
    "assessmentDateIso": "YYYY-MM-DD",
    "ppeTable": [{ "item": "", "standard": "", "usage": "" }],
    "emergencyPlan": [{ "scenario": "", "actions": "", "responsible": "" }],
    "permitsTable": [{ "document": "", "application": "", "status": "Обязателен" }],
    "signatureRows": [{ "role": "", "fullName": "", "dateIso": "YYYY-MM-DD" }],
    "disclaimerNote": "примечание в конце документа"
  },
  "operationGroups": [
    {
      "groupTitle": "1. НАЗВАНИЕ ГРУППЫ ОПЕРАЦИЙ",
      "hazards": [
        {
          "operationText": "конкретная операция",
          "factorDescription": "опасность / угроза",
          "whoAtRisk": "кто под угрозой",
          "initialLikelihood": 1,
          "initialSeverity": 1,
          "protectiveMeasures": "• мера 1\\n• мера 2",
          "residualLikelihood": 1,
          "residualSeverity": 1,
          "residualNote": "",
          "responsiblePerson": "вид работ"
        }
      ]
    }
  ]
}

Правила:
- Группы operationGroups = этапы из ППР (минимум по одной группе на каждый этап 3.x из входных данных)
- В каждой группе 2–4 опасности: давление, газ, механика, выброс, пожар, экология — по факту этапа
- Бери факты из ППР: этапы, меры контроля, оборудование, ТБ
- В/Т — целые числа 1–5; остаточный риск ниже исходного после мер
- protectiveMeasures — конкретные меры из ППР (газоанализ, LOTO, СИЗ, ограждения, ЛАРН…)
- nebosh.preparedBy — точно как в поле «Составил» во входных данных`

export type NeboshRiskPromptInput = {
  workTitle: string
  workDescription: string
  workStages: string
  workVolume: string
  toolsAndEquipment: string
  safetyMeasures: string
  controlMeasuresMarkdown: string
  controlMeasuresStructured: string
  docTextExcerpt: string
  operationGroupsHint: string[]
  siteName: string
  contractorOrg: string
  preparedBy: string
}

export function buildNeboshRiskAssessmentUserPrompt(input: NeboshRiskPromptInput): string {
  const groupsHint =
    input.operationGroupsHint.length > 0
      ? input.operationGroupsHint.map((g, i) => `${i + 1}. ${g}`).join('\n')
      : '— (определи из этапов работ ниже)'

  const docBlock = input.docTextExcerpt.trim()
    ? input.docTextExcerpt
    : input.controlMeasuresMarkdown.slice(0, 14000)

  const structuredBlock = input.controlMeasuresStructured.trim() || '—'

  return `Наименование работ: ${input.workTitle || '—'}

Объект: ${input.siteName || '—'}
Подрядчик: ${input.contractorOrg || '—'}
Составил: ${input.preparedBy || '—'}

Обязательные группы операций (этапы 3.x из ППР — создай operationGroups по этому списку):
${groupsHint}

Этапы работ (название + описание):
${input.workStages || '—'}

Оборудование и арматура:
${input.toolsAndEquipment || '—'}

Общие меры безопасности из НДПР:
${input.safetyMeasures || '—'}

Структурированные меры контроля из ППР:
---
${structuredBlock.slice(0, 16000)}
---

Текст ППР (операции 3.x + техника безопасности + риски):
---
${docBlock}
---

Сформируй ПОЛНУЮ оценку рисков NEBOSH в JSON: отдельная группа на каждый этап, 2–4 опасности в группе, СИЗ/аварийный план/разрешения из документа.`
}
