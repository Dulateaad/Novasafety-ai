import type { DemoUser, Permit } from '../types/domain'
import type { AbrDailyAckDay, AbrDailyAckEntry } from '../types/abrDailyAck'
import { emptyAbrDailyAckDay } from '../types/abrDailyAck'
import { DEFAULT_WORKERS } from '../config/defaultWorkers'
import { resolveWorkerUid } from './resolveWorkerUid'
import { isUserOnPermitCrew, uidMatchesAccount } from './permitAccess'

const ACTIVE = new Set<Permit['status']>(['issued', 'in_progress', 'suspended'])

/** Подпись действительна в сменном окне 24 ч (с 07:00 до 07:00 следующего дня). */
export const ABR_DAILY_ACK_VALID_MS = 24 * 60 * 60 * 1000

/** Начало смены — час ежедневного ознакомления с АБР (местное время). */
export const ABR_DAILY_ACK_SHIFT_HOUR = 7

/** Текст блока «механика» для PDF и справки. */
export function abrDailyAckMechanicsPdfText(): string {
  const h = String(ABR_DAILY_ACK_SHIFT_HOUR).padStart(2, '0')
  return (
    `Механика ежедневного ознакомления с АБР: каждый работник бригады до начала смены (${h}:00, местное время) ` +
    `подписывает ознакомление с анализом безопасности работ через eGov Mobile (ЭЦП). ` +
    `Подпись действительна с ${h}:00 текущих суток до ${h}:00 следующего дня; ` +
    `без действующей подписи работник не допускается к работам по наряду. ` +
    `Ниже — журнал подписей (дата смены, Ф.И.О., должность, подпись).`
  )
}

