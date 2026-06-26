import type { PprAttachment } from '../types/ppr'
import { extractTextFromPprAttachment } from './pprDocText'

function normalizeTitleText(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim()
}

/** Убирает путь к файлу, хвост .docx и текст объёма работ из наименования. */
export function sanitizeWorkTitleCandidate(raw: string): string {
  let t = normalizeTitleText(raw)
  if (!t) return ''

  t = t.replace(/^[a-z]:\\(?:[^\\]+\\)+/i, '')
  if (/^[a-z]:\\|^\\\\/i.test(t)) {
    t = t.replace(/^.*[\\/]/, '')
  }
  t = t.replace(/\.docx?\b/gi, ' ')

  const scopeSplit = t.split(
    /\s+(?<![а-яё])(?:От|From|Starting from|Необходимо|Требуется|Scope:)\s+/i,
  )[0]
  t = scopeSplit ?? t

  for (const re of [
    /\s+(?:выполнить|установить|осуществить|произвести|обеспечить)\s+/i,
    /\s+согласно\s+схем/i,
    /\s+диаметром\s+/i,
    /\s+для\s+обеспечения\s+безопасного/i,
  ]) {
    const part = t.split(re)[0]?.trim()
    if (part && part.length >= 8) t = part
  }

  return t.replace(/\s+/g, ' ').trim()
}

/** Слишком длинный или похож на описание этапа, а не на название. */
export function looksLikeWorkScopeNotTitle(title: string): boolean {
  const t = title.trim()
  if (!t) return true
  if (t.length > 140) return true
  if (/^[a-z]:\\/i.test(t) || /\\Users\\/i.test(t) || /\.docx?\b/i.test(t)) return true
  if (/^(?:от|from|starting from)\s+/i.test(t)) return true
  if (
    /(?:^|\s)(?:выполнить|установить|осуществить|согласно схем|диаметром|обеспечения безопасного)(?:\s|$)/i.test(
      t,
    )
  ) {
    return true
  }
  return false
}

export function cleanPprWorkTitle(raw: string): string {
  let t = sanitizeWorkTitleCandidate(raw)
  if (!t) return ''

  t = t.replace(/\bmethod\s+statement\b/gi, ' ')
  t = t.replace(/^ms[\s._-]+/i, '')
  t = t.replace(/\bms\b(?=\s)/gi, ' ')

  t = t.replace(/\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b/g, ' ')
  t = t.replace(/\b\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\b/g, ' ')
  t = t.replace(/\(\s*\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\s*\)/g, ' ')
  t = t.replace(/\(\s*\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*\)/g, ' ')

  t = t.replace(/\s*[-–—]\s*GS\s*$/i, '')
  t = t.replace(/\s+rev\.?\s*\d*\s*$/i, '')

  t = t.replace(/\s+/g, ' ')
  t = t.replace(/\s*[-–—]\s*$/g, '')
  t = t.replace(/^[\s\-–—,_]+|[\s\-–—,_]+$/g, '')

  return t.trim()
}

/** Нормализует наименование: очистка + запасной вариант из имени файла. */
export function normalizePprWorkTitle(raw: string, fallback = ''): string {
  const cleaned = toReadableRussianTitle(cleanPprWorkTitle(raw) || raw)
  if (cleaned) return cleaned
  const fb = toReadableRussianTitle(cleanPprWorkTitle(fallback) || fallback)
  return fb || fallback.trim()
}

const HEADER_END_MARKERS = [
  'Содержание',
  'TABLE OF CONTENTS',
  'Table of Contents',
  '1.\tОбщие положения',
  '1. Общие положения',
  '1.\tGENERAL',
  '1. GENERAL',
]

const HEADER_SKIP_LINE =
  /^(проект|ревизия|revision|авторские|copyright|утвержд|подготов|провер|перечень|история|номер|раздел|описание|status|page|фио|должность|подпись|выпуск|ред\.|дата|c$|\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}$)/i

function docHeaderRegion(docText: string): string {
  let end = Math.min(docText.length, 7000)
  for (const marker of HEADER_END_MARKERS) {
    const idx = docText.search(
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    )
    if (idx > 200 && idx < end) end = idx
  }
  return docText.slice(0, end)
}

