import type { PermitDraft } from '../types/domain'
import { initialNdprResponses } from './ndprChecklistTemplate'

export function emptyF02() {
  return {
    company: '',
    badgeNo: '',
    shift: '' as const,
    startDate: '',
    endDate: '',
    issuedTo: '',
    safety: {
      isolationOfEnergy: '',
      fireFightingEquipment: '',
      communications: '',
      workAreaBarricading: '',
    },
  }
}

export function emptyPermitDraft(): PermitDraft {
  return {
    title: '',
    permitType: 'cold',
    category: 2,
    specialWorkActivity: 'cold_works',
    specialWorkActivities: ['cold_works'],
    zoneClass: 1,
    siteName: '',
    workDescription: '',
    workStages: '',
    workVolume: '',
    toolsAndEquipment: '',
    issuerUid: '',
    permitterUid: '',
    performerUid: '',
    leadExpertUid: '',
    ertUid: undefined,
    isContractorPermit: false,
    samePersonException: { allowed: false, reason: '' },
    f04: undefined,
    registrationRefNo: '',
    f02: emptyF02(),
    executors: [],
    ndprChecklist: initialNdprResponses(),
  }
}
