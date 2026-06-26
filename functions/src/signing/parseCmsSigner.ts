import { fromBER } from 'asn1js'
import { ContentInfo, SignedData, Certificate } from 'pkijs'

export interface CmsSignerInfo {
  subjectDn: string
  commonName: string
  iin: string | null
  serialNumber: string | null
}

/** Извлекает данные подписанта из CMS (PKCS#7) DER/base64. */
export function parseCmsSigner(cmsBase64: string): CmsSignerInfo {
  const der = Buffer.from(cmsBase64, 'base64')
  const asn1 = fromBER(der)
  const contentInfo = new ContentInfo({ schema: asn1.result })
  const signedData = new SignedData({ schema: contentInfo.content })

  let cert: Certificate | null = null
  if (signedData.certificates && signedData.certificates.length > 0) {
    cert = signedData.certificates[0] as Certificate
  }

  if (!cert) {
    throw new Error('CMS: сертификат подписанта не найден')
  }

  const subjectParts = cert.subject.typesAndValues.map((tv) => {
    const type = tv.type
    const value = tv.value.valueBlock.value
    return `${type}=${value}`
  })
  const subjectDn = subjectParts.join(', ')
  const cn =
    cert.subject.typesAndValues.find((tv) => String(tv.type).includes('2.5.4.3'))
      ?.value.valueBlock.value ?? ''
  const serial =
    cert.subject.typesAndValues.find((tv) => String(tv.type).includes('2.5.4.5'))
      ?.value.valueBlock.value ?? null

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
      // heuristic: KZ IIN is 12 digits, often starts with birth year
      const digits = bare[1]
      const year = Number(digits.slice(0, 2))
      if (year >= 0 && year <= 99) return digits
    }
  }
  // KZ cert serial often IINXXXXXXXXXXXX
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
  try {
    const res = await fetch(`${base}/api/exported`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signType: 'cms', signature: cmsBase64 }),
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
