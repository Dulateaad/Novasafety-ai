import { createHash } from 'crypto'
import { createRequire } from 'module'
import PDFDocument from 'pdfkit'

const nodeRequire = createRequire(__filename)

const HSE_SECTION_TITLE = 'Мероприятия по ОТ, ТБ и ООС'

const ROLE_LABELS: Record<string, string> = {
  performer: 'Производитель работ (составитель)',
  permitter: 'Допускающий',
  issuer: 'Выдающий НД',
  leadExpert: 'Утверждающий НД',
}

function resolveDejaVuFonts(): { regular: string; bold: string } {
  return {
    regular: nodeRequire.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'),
    bold: nodeRequire.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf'),
  }
}

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

function line(doc: PDFKit.PDFDocument, text: string, opts?: { bold?: boolean }) {
  doc.font(opts?.bold ? 'DejaVu-Bold' : 'DejaVu').fontSize(opts?.bold ? 11 : 10)
  doc.text(text, { lineGap: 2 })
}

/** PDF-пакет НДПР для подписи ЭЦП (промышленный формат). */
export async function buildNdprSigningPdf(input: {
  permit: Record<string, unknown>
  role: string
  signerName: string
  signerUid: string
}): Promise<{ pdf: Buffer; documentHash: string }> {
  const p = input.permit
  const regNo = String(p.registrationRefNo ?? '—')
  const title = String(p.title ?? '')
  const site = String(p.siteName ?? '')
  const workDesc = String(p.workDescription ?? '').slice(0, 6000)

  const fonts = resolveDejaVuFonts()

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('error', reject)
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks)
      resolve({ pdf, documentHash: sha256Hex(pdf) })
    })

    try {
      doc.registerFont('DejaVu', fonts.regular)
      doc.registerFont('DejaVu-Bold', fonts.bold)
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
      return
    }

    doc.font('DejaVu-Bold').fontSize(14).text('NOVA Safety — НДПР / пакет согласования', {
      align: 'center',
    })
    doc.moveDown(0.5)
    line(doc, `Рег. №: ${regNo}`)
    line(doc, `Наименование: ${title}`)
    line(doc, `Объект: ${site}`)
    line(doc, `Категория: ${String(p.category ?? '—')}`)
    line(doc, `Статус: ${String(p.status ?? '—')}`)
    doc.moveDown(0.5)
    line(doc, `Подписывающая роль: ${ROLE_LABELS[input.role] ?? input.role}`, {
      bold: true,
    })
    line(doc, `Подписант (учётная запись): ${input.signerName}`)
    line(doc, `UID: ${input.signerUid}`)
    line(doc, `Дата формирования PDF: ${new Date().toISOString()}`)
    doc.moveDown()
    line(doc, '— Описание работ —', { bold: true })
    line(doc, workDesc || '—')

    const ppr = p.ppr as {
      tasks?: { taskTitle?: string; workContent?: string; safetyMeasures?: string }[]
      attachment?: { fileName?: string; sizeBytes?: number }
      workTitle?: string
    } | undefined
    if (ppr?.attachment?.fileName) {
      line(doc, `Приложен файл ППР: ${ppr.attachment.fileName}`, { bold: true })
      if (ppr.attachment.sizeBytes) {
        line(doc, `Размер: ${ppr.attachment.sizeBytes} bytes`)
      }
      doc.moveDown(0.5)
    }
    if (ppr?.workTitle?.trim()) {
      line(doc, `ППР: ${ppr.workTitle.trim()}`)
    }
    if (ppr?.tasks?.length) {
      doc.moveDown()
      line(doc, '— ППР (задания) —', { bold: true })
      ppr.tasks.forEach((t, i) => {
        line(doc, `${i + 1}. ${t.taskTitle || `Задание ${i + 1}`}`)
        if (t.workContent?.trim()) line(doc, `   ${t.workContent.trim()}`)
        if (t.safetyMeasures?.trim()) line(doc, `   Меры: ${t.safetyMeasures.trim()}`)
      })
    }

    const asor = p.asor as {
      tasks?: { taskTitle?: string; hazards?: { factorDescription?: string }[] }[]
    } | undefined
    if (asor?.tasks?.length) {
      doc.moveDown()
      line(doc, `— ${HSE_SECTION_TITLE} —`, { bold: true })
      asor.tasks.forEach((t, ti) => {
        line(doc, `${ti + 1}. ${t.taskTitle || `Задание ${ti + 1}`}`)
        t.hazards?.forEach((h, hi) => {
          if (h.factorDescription?.trim()) {
            line(doc, `   Фактор ${hi + 1}: ${h.factorDescription.trim()}`)
          }
        })
      })
    }

    doc.moveDown()
    line(
      doc,
      'Подпись ЭЦП через eGov Mobile подтверждает ознакомление и согласование пакета НДПР.',
    )
    doc.end()
  })
}

export function pdfToBase64(pdf: Buffer): string {
  return pdf.toString('base64')
}
