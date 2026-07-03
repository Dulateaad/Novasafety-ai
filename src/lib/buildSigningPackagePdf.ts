import type { DemoUser, PackagePdfDocument, Permit } from '../types/domain'
import type { AbrForm } from '../types/abr'
import type { EgovSignRole } from '../types/egovSignature'
import { EGOV_ROLE_LABELS } from '../types/egovSignature'
import { buildAbrPdf } from './buildAbrPdf'
import { buildNeboshRiskPdf, prepareNeboshFormForPdf } from './buildNeboshRiskPdf'
import {
  buildFormalPackagePdfContent,
  FORMAL_PDF_STYLES,
} from './formalPackagePdfContent'
import { initPdfMake, pdfBase64Async } from './pdfMakeEngine'
import { mergePdfBase64 } from './mergePdfBase64'
import {
  applyAbrHeaderFromPprNd,
  mergeAbrPeopleFromNd,
} from './prefillAbrFromPackage'
import { resolveUserBadgeNo } from './userBadgeNumbers'
import { workPermissionDocumentsForSigningPackage } from './workPermissions'

export type PackagePdfPart = 'ndpr' | 'abr' | 'risk'

async function sha256HexFromBase64(b64: string): Promise<string> {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function prepareAbrForPermit(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[],
): AbrForm | null {
  const raw = permit.asor?.abr
  if (!raw?.stages?.length) return null
  const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
  const resolveBadge = (uid: string) => resolveUserBadgeNo(uid, directory)
  let abr = raw
  if (permit.ppr) {
    abr = applyAbrHeaderFromPprNd(abr, permit.ppr, permit)
  }
  return mergeAbrPeopleFromNd(abr, permit, resolveName, resolveBadge)
}

function prepareNeboshForPermit(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[],
): Permit['asor'] | null {
  return prepareNeboshFormForPdf(permit, resolveUser, directory)
}

async function buildNdprSectionBase64(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  opts?: { role?: EgovSignRole; signerName?: string },
): Promise<string> {
  const pdfMake = await initPdfMake()
  const content = buildFormalPackagePdfContent(permit, resolveUser)

  if (opts?.role && opts.signerName) {
    content.push({
      margin: [0, 14, 0, 0],
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: 'Подписание ЭЦП',
              bold: true,
              fontSize: 10,
              fillColor: '#1F4E79',
              color: '#ffffff',
              margin: [6, 4, 6, 4],
            },
          ],
          [
            {
              margin: [6, 4, 6, 4],
              fontSize: 9,
              stack: [
                { text: `Роль: ${EGOV_ROLE_LABELS[opts.role]}` },
                { text: `Подписант: ${opts.signerName}` },
                { text: `Дата формирования: ${new Date().toLocaleString('ru-RU')}` },
              ],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
      },
    })
  }

  return pdfBase64Async(pdfMake, {
    pageSize: 'A4',
    pageMargins: [40, 36, 40, 36],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles: FORMAL_PDF_STYLES,
    content,
  })
}

function regSlug(permit: Permit): string {
  return (permit.registrationRefNo || permit.id.slice(0, 8)).replace(/\s+/g, '-')
}

/** Отдельный PDF: только НДПР, АБР или Оценка Риска. */
export async function buildPermitPackagePartPdf(
  part: PackagePdfPart,
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[],
): Promise<PackagePdfDocument> {
  const reg = regSlug(permit)

  if (part === 'ndpr') {
    const pdfBase64 = await buildNdprSectionBase64(permit, resolveUser)
    return {
      fileName: `NDPR-${reg}-НДПР.pdf`,
      generatedAtIso: new Date().toISOString(),
      pdfBase64,
      documentHash: await sha256HexFromBase64(pdfBase64),
    }
  }

  if (part === 'abr') {
    const abr = prepareAbrForPermit(permit, resolveUser, directory)
    if (!abr) throw new Error('АБР не оформлен для этого наряда')
    const { base64, fileName } = await buildAbrPdf(abr, permit.abrDailyAcks, {
      permit,
      resolveUser,
      directory,
    })
    return {
      fileName,
      generatedAtIso: new Date().toISOString(),
      pdfBase64: base64,
      documentHash: await sha256HexFromBase64(base64),
    }
  }

  const asor = prepareNeboshForPermit(permit, resolveUser, directory)
  if (!asor) {
    throw new Error('Оценка Риска не оформлена для этого наряда')
  }
  const title = asor.shortTitleForNarjad || permit.title || 'Оценка Риска'
  const { base64, fileName } = await buildNeboshRiskPdf(asor, title, { permit, resolveUser })
  return {
    fileName,
    generatedAtIso: new Date().toISOString(),
    pdfBase64: base64,
    documentHash: await sha256HexFromBase64(base64),
  }
}

/**
 * Полный PDF для подписания и скачивания: НДПР (сводка) + АБР + Оценка Риска.
 */
export async function buildSigningPackagePdf(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[],
  opts?: { role?: EgovSignRole; signerName?: string },
): Promise<PackagePdfDocument> {
  const abr = prepareAbrForPermit(permit, resolveUser, directory)
  const asor = prepareNeboshForPermit(permit, resolveUser, directory)
  const permDocs = workPermissionDocumentsForSigningPackage(permit)

  const [ndprBase64, abrResult, riskResult, permBase64s] = await Promise.all([
    buildNdprSectionBase64(permit, resolveUser, opts),
    abr
      ? buildAbrPdf(abr, permit.abrDailyAcks, { permit, resolveUser, directory }).then(
          (r) => r.base64,
        )
      : Promise.resolve(null as string | null),
    asor
      ? buildNeboshRiskPdf(
          asor,
          asor.shortTitleForNarjad || permit.title || 'Оценка Риска',
          { permit, resolveUser },
        ).then((r) => r.base64)
      : Promise.resolve(null as string | null),
    (async () => {
      if (!permDocs.length) return [] as string[]
      const { buildWorkPermissionPdf } = await import('./buildWorkPermissionPdf')
      const pdfMake = await initPdfMake()
      const permPdfOpts = { includeClosureSection: permit.status === 'closed' }
      return Promise.all(
        permDocs.map(async (doc) => {
          const { base64 } = await buildWorkPermissionPdf(doc, pdfMake, permPdfOpts)
          return base64
        }),
      )
    })(),
  ])

  const parts: string[] = [ndprBase64]
  if (abrResult) parts.push(abrResult)
  if (riskResult) parts.push(riskResult)
  parts.push(...permBase64s)

  const pdfBase64 = parts.length === 1 ? parts[0]! : await mergePdfBase64(parts)
  const documentHash = await sha256HexFromBase64(pdfBase64)
  const reg = regSlug(permit)
  const hasRisk = Boolean(asor)
  const suffix =
    abr && hasRisk
      ? 'полный-пакет'
      : abr
        ? 'НДПР-АБР'
        : hasRisk
          ? 'НДПР-ОР'
          : 'НДПР'
  const fileName = `NDPR-${reg}-${suffix}.pdf`

  return {
    fileName,
    generatedAtIso: new Date().toISOString(),
    pdfBase64,
    documentHash,
  }
}
