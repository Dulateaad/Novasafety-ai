import { SOURCE_DOCUMENT_LABEL } from '../config/branding'
import { ABR_CONTROLS, ABR_HAZARDS } from '../config/abrCatalog'
import type { AbrBriefingAnswers, AbrForm, AbrPostWorkAnswers, AbrStageRow } from '../types/abr'

function hazardName(no: number): string {
  return ABR_HAZARDS.find((h) => h.no === no)?.text.toLowerCase() ?? 'опасность на площадке'
}

function controlPhrase(no: number): string {
  const item = ABR_CONTROLS.find((c) => c.no === no)
  if (!item) return ''
  const shortcuts: Record<number, string> = {
    7: 'стационарный газоанализ',
    18: 'процедуру LOTO (блокировку и маркировку)',
    19: 'отбор проб воздуха по наряд-допуск',
    26: 'предупреждающие знаки и ограждения',
    27: 'сигнальщика',
    31: 'наблюдателя по ТБ',
    32: 'пожарного наблюдателя',
    33: 'наставника для молодых рабочих',
    48: 'средства защиты органов дыхания (СИЗОД)',
    50: 'защиту рук и ног',
    51: 'светоотражающие жилеты',
  }
  if (shortcuts[no]) return shortcuts[no]
  const text = item.text
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function joinPhrases(items: string[]): string {
  const parts = items.filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} и ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} и ${parts[parts.length - 1]}`
}

function topNumbers(nums: number[], limit: number): number[] {
  const freq = new Map<number, number>()
  for (const n of nums) {
    if (n >= 1 && n <= 54) freq.set(n, (freq.get(n) ?? 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([n]) => n)
}

function allControls(stages: AbrStageRow[]): number[] {
  return [...new Set(stages.flatMap((s) => s.controlNumbers))].sort((a, b) => a - b)
}

/** Разбивает слипшиеся пункты «1. … 2. …» на отдельные строки. */
export function formatAbrAnswerText(text: string): string {
  const raw = (text || '').trim()
  if (!raw) return ''

  let normalized = raw.replace(/\r\n/g, '\n')
  normalized = normalized.replace(/([.\)])(\d+\.)\s*/g, '$1\n$2 ')
  normalized = normalized.replace(/(\S)(\d+\.\s)/g, '$1\n$2')

  let parts = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (parts.length === 1) {
    const line = parts[0]
    if (line.includes(';')) {
      parts = line.split(';').map((item) => item.trim()).filter(Boolean)
    } else if (/\d+\./.test(line)) {
      parts = line
        .split(/(?<=[\.\)])(\d+\.\s*)/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  if (parts.length <= 1) return raw

  return parts
    .map((line, i) => {
      const t = line.trim()
      if (!t) return ''
      if (/^\d+[\.\)]\s/.test(t)) return t
      return `${i + 1}. ${t.replace(/^•\s*/, '')}`
    })
    .filter(Boolean)
    .join('\n')
}

function pickControlPhrases(controls: number[], preferred: number[]): string {
  const chosen = preferred.filter((n) => controls.includes(n))
  const fallback = controls.filter((n) => !chosen.includes(n)).slice(0, 4)
  return joinPhrases([...chosen, ...fallback].map(controlPhrase).filter(Boolean))
}

function buildTopHazardsAnswer(stages: AbrStageRow[]): string {
  const hazards = new Set(stages.flatMap((s) => s.hazardNumbers))
  const controls = allControls(stages)
  const lines: string[] = []

  if (hazards.has(46) || hazards.has(52)) {
    const measures = pickControlPhrases(controls, [18, 7, 27, 31, 48])
    lines.push(
      `${lines.length + 1}. Работа с ${hazards.has(46) ? 'трубопроводами под давлением' : 'оборудованием'}${hazards.has(52) ? ' и возможным сбросом высокого давления' : ''} — ${measures ? `применять ${measures}, ` : ''}удерживать персонал вне опасной зоны радиусом не менее 30 м.`,
    )
  }

  if (hazards.has(19)) {
    const measures = pickControlPhrases(controls, [7, 48, 19, 31])
    lines.push(
      `${lines.length + 1}. ${hazardName(19).charAt(0).toUpperCase()}${hazardName(19).slice(1)} — ${measures ? `использовать ${measures}, ` : ''}контролировать воздушную среду перед началом и во время каждого этапа работ.`,
    )
  }

  if (hazards.has(7) || hazards.has(10)) {
    const measures = pickControlPhrases(controls, [32, 26, 7, 50])
    lines.push(
      `${lines.length + 1}. Пожаро-взрывоопасность при работах с газом и горячими средами — запретить открытый огонь в опасной зоне${measures ? `, обеспечить ${measures}` : ''}.`,
    )
  }

  if (hazards.has(6)) {
    lines.push(
      `${lines.length + 1}. Опасность нахождения в зоне возможного удара или выброса (Line of Fire) — не допускать персонал в зону действия оборудования до подтверждения безопасных условий.`,
    )
  }

  const remaining = topNumbers(
    stages.flatMap((s) => s.hazardNumbers),
    5,
  ).filter((n) => !lines.some((l) => l.includes(hazardName(n))))

  for (const hNo of remaining) {
    if (lines.length >= 3) break
    const stage = stages.find((s) => s.hazardNumbers.includes(hNo))
    const measures = stage ? pickControlPhrases(stage.controlNumbers, stage.controlNumbers) : ''
    const name = hazardName(hNo)
    lines.push(
      `${lines.length + 1}. ${name.charAt(0).toUpperCase()}${name.slice(1)} на этапе «${stage?.title ?? 'работ'}»${measures ? ` — применяются ${measures}` : ' — соблюдаются меры контроля по АБР'}.`,
    )
  }

  while (lines.length < 3) {
    lines.push(
      `${lines.length + 1}. Соблюдение требований наряд-допуска, инструктажа и средств защиты, указанных в этапах данного АБР.`,
    )
  }

  return lines.slice(0, 3).join('\n')
}

function buildStopScenariosAnswer(stages: AbrStageRow[]): string {
  const hazards = new Set(stages.flatMap((s) => s.hazardNumbers))
  const controls = new Set(stages.flatMap((s) => s.controlNumbers))
  const lines: string[] = []

  if (hazards.has(19)) {
    lines.push(
      `${lines.length + 1}. Обнаружение загазованности выше допустимых концентраций или отсутствие показаний газоанализатора — немедленная остановка работ и эвакуация персонала.`,
    )
  }
  if (hazards.has(6) || hazards.has(46) || hazards.has(52)) {
    lines.push(
      `${lines.length + 1}. Обнаружение персонала в опасной зоне (Line of Fire) или нештатная ситуация при работе с давлением — остановка всех операций до полной эвакуации зоны.`,
    )
  }
  if (hazards.has(7) || hazards.has(52)) {
    lines.push(
      `${lines.length + 1}. Потеря герметичности, утечка углеводородов, неисправность манометров или предохранительных устройств — прекращение работ и переход в режим аварийного сброса давления.`,
    )
  }
  if (controls.has(18) || hazards.has(46)) {
    lines.push(
      `${lines.length + 1}. Нарушение процедуры LOTO, несанкционированный пуск оборудования или отклонение от утверждённого порядка работ — немедленная остановка и доклад руководителю работ.`,
    )
  }

  while (lines.length < 3) {
    lines.push(
      `${lines.length + 1}. Любая нештатная ситуация, угроза жизни и здоровью или нарушение условий наряд-допуска — работы прекращаются до устранения причины и разрешения руководства.`,
    )
  }

  return lines.slice(0, 3).join('\n')
}

function buildMorMentorsAnswer(stages: AbrStageRow[]): string {
  const controls = allControls(stages)
  const hasMentor = controls.includes(33)
  const stageList = stages
    .map((s) => s.title)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ')

  const parts = [
    'Все работники прошли целевой инструктаж перед началом работ, ознакомлены с опасными факторами и мерами контроля по данному АБР.',
    stageList
      ? `Обсуждены этапы: ${stageList}.`
      : 'Обсуждены этапы работ и порядок безопасного их выполнения.',
    hasMentor
      ? 'Для молодых рабочих (МОР) назначен наставник; наставник находится на рабочем месте, знает свои обязанности и контролирует соблюдение требований безопасности.'
      : 'Молодых рабочих без стажа (МОР) в бригаде нет либо каждый работник имеет допуск и опыт выполнения аналогичных работ.',
  ]
  return parts.join(' ')
}

function buildPostWorkAnswers(
  stages: AbrStageRow[],
  jobDescription: string,
  workLocation: string,
): AbrPostWorkAnswers {
  const hazards = new Set(stages.flatMap((s) => s.hazardNumbers))
  const controls = new Set(stages.flatMap((s) => s.controlNumbers))

  const doneWell: string[] = []
  if (controls.has(18)) {
    doneWell.push('Соблюдены все процедуры LOTO при отключении и изоляции оборудования.')
  }
  if (controls.has(7)) {
    doneWell.push('Газоанализ проводился перед началом каждого этапа и подтвердил безопасные параметры.')
  }
  if (hazards.has(46) || hazards.has(52)) {
    doneWell.push(
      'Персонал находился вне опасной зоны во время операций со сбросом давления и работ с технологическим оборудованием.',
    )
  }
  if (controls.has(32) || controls.has(26)) {
    doneWell.push(
      'Первичные средства пожаротушения, ограждения и предупреждающие знаки были готовы на месте проведения работ.',
    )
  }
  if (doneWell.length === 0) {
    doneWell.push(
      'Работы выполнены в соответствии с планом, требованиями безопасности и условиями наряд-допуска.',
    )
  }

  const improvements: string[] = [
    'Проведён дополнительный инструктаж по действиям при нештатных ситуациях.',
  ]
  if (hazards.has(46) || hazards.has(52)) {
    improvements.push(
      'Техническое состояние манометров и предохранительных устройств проверено перед началом работ.',
    )
  }
  improvements.push(
    `Актуальные схемы, ${SOURCE_DOCUMENT_LABEL.toLowerCase()} и план ликвидации аварий находились на рабочем месте.`,
  )

  const workRef = [workLocation, jobDescription].filter((s) => s.trim()).join(' — ')

  return {
    doneWell: doneWell.join(' '),
    doneWrong:
      'Отклонений от плана, нарушений процедур, неисправностей оборудования и проблем с коммуникацией между членами бригады не выявлено.',
    improvements: improvements.join(' '),
    pprUsage: workRef
      ? `${SOURCE_DOCUMENT_LABEL} использовался как основной документ для планирования этапов работ (${workRef}), определения опасных факторов и выбора средств защиты. Все требования ${SOURCE_DOCUMENT_LABEL.toLowerCase()} по безопасному выполнению работ были реализованы на площадке.`
      : `${SOURCE_DOCUMENT_LABEL} использовался как основной документ для планирования этапов, определения опасных факторов и выбора средств защиты. Требования ${SOURCE_DOCUMENT_LABEL.toLowerCase()} были выполнены на всех этапах работ.`,
  }
}

function buildAnswersFromStages(abr: AbrForm): {
  briefing: AbrBriefingAnswers
  postWork: AbrPostWorkAnswers
} {
  const { stages, jobDescription, workLocation } = abr
  return {
    briefing: {
      topHazardsAndControls: buildTopHazardsAnswer(stages),
      stopScenarios: buildStopScenariosAnswer(stages),
      morMentors: buildMorMentorsAnswer(stages),
    },
    postWork: buildPostWorkAnswers(stages, jobDescription, workLocation),
  }
}

/** Ответы инструктажа и итогов — по анализу этапов АБР, понятным языком. */
export function enrichAbrAnswers(abr: AbrForm): AbrForm {
  if (!abr.stages.length) return abr

  const generated = buildAnswersFromStages(abr)

  return {
    ...abr,
    briefing: generated.briefing,
    postWork: generated.postWork,
  }
}