/** Убирает служебный префикс шапки — оставляет суть работ. */
function stripPprTitlePrefixes(raw: string): string {
  let t = raw.replace(/\s+/g, ' ').trim()
  t = t.replace(/^ППР\s+на\s+/i, '')
  t = t.replace(/^ПОР\s+по\s+/i, '')
  t = t.replace(/^POR\s+(?:po|for)\s+/i, '')
  t = t.replace(/^ПЛАН\s+ПРОИЗВОДСТВА\s+РАБОТ\s+(?:ПО\s+|НА\s+)?/i, '')
  t = t.replace(/^ПЛАН\s+ОРГАНИЗАЦИИ\s+РАБОТ\s+ПО\s+/i, '')
  t = t.replace(/^ПРОГРАММА\s+ПРОИЗВОДСТВА\s+РАБОТ\s+ПО\s+/i, '')
  t = t.replace(/^ПРОГРАММА\s+ПРОИЗВОДСТВА\s+РАБОТ\s+/i, '')
  t = t.replace(/^РАБОТ\s+ПО\s+/i, '')
  t = t.replace(/^METHOD\s+STATEMENT\s+(?:FOR\s+)?/i, '')
  return t.trim()
}

function isMostlyUpperCase(text: string): boolean {
  const letters = text.replace(/[^A-Za-zА-ЯЁа-яё]/g, '')
  if (letters.length < 8) return false
  const upper = text.replace(/[^A-ZА-ЯЁ]/g, '').length
  return upper / letters.length > 0.7
}

/** КАПС из шапки → читаемый регистр; «ПО ОЧИСТКЕ» → «Очистка». */
export function toReadableRussianTitle(raw: string): string {
  let t = stripPprTitlePrefixes(raw.trim())
  if (!t) t = raw.trim()
  if (!t) return ''

  if (!isMostlyUpperCase(t)) {
    let cleaned = cleanPprWorkTitle(t)
    for (const [re, word] of [
      [/^разгрузку(?=\s|$)/i, 'Разгрузка'],
      [/^монтаж(?=\s|$)/i, 'Монтаж'],
      [/наземный/gi, 'наземной'],
      [/выкидной/gi, 'выкидной'],
      [/\bu-(\d+)\b/gi, 'U-$1'],
    ] as [RegExp, string][]) {
      cleaned = cleaned.replace(re, word)
    }
    cleaned = polishWorkTitleGrammar(cleaned)
    return cleaned || t
  }

  t = t.toLowerCase()
  const dativeToNominative: [RegExp, string][] = [
    [/^разгрузку(?=\s|$)/, 'разгрузка'],
    [/^очистке(?=\s|$)/, 'очистка'],
    [/^монтажу(?=\s|$)/, 'монтаж'],
    [/^ремонту(?=\s|$)/, 'ремонт'],
    [/^строительству(?=\s|$)/, 'строительство'],
    [/^обустройству(?=\s|$)/, 'обустройство'],
    [/^прокладке(?=\s|$)/, 'прокладка'],
    [/^бурению(?=\s|$)/, 'бурение'],
    [/^демонтажу(?=\s|$)/, 'демонтаж'],
    [/^испытанию(?=\s|$)/, 'испытание'],
  ]
  for (const [re, word] of dativeToNominative) {
    t = t.replace(re, word)
  }

  t = t.replace(/\bgre\b/g, 'GRE')
  t = t.replace(/\bu(\d+)\b/g, (_, n: string) => `U-${n}`)
  t = t.charAt(0).toUpperCase() + t.slice(1)

  const cleaned = polishWorkTitleGrammar(cleanPprWorkTitle(t))
  return cleaned || t
}

function polishWorkTitleGrammar(title: string): string {
  let t = title.trim()
  if (!t) return ''
  t = t.replace(/^монтаж(?=\s|$)/i, 'Монтаж')
  t = t.replace(/наземный/gi, 'наземной')
  t = t.replace(/\bu(\d+)\b/gi, 'U-$1')
  t = t.replace(/\s+/g, ' ').trim()
  if (t.length > 120) {
    t = t.slice(0, 117).replace(/\s+\S*$/, '').trim()
  }
  return t
}

