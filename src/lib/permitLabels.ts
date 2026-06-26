import type { PermitType } from '../types/domain'

export const PERMIT_TYPE_LABELS: Record<PermitType, string> = {
  fire: 'Огневой НД',
  cold: 'Холодный НД',
}

export {
  SPECIAL_WORK_ACTIVITY_LABELS,
  STATUS_LABELS,
  ZONE_CLASS_LABELS,
} from '../types/domain'