/** Локальная календарная дата (не UTC), чтобы «сегодня» совпадало с Казахстаном. */
export function todayDateIso(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Дата текущей смены: до 07:00 — ещё «вчерашняя» смена. */
export function currentShiftDateIso(date = new Date()): string {
  const d = new Date(date)
  if (d.getHours() < ABR_DAILY_ACK_SHIFT_HOUR) {
    d.setDate(d.getDate() - 1)
  }
  return todayDateIso(d)
}

function shiftWindowStart(date = new Date()): Date {
  const shiftDate = currentShiftDateIso(date)
  const [y, m, day] = shiftDate.split('-').map(Number)
  return new Date(y, m - 1, day, ABR_DAILY_ACK_SHIFT_HOUR, 0, 0, 0)
}

function shiftWindowEnd(start: Date): Date {
  return new Date(start.getTime() + ABR_DAILY_ACK_VALID_MS)
}

function accountIdsForUid(uid: string, directory: DemoUser[] = []): Set<string> {
  const ids = new Set<string>()
  const id = uid.trim()
  if (!id) return ids
  ids.add(id)
  const resolved = resolveWorkerUid(directory, id)
  if (resolved) ids.add(resolved)
  for (const u of directory) {
    if (uidMatchesAccount(id, u, directory)) ids.add(u.id)
  }
  return ids
}

function workerSpecForExecutorUid(
  uid: string,
  directory: DemoUser[] = [],
): (typeof DEFAULT_WORKERS)[number] | undefined {
  const id = uid.trim()
  if (!id) return undefined
  const direct = DEFAULT_WORKERS.find((s) => s.demoIds.includes(id))
  if (direct) return direct
  const resolved = resolveWorkerUid(directory, id)
  if (resolved) {
    const hit = DEFAULT_WORKERS.find((s) => s.demoIds.includes(resolved))
    if (hit) return hit
  }
  const user =
    directory.find((u) => u.id === id || u.id === resolved) ??
    directory.find((u) => uidMatchesAccount(id, u, directory))
  if (!user?.displayName?.trim()) return undefined
  const text = user.displayName.trim()
  return DEFAULT_WORKERS.find((s) => s.namePatterns?.some((p) => p.test(text)))
}

/** Все известные подписи ФИО для строки бригады (справочник + шаблон бригады). */
export function executorDisplayNamesForUid(
  uid: string,
  directory: DemoUser[] = [],
): string[] {
  const names = new Set<string>()
  const id = uid.trim()
  if (!id) return []
  const resolved = resolveWorkerUid(directory, id)
  for (const u of directory) {
    if (u.id === id || u.id === resolved || uidMatchesAccount(id, u, directory)) {
      if (u.displayName?.trim()) names.add(u.displayName.trim())
    }
  }
  const spec = workerSpecForExecutorUid(id, directory)
  if (spec) {
    names.add(spec.displayName)
    const short = spec.displayName.split('—')[0]?.trim()
    if (short) names.add(short)
  }
  return [...names]
}

export function resolveExecutorDisplayName(
  uid: string,
  directory: DemoUser[] = [],
): string {
  const names = executorDisplayNamesForUid(uid, directory)
  return names[0] ?? uid
}

function entryMatchesExecutorName(
  entry: AbrDailyAckEntry,
  executorUid: string,
  directory: DemoUser[] = [],
): boolean {
  const text = `${entry.fullName} ${entry.roleLabel}`.trim()
  if (!text) return false
  const spec = workerSpecForExecutorUid(executorUid, directory)
  if (!spec?.namePatterns?.length) return false
  return spec.namePatterns.some((p) => p.test(text))
}

function isAbrEntryStillValid(entry: AbrDailyAckEntry, now = Date.now()): boolean {
  const signedAt = new Date(entry.signedAtIso).getTime()
  if (!Number.isFinite(signedAt)) return false
  const start = shiftWindowStart(new Date(now))
  const end = shiftWindowEnd(start)
  return signedAt >= start.getTime() && signedAt < end.getTime()
}

export function abrDailyAckValidUntilIso(entry: AbrDailyAckEntry): string {
  const signedAt = new Date(entry.signedAtIso).getTime()
  if (!Number.isFinite(signedAt)) return ''
  const start = shiftWindowStart(new Date(signedAt))
  const end = shiftWindowEnd(start)
  return end.toISOString()
}

function executorNameKeys(name: string): string[] {
  const raw = name.trim().toLowerCase()
  if (!raw) return []
  const keys = new Set<string>([raw])
  const short = raw.split('—')[0]?.split('-')[0]?.trim()
  if (short) keys.add(short)
  const tokens = raw.split(/[\s,—\-]+/).filter((t) => t.length > 2)
  for (const t of tokens) keys.add(t)
  return [...keys]
}

function namesLikelySame(a: string, b: string): boolean {
  const ak = executorNameKeys(a)
  const bk = executorNameKeys(b)
  if (!ak.length || !bk.length) return false
  if (ak.some((x) => bk.some((y) => x.includes(y) || y.includes(x)))) return true
  const aTokens = new Set(ak.flatMap((k) => k.split(/[\s,—\-]+/).filter((t) => t.length > 2)))
  const bTokens = new Set(bk.flatMap((k) => k.split(/[\s,—\-]+/).filter((t) => t.length > 2)))
  let overlap = 0
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap += 1
  }
  return overlap >= 2 || (overlap >= 1 && (aTokens.size <= 2 || bTokens.size <= 2))
}

function uidsRepresentSameAccount(
  leftUid: string,
  rightUid: string,
  directory: DemoUser[] = [],
): boolean {
  const a = leftUid.trim()
  const b = rightUid.trim()
  if (!a || !b) return false
  if (a === b) return true
  const left = accountIdsForUid(a, directory)
  for (const id of accountIdsForUid(b, directory)) {
    if (left.has(id)) return true
  }
  return false
}

function entryMatchesExecutorUid(
  entry: AbrDailyAckEntry,
  executorUid: string,
  directory: DemoUser[] = [],
  executorDisplayName = '',
): boolean {
  const entryUid = entry.userUid.trim()
  const execUid = executorUid.trim()
  if (!execUid) return false
  if (entryUid && uidsRepresentSameAccount(entryUid, execUid, directory)) return true
  const names = new Set(executorDisplayNamesForUid(execUid, directory))
  if (executorDisplayName.trim()) names.add(executorDisplayName.trim())
  for (const name of names) {
    if (entry.fullName.trim() && namesLikelySame(entry.fullName, name)) return true
  }
  return entryMatchesExecutorName(entry, execUid, directory)
}

