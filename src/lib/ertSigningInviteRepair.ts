import type { DemoUser, Permit } from '../types/domain'
import { allCrewAcknowledged } from './crewAckComplete'
import { permitRequiresErtApproval } from './fireWorkApproval'
import { ertGasTestComplete } from './ertGasTestHints'
import { provisionPermitSignersClient } from './provisionSigners'
import { actorMatchesAssigneeForRole, isRoleSigned } from './signatureStatus'

/** Пересоздать signingInvites с Firebase uid для нарядов, где ERT уже может подписать. */
export async function repairErtSigningInvites(
  permits: Permit[],
  user: DemoUser,
  directory: DemoUser[],
  alreadyRepaired: Set<string>,
): Promise<number> {
  if (user.role !== 'ert') return 0

  let repaired = 0
  for (const permit of permits) {
    if (permit.status !== 'on_approval') continue
    if (!permitRequiresErtApproval(permit)) continue
    if (!isRoleSigned(permit, 'performer', directory)) continue
    if (!allCrewAcknowledged(permit, directory)) continue
    if (!ertGasTestComplete(permit)) continue
    if (isRoleSigned(permit, 'ert', directory)) continue
    if (!actorMatchesAssigneeForRole(permit, 'ert', user, directory)) continue
    if (alreadyRepaired.has(permit.id)) continue

    alreadyRepaired.add(permit.id)
    try {
      await provisionPermitSignersClient(permit.id)
      repaired += 1
    } catch (e) {
      console.warn('[NOVA] repairErtSigningInvites failed', permit.id, e)
    }
  }
  return repaired
}
