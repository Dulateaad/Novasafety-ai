export type WorkStageBlock = {
  title: string
  body: string
}

/** Разбор текста этапов: «1. Название» + описание на следующих строках. */
export function parseWorkStagesBlocks(text: string): WorkStageBlock[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const chunks = trimmed.split(/\n\n+/)
  const blocks: WorkStageBlock[] = []

  for (const chunk of chunks) {
    const lines = chunk.split('\n')
    const first = lines[0]?.trim() ?? ''
    const isNumberedTitle = /^\d+[.)]\s+/.test(first)

    if (isNumberedTitle && lines.length > 1) {
      blocks.push({
        title: first,
        body: lines.slice(1).join('\n').trim(),
      })
      continue
    }

    if (isNumberedTitle) {
      blocks.push({ title: first, body: '' })
      continue
    }

    if (first) {
      blocks.push({ title: first, body: lines.slice(1).join('\n').trim() })
    }
  }

  return blocks.filter((b) => b.title || b.body)
}

/** Только заголовки этапов «1. …» без текста описания. */
export function listWorkStageTitles(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const fromBlocks = parseWorkStagesBlocks(trimmed)
    .map((b) => b.title.trim())
    .filter(Boolean)
  if (fromBlocks.length > 1) return fromBlocks

  const byNumberedLine = trimmed
    .split(/\n(?=\d+[.)]\s)/)
    .map((s) => s.trim().split('\n')[0]?.trim())
    .filter((s): s is string => Boolean(s))
  if (byNumberedLine.length > 1) return byNumberedLine

  if (fromBlocks.length === 1) return fromBlocks

  const first = trimmed.split('\n')[0]?.trim()
  return first ? [first] : []
}

export function workStagesTitlesText(text: string): string {
  return listWorkStageTitles(text).join('\n')
}
