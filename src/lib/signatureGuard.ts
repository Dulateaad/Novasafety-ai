import type { DemoUser, Permit } from '../types/domain'
import { uidMatchesAccount } from './permitAccess'

/** Серверная (репозиторий) проверка: менять подпись может только назначенный участник или координатор. */
export function assertSignaturePatchAllowed(
  actor: DemoUser,
  permit: Permit,
  patch: Partial<Permit['signatures']>,
  directory: DemoUser[] = [],
): void {
  const current = permit.signatures ?? {
    performerSigned: false,
    issuerSigned: false,
    permitterSigned: false,
    leadExpertSigned: false,
    ertSigned: false,
  }
  if (patch.issuerSigned !== undefined && patch.issuerSigned !== current.issuerSigned) {
    const ok =
      actor.role === 'coordinator' ||
      (actor.role === 'issuer' && uidMatchesAccount(permit.issuerUid, actor, directory))
    if (!ok) {
      throw new Error('Подпись «Выдающий НД» может поставить только назначенный выдающий')
    }
  }

  if (
    patch.permitterSigned !== undefined &&
    patch.permitterSigned !== current.permitterSigned
  ) {
    const ok =
      actor.role === 'coordinator' ||
      (actor.role === 'permitter' && uidMatchesAccount(permit.permitterUid, actor, directory))
    if (!ok) {
      throw new Error('Подпись «Допускающий» может поставить только назначенный допускающий')
    }
  }

  if (
    patch.leadExpertSigned !== undefined &&
    patch.leadExpertSigned !== current.leadExpertSigned
  ) {
    const ok =
      actor.role === 'coordinator' ||
      (actor.role === 'leadExpert' && uidMatchesAccount(permit.leadExpertUid, actor, directory))
    if (!ok) {
      throw new Error(
        'Подпись тех. эксперта может поставить только назначенный представитель руководства',
      )
    }
  }
}
