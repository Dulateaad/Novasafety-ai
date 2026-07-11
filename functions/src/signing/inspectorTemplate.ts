/** Учётная запись инспектора по ОТ, ТБ и ООС (Рахат Алиев). */
export type InspectorAccountTemplate = {
  email: string
  password: string
  displayName: string
  role: 'safety'
  badgeNo: string
  inspectorSites: string[]
}

export const INSPECTOR_ACCOUNT_TEMPLATE: InspectorAccountTemplate = {
  email: 'rahataliev@nova.local',
  password: 'Rahat523',
  displayName: 'Рахат Алиев',
  role: 'safety',
  badgeNo: '018',
  inspectorSites: ['12 скважина', '21 скважина'],
}
