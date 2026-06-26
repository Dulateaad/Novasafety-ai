import type { PprControlMeasuresDoc, PprControlMeasuresItem } from '../types/ppr'
import { titleFromFileName } from './pprAttachment'

export function controlMeasuresFileName(sourceFileName: string): string {
  const base = titleFromFileName(sourceFileName)
    .replace(/[^\w\s\-–—().,а-яА-ЯёЁ]/g, '')
    .trim()
    .slice(0, 60)
  return `Меры-контроля-${base || 'ППР'}.md`
}

export function buildControlMeasuresMarkdown(input: {
  workTitle: string
  sourceFileName: string
  items: PprControlMeasuresItem[]
  method: PprControlMeasuresDoc['method']
}): string {
  const lines: string[] = [
    `# Меры контроля опасных факторов`,
    '',
    `**Наименование работ:** ${input.workTitle || '—'}`,
    `**Источник ППР:** ${input.sourceFileName}`,
    `**Дата формирования:** ${new Date().toISOString().slice(0, 10)}`,
    `**Способ извлечения:** ${input.method === 'ai' ? 'ИИ (LLM)' : 'автоматический разбор документа'}`,
    '',
    '---',
    '',
  ]

  input.items.forEach((item, idx) => {
    lines.push(`## ${idx + 1}. ${item.section}`)
    lines.push('')
    lines.push(`**Опасный фактор / контекст:** ${item.hazard}`)
    lines.push('')
    lines.push('**Меры контроля:**')
    item.controlMeasures.forEach((m) => {
      lines.push(`- ${m}`)
    })
    lines.push('')
  })

  lines.push(
    '---',
    '',
    '_Документ сформирован автоматически NOVA Safety на основании загруженного ППР. Требуется проверка ответственным лицом ОТ/ТБ перед применением._',
  )

  return lines.join('\n')
}

export function downloadControlMeasuresDoc(doc: PprControlMeasuresDoc): void {
  const blob = new Blob([doc.markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = doc.fileName
  a.click()
  URL.revokeObjectURL(url)
}