export function normalizeAbrDailyAcks(raw: unknown): AbrDailyAckDay[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((day) => {
      if (!day || typeof day !== 'object') return null
      const d = day as Partial<AbrDailyAckDay>
      const dateIso = String(d.dateIso ?? '').slice(0, 10)
      if (!dateIso) return null
      const entries: AbrDailyAckEntry[] = Array.isArray(d.entries)
        ? d.entries
            .map((e): AbrDailyAckEntry | null => {
              if (!e || typeof e !== 'object') return null
              const x = e as Partial<AbrDailyAckEntry>
              const userUid = String(x.userUid ?? '').trim()
              if (!userUid) return null
              const entry: AbrDailyAckEntry = {
                userUid,
                fullName: String(x.fullName ?? '').trim(),
                roleLabel: String(x.roleLabel ?? 'Работник').trim(),
                signedAtIso: String(x.signedAtIso ?? new Date().toISOString()),
                signatureNote: String(x.signatureNote ?? 'Ознакомлен').trim(),
              }
              if (typeof x.cmsBase64 === 'string' && x.cmsBase64.trim()) {
                entry.cmsBase64 = x.cmsBase64.trim()
              }
              if (typeof x.signerIin === 'string' || x.signerIin === null) {
                entry.signerIin = x.signerIin
              }
              if (typeof x.documentHash === 'string' && x.documentHash.trim()) {
                entry.documentHash = x.documentHash.trim()
              }
              if (x.provider === 'egov_mobile' || x.provider === 'ncalayer' || x.provider === 'manual') {
                entry.provider = x.provider
              }
              return entry
            })
            .filter((x): x is AbrDailyAckEntry => x !== null)
        : []
      return { dateIso, entries } satisfies AbrDailyAckDay
    })
    .filter((x): x is AbrDailyAckDay => x !== null)
}

export function abrDailyAckForDate(
  permit: Permit,
  dateIso = todayDateIso(),
): AbrDailyAckDay {
  const list = normalizeAbrDailyAcks(permit.abrDailyAcks)
  return list.find((d) => d.dateIso === dateIso) ?? emptyAbrDailyAckDay(dateIso)
}

export function latestAbrDailyAckForUser(
  permit: Permit,
  userUid: string,
  directory: DemoUser[] = [],
  executorDisplayName = '',
): AbrDailyAckEntry | undefined {
  const uid = userUid.trim()
  if (!uid) return undefined
  const label =
    executorDisplayName.trim() || resolveExecutorDisplayName(uid, directory)
  return normalizeAbrDailyAcks(permit.abrDailyAcks)
    .flatMap((day) => day.entries)
    .filter((e) => entryMatchesExecutorUid(e, uid, directory, label))
    .sort((a, b) => b.signedAtIso.localeCompare(a.signedAtIso))[0]
}

export function hasValidAbrDailyAck(
  permit: Permit,
  userUid: string,
  directory: DemoUser[] = [],
  executorDisplayName = '',
): boolean {
  const latest = latestAbrDailyAckForUser(permit, userUid, directory, executorDisplayName)
  return latest ? isAbrEntryStillValid(latest) : false
}

/** Подпись действительна в сменном окне (07:00 — 07:00). */
export function hasAbrDailyAckToday(
  permit: Permit,
  userUid: string,
  directory: DemoUser[] = [],
): boolean {
  return hasValidAbrDailyAck(permit, userUid, directory)
}

function ackMergeKey(
  entry: AbrDailyAckEntry,
  directory: DemoUser[] = [],
): string {
  const ids = [...accountIdsForUid(entry.userUid, directory)].sort()
  if (ids.length) return ids.join('|')
  const name = entry.fullName.trim().toLowerCase()
  return name ? `name:${name}` : entry.userUid
}

/** Объединить серверные и новые подписи (защита от гонки при одновременном сохранении). */
export function mergeAbrDailyAcksBundles(
  server: AbrDailyAckDay[],
  incoming: AbrDailyAckDay[],
  directory: DemoUser[] = [],
): AbrDailyAckDay[] {
  const byDate = new Map<string, Map<string, AbrDailyAckEntry>>()

  const put = (day: AbrDailyAckDay) => {
    let map = byDate.get(day.dateIso)
    if (!map) {
      map = new Map()
      byDate.set(day.dateIso, map)
    }
    for (const e of day.entries) {
      const key = ackMergeKey(e, directory)
      const prev = map.get(key)
      if (!prev || e.signedAtIso >= prev.signedAtIso) {
        map.set(key, e)
      }
    }
  }

  for (const day of server) put(day)
  for (const day of incoming) put(day)

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateIso, map]) => ({
      dateIso,
      entries: [...map.values()].sort((a, b) => a.signedAtIso.localeCompare(b.signedAtIso)),
    }))
}

