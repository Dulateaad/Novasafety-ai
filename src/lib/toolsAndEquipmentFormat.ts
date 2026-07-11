const SECTION_HEADER =
  /^(?:инструменты?\s+и\s+оборудование|tools?\s+and\s+equipment|equipment\s+and\s+tools|plant\s+and\s+equipment|участники|этапы?\s+выполнения|описание\s+технолог)/i

const INSTRUCTION_LINE =
  /\b(?:должен|должны|необходимо|следует|обязан|запрещ|при\s+проведении|при\s+выполнении|использовать\s+только|перед\s+началом)\b/i

const ADMIN_OR_DOC_JUNK =
  /\b(?:документ|инструкц|паспорт|сертификат|удостоверен|лиценз|разрешени|согласован|журнал|блокнот|приказ|протокол|акт\b|наряд|допуск|обучени|инструтаж|брифинг)\b/i

const WORK_ACTION_START =
  /^(?:\d+[.)]\s*)?(?:подготовительн(?:ые\s+)?работ|организаци(?:я|и)|очистк(?:а|и)|монтаж|демонтаж|спуск|пуск|проведени|выполнени|замен(?:а|ы)|ремонт|установк(?:а|и)|контрол(?:ь|я)|проверк(?:а|и)|испытани|продувк|опрессов|отключени|подключени|вывоз|транспортировк|накоплени|заполнени|опорожнени|герметизаци|изоляци|маркировк|ограждени|согласовани(?:е|я)|взаимодействи)/i

const WORK_CONTEXT =
  /\b(?:перед\s+(?:запуском|при[её]мом|началом|проведением)|при\s+помощи|в\s+ходе\s+работ|после\s+завершения|в\s+процессе|на\s+(?:скважин(?:е|ы)?|сборн(?:ой|ая)\s+станци|участк(?:е|а)|объект(?:е|а)|площадк(?:е|а)))\b/i

/** Убирает маркеры списка и лишнюю пунктуацию. */
export function sanitizeToolsAndEquipmentItem(raw: string): string {
  let t = raw.replace(/\s+/g, ' ').trim()
  t = t.replace(/^[-–—•·*\u2022\d.)]+\s*/, '')
  t = t.replace(/^[«"']|[»"']$/g, '')
  t = t.replace(/[.;,\s]+$/g, '')
  t = t.replace(/\s+и\s+т\.?\s*п\.?\s*$/i, '')
  return t.trim()
}

/** Проверяет, что строка — наименование инструмента/оборудования, а не абзац или заголовок. */
export function isValidToolsAndEquipmentItem(raw: string): boolean {
  const t = sanitizeToolsAndEquipmentItem(raw)
  if (t.length < 2 || t.length > 120) return false
  if (SECTION_HEADER.test(t)) return false
  if (ADMIN_OR_DOC_JUNK.test(t)) return false
  if (WORK_ACTION_START.test(t)) return false
  if (WORK_CONTEXT.test(t)) return false
  if (INSTRUCTION_LINE.test(t) && t.length > 40) return false
  const wordCount = t.split(/\s+/).length
  if (wordCount > 8) return false
  if (/^\d+\.\d+/.test(t)) return false
  if (/^(?:раздел|пункт|п\.?\s*\d)/i.test(t)) return false
  return true
}

/** Разбивает текст инструментов/оборудования на пункты списка. */
export function parseToolsAndEquipmentList(raw: string): string[] {
  if (!raw.trim()) return []

  const seen = new Set<string>()
  const out: string[] = []

  for (const line of raw.split(/\n+/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const parts = trimmed.split(/[;|]/).flatMap((segment) =>
      segment.split(/,(?![^()]*\))/),
    )

    for (const part of parts) {
      const item = sanitizeToolsAndEquipmentItem(part)
      if (!isValidToolsAndEquipmentItem(item)) continue
      const key = item.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
  }

  return out
}

/** Один пункт — одна строка. */
export function formatToolsAndEquipmentAsList(raw: string): string {
  return parseToolsAndEquipmentList(raw).join('\n')
}

export function normalizeToolsAndEquipmentText(raw: string): string {
  return formatToolsAndEquipmentAsList(raw.trim())
}

/** Объединяет списки из ППР (раздел документа + ответ ИИ), без дубликатов. */
export function mergeToolsAndEquipmentSources(
  ...sources: Array<string | undefined | null>
): string {
  const seen = new Set<string>()
  const out: string[] = []

  for (const source of sources) {
    if (!source?.trim()) continue
    for (const item of parseToolsAndEquipmentList(source)) {
      const key = item.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
  }

  return out.join('\n')
}

function normToolKey(raw: string): string {
  return sanitizeToolsAndEquipmentItem(raw).toLowerCase()
}

/** Убирает из списка инструментов названия этапов работ (часто попадают из ответа ИИ). */
export function filterToolsAgainstWorkTasks(
  toolsRaw: string,
  workTexts: Array<string | undefined | null>,
): string {
  const forbidden = new Set<string>()
  for (const raw of workTexts) {
    if (!raw?.trim()) continue
    for (const line of raw.split(/\n+/)) {
      const t = sanitizeToolsAndEquipmentItem(line)
      if (t.length < 10) continue
      forbidden.add(normToolKey(t))
      const head = t.split(/\.\s+/)[0]?.trim() ?? t
      if (head.length >= 10) forbidden.add(normToolKey(head))
    }
  }

  const seen = new Set<string>()
  const out: string[] = []
  for (const item of parseToolsAndEquipmentList(toolsRaw)) {
    const key = normToolKey(item)
    if (seen.has(key)) continue
    let skip = false
    for (const f of forbidden) {
      if (f === key || (key.length >= 14 && (f.includes(key) || key.includes(f)))) {
        skip = true
        break
      }
    }
    if (skip) continue
    seen.add(key)
    out.push(item)
  }
  return out.join('\n')
}
