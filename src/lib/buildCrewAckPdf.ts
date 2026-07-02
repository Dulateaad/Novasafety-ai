import type { DemoUser, Permit } from '../types/domain'
import { buildAbrPdf } from './buildAbrPdf'
import { buildNeboshRiskPdf, prepareNeboshFormForPdf } from './buildNeboshRiskPdf'
import { mergePdfBase64 } from './mergePdfBase64'
import {
  applyAbrHeaderFromPprNd,
  mergeAbrPeopleFromNd,
} from './prefillAbrFromPackage'
import { resolveUserBadgeNo } from './userBadgeNumbers'

async function sha256HexFromBase64(b64: string): Promise<string> {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** PDF для ознакомления бригады: АБР + Оценка Риска. */
export async function buildCrewAckPackagePdf(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[],
): Promise<{ base64: string; fileName: string; documentHash: string }> {
  const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
  const resolveBadge = (uid: string) => resolveUserBadgeNo(uid, directory)
  const title = permit.asor?.shortTitleForNarjad || permit.title || 'Оценка Риска'

  const parts: string[] = []
  const rawAbr = permit.asor?.abr
  if (rawAbr?.stages?.length) {
    let abr = rawAbr
    if (permit.ppr) {
      abr = applyAbrHeaderFromPprNd(abr, permit.ppr, permit)
    }
    abr = mergeAbrPeopleFromNd(abr, permit, resolveName, resolveBadge)
    const { base64 } = await buildAbrPdf(abr, permit.abrDailyAcks, {
      permit,
      resolveUser,
      directory,
    })
    parts.push(base64)
  }

  const asor = prepareNeboshFormForPdf(permit, resolveUser, directory)
  if (asor) {
    const { base64 } = await buildNeboshRiskPdf(asor, title, { permit, resolveUser })
    parts.push(base64)
  }

  if (parts.length === 0) {
    throw new Error('Нет сформированных АБР и оценки Риска для ознакомления')
  }

  const base64 = parts.length === 1 ? parts[0]! : await mergePdfBase64(parts)
  const documentHash = await sha256HexFromBase64(base64)
  const reg = permit.registrationRefNo || permit.id.slice(0, 8)
  return {
    base64,
    fileName: `Ознакомление-АБР-ОР-${reg.replace(/\s+/g, '-')}.pdf`,
    documentHash,
  }
}
