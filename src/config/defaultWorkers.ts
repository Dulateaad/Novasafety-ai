import type { DemoUser } from '../types/domain'

export type DefaultWorkerSpec = {
  key: string
  displayName: string
  emails: string[]
  demoIds: string[]
  badgeNo: string
  namePatterns?: RegExp[]
}

/** Стандартная бригада — выбор в НДПР и ФИО в PDF. */
export const DEFAULT_WORKERS: DefaultWorkerSpec[] = [
  {
    key: 'worker1',
    displayName: 'Ким Алибек — слесарь-монтажник',
    emails: ['worker1@nova.local'],
    demoIds: ['w-worker-1'],
    badgeNo: '010',
    namePatterns: [/ким/i, /алибек/i, /слесар/i],
  },
  {
    key: 'worker2',
    displayName: 'Алиев Бахыт — электромонтер',
    emails: ['worker2@nova.local'],
    demoIds: ['w-worker-2'],
    badgeNo: '011',
    namePatterns: [/алиев/i, /бахыт/i, /электромонт/i],
  },
  {
    key: 'worker3',
    displayName: 'Нурланов Серик — сварщик',
    emails: ['worker3@nova.local'],
    demoIds: ['w-worker-3'],
    badgeNo: '012',
    namePatterns: [/нурланов/i, /серик/i, /сварщик/i],
  },
  {
    key: 'worker4',
    displayName: 'Жумабеков Ерлан — аппаратчик',
    emails: ['worker4@nova.local'],
    demoIds: ['w-worker-4'],
    badgeNo: '013',
    namePatterns: [/жумабеков/i, /ерлан/i, /аппаратчик/i],
  },
  {
    key: 'worker5',
    displayName: 'Оразов Марат — машинист крана',
    emails: ['worker5@nova.local'],
    demoIds: ['w-worker-5'],
    badgeNo: '014',
    namePatterns: [/оразов/i, /марат/i, /кран/i],
  },
  {
    key: 'worker6',
    displayName: 'Тлеуберген Данияр — газорезчик',
    emails: ['worker6@nova.local'],
    demoIds: ['w-worker-6'],
    badgeNo: '015',
    namePatterns: [/тлеуберген/i, /данияр/i, /газорез/i],
  },
  {
    key: 'worker7',
    displayName: 'Сейтова Гульнара — оператор установки',
    emails: ['worker7@nova.local'],
    demoIds: ['w-worker-7'],
    badgeNo: '016',
    namePatterns: [/сейтова/i, /гульнара/i, /оператор/i],
  },
]

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase()
}

function matchesNamePatterns(displayName: string, patterns?: RegExp[]): boolean {
  if (!patterns?.length) return false
  const text = displayName.trim()
  if (!text) return false
  return patterns.some((pattern) => pattern.test(text))
}

function withWorkerDefaults(user: DemoUser, spec: DefaultWorkerSpec): DemoUser {
  return {
    ...user,
    displayName: spec.displayName,
    role: 'executor',
    badgeNo: user.badgeNo?.trim() || spec.badgeNo,
  }
}

function findWorkerForSpec(
  directory: DemoUser[],
  spec: DefaultWorkerSpec,
): DemoUser | undefined {
  const byEmail = new Map(
    directory.map((u) => [normalizedEmail(u.email ?? ''), u]),
  )
  for (const email of spec.emails) {
    const hit = byEmail.get(normalizedEmail(email))
    if (hit) return withWorkerDefaults(hit, spec)
  }
  for (const id of spec.demoIds) {
    const hit = directory.find((u) => u.id === id)
    if (hit) return withWorkerDefaults(hit, spec)
  }
  for (const user of directory) {
    if (user.role !== 'executor') continue
    if (matchesNamePatterns(user.displayName, spec.namePatterns)) {
      return withWorkerDefaults(user, spec)
    }
  }
  return undefined
}

/** Дополняет справочник работниками с фиксированными ФИО. */
export function enrichUserDirectoryWithDefaultWorkers(
  directory: DemoUser[],
): DemoUser[] {
  const patched = directory.map((user) => {
    const spec = DEFAULT_WORKERS.find(
      (s) =>
        s.emails.some(
          (email) => normalizedEmail(email) === normalizedEmail(user.email ?? ''),
        ) ||
        s.demoIds.includes(user.id) ||
        matchesNamePatterns(user.displayName, s.namePatterns),
    )
    return spec ? withWorkerDefaults(user, spec) : user
  })

  for (const spec of DEFAULT_WORKERS) {
    if (findWorkerForSpec(patched, spec)) continue
    patched.push({
      id: spec.demoIds[0] ?? `default-${spec.key}`,
      displayName: spec.displayName,
      email: spec.emails[0] ?? '',
      role: 'executor',
      badgeNo: spec.badgeNo,
    })
  }

  return patched
}

export function defaultWorkerDemoUsers(): DemoUser[] {
  return DEFAULT_WORKERS.map((spec) => ({
    id: spec.demoIds[0] ?? `default-${spec.key}`,
    displayName: spec.displayName,
    email: spec.emails[0] ?? '',
    role: 'executor' as const,
    badgeNo: spec.badgeNo,
  }))
}
