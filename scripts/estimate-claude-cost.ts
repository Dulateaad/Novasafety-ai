import { ABR_RISK_ASSESSMENT_SYSTEM_PROMPT, buildAbrRiskAssessmentUserPrompt } from '../src/config/abrRiskAssessmentPrompt'
import { NEBOSH_RISK_ASSESSMENT_SYSTEM_PROMPT, buildNeboshRiskAssessmentUserPrompt } from '../src/config/neboshRiskAssessmentPrompt'
import { PPR_CONTROL_MEASURES_SYSTEM_PROMPT, buildControlMeasuresUserPrompt } from '../src/config/pprControlMeasuresPrompt'

const tok = (s: string) => Math.ceil(s.length / 3)

const typicalPpr = {
  workTitle: 'Очистка трубопровода GRE от скважины U12 до сборной станции',
  workStages: Array.from({ length: 6 }, (_, i) =>
    `Этап ${i + 1}: Подготовка площадки, сброс давления, отключение участка, установка заглушек, газоанализ, LOTO. Оборудование: манометр, шланги, азотная установка.`,
  ).join('\n'),
  tools: 'Азотная установка; сепаратор; манометры; шланги; заглушки; газоанализатор; ЛАРН; СИЗ',
  cm: Array.from({ length: 40 }, (_, i) =>
    `### Раздел ${i + 1}\nОпасность: работа под давлением / газоопасная зона\n- Мера ${i * 3 + 1}: LOTO и блокировка\n- Мера ${i * 3 + 2}: газоанализ перед входом\n- Мера ${i * 3 + 3}: СИЗ и инструктаж`,
  ).join('\n\n'),
  site: '12 скважина GRE U12',
  contractor: 'ТОО Подрядчик',
}

const abrUser = buildAbrRiskAssessmentUserPrompt({
  workTitle: typicalPpr.workTitle,
  workStages: typicalPpr.workStages,
  toolsAndEquipment: typicalPpr.tools,
  controlMeasuresMarkdown: typicalPpr.cm,
  siteName: typicalPpr.site,
  permitNo: 'НД-2026-001',
  contractorOrg: typicalPpr.contractor,
  dateIso: '2026-06-13',
  shiftDay: true,
  shiftNight: false,
})

const nebUser = buildNeboshRiskAssessmentUserPrompt({
  workTitle: typicalPpr.workTitle,
  workDescription: '',
  workStages: typicalPpr.workStages,
  workVolume: '',
  toolsAndEquipment: typicalPpr.tools,
  controlMeasuresMarkdown: typicalPpr.cm,
  siteName: typicalPpr.site,
  contractorOrg: typicalPpr.contractor,
  preparedBy: 'Каниев Н. — производитель работ',
})

const pprDocText = typicalPpr.cm.repeat(2).slice(0, 14000)
const pprUser = buildControlMeasuresUserPrompt(pprDocText, 'ppr-example.docx')

type Scenario = { input: number; output: number; label: string }

const scenarios: Record<string, Scenario> = {
  PPR_docx: {
    label: 'Извлечение ППР (.docx)',
    input: tok(PPR_CONTROL_MEASURES_SYSTEM_PROMPT) + tok(pprUser),
    output: 8000,
  },
  PPR_pdf: {
    label: 'Извлечение ППР (PDF)',
    input: tok(PPR_CONTROL_MEASURES_SYSTEM_PROMPT) + 200 + 25000,
    output: 8000,
  },
  ABR: {
    label: 'АБР',
    input: tok(ABR_RISK_ASSESSMENT_SYSTEM_PROMPT) + tok(abrUser),
    output: 2500,
  },
  NEBOSH: {
    label: 'Оценка риска',
    input: tok(NEBOSH_RISK_ASSESSMENT_SYSTEM_PROMPT) + tok(nebUser),
    output: 12000,
  },
}

for (const s of Object.values(scenarios)) {
  console.log(`${s.label}: вход ~${s.input.toLocaleString()}, выход ~${s.output.toLocaleString()}`)
}

const prices = {
  'Haiku 4.5': { in: 1, out: 5 },
  'Sonnet 4.6': { in: 3, out: 15 },
  'Opus 4.8': { in: 5, out: 25 },
  'Fable 5': { in: 10, out: 50 },
}

function usd(model: keyof typeof prices, inTok: number, outTok: number) {
  const p = prices[model]
  return (inTok / 1e6) * p.in + (outTok / 1e6) * p.out
}

console.log('\n--- Стоимость одного запроса ---')
for (const s of Object.values(scenarios)) {
  console.log(`\n${s.label}`)
  for (const model of Object.keys(prices) as Array<keyof typeof prices>) {
    console.log(`  ${model}: $${usd(model, s.input, s.output).toFixed(3)}`)
  }
}

const fullDocx = ['PPR_docx', 'ABR', 'NEBOSH'] as const
const fullPdf = ['PPR_pdf', 'ABR', 'NEBOSH'] as const

function packageCost(keys: readonly string[], model: keyof typeof prices) {
  let inSum = 0
  let outSum = 0
  for (const k of keys) {
    inSum += scenarios[k].input
    outSum += scenarios[k].output
  }
  return usd(model, inSum, outSum)
}

console.log('\n--- Полный пакет на 1 наряд ---')
for (const model of Object.keys(prices) as Array<keyof typeof prices>) {
  console.log(`${model}: docx $${packageCost(fullDocx, model).toFixed(2)} | pdf $${packageCost(fullPdf, model).toFixed(2)}`)
}

console.log('\n--- 100 нарядов/мес (docx) ---')
for (const model of Object.keys(prices) as Array<keyof typeof prices>) {
  console.log(`${model}: $${(packageCost(fullDocx, model) * 100).toFixed(0)}`)
}

console.log('\nDEBUG chars:', {
  abrUser: abrUser.length,
  nebUser: nebUser.length,
  pprUser: pprUser.length,
})
