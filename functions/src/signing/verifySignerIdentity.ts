import type { DocumentData } from 'firebase-admin/firestore'
import type { CmsSignerInfo } from './parseCmsSigner'

export class SignerIdentityRejected extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignerIdentityRejected'
  }
}

function profileDisplayName(user: DocumentData): string {
  const raw = typeof user.displayName === 'string' ? user.displayName.trim() : ''
  return raw
}

function looksLikeUid(text: string): boolean {
  return /^[A-Za-z0-9_-]{18,}$/.test(text)
}

/** ФИО из профиля без должности (« — слесарь»). */
function nameForMatch(displayName: string): string {
  const dash = displayName.indexOf(' — ')
  return (dash >= 0 ? displayName.slice(0, dash) : displayName).trim()
}

function normalizeNameTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\bIIN\d{12}\b/gi, ' ')
    .replace(/\bИИН[:\s]*\d{12}\b/gi, ' ')
    .replace(/[^a-zа-яәғқңөұүһі\s-]/gi, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
}

const CYR_TO_LAT: Record<string, string> = {
  а: 'a',
  ә: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  ғ: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  і: 'i',
  к: 'k',
  қ: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  ң: 'n',
  о: 'o',
  ө: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ұ: 'u',
  ү: 'u',
  ф: 'f',
  х: 'h',
  һ: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ы: 'y',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

function toLatinApprox(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => CYR_TO_LAT[ch] ?? ch)
    .join('')
}

function tokenSetsMatch(profileTokens: string[], certTokens: string[]): boolean {
  const certLatin = new Set(certTokens.map(toLatinApprox))
  const certRaw = new Set(certTokens)
  const matched = profileTokens.filter((token) => {
    if (certRaw.has(token)) return true
    const latin = toLatinApprox(token)
    return certLatin.has(latin)
  })
  const required = Math.min(2, profileTokens.length)
  return matched.length >= required
}

function certPersonName(signerInfo: CmsSignerInfo): string {
  const fromCn = signerInfo.commonName
    .replace(/\bIIN\d{12}\b/gi, ' ')
    .replace(/\bИИН[:\s]*\d{12}\b/gi, ' ')
    .trim()
  if (fromCn) return fromCn
  const dn = signerInfo.subjectDn
    .replace(/2\.5\.4\.3=/g, '')
    .replace(/\bIIN\d{12}\b/gi, ' ')
    .trim()
  return dn
}

/** Совпадение ФИО: минимум фамилия и имя (2 токена) из профиля есть в сертификате. */
export function namesMatchProfile(
  profileName: string,
  certName: string,
): boolean {
  const profileTokens = normalizeNameTokens(nameForMatch(profileName))
  const certTokens = normalizeNameTokens(certName)
  if (profileTokens.length === 0 || certTokens.length === 0) return false
  return tokenSetsMatch(profileTokens, certTokens)
}

/**
 * Сверка ФИО подписанта с профилем users/{uid}.
 * Бросает SignerIdentityRejected при несовпадении.
 */
export function assertSignerMatchesProfile(
  user: DocumentData,
  signerInfo: CmsSignerInfo,
  options?: { verifyFio?: boolean },
): void {
  if (options?.verifyFio === false) return

  const displayName = profileDisplayName(user)
  if (!displayName || looksLikeUid(displayName)) {
    throw new SignerIdentityRejected(
      'В профиле пользователя не указано ФИО. Администратор должен заполнить поле «displayName».',
    )
  }

  const certName = certPersonName(signerInfo)
  if (!certName) {
    throw new SignerIdentityRejected(
      'В сертификате ЭЦП не найдено ФИО подписанта.',
    )
  }
  if (!namesMatchProfile(displayName, certName)) {
    throw new SignerIdentityRejected(
      `ФИО в сертификате («${certName}») не совпадает с профилем («${nameForMatch(displayName)}»). Подпишите своим сертификатом eGov Mobile.`,
    )
  }
}
