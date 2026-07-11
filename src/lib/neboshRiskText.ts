const RISK_BAND_WORD =
  '(?:low|medium|high|низкий|средний|высокий|LOW|MEDIUM|HIGH|НИЗКИЙ|СРЕДНИЙ|ВЫСОКИЙ)'

/** Убирает подписи остаточного риска в скобках: (low), (medium), (high) и т.п. */
export function sanitizeNeboshRiskAnnotations(text: string): string {
  if (!text?.trim()) return ''

  let cleaned = text
    .replace(
      new RegExp(
        `\\(\\s*${RISK_BAND_WORD}(?:\\s*[,;/]\\s*${RISK_BAND_WORD})*\\s*\\)`,
        'gi',
      ),
      '',
    )
    .replace(/\(\s*остаточн[^)]*\)/gi, '')
    .replace(/\(\s*residual\s+risk[^)]*\)/gi, '')
    .replace(
      new RegExp(
        `[,;]?\\s*(?:остаточн\\w*|residual\\s+risk)\\s*[:—-]?\\s*${RISK_BAND_WORD}\\s*`,
        'gi',
      ),
      '',
    )
    .replace(/\b(LOW|MEDIUM|HIGH)\s*\(\s*\d+\s*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,;.])/g, '$1')

  return cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false
      if (/^\(?\s*остаточн/i.test(line)) return false
      if (/^\(?\s*residual\s+risk/i.test(line)) return false
      if (
        new RegExp(
          `^\\(?\\s*${RISK_BAND_WORD}(?:\\s*[,;/]\\s*${RISK_BAND_WORD})*\\s*\\)?$`,
          'i',
        ).test(line)
      ) {
        return false
      }
      if (/^\s*(LOW|MEDIUM|HIGH)\s*\(\s*\d+\s*\)\s*$/i.test(line)) return false
      return true
    })
    .join('\n')
    .trim()
}
