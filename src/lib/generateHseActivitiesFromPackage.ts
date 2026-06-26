import {
  buildHseActivitiesUserPrompt,
  HSE_ACTIVITIES_AI_SYSTEM_PROMPT,
} from '../config/hseActivitiesAiPrompt'
import {
  HSE_ACTIVITY_TEMPLATES,
  hseTemplateIdsFromNdprActivity,
} from '../config/hseActivityTemplates'
import type { PermitDraft } from '../types/domain'
import type { PprForm } from '../types/ppr'
import { isAssistantChatConfigured, requestAssistantCompletion } from './chatAssistant'
import { aiGenerateText, isAiClientReady } from './aiClient'
import { parseHseActivitiesAiJson, type HseActivitiesAiResult } from './hseActivitiesAiParse'
import { extractTextFromPprAttachment } from './pprDocText'
import { isGeminiExtractionAvailable } from './pprGeminiExtract'

const KEYWORD_RULES: { pattern: RegExp; id: string }[] = [
  { pattern: /огнев.*высот|высот.*огнев|сварк.*высот/i, id: 'work-fire-height' },
  { pattern: /огнев|открыт[^\n]{0,20}огн|свар(очн|к)|резк[^\n]{0,12}металл/i, id: 'work-fire' },
  { pattern: /на высот|высотн|люльк| стропаль| подъём/i, id: 'work-height' },
  { pattern: /замкнут|зпо|confined|закрыт[^\n]{0,10}объ[её]м/i, id: 'work-confined' },
  { pattern: /газоопас|взрывоопас|h₂s| сероводород|кислород/i, id: 'work-gas' },
  { pattern: /электр|напряжен|электроустанов/i, id: 'work-electrical' },
  { pattern: /радиограф|рентген|излучен/i, id: 'work-radiographic' },
  { pattern: /loto|блокировк|изоляц[^\n]{0,20}энерг/i, id: 'work-isolation' },
  { pattern: /грузопод|кран|такелаж|строп/i, id: 'work-lifting' },
  { pattern: /землян|котлован|тrench/i, id: 'work-excavation' },
  { pattern: /simops|одновременн[^\n]{0,12}операц/i, id: 'tb-simops' },
]

function suggestHseTemplateIdsByRules(
  ndpr: PermitDraft,
  haystack: string,
): string[] {
  const ids = new Set(hseTemplateIdsFromNdprActivity(ndpr.specialWorkActivity))
  const text = haystack.toLowerCase()

  for (const { pattern, id } of KEYWORD_RULES) {
    if (pattern.test(text)) ids.add(id)
  }

  if (ids.size === 0) {
    ids.add('ot-briefing')
    ids.add('ot-ppe-check')
  }

  return [...ids].filter((id) => HSE_ACTIVITY_TEMPLATES.some((t) => t.id === id))
}

async function loadPprTextExcerpt(ppr: PprForm): Promise<string> {
  if (ppr.controlMeasures?.markdown) {
    return ppr.controlMeasures.markdown.slice(0, 12000)
  }
  if (!ppr.attachment) return ''
  try {
    const full = await extractTextFromPprAttachment(ppr.attachment)
    return full.length > 12000 ? `${full.slice(0, 12000)}\n…[обрезано]` : full
  } catch {
    return ''
  }
}

async function generateWithAi(userPrompt: string): Promise<HseActivitiesAiResult> {
  const raw = await aiGenerateText({
    systemPrompt: HSE_ACTIVITIES_AI_SYSTEM_PROMPT,
    userPrompt,
    json: true,
  })
  const parsed = parseHseActivitiesAiJson(raw)
  return { ...parsed, method: 'ai' }
}

async function generateWithAssistant(userPrompt: string): Promise<HseActivitiesAiResult> {
  const raw = await requestAssistantCompletion(
    [{ role: 'user', content: userPrompt }],
    { systemPrompt: HSE_ACTIVITIES_AI_SYSTEM_PROMPT },
  )
  const parsed = parseHseActivitiesAiJson(raw)
  return { ...parsed, method: 'ai' }
}

/** ИИ / правила: подбор шаблонов мероприятий ОТ/ТБ/ООС по НДПР + ППР. */
export async function generateHseActivitiesFromPackage(
  ndpr: PermitDraft,
  ppr: PprForm,
): Promise<HseActivitiesAiResult> {
  const pprExcerpt = await loadPprTextExcerpt(ppr)
  const userPrompt = buildHseActivitiesUserPrompt({ ndpr, ppr, pprExcerpt })
  const haystack = [
    ndpr.title,
    ndpr.workDescription,
    ndpr.toolsAndEquipment,
    ppr.workTitle,
    pprExcerpt,
    ppr.controlMeasures?.markdown ?? '',
  ].join('\n')

  if (isAiClientReady()) {
    try {
      return await generateWithAi(userPrompt)
    } catch {
      /* assistant or rules */
    }
  }

  if (isAssistantChatConfigured()) {
    try {
      return await generateWithAssistant(userPrompt)
    } catch {
      /* rules */
    }
  }

  const templateIds = suggestHseTemplateIdsByRules(ndpr, haystack)
  return {
    templateIds,
    rationale:
      'Подбор по виду работ из НДПР и ключевым словам в ППР (без ИИ — задайте VITE_ANTHROPIC_API_KEY для полного анализа).',
    method: 'rules',
  }
}

export function isHseAiAvailable(): boolean {
  return isGeminiExtractionAvailable() || isAssistantChatConfigured()
}
