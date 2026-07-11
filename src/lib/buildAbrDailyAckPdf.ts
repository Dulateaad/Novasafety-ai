import type { DemoUser, Permit } from '../types/domain'
import { initPdfMake, pdfBase64Async } from './pdfMakeEngine'

async function sha256HexFromBase64(b64: string): Promise<string> {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Одностраничный PDF для ежедневного ознакомления работника с АБР. */
export async function buildAbrDailyAckPdf(
  permit: Permit,
  worker: DemoUser,
  roleLabel: string,
  dateIso: string,
): Promise<{ base64: string; fileName: string; documentHash: string }> {
  const pdfMake = await initPdfMake()
  const reg = permit.registrationRefNo || permit.id.slice(0, 8)
  const title = permit.asor?.shortTitleForNarjad || permit.title || 'АБР'
  const signedLabel = new Date().toLocaleDateString('ru-RU')

  const doc = {
    pageSize: 'A4',
    pageMargins: [48, 56, 48, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content: [
      { text: 'Ежедневное ознакомление с АБР', style: 'title' },
      {
        text: `Наряд-допуск № ${reg} · ${dateIso}`,
        margin: [0, 0, 0, 12],
        color: '#444',
      },
      {
        text: `Наименование работ: ${title}`,
        margin: [0, 0, 0, 16],
      },
      {
        table: {
          widths: ['32%', '*'],
          body: [
            ['Ф.И.О.', worker.displayName],
            ['Должность', roleLabel],
            ['Дата ознакомления', signedLabel],
          ].map(([k, v]) => [
            { text: k, bold: true, fillColor: '#eef3fb' },
            { text: v },
          ]),
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 16],
      },
      {
        text: 'Настоящим подтверждаю, что я ознакомлен(а) с актуальным анализом безопасности работ (АБР) по данному наряду-допуску и понимаю опасные факторы и меры защиты на текущую смену.',
        italics: true,
        margin: [0, 0, 0, 24],
      },
      {
        columns: [
          { width: '*', text: 'Подпись работника:', bold: true },
          { width: '45%', text: '\n\n_________________________', alignment: 'center' },
        ],
      },
    ],
    styles: {
      title: { fontSize: 14, bold: true, color: '#0b2147', margin: [0, 0, 0, 8] },
    },
  }

  const base64 = await pdfBase64Async(pdfMake, doc)
  const documentHash = await sha256HexFromBase64(base64)
  return {
    base64,
    fileName: `ABR-daily-${reg.replace(/\s+/g, '-')}-${dateIso}.pdf`,
    documentHash,
  }
}
