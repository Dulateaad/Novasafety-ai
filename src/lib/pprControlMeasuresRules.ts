import type { PprControlMeasuresItem } from '../types/ppr'

function sliceBetween(text: string, start: string, end: string): string {
  const from = text.lastIndexOf(start)
  if (from < 0) return ''
  const bodyStart = from + start.length
  const to = end ? text.indexOf(end, bodyStart) : -1
  return to >= 0 ? text.slice(bodyStart, to) : text.slice(bodyStart)
}

function splitParagraphs(block: string): string[] {
  return block
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 25 && !/^\d+\.\s*$/.test(p))
}

function extractNumberedSections(text: string, prefix: string): PprControlMeasuresItem[] {
  const re = new RegExp(`(${prefix.replace('.', '\\.')}\\d+(?:\\.\\d+)?)\\s+([^\\n]+)`, 'g')
  const items: PprControlMeasuresItem[] = []
  let match: RegExpExecArray | null
  const hits: { index: number; section: string; title: string }[] = []

  while ((match = re.exec(text)) !== null) {
    hits.push({
      index: match.index,
      section: match[1].trim(),
      title: match[2].trim(),
    })
  }

  for (let i = 0; i < hits.length; i += 1) {
    const start = hits[i].index
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length
    const body = text.slice(start, end)
    const measures = splitParagraphs(body.replace(/^[^\n]+\n/, ''))
    if (measures.length === 0) continue
    items.push({
      section: `${hits[i].section} ${hits[i].title}`,
      hazard: hits[i].title,
      controlMeasures: measures,
    })
  }

  return items
}

/** Rule-based извлечение мер контроля (fallback без LLM). */
export function extractControlMeasuresByRules(
  docText: string,
  workTitle: string,
): PprControlMeasuresItem[] {
  const items: PprControlMeasuresItem[] = []

  const safetyBlock = sliceBetween(
    docText,
    'Техника безопасности и охрана труда',
    'Требования по охране окружающей среды',
  )
  if (safetyBlock.trim()) {
    const general = splitParagraphs(safetyBlock)
    if (general.length > 0) {
      items.push({
        section: '4. Техника безопасности и охрана труда',
        hazard: 'Общие требования безопасности',
        controlMeasures: general,
      })
    }

    const zonesBlock = sliceBetween(safetyBlock, 'Опасные зоны и зонирование', 'Специфические риски')
    const zoneMeasures = splitParagraphs(zonesBlock)
    if (zoneMeasures.length > 0) {
      items.push({
        section: '4.1 Опасные зоны и зонирование',
        hazard: 'Line of Fire / опасная зона',
        controlMeasures: zoneMeasures,
      })
    }

    const riskBlock = sliceBetween(
      safetyBlock,
      'Специфические риски',
      'Требования по охране окружающей среды',
    )
    const riskLines = riskBlock
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l.length >= 15)
    const hazards = riskLines.filter(
      (l) =>
        /риск|опасност|взрыв|выброс|давлен/i.test(l) && l.length < 120,
    )
    const controls = riskLines.filter((l) => !hazards.includes(l) && l.length >= 25)
    if (hazards.length > 0 || controls.length > 0) {
      items.push({
        section: '4.2 Специфические риски',
        hazard: hazards[0] || 'Специфические риски работ',
        controlMeasures: controls.length > 0 ? controls : hazards.slice(1),
      })
    }
  }

  const opsBlock = sliceBetween(docText, 'Описание технологических операций', 'Техника безопасности')
  items.push(...extractNumberedSections(opsBlock, '3.'))

  const envBlock = sliceBetween(
    docText,
    'Требования по охране окружающей среды',
    'ПРИЛОЖЕНИЯ',
  )
  const envMeasures = splitParagraphs(envBlock)
  if (envMeasures.length > 0) {
    items.push({
      section: '5. Требования по охране окружающей среды',
      hazard: 'Воздействие на окружающую среду',
      controlMeasures: envMeasures,
    })
  }

  if (items.length === 0) {
    const fallback = splitParagraphs(docText).slice(0, 12)
    if (fallback.length > 0) {
      items.push({
        section: workTitle || 'ППР',
        hazard: 'Общие меры контроля',
        controlMeasures: fallback,
      })
    }
  }

  return items
}