function cleanHeaderWorkTitle(raw: string): string {
  const t = sanitizeWorkTitleCandidate(raw.replace(/\s+/g, ' ').trim())
  if (!t || looksLikeWorkScopeNotTitle(t)) return ''
  const readable = toReadableRussianTitle(t)
  if (looksLikeWorkScopeNotTitle(readable)) return ''
  return readable
}

const WORK_TITLE_LABEL =
  /(?:наименован(?:ие|ия)\s*(?:\/\s*объ[её]м\s*)?работ|work\s*title|title\s*of\s*(?:the\s*)?work|subject\s*of\s*work|scope\s*of\s*work|наименование\s*работ)/i

/** Строки таблицы Word (mammoth → TAB): «Наименование работ» | значение. */
function extractLabeledWorkTitleFromStructuredText(docText: string): string {
  for (const line of docText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const tabCells = trimmed.split('\t').map((c) => c.trim()).filter(Boolean)
    if (tabCells.length >= 2 && WORK_TITLE_LABEL.test(tabCells[0])) {
      const value = tabCells.slice(1).join(' ').trim()
      const title = cleanHeaderWorkTitle(value)
      if (title.length >= 5) return title
    }

    const inline = trimmed.match(
      new RegExp(
        `${WORK_TITLE_LABEL.source}\\s*[:\\-–—]\\s*(.+)`,
        'i',
      ),
    )
    if (inline?.[1]) {
      const title = cleanHeaderWorkTitle(inline[1].trim())
      if (title.length >= 5) return title
    }
  }

  const labeled = docText.matchAll(
    /(?:Наименование\s*(?:\/\s*объ[eё]м\s*)?работ|Work\s*Title|Title\s*of\s*Work)\s*[:\-–—]\s*([^\n\t]+)/gi,
  )
  for (const m of labeled) {
    const title = cleanHeaderWorkTitle(m[1]?.trim() ?? '')
    if (title.length >= 5) return title
  }

  return ''
}

