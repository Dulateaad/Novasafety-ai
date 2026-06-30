import { ABR_LABEL, APP_NAME } from '../config/branding'
import type { AsorForm } from '../types/asor'
import type { DemoUser, PermitDraft } from '../types/domain'
import { isAiClientReady } from './aiClient'
import { isNdGatePassed } from './ndGate'
import { isPprGatePassed } from './pprGate'
import {
  canUserSubmitPermitPackage,
  submitPermitPackageDeniedReason,
} from './permitAccess'
import { validateNdprDraft } from './validateNdprDraft'
import { isAbrReady, isRiskAssessmentReady } from './validateAsorForm'

export type SubmitRequirement = {
  id: string
  label: string
  ok: boolean
  hint?: string
}

export function getPackageSubmitRequirements(args: {
  user: DemoUser | null
  form: AsorForm
  manualReviewConfirmed: boolean
  ndDraft: PermitDraft
}): SubmitRequirement[] {
  const { user, form, manualReviewConfirmed, ndDraft } = args
  const maySubmit = canUserSubmitPermitPackage(user)
  const pprOk = isPprGatePassed()
  const ndOk = isNdGatePassed()
  const ndprErr = validateNdprDraft(ndDraft)
  const aiOk = isAiClientReady()
  const abrReady = isAbrReady(form)
  const neboshReady = isRiskAssessmentReady(form)

  return [
    {
      id: 'role',
      label: 'Ваша роль может отправлять пакет',
      ok: maySubmit,
      hint: maySubmit ? undefined : submitPermitPackageDeniedReason(user),
    },
    {
      id: 'ppr',
      label: 'Шаг «ППР» завершён',
      ok: pprOk,
      hint: pprOk ? undefined : 'Загрузите ППР и нажмите «Далее — НДПР»',
    },
    {
      id: 'ndpr',
      label: 'Шаг «НДПР» заполнен',
      ok: ndOk && !ndprErr,
      hint: !ndOk
        ? 'Заполните НДПР и перейдите к оценке риска'
        : (ndprErr ?? undefined),
    },
    {
      id: 'ai',
      label: 'Настроена генерация документов (AI)',
      ok: aiOk,
      hint: aiOk
        ? undefined
        : 'Ключ Claude не задан — кнопки «Сформировать через NOVA SAFETY AI» недоступны',
    },
    {
      id: 'abr',
      label: `${ABR_LABEL} сформирован`,
      ok: abrReady,
      hint: abrReady
        ? undefined
        : `Заполните ${ABR_LABEL} вручную или нажмите «Сформировать через ${APP_NAME}»`,
    },
    {
      id: 'nebosh',
      label: 'Оценка Риска сформирована',
      ok: neboshReady,
      hint: neboshReady
        ? undefined
        : `Заполните оценку риска вручную или нажмите «Сформировать через ${APP_NAME}»`,
    },
    {
      id: 'review',
      label: 'Отмечена проверка документов',
      ok: manualReviewConfirmed,
      hint: manualReviewConfirmed ? undefined : 'Поставьте галочку «Я проверил…»',
    },
  ]
}
