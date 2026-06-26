import type { Firestore } from 'firebase-admin/firestore'

function formatRegistrationNumber(n: number): string {
  const next = Math.max(1, Math.floor(n))
  const width = next <= 999 ? 3 : String(next).length
  return String(next).padStart(width, '0')
}

type PermitRow = {
  id: string
  registrationRefNo?: string
  createdAtIso?: string
  updatedAtIso?: string
}

export type RenumberPermitsResult = {
  total: number
  updated: number
  invitesUpdated: number
  mapping: { permitId: string; from: string; to: string }[]
}

/** Перенумеровать все наряды: 001, 002… по дате создания (старые — меньший номер). */
export async function renumberAllPermits(db: Firestore): Promise<RenumberPermitsResult> {
  const snap = await db.collection('permits').get()
  const permits: PermitRow[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<PermitRow, 'id'>),
  }))

  permits.sort((a, b) => {
    const ca = String(a.createdAtIso ?? a.updatedAtIso ?? '')
    const cb = String(b.createdAtIso ?? b.updatedAtIso ?? '')
    return ca.localeCompare(cb) || a.id.localeCompare(b.id)
  })

  const regByPermitId = new Map<string, string>()
  const mapping: RenumberPermitsResult['mapping'] = []
  let updated = 0

  for (let i = 0; i < permits.length; i += 1) {
    const p = permits[i]!
    const nextNo = formatRegistrationNumber(i + 1)
    regByPermitId.set(p.id, nextNo)
    const prev = String(p.registrationRefNo ?? '').trim()
    if (prev === nextNo) continue
    mapping.push({ permitId: p.id, from: prev || '—', to: nextNo })
    await db.collection('permits').doc(p.id).update({
      registrationRefNo: nextNo,
      updatedAtIso: new Date().toISOString(),
    })
    updated += 1
  }

  let invitesUpdated = 0
  const invitesSnap = await db.collection('signingInvites').get()
  for (const doc of invitesSnap.docs) {
    const permitId = String(doc.data().permitId ?? '').trim()
    if (!permitId) continue
    const nextNo = regByPermitId.get(permitId)
    if (!nextNo) continue
    const prev = String(doc.data().registrationRefNo ?? '').trim()
    if (prev === nextNo) continue
    await doc.ref.update({
      registrationRefNo: nextNo,
      updatedAtIso: new Date().toISOString(),
    })
    invitesUpdated += 1
  }

  return {
    total: permits.length,
    updated,
    invitesUpdated,
    mapping,
  }
}
