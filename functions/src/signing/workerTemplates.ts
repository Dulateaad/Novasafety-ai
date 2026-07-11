export type WorkerAccountTemplate = {
  email: string
  password: string
  displayName: string
  badgeNo: string
}

/** Стандартные учётки работников бригады (синхронно с src/config/defaultWorkers.ts). */
export const WORKER_ACCOUNT_TEMPLATES: WorkerAccountTemplate[] = [
  {
    email: 'worker1@nova.local',
    password: 'Worker123',
    displayName: 'Ким Алибек — слесарь-монтажник',
    badgeNo: '010',
  },
  {
    email: 'worker2@nova.local',
    password: 'Worker223',
    displayName: 'Алиев Бахыт — электромонтер',
    badgeNo: '011',
  },
  {
    email: 'worker3@nova.local',
    password: 'Worker323',
    displayName: 'Нурланов Серик — сварщик',
    badgeNo: '012',
  },
  {
    email: 'worker4@nova.local',
    password: 'Worker423',
    displayName: 'Жумабеков Ерлан — аппаратчик',
    badgeNo: '013',
  },
  {
    email: 'worker5@nova.local',
    password: 'Worker523',
    displayName: 'Оразов Марат — машинист крана',
    badgeNo: '014',
  },
  {
    email: 'worker6@nova.local',
    password: 'Worker623',
    displayName: 'Тлеуберген Данияр — газорезчик',
    badgeNo: '015',
  },
  {
    email: 'worker7@nova.local',
    password: 'Worker723',
    displayName: 'Сейтова Гульнара — оператор установки',
    badgeNo: '016',
  },
]
