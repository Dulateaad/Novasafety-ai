/** Учётная запись Emergency Response Team (ПАС). */
export type ErtAccountTemplate = {
  email: string
  password: string
  displayName: string
  role: 'ert'
  badgeNo: string
}

export const ERT_ACCOUNT_TEMPLATE: ErtAccountTemplate = {
  email: 'ert@nova.local',
  password: 'Ert235',
  displayName: 'ПАС Ардак Сабитов',
  role: 'ert',
  badgeNo: '022',
}
