import type { EgovSignRole } from './types'

export type SignerAccountTemplate = {
  email: string
  password: string
  displayName: string
  role: EgovSignRole
  badgeNo: string
  stepLabel: string
  iin?: string
}

/** Стандартные учётки подписантов (создаются автоматически при отправке на согласование). */
export const SIGNER_ACCOUNT_TEMPLATES: Record<EgovSignRole, SignerAccountTemplate> = {
  performer: {
    email: 'abylay2@nova.local',
    password: 'Abylay2523',
    displayName: 'Абылай Акмалиев',
    role: 'performer',
    badgeNo: '020',
    stepLabel: 'Шаг 1: 10.3 Ознакомился — Абылай Акмалиев — Производитель работ',
  },
  permitter: {
    email: 'permitter@nova.local',
    password: 'Permitter123',
    displayName: 'Ибат Габитжан',
    role: 'permitter',
    badgeNo: '002',
    stepLabel: 'Шаг 2: Допустил — Ибат Габитжан — Допускающий',
  },
  issuer: {
    email: 'temirlan@nova.local',
    password: 'Temirlan523',
    displayName: 'Темирлан Уахитов',
    role: 'issuer',
    badgeNo: '008',
    stepLabel: 'Шаг 3: Выдал — Темирлан Уахитов — Выдающий НД',
  },
  leadExpert: {
    email: 'lead@nova.local',
    password: 'Lead123',
    displayName: 'Али Зайнуллин',
    role: 'leadExpert',
    badgeNo: '004',
    stepLabel: 'Шаг 4: Утвердил — Али Зайнуллин — Утверждающий НД',
  },
  ert: {
    email: 'ert@nova.local',
    password: 'Ert235',
    displayName: 'ПАС Ардак Сабитов',
    role: 'ert',
    badgeNo: '022',
    stepLabel: 'Согласовал (ERT) — ПАС Ардак Сабитов',
  },
}

/** Дополнительные производители работ (выбор в НДПР, отдельные учётки). */
export const ADDITIONAL_PERFORMER_ACCOUNT_TEMPLATES: SignerAccountTemplate[] = [
  {
    email: 'nurkhan@nova.local',
    password: 'Nurkhan523',
    displayName: 'Нурхан Каниев',
    role: 'performer',
    badgeNo: '021',
    stepLabel: 'Производитель работ — Нурхан Каниев',
  },
]
