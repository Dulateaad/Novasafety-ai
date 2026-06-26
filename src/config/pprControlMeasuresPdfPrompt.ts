import type { PprControlMeasuresItem } from '../types/ppr'

/** Отдельный запрос: Gemini полностью верстает PDF-документ (блоки). */
export const PPR_PDF_DOCUMENT_SYSTEM_PROMPT = `Ты — эксперт по ОТ/ТБ ТОО «Урал Ойл энд Газ» (UOG).
Сформируй полный текст PDF-документа «Меры контроля опасных факторов» для печати и согласования.

Ответ — ТОЛЬКО валидный JSON:
{
  "pdfDocument": {
    "blocks": [
      { "type": "h1", "text": "Меры контроля опасных факторов" },
      { "type": "p", "text": "ТОО «Урал Ойл энд Газ» · NOVA Safety" },
      { "type": "h2", "text": "1. Наименование и источник" },
      { "type": "p", "text": "..." },
      { "type": "h2", "text": "2. Раздел ППР — ..." },
      { "type": "p", "text": "Опасный фактор: ..." },
      { "type": "ul", "items": ["мера 1", "мера 2"] }
    ]
  }
}

Типы blocks: h1, h2, h3, p, ul, ol.
Правила:
- Документ полностью на русском, официальный стиль.
- Включи: титул, объект/работы, источник ППР, дату, все разделы с мерами из данных, блок «Ответственный за ОТ/ТБ», disclaimer о проверке.
- Не сокращай меры — перенеси все из входных данных.
- ul/ol только с items, p/h* только с text.`

export function buildPdfDocumentUserPrompt(input: {
  workTitle: string
  sourceFileName: string
  items: PprControlMeasuresItem[]
}): string {
  return `Наименование работ: ${input.workTitle}
Источник ППР: ${input.sourceFileName}
Дата: ${new Date().toISOString().slice(0, 10)}

Данные мер контроля (JSON):
${JSON.stringify(input.items, null, 2)}

Сформируй pdfDocument.blocks — полный PDF-документ для согласования.`
}
