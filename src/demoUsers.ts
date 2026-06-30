import type { DemoUser } from './types/domain'

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'u-coordinator',
    displayName: 'Админ Системы',
    email: 'coordinator@demo.local',
    role: 'coordinator',
    badgeNo: '001',
  },
  {
    id: 'u-issuer',
    displayName: 'Иванов — выдающий',
    email: 'issuer@demo.local',
    role: 'issuer',
    badgeNo: '002',
  },
  {
    id: 'u-permitter',
    displayName: 'Ибат Габитжан',
    email: 'permitter@nova.local',
    role: 'permitter',
    badgeNo: '002',
  },
  {
    id: 'u-performer',
    displayName: 'Сидоров — ПР',
    email: 'performer@demo.local',
    role: 'performer',
    badgeNo: '004',
  },
  {
    id: 'u-performer-2',
    displayName: 'Каменов — производитель работ',
    email: 'performer2@demo.local',
    role: 'performer',
    badgeNo: '005',
  },
  {
    id: 'u-performer-3',
    displayName: 'Токаев — производитель работ',
    email: 'performer3@demo.local',
    role: 'performer',
    badgeNo: '006',
  },
  {
    id: 'u-performer-4',
    displayName: 'Байжанов — производитель работ',
    email: 'performer4@demo.local',
    role: 'performer',
    badgeNo: '007',
  },
  {
    id: 'u-performer-5',
    displayName: 'Уахитов Темирлан — инженер по ОТ, ТБ и ООС',
    email: 'temirlan-safety@nova.local',
    role: 'safety',
    badgeNo: '008',
  },
  {
    id: 'u-performer-abylay',
    displayName: 'Абылай Акмалиев',
    email: 'abylay2@nova.local',
    role: 'performer',
    badgeNo: '020',
  },
  {
    id: 'u-performer-6',
    displayName: 'Абылай — производитель работ',
    email: 'abylay@nova.local',
    role: 'performer',
    badgeNo: '009',
  },
  {
    id: 'u-issuer-temirlan',
    displayName: 'Темирлан Усеинов',
    email: 'temirlan@nova.local',
    role: 'issuer',
    badgeNo: '008',
  },
  {
    id: 'u-ert',
    displayName: 'ПАС — Пожарно-аварийная служба',
    email: 'ert@nova.local',
    role: 'ert',
    badgeNo: '022',
  },
  {
    id: 'u-executor',
    displayName: 'Ким А. — слесарь-монтажник',
    email: 'executor@demo.local',
    role: 'executor',
    badgeNo: '010',
  },
  {
    id: 'u-worker-2',
    displayName: 'Алиев Б. — электромонтер',
    email: 'worker2@demo.local',
    role: 'executor',
    badgeNo: '011',
  },
  {
    id: 'u-worker-3',
    displayName: 'Нурланов С. — сварщик',
    email: 'worker3@demo.local',
    role: 'executor',
    badgeNo: '012',
  },
  {
    id: 'u-worker-4',
    displayName: 'Жумабеков Е. — аппаратчик',
    email: 'worker4@demo.local',
    role: 'executor',
    badgeNo: '013',
  },
  {
    id: 'u-worker-5',
    displayName: 'Оразов М. — машинист крана',
    email: 'worker5@demo.local',
    role: 'executor',
    badgeNo: '014',
  },
  {
    id: 'u-worker-6',
    displayName: 'Тлеуберген Д. — газорезчик',
    email: 'worker6@demo.local',
    role: 'executor',
    badgeNo: '015',
  },
  {
    id: 'u-worker-7',
    displayName: 'Сейтова Г. — оператор установки',
    email: 'worker7@demo.local',
    role: 'executor',
    badgeNo: '016',
  },
  {
    id: 'u-contractor',
    displayName: 'ТОО Подряд — заявитель',
    email: 'contractor@demo.local',
    role: 'contractor',
    badgeNo: '017',
  },
  {
    id: 'u-safety',
    displayName: 'Представитель ОТ/ТБ',
    email: 'safety@demo.local',
    role: 'safety',
    badgeNo: '018',
  },
  {
    id: 'u-lead',
    displayName: 'Али Зайнуллин',
    email: 'lead@nova.local',
    role: 'leadExpert',
    badgeNo: '004',
  },
]

export function userById(id: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.id === id)
}

/** Справочник из Firestore, иначе демо-ID из старых записей. */
export function resolveUserDirectoryEntry(
  id: string,
  directory: DemoUser[],
): DemoUser | undefined {
  return directory.find((u) => u.id === id) ?? userById(id)
}
