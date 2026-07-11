import type { AsorPpeSelections } from '../types/asor'
import { emptyPpeBlock } from '../types/asor'
import type { PprForm } from '../types/ppr'

type PpeRule = { field: keyof AsorPpeSelections; patterns: RegExp[] }

const PPE_RULES: PpeRule[] = [
  { field: 'fallHarnessSystem', patterns: [/страхов(очн|к)/i, /высот/i, /пояс/i, /люльк/i] },
  { field: 'faceShield', patterns: [/лицев[^\n]{0,8}щит/i, /защит[^\n]{0,8}лиц/i] },
  { field: 'helmetWelding', patterns: [/свар(очн|к)/i, /шлем[^\n]{0,12}свар/i] },
  { field: 'helmetPainting', patterns: [/лакокрас/i, /окras/i, /покрас/i] },
  { field: 'arboristHelmet', patterns: [/лес(a|ов)/i, /арборист/i] },
  { field: 'eyeChem', patterns: [/хим[^\n]{0,8}очк/i, /кислот/i, /щелоч/i] },
  { field: 'eyeCuttingGrinding', patterns: [/резк/i, /шлиф/i, /болгар/i] },
  { field: 'hearEarplugs', patterns: [/беруш/i] },
  { field: 'hearMuffs', patterns: [/наушник/i, /слух/i, /шум/i] },
  { field: 'respDustMask', patterns: [/пыл[^\n]{0,8}маск/i, /респиратор/i, /пыл/i] },
  { field: 'respCascade', patterns: [/каскад/i, /фильтр[^\n]{0,8}комбин/i] },
  { field: 'respSCBA', patterns: [/сиzod|сизод|вда|scba|изолирован/i] },
  { field: 'clothChem', patterns: [/хим[^\n]{0,8}одежд/i, /химзащит/i] },
  { field: 'clothWelding', patterns: [/свар[^\n]{0,12}одежд/i, /огнеупор/i] },
  { field: 'clothRainSuits', patterns: [/дождев/i] },
  { field: 'clothingDisposable', patterns: [/однораз/i, /комбинезон/i] },
  { field: 'apronLeather', patterns: [/фартук[^\n]{0,8}кож/i] },
  { field: 'apronChem', patterns: [/фартук[^\n]{0,8}хим/i] },
  { field: 'glovesCotton', patterns: [/перчат[^\n]{0,8}хлоп/i, /тканев[^\n]{0,8}перчат/i] },
  { field: 'glovesLeather', patterns: [/перчат[^\n]{0,8}кож/i] },
  { field: 'glovesChem', patterns: [/перчат[^\n]{0,8}хим/i, /нитрил/i] },
  { field: 'glovesWelding', patterns: [/перчат[^\n]{0,8}свар/i, /краги/i] },
  { field: 'glovesDielectric', patterns: [/диэлектр/i, /электр[^\n]{0,12}перчат/i] },
  { field: 'feetDielectricBoots', patterns: [/диэлектр[^\n]{0,8}сапог/i, /галош/i] },
  { field: 'feetRubberBoots', patterns: [/резин[^\n]{0,8}сапог/i, /пвх/i] },
  { field: 'signsHearing', patterns: [/знак[^\n]{0,12}слух/i] },
  { field: 'signsDroppedObjects', patterns: [/падающ/i, /предмет/i] },
  { field: 'signsRadiography', patterns: [/рентген/i, /радиограф/i, /излучен/i] },
  { field: 'signsN2Blowdown', patterns: [/n₂|n2|азот/i, /продув/i] },
  { field: 'fenceDangerArea', patterns: [/огражден/i, /опасн[^\n]{0,8}участ/i, /баррикад/i] },
  { field: 'fenceGasWorks', patterns: [/газоопас/i, /газ[^\n]{0,8}работ/i] },
  { field: 'extraRadioOther', patterns: [/раци/i, /связ/i, /канал/i] },
]

function pprTextBlob(ppr: PprForm): string {
  return [
    ppr.workDescription,
    ppr.safetyMeasures,
    ppr.toolsAndEquipment,
    ...ppr.tasks.map((t) => `${t.workContent} ${t.safetyMeasures}`),
    ...(ppr.controlMeasures?.items ?? []).flatMap((i) => [
      i.hazard,
      ...i.controlMeasures,
    ]),
  ].join('\n')
}

/** Автозаполнение СИЗ по тексту ППР (меры контроля, задания). */
export function inferPpeFromPpr(ppr: PprForm): AsorPpeSelections {
  const base = emptyPpeBlock()
  const hay = pprTextBlob(ppr)
  if (!hay.trim()) return base

  const next = { ...base }
  for (const rule of PPE_RULES) {
    if (rule.patterns.some((re) => re.test(hay))) {
      const key = rule.field
      if (key in next && typeof next[key] === 'boolean') {
        next[key] = true as never
      }
    }
  }
  return next
}
