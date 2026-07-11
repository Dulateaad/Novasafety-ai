const PDF_CHECKBOX = {
  border: '#8a9bb0',
  emptyFill: '#ffffff',
  checkStroke: '#ffffff',
} as const

/** Квадратная галочка для pdfmake (как в веб-таблицах разрешений). */
export function pdfCheckboxSvg(
  checked: boolean,
  opts?: { size?: number; accentColor?: string },
): string {
  const size = opts?.size ?? 12
  const accent = opts?.accentColor ?? '#2196f3'
  if (!checked) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="${size}" height="${size}">
      <rect x="0.75" y="0.75" width="12.5" height="12.5" rx="2" fill="${PDF_CHECKBOX.emptyFill}" stroke="${PDF_CHECKBOX.border}" stroke-width="1.25"/>
    </svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="${size}" height="${size}">
    <rect x="0.75" y="0.75" width="12.5" height="12.5" rx="2" fill="${accent}" stroke="${accent}" stroke-width="1.25"/>
    <path d="M3.6 7.1 6.1 9.6 10.4 4.8" fill="none" stroke="${PDF_CHECKBOX.checkStroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

/** Ячейка таблицы с центрированной галочкой. */
export function buildPdfCheckboxCell(
  checked: boolean,
  fillColor = '#FFFFFF',
  accentColor?: string,
): Record<string, unknown> {
  return {
    alignment: 'center',
    fillColor,
    margin: [0, 3, 0, 3],
    stack: [
      {
        svg: pdfCheckboxSvg(checked, { accentColor }),
        width: 12,
        height: 12,
        alignment: 'center',
      },
    ],
  }
}

/** Строка «галочка + подпись» для списков в PDF. */
export function buildPdfCheckboxLine(
  checked: boolean,
  label: string,
  opts?: { fontSize?: number; accentColor?: string; note?: string },
): Record<string, unknown> {
  const note = opts?.note?.trim() ? ` ${opts.note.trim()}` : ''
  return {
    columns: [
      {
        width: 14,
        stack: [
          {
            svg: pdfCheckboxSvg(checked, { accentColor: opts?.accentColor }),
            width: 12,
            height: 12,
            margin: [0, 1, 0, 0],
          },
        ],
      },
      {
        width: '*',
        text: `${label}${note}`,
        fontSize: opts?.fontSize ?? 7.5,
      },
    ],
    columnGap: 5,
    margin: [0, 0, 0, 2],
  }
}

/** Две галочки с подписями (категория разрешения и т.п.). */
export function buildPdfCheckboxChoiceCell(
  choices: { label: string; checked: boolean }[],
  opts?: { fillColor?: string; accentColor?: string; fontSize?: number },
): Record<string, unknown> {
  const fillColor = opts?.fillColor ?? '#FFFFFF'
  const accentColor = opts?.accentColor
  const fontSize = opts?.fontSize ?? 7.5
  const columns: Record<string, unknown>[] = []
  for (let i = 0; i < choices.length; i += 1) {
    const choice = choices[i]!
    columns.push({
      width: 14,
      stack: [
        {
          svg: pdfCheckboxSvg(choice.checked, { accentColor }),
          width: 12,
          height: 12,
          alignment: 'center',
        },
      ],
    })
    columns.push({
      width: 'auto',
      text: choice.label,
      fontSize,
      margin: [2, 2, i < choices.length - 1 ? 14 : 0, 0],
    })
  }
  return {
    alignment: 'center',
    fillColor,
    columns,
  }
}
