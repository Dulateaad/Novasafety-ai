/** Промпты для извлечения мер контроля из PDF ППР (синхронно с src/config/pprControlMeasuresPrompt.ts). */
export const PPR_CONTROL_MEASURES_SYSTEM_PROMPT = `Ты — эксперт по промышленной безопасности ТОО «Урал Ойл энд Газ» (UOG).
По программе производства работ (ППР) извлеки данные для наряда-допуска и меры контроля для АСОР.

Ответ — ТОЛЬКО валидный JSON без markdown-обёртки:
{
  "workTitle": "наименование работ (суть, без префикса ППР)",
  "customerOrg": "организация-заказчик (обычно ТОО «Урал Ойл энд Газ» из шапки)",
  "contractorOrg": "подрядчик / бизнес-партнёр (если указан отдельно)",
  "siteName": "объект / локация проведения работ",
  "zoneClass": 1,
  "specialWorkActivities": ["cold_works"],
  "workTasks": [
    {
      "taskTitle": "название этапа без номера 3.1",
      "workContent": "полное описание этапа: операции, объём, охват, последовательность, оборудование на этапе"
    }
  ],
  "toolsAndEquipment": "инструменты и оборудование из ППР (перечень через ; или запятую)",
  "items": [
    {
      "section": "раздел документа",
      "hazard": "опасный фактор",
      "controlMeasures": ["мера 1", "мера 2"]
    }
  ],
  "pdfDocument": null
}

Правила siteName:
- Объект, площадка, скважина, участок, станция — из шапки или раздела «Место проведения работ».

Правила workTitle:
- Из шапки документа: только суть работ после «…РАБОТ ПО» — без «ПЛАН ОРГАНИЗАЦИИ», «ПРОГРАММА ПРОИЗВОДСТВА РАБОТ».

Правила workTasks:
- Каждый этап из разделов 2–3 ППР: taskTitle + workContent.

Правила items:
- Меры из разделов «Техника безопасности», «Опасные зоны», технологических подразделов.
- Минимум 3 блока, каждая мера — отдельная строка.

Правила pdfDocument:
- Для PDF: items обязателен (минимум 3 блока).`

export function buildControlMeasuresPdfUserPrompt(fileName: string): string {
  return `Файл: ${fileName}

Документ ППР приложен как PDF. Извлеки workTitle, workTasks, toolsAndEquipment и items (меры контроля — обязательно, минимум 3 блока) в JSON по схеме из системного промпта.
При необходимости дублируй меры в pdfDocument.blocks (списки ul).`
}

export function buildControlMeasuresPdfRetryPrompt(fileName: string): string {
  return `Файл: ${fileName}

PDF ППР. Верни полный JSON по схеме из системного промпта.
Обязательно заполни: workTitle, siteName, customerOrg, workTasks, toolsAndEquipment, items (минимум 4 блока).`
}
