import { fromBER } from 'asn1js'
import { ContentInfo, SignedData, Certificate } from 'pkijs'

export interface CmsSignerInfo {
  subjectDn: string
  commonName: string
  iin: string | null
  serialNumber: string | null
}

function normalizeCmsBase64(cmsBase64: string): string {
  return cmsBase64.replace(/\s+/g, '')
}

function dnFieldValue(tv: {
  value: { valueBlock: { value: unknown } }
}): string {
  const raw = tv.value.valueBlock.value
  if (typeof raw === 'string') return raw
  if (raw instanceof Uint8Array) return Buffer.from(raw).toString('utf8')
  if (Array.isArray(raw)) return Buffer.from(raw).toString('utf8')
  return String(raw ?? '')
}

function pickSignerCertificate(signedData: SignedData): Certificate | null {
  if (signedData.certificates && signedData.certificates.length > 0) {
    return signedData.certificates[0] as Certificate
  }
  return null
}

/** Извлекает данные подписанта из CMS (PKCS#7) DER/base64. */
export function parseCmsSigner(cmsBase64: string): CmsSignerInfo {
  const normalized = normalizeCmsBase64(cmsBase64)
  const der = Buffer.from(normalized, 'base64')
  const asn1 = fromBER(der)
  if (asn1.offset === -1) {
    throw new Error('CMS: некорректный DER')
  }
  const contentInfo = new ContentInfo({ schema: asn1.result })
  const signedData = new SignedData({ schema: contentInfo.content })

  const cert = pickSignerCertificate(signedData)
  if (!cert) {
    throw new Error('CMS: сертификат подписанта не найден')
  }

  const subjectParts = cert.subject.typesAndValues.map((tv) => {
    const type = tv.type
    const value = dnFieldValue(tv)
    return `${type}=${value}`
  })
  const subjectDn = subjectParts.join(', ')
  const cnTv = cert.subject.typesAndValues.find((tv) => String(tv.type).includes('2.5.4.3'))
  const cn = cnTv ? dnFieldValue(cnTv) : ''
  const serialTv = cert.subject.typesAndValues.find((tv) =>
    String(tv.type).includes('2.5.4.5'),
  )
  const serial = serialTv ? dnFieldValue(serialTv) : null

  const iin = extractIin(subjectDn, cn, serial)

  return {
    subjectDn,
    commonName: String(cn),
    iin,
    serialNumber: serial ? String(serial) : null,
  }
}

function extractIin(
  subjectDn: string,
  cn: string,
  serial: string | null,
): string | null {
  const sources = [subjectDn, cn, serial ?? '']
  for (const s of sources) {
    const m =
      s.match(/\bIIN(\d{12})\b/i) ??
      s.match(/\bИИН[:\s]*(\d{12})\b/i) ??
      s.match(/\bserialNumber=IIN(\d{12})\b/i)
    if (m) return m[1]
    const bare = s.match(/\b(\d{12})\b/)
    if (bare && /^(19|20)\d{2}/.test(bare[1].slice(0, 4) === '19' ? bare[1] : bare[1])) {
      const digits = bare[1]
      const year = Number(digits.slice(0, 2))
      if (year >= 0 && year <= 99) return digits
    }
  }
  if (serial) {
    const clean = serial.replace(/\D/g, '')
    if (clean.length === 12) return clean
  }
  return null
}

/** Проверка CMS через SIGEX (разбор + регистрация подписи). */
export async function verifyCmsViaSigex(
  cmsBase64: string,
  sigexBaseUrl: string,
): Promise<{ ok: boolean; detail?: string }> {
  const base = sigexBaseUrl.replace(/\/$/, '')
  const normalized = normalizeCmsBase64(cmsBase64)
  try {
    const res = await fetch(`${base}/api/exported`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signType: 'cms', signature: normalized }),
    })
    if (!res.ok) {
      return { ok: false, detail: `SIGEX HTTP ${res.status}` }
    }
    const json = (await res.json()) as { message?: string }
    if (json.message) return { ok: false, detail: json.message }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}