export function mergeAbrDailyAckEntry(
  permit: Permit,
  entry: AbrDailyAckEntry,
  dateIso = currentShiftDateIso(),
  directory: DemoUser[] = [],
): AbrDailyAckDay[] {
  const list = normalizeAbrDailyAcks(permit.abrDailyAcks)
  const idx = list.findIndex((d) => d.dateIso === dateIso)
  const day = idx >= 0 ? list[idx]! : emptyAbrDailyAckDay(dateIso)
  const entries = [
    ...day.entries.filter(
      (e) =>
        !uidsRepresentSameAccount(e.userUid, entry.userUid, directory) &&
        !namesLikelySame(e.fullName, entry.fullName),
    ),
    entry,
  ]
  const nextDay = { dateIso, entries }
  if (idx >= 0) {
    const copy = [...list]
    copy[idx] = nextDay
    return copy
  }
  return [...list, nextDay].sort((a, b) => a.dateIso.localeCompare(b.dateIso))
}

export function buildAbrDailyAckEntry(
  actor: DemoUser,
  resolveRoleLabel: (user: DemoUser) => string,
  opts?: {
    cmsBase64?: string
    signerIin?: string | null
    documentHash?: string
    provider?: AbrDailyAckEntry['provider']
  },
): AbrDailyAckEntry {
  const signedAtIso = new Date().toISOString()
  const when = new Date(signedAtIso).toLocaleString('ru-RU')
  const egov = Boolean(opts?.cmsBase64?.trim())
  const provider = opts?.provider ?? (egov ? 'egov_mobile' : 'manual')
  const signatureNote =
    provider === 'ncalayer'
      ? `ЭЦП NCALayer · ${when}`
      : provider === 'egov_mobile'
        ? `ЭЦП eGov Mobile · ${when}`
        : egov
          ? `ЭЦП · ${when}`
          : `Ознакомлен · ${when}`
  return {
    userUid: actor.id,
    fullName: actor.displayName,
    roleLabel: resolveRoleLabel(actor),
    signedAtIso,
    signatureNote,
    cmsBase64: opts?.cmsBase64?.trim() || undefined,
    signerIin: opts?.signerIin,
    documentHash: opts?.documentHash,
    provider,
  }
}

export function isAbrDailyAckPeriodActive(status: Permit['status']): boolean {
  return ACTIVE.has(status)
}

export function pendingAbrDailyAckUids(
  permit: Permit,
  _dateIso = todayDateIso(),
  directory: DemoUser[] = [],
  resolveDisplayName?: (uid: string) => string | undefined,
): string[] {
  if (!isAbrDailyAckPeriodActive(permit.status)) return []
  return permit.executors
    .map((ex) => ex.userUid.trim())
    .filter((uid) => {
      if (!uid) return false
      const label =
        resolveDisplayName?.(uid) ?? resolveExecutorDisplayName(uid, directory)
      return !hasValidAbrDailyAck(permit, uid, directory, label)
    })
}

export function pendingAbrDailyAckPermitsForUser(
  permits: Permit[],
  user: DemoUser,
  directory: DemoUser[] = [],
): Permit[] {
  if (!user.id.trim()) return []
  return permits.filter((p) => {
    if (!isAbrDailyAckPeriodActive(p.status)) return false
    if (!isUserOnPermitCrew(p, user.id, user, directory)) return false
    return p.executors.some((ex) => {
      const uid = ex.userUid.trim()
      if (!uid) return false
      if (uid !== user.id && !uidMatchesAccount(uid, user, directory)) return false
      const label = resolveExecutorDisplayName(uid, directory)
      return !hasValidAbrDailyAck(p, uid, directory, label)
    })
  })
}
