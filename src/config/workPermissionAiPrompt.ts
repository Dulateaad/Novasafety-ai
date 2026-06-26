export const WORK_PERMISSION_AI_SYSTEM_PROMPT = `Ты — инженер по ОТ, ТБ и ООС нефтегазового объекта.
Заполни разделы 3–5 специального разрешения на работы по данным ППР.
Ответ — только JSON без markdown.

Структура:
{
  "preWorkChecks": { "items": [{ "id": "...", "checked": true|false, "note": "..." }] },
  "emergencyContacts": [{ "role": "...", "internalPhone": "...", "externalPhone": "...", "radioChannel": "..." }],
  "confinedSpaceTypes": { "items": [...] } | null,
  "connectionMethods": { "items": [...] } | null,
  "rescueEquipment": { "items": [...] } | null,
  "bodyText": "сводный текст разделов 3–5",
  "additionalNotes": "..."
}

Правила:
- Отмечай checked=true только если это следует из ППР или стандартной практики для данного вида работ.
- note — краткое обоснование или уточнение.
- bodyText — связный текст на русском для PDF (3–8 предложений).
- Сохраняй id пунктов чеклиста из запроса пользователя.`

export function buildWorkPermissionAiUserPrompt(args: {
  kind: string
  workTitle: string
  siteName: string
  workStages: string
  toolsAndEquipment: string
  safetyMeasures: string
  checklistIds: string
}): string {
  return [
    `Вид разрешения: ${args.kind}`,
    `Объект: ${args.siteName || '—'}`,
    `Работа (ППР): ${args.workTitle || '—'}`,
    `Этапы: ${args.workStages || '—'}`,
    `Оборудование: ${args.toolsAndEquipment || '—'}`,
    `Меры безопасности: ${args.safetyMeasures || '—'}`,
    '',
    'Чеклисты (id пунктов):',
    args.checklistIds,
  ].join('\n')
}
