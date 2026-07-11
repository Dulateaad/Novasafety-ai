/** Перенос строк только по пробелам — pdfmake иначе рвёт кириллицу посередине слова. */
export function wrapTextAtWords(text: string, maxCharsPerLine: number): string {
  if (!text?.trim()) return text || ''
  if (maxCharsPerLine < 6) return text

  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => wrapParagraphAtWords(line, maxCharsPerLine))
    .join('\n')
}

function wrapParagraphAtWords(paragraph: string, maxChars: number): string {
  const trimmed = paragraph.trim()
  if (!trimmed) return ''
  if (trimmed.length <= maxChars) return trimmed

  const words = trimmed.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    if (!line) {
      if (word.length <= maxChars) {
        line = word
      } else {
        lines.push(...splitLongToken(word, maxChars))
      }
      continue
    }

    const candidate = `${line} ${word}`
    if (candidate.length <= maxChars) {
      line = candidate
      continue
    }

    lines.push(line)
    if (word.length <= maxChars) {
      line = word
    } else {
      lines.push(...splitLongToken(word, maxChars))
      line = ''
    }
  }

  if (line) lines.push(line)
  return lines.join('\n')
}

function splitLongToken(token: string, maxChars: number): string[] {
  const chunks: string[] = []
  let rest = token
  while (rest.length > maxChars) {
    chunks.push(rest.slice(0, maxChars))
    rest = rest.slice(maxChars)
  }
  if (rest) chunks.push(rest)
  return chunks
}
