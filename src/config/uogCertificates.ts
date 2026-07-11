/** Реестр процедур UOG-HSE (файлы в public/certificates/). */
export interface UogCertificate {
  id: string
  code: string
  title: string
  /** Путь для скачивания из public (если файл есть). */
  publicPath?: string
  /** Ключевые слова для автопривязки к ППР. */
  matchPatterns: RegExp[]
  /** Всегда прикреплять при оформлении наряда. */
  alwaysAttach?: boolean
}

export const UOG_CERTIFICATES: UogCertificate[] = [
  {
    id: 'pr-012',
    code: 'UOG-HSE-PR-012',
    title: 'Процедура работы на высоте',
    publicPath: '/certificates/UOG-HSE-PR-012.docx',
    matchPatterns: [/высот/i, /люльк/i, /страхов(очн|к)/i, /пояс/i, /лес(a|ов)/i, /подъ[её]м/i],
  },
  {
    id: 'pr-001',
    code: 'UOG-HSE-PR-001',
    title: 'Процедура по идентификации и оценке рисков',
    publicPath: '/certificates/UOG-HSE-PR-001.docx',
    matchPatterns: [/асор/i, /риск/i, /оценк/i, /идентификац/i],
    alwaysAttach: true,
  },
  {
    id: 'pr-007-r',
    code: 'UOG-HSE-PR-007-R',
    title: 'Система наряд-допуска',
    publicPath: '/certificates/UOG-HSE-PR-007-R.docx',
    matchPatterns: [/наряд/i, /допуск/i, /ндпр/i, /ptw/i],
    alwaysAttach: true,
  },
  {
    id: 'pr-055',
    code: 'UOG-HSE-PR-055',
    title: 'Процедура знаки безопасности и сигнальная разметка',
    publicPath: '/certificates/UOG-HSE-PR-055.docx',
    matchPatterns: [/знак/i, /разметк/i, /огражден/i, /баррикад/i, /сигнал/i],
  },
  {
    id: 'pl-003',
    code: 'UOG-HSE-PL-003',
    title: 'План управления отходами',
    publicPath: '/certificates/UOG-HSE-PL-003.docx',
    matchPatterns: [/отход/i, /мусор/i, /утилиз/i, /складирован/i],
  },
]

export function uogCertificateById(id: string): UogCertificate | undefined {
  return UOG_CERTIFICATES.find((c) => c.id === id)
}

export function uogCertificateLabel(cert: UogCertificate): string {
  return `${cert.code} ${cert.title}`
}
