const SAFETY_LINE =
  /техник.*безопас|опасн|мер.*контрол|риск|oh&s|hse|охран.*труд|запрет|требован|simops|зпо|огнев/i

/** Сжимает длинный текст ППР — приоритет разделам ОТ/ТБ (быстрее Gemini). */
export function prioritizeSafetyText(full: string, maxLen = 14000): string {
  const text = full.trim()
  if (text.length <= maxLen) return text

  const head = text.slice(0, 5000)
  const tail = text.slice(-2500)
  const budget = maxLen - head.length - tail.length - 80

  const lines = text.split('\n')
  const picked: string[] = []
  let size = 0
  for (const line of lines) {
    if (!SAFETY_LINE.test(line)) continue
    const chunk = line.trim()
    if (!chunk) continue
    if (size + chunk.length + 1 > budget) break
    picked.push(chunk)
    size += chunk.length + 1
  }

  const mid = picked.length > 0 ? picked.join('\n') : text.slice(5000, 5000 + budget)
  return `${head}\n\n…[фрагменты по ОТ/ТБ]…\n\n${mid}\n\n…[конец документа]…\n\n${tail}`.slice(
    0,
    maxLen,
  )
}

/** Сжимает длинный ППР — приоритет разделам с оборудованием и инструментами. */
export function prioritizeEquipmentText(full: string, maxLen = 80000): string {
  const text = full.trim()
  if (text.length <= maxLen) return text

  const opsMatch = text.match(
    /(?:^|\n)\s*3\.1\s+[\s\S]*?(?=(?:^|\n)\s*(?:приложени|appendix)\s*$|\n\s*attachment\s+markup)/im,
  )
  const safetyMatch = text.match(
    /(?:техника\s+безопасности|health\s+and\s+safety|требования\s+безопасности|оборудование\s+и\s+инструменты\s+должны)([\s\S]{0,14000})/i,
  )
  const tableMatch = text.match(
    /(?:инструменты?\s+и\s+оборудование|tools?\s+and\s+equipment)([\s\S]{0,8000}?)(?:\n\s*3\.1|\n\s*описание\s+технолог|$)/i,
  )

  const focused = [tableMatch?.[0], opsMatch?.[0], safetyMatch?.[0]].filter(Boolean).join('\n\n')
  if (!focused) {
    return text.slice(0, maxLen)
  }

  const head = text.slice(0, 2500)
  const room = maxLen - head.length - 80
  return `${head}\n\n…[оборудование: операции и ТБ]…\n\n${focused.slice(0, room)}`
}

const RISK_LINE =
  /опасн|риск|угроз|авар|выброс|взрыв|отрав|ожог|разгермет|давлен|газоопас|line of fire|зона|loto|блокиров|сброс|пиг|факел|азот|опрессов|larн|spill|эколог/i

/** Сжимает ППР для оценки рисков — приоритет операциям 3.x, ТБ/HSE и аварийным сценариям. */
export function prioritizeRiskAssessmentText(full: string, maxLen = 70000): string {
  const text = full.trim()
  if (text.length <= maxLen) return text

  const opsMatch = text.match(
    /(?:^|\n)\s*3\.1\s+[\s\S]*?(?=(?:^|\n)\s*(?:приложени|appendix)\s*$|\n\s*attachment\s+markup)/im,
  )
  const safetyMatch = text.match(
    /(?:техника\s+безопасности|health\s+and\s+safety|требования\s+безопасности|оборудование\s+и\s+инструменты\s+должны|опасные\s+зоны)([\s\S]{0,18000})/i,
  )
  const stagesMatch = text.match(
    /(?:этапы\s+выполнения\s+работ|stages?\s+of\s+work)([\s\S]{0,6000})/i,
  )

  const focused = [stagesMatch?.[0], opsMatch?.[0], safetyMatch?.[0]].filter(Boolean).join('\n\n')
  if (!focused) {
    const head = text.slice(5500, 5500 + maxLen - 3000)
    const riskLines: string[] = []
    for (const line of text.split('\n')) {
      if (!RISK_LINE.test(line)) continue
      const chunk = line.trim()
      if (chunk.length < 12) continue
      riskLines.push(chunk)
      if (riskLines.join('\n').length > 8000) break
    }
    return `${head}\n\n…[риски из документа]…\n\n${riskLines.join('\n')}`.slice(0, maxLen)
  }

  const head = text.slice(0, 2500)
  const room = maxLen - head.length - 80
  return `${head}\n\n…[операции и оценка рисков]…\n\n${focused.slice(0, room)}`
}
