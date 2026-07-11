import type { PprForm } from '../types/ppr'
import { buildPprTextHaystack } from './inferSpecialWorkActivityFromPpr'

/** Юрлицо РК / международное — только с границей слова (не «Тип» → «ип»). */
const LEGAL_ENTITY_PATTERN =
  /(?<![A-Za-zА-Яа-яЁё])(?:ТОО|АО|ТДО|LLP|LLC|JSC)\s*[«"]?[^»"\n;]{2,120}[»"]?/i

const IP_LINE_PATTERN = /^(?:ИП)\s+[«"]?[^»"\n;]{2,80}[»"]?/i

const GARBAGE_ORG =
  /^(?:тип|выпуск|дата|номер|ред\.|статус|page|фио|должность|подпись|план|программа|ппр|method)/i

type OrgParties = { customer: string; contractor: string }

function trimOrgName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[«"(\[]+|[»")\].,;]+$/g, '')
    .replace(/[,.;]+$/, '')
    .trim()
}

function isPlausibleOrg(name: string): boolean {
  const t = name.trim()
  if (t.length < 2 || t.length > 120) return false
  if (GARBAGE_ORG.test(t)) return false
  if (/выпуска|рассмотрени|документ|план\s+организаци|программ\s+производ|method\s+statement/i.test(t))
    return false
  return true
}

function takeOrgLabel(line: string, label: RegExp): string {
  const m = line.match(label)
  if (!m?.[1]) return ''
  const raw = m[1].split(/[—–-]/)[0]?.trim() ?? m[1].trim()
  const cleaned = trimOrgName(raw)
  return isPlausibleOrg(cleaned) ? cleaned : ''
}

/** Заказчик и подрядчик из шапки и текста ППР (в т.ч. UEPC BBS / KSS). */
export function extractOrgPartiesFromText(text: string): OrgParties {
  const hay = text.trim()
  let customer = ''
  let contractor = ''

  const body = hay.match(
    /Заказчика\s+([^,.\n]+?)(?:\s*,\s*|\s+)выполняемого\s+Бизнес[-\s]?партн(?:ер|ё)ром\s+([^,.\n]+)/i,
  )
  if (body) {
    customer = trimOrgName(body[1])
    contractor = trimOrgName(body[2])
  }

  const bpInline = hay.match(
    /Бизнес[-\s]?партн(?:ер|ё)ром\s+([A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9\s.\-«»"]{1,48})/i,
  )
  if (bpInline && !contractor) {
    contractor = trimOrgName(bpInline[1])
  }

  const custInline = hay.match(
    /Заказчик[а]?(?:\s*\([^)]*\))?\s+([A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9\s.\-«»"]{1,48})/i,
  )
  if (custInline && !customer) {
    customer = trimOrgName(custInline[1])
  }

  for (const line of hay.split('\n').slice(0, 120)) {
    const t = line.trim()
    if (!t) continue
    if (!customer) {
      customer = takeOrgLabel(
        t,
        /^(?:заказчик|customer|client)\s*[:：]\s*(.+)$/i,
      )
    }
    if (!contractor) {
      contractor = takeOrgLabel(
        t,
        /^(?:подрядчик|бизнес[-\s]?партн(?:ер|ёр)|исполнитель|contractor)\s*[:：]\s*(.+)$/i,
      )
    }
    const bpLine = t.match(
      /^([A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9\s.\-]{1,40})\s*[—–-]\s*Бизнес[-\s]?партн/i,
    )
    if (bpLine && !contractor) {
      contractor = trimOrgName(bpLine[1])
    }
  }

  const headerLines = hay
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12)
  if (!customer) {
    for (const line of headerLines) {
      if (/подрядчик|бизнес[-\s]?партн|contractor|план|программ|ппр|method/i.test(line)) {
        continue
      }
      const org = line.match(LEGAL_ENTITY_PATTERN)?.[0]
      if (org && isPlausibleOrg(org)) {
        customer = trimOrgName(org)
        break
      }
    }
  }
  if (!customer && headerLines[0] && /^[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9\s.\-«»"]{2,80}$/.test(headerLines[0])) {
    if (!/ппр|план|ревиз|дата|тип|номер|выпуск|программ|method/i.test(headerLines[0])) {
      customer = trimOrgName(headerLines[0])
    }
  }

  if (!isPlausibleOrg(customer)) customer = ''
  if (!isPlausibleOrg(contractor)) contractor = ''

  return { customer, contractor }
}

/** Организация-заказчик для поля «Организация» в НДПР. */
export function inferCustomerOrgFromText(text: string): string {
  const hay = text.trim()
  if (!hay) return ''

  const { customer } = extractOrgPartiesFromText(hay)
  if (customer) return customer

  const uog = hay.match(/ТОО\s*[«"']?\s*Урал\s+Ойл\s+энд\s+Газ\s*[»"']?/i)
  if (uog?.[0] && isPlausibleOrg(uog[0])) return trimOrgName(uog[0])

  for (const line of hay.split('\n').slice(0, 80)) {
    const org = takeOrgLabel(line, /^организация\s*[:：]\s*(.+)$/i)
    if (org) return org
  }

  for (const line of hay.split('\n').slice(0, 30)) {
    if (/подрядчик|бизнес[-\s]?партн|contractor|исполнител/i.test(line)) continue
    const org = line.match(LEGAL_ENTITY_PATTERN)?.[0]
    if (org && isPlausibleOrg(org)) return org.trim()
  }

  return ''
}

export function inferCustomerOrgFromPpr(ppr: PprForm, docText?: string): string {
  if (ppr.customerOrg.trim()) return ppr.customerOrg.trim()
  return inferCustomerOrgFromText(buildPprTextHaystack(ppr, docText))
}

/** Извлекает организацию-подрядчика из шапки и текста ППР. */
export function inferContractorOrgFromText(text: string): string {
  const hay = text.trim()
  if (!hay) return ''

  const { contractor } = extractOrgPartiesFromText(hay)
  if (contractor) return contractor

  for (const line of hay.split('\n').slice(0, 50)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (!/организац|подрядчик|contractor|исполнител/i.test(trimmed)) {
      continue
    }
    const org = trimmed.match(LEGAL_ENTITY_PATTERN)?.[0]
    if (org && isPlausibleOrg(org)) return org.trim()
    const cleaned = cleanOrgLine(trimmed)
    if (isPlausibleOrg(cleaned)) return cleaned
  }

  for (const line of hay.split('\n').slice(0, 30)) {
    const trimmed = line.trim()
    const ip = trimmed.match(IP_LINE_PATTERN)?.[0]
    if (ip && isPlausibleOrg(ip)) return ip.trim()
  }

  const headerHit = hay.slice(0, 4000).match(LEGAL_ENTITY_PATTERN)
  if (headerHit?.[0] && isPlausibleOrg(headerHit[0])) {
    return headerHit[0].trim()
  }

  return ''
}

function cleanOrgLine(line: string): string {
  return line
    .replace(/^(?:организация|подрядчик|contractor|исполнитель)\s*[:：]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function inferContractorOrgFromPpr(
  ppr: PprForm,
  docText?: string,
): string {
  if (ppr.contractorOrg.trim()) return ppr.contractorOrg.trim()
  return inferContractorOrgFromText(buildPprTextHaystack(ppr, docText))
}
