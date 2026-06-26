import type { DemoUser, Permit } from '../types/domain'

/** Серверная (репозиторий) проверка: менять подпись может только назначенный участник или координатор. */
export function assertSignaturePatchAllowed(
  actor: DemoUser,
  permit: Permit,
  patch: Partial<Permit['signatures']>,
): void {
  if (patch.issuerSigned !== undefined && patch.issuerSigned !== permit.signatures.issuerSigned) {
    const ok =
      actor.role === 'coordinator' ||
      (actor.role === 'issuer' && actor.id === permit.issuerUid)
    if (!ok) {
      throw new Error('Подпись «Выдающий НД» может поставить только назначенный выдающий')
    }
  }

  if (
    patch.permitterSigned !== undefined &&
    patch.permitterSigned !== permit.signatures.permitterSigned
  ) {
    const ok =
      actor.role === 'coordinator' ||
      (actor.role === 'permitter' && actor.id === permit.permitterUid)
    if (!ok) {
      throw new Error('Подпись «Допускающий» может поставить только назначенный допускающий')
    }
  }

  if (
    patch.leadExpertSigned !== undefined &&
    patch.leadExpertSigned !== permit.signatures.leadExpertSigned
  ) {
    const ok =
      actor.role === 'coordinator' ||
      (actor.role === 'leadExpert' && actor.id === permit.leadExpertUid)
    if (!ok) {
      throw new Error(
        'Подпись тех. эксперта может поставить только назначенный представитель руководства',
      )
    }
  }
}
