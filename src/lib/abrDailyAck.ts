import type { DemoUser, Permit } from '../types/domain'
import type { AbrDailyAckDay, AbrDailyAckEntry } from '../types/abrDailyAck'
import { emptyAbrDailyAckDay } from '../types/abrDailyAck'

export function todayDateIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function normalizeAbrDailyAcks(raw: unknown): AbrDailyAckDay[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((day) => {
      if (!day || typeof day !== 'object') return null
      const d = day as Partial<AbrDailyAckDay>
      const dateIso = String(d.dateIso ?? '').slice(0, 10)
      if (!dateIso) return null
      const entries = Array.isArray(d.entries)
        ? d.entries
            .map((e) => {
              if (!e || typeof e !== 'object') return null
              const x = e as Partial<AbrDailyAckEntry>
              const userUid = String(x.userUid ?? '').trim()
              if (!userUid) return null
              return {
                userUid,
                fullName: String(x.fullName ?? '').trim(),
                roleLabel: String(x.roleLabel ?? 'Работник').trim(),
                signedAtIso: String(x.signedAtIso ?? new Date().toISOString()),
                signatureNote: String(x.signatureNote ?? 'Ознакомлен').trim(),
              } satisfies AbrDailyAckEntry
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

export function hasAbrDailyAckToday(permit: Permit, userUid: string): boolean {
  const day = abrDailyAckForDate(permit)
  return day.entries.some((e) => e.userUid === userUid)
}

export function mergeAbrDailyAckEntry(
  permit: Permit,
  entry: AbrDailyAckEntry,
  dateIso = todayDateIso(),
): AbrDailyAckDay[] {
  const list = normalizeAbrDailyAcks(permit.abrDailyAcks)
  const idx = list.findIndex((d) => d.dateIso === dateIso)
  const day = idx >= 0 ? list[idx]! : emptyAbrDailyAckDay(dateIso)
  const entries = [
    ...day.entries.filter((e) => e.userUid !== entry.userUid),
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
): AbrDailyAckEntry {
  const signedAtIso = new Date().toISOString()
  return {
    userUid: actor.id,
    fullName: actor.displayName,
    roleLabel: resolveRoleLabel(actor),
    signedAtIso,
    signatureNote: `Ознакомлен ${new Date(signedAtIso).toLocaleString('ru-RU')}`,
  }
}