/** Склеивает заголовок, разбитый на две строки: «…РАБОТ» + «ПО …». */
function joinMultilineHeaderTitles(header: string): string {
  const lines = header
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const prev = out[out.length - 1]
    if (prev && /РАБОТ\s*$/i.test(prev) && /^ПО\s+/i.test(line)) {
      out[out.length - 1] = `${prev} ${line}`.trim()
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

/** Наименование работ из шапки Method Statement / ППР (титульный лист). */
export function extractWorkTitleFromDocHeader(docText: string): string {
  const text = normalizeTitleText(docText)
  const structured = extractLabeledWorkTitleFromStructuredText(text)
  if (structured) return structured

  const header = joinMultilineHeaderTitles(docHeaderRegion(text))
  const flat = header.replace(/\s+/g, ' ').trim()

  const porShort = flat.match(
    /(?:ПОР|ПЛАН\s+ОРГАНИЗАЦИИ\s+РАБОТ)\s+ПО\s+(.{8,160}?)(?=\s*(?:РЕВИЗИЯ|Содержание|Авторские|ПРОЕКТ|\d{1,2}\.\d{1,2}\.\d{4}|$))/i,
  )
  if (porShort?.[1]) {
    const title = cleanHeaderWorkTitle(porShort[1])
    if (title.length >= 8) return title
  }

  const porFull = flat.match(
    /(ПЛАН\s+ОРГАНИЗАЦИИ\s+РАБОТ\s+ПО.{8,320}?)(?=\s*(?:РЕВИЗИЯ|Содержание|Авторские|ПРОЕКТ|\d{1,2}\.\d{1,2}\.\d{4}|$))/i,
  )
  if (porFull?.[1]) {
    const title = cleanHeaderWorkTitle(porFull[1])
    if (title.length >= 8) return title
  }

  const pprNa = flat.match(
    /(ППР\s+на\s+.{8,280}?)(?=\s*(?:РЕВИЗИЯ|Содержание|Авторские|ПРОЕКТ|\d{1,2}\.\d{1,2}\.\d{4}|$))/i,
  )
  if (pprNa?.[1]) {
    const title = cleanHeaderWorkTitle(pprNa[1])
    if (title.length >= 8) return title
  }

  const pprFull = flat.match(
    /(ПРОГРАММА\s+ПРОИЗВОДСТВА\s+РАБОТ(?:\s+ПО)?\s*.{8,320}?)(?=\s*(?:РЕВИЗИЯ|Содержание|Авторские|\d{1,2}\.\d{1,2}\.\d{4}|$))/i,
  )
  if (pprFull?.[1]) {
    const title = cleanHeaderWorkTitle(pprFull[1])
    if (title.length >= 8) return title
  }

  const pprPlan = flat.match(
    /(ПЛАН\s+ПРОИЗВОДСТВА\s+РАБОТ\s+(?:ПО|НА)\s+.{8,320}?)(?=\s*(?:РЕВИЗИЯ|Содержание|Авторские|\d{1,2}\.\d{1,2}\.\d{4}|$))/i,
  )
  if (pprPlan?.[1]) {
    const title = cleanHeaderWorkTitle(pprPlan[1])
    if (title.length >= 8) return title
  }

  const msFull = flat.match(
    /(METHOD\s+STATEMENT.{8,320}?)(?=\s*(?:REVISION|TABLE OF CONTENTS|Author|РЕВИЗИЯ|$))/i,
  )
  if (msFull?.[1]) {
    const title = cleanHeaderWorkTitle(msFull[1])
    if (title.length >= 8) return title
  }

  const lines = header
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length >= 12 && l.length <= 220 && !HEADER_SKIP_LINE.test(l))

  const workKw =
    /очистк|монтаж|ремонт|строительств|демонтаж|испытан|прокладк|бурени|обустройств|трубопровод|скважин|сборн|шлейф|разгрузк|транспортир|железнодорож|погрузочн|GRE|U[\s-]?\d+|замен|реконструкц|обслужив|пусконалад|гидроиспыт|изоляц|покрас|сварк|кран|насос|компрессор|фланец|арматур|отжиг|выкидн/i
  const candidates = lines
    .filter((l) => workKw.test(l) && !looksLikeWorkScopeNotTitle(l))
    .map((l) => ({ line: l, title: cleanHeaderWorkTitle(l) }))
    .filter((c) => c.title.length >= 8 && !looksLikeWorkScopeNotTitle(c.title))
  if (candidates.length > 0) {
    const porLike = candidates.find((c) => /^(?:ПОР|ППР|ПЛАН|ПРОГРАММА|METHOD)/i.test(c.line))
    if (porLike) return porLike.title
    candidates.sort((a, b) => a.title.length - b.title.length)
    return candidates[0].title
  }

  return ''
}

/** Приоритет: шапка документа → извлечённое значение → имя файла. */
export function resolvePprWorkTitle(
  sources: { header?: string; extracted?: string; fileName?: string },
): string {
  const tryTitle = (raw: string): string => {
    const readable = toReadableRussianTitle(sanitizeWorkTitleCandidate(raw))
    if (!readable || looksLikeWorkScopeNotTitle(readable)) return ''
    return readable
  }

  const header = tryTitle(sources.header?.trim() ?? '')
  if (header) return header
  const extracted = tryTitle(sources.extracted?.trim() ?? '')
  if (extracted && !/^method\s+statement\b/i.test(extracted)) return extracted
  const fromFile = sources.fileName ? tryTitle(titleFromFileStem(sources.fileName)) : ''
  return fromFile
}

/** Заголовок из вложения ППР: шапка документа → извлечённое → имя файла. */
export async function resolvePprWorkTitleFromAttachment(
  attachment: PprAttachment,
  extracted?: string,
): Promise<string> {
  const docText = await extractTextFromPprAttachment(attachment)
  return resolvePprWorkTitle({
    header: extractWorkTitleFromDocHeader(docText),
    extracted,
    fileName: attachment.fileName,
  })
}

/** Имя файла PPR_razgruzka_trub → читаемое наименование. */
function titleFromFileStem(fileName: string): string {
  let t = fileName.trim()
  t = t.replace(/^.*[\\/]/, '')
  t = t.replace(/\.[^.]+$/, '')
  t = sanitizeWorkTitleCandidate(t)
  t = t.replace(/^PPR[_\s.-]+/i, '')
  t = t.replace(/^ПОР\s+по\s+/i, '')
  t = t.replace(/^POR\s+(?:po|for)\s+/i, '')
  t = t.replace(/[_-]+/g, ' ')
  return cleanPprWorkTitle(t) || t
}
