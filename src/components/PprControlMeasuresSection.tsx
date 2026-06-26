import type { PprControlMeasuresDoc } from '../types/ppr'
import type { PprExtractStage } from '../lib/extractPprControlMeasures'
import { activeAiProviderLabel } from '../lib/aiClient'
import { controlMeasuresMethodLabel } from '../lib/pprControlMeasuresParse'
import { AiDisclaimerNotice } from './AiDisclaimerNotice'
import { LoadingProgress } from './LoadingProgress'

function stageLabel(stage: PprExtractStage | null): string {
  const ai = activeAiProviderLabel()
  switch (stage) {
    case 'reading':
      return 'Чтение документа…'
    case 'gemini':
      return `Анализ ${ai}…`
    case 'rules':
      return 'Подбор по правилам…'
    case 'pdf':
      return `${ai} формирует PDF…`
    default:
      return 'Обработка…'
  }
}

export function PprControlMeasuresSection(props: {
  doc?: PprControlMeasuresDoc
  extracting?: boolean
  extractStage?: PprExtractStage | null
  pdfBuilding?: boolean
  pdfWarning?: string | null
  error?: string | null
  onRetry?: () => void
}) {
  const { doc, extracting, extractStage, pdfBuilding, pdfWarning, error, onRetry } = props
  const aiLabel = activeAiProviderLabel()

  if (!doc && !extracting && !error) return null

  return (
    <fieldset className="fieldset ppr-control-measures">
      <legend>Оценка риска и PDF ({aiLabel})</legend>
      <AiDisclaimerNotice />
      <p className="muted xsmall" style={{ marginTop: 0 }}>
        {aiLabel} извлекает риски из ППР и формирует PDF «Оценка риска» для согласования.
      </p>

      {(extracting || pdfBuilding) && (
        <LoadingProgress
          label={extracting ? stageLabel(extractStage ?? null) : `${aiLabel} формирует PDF…`}
          indeterminate
          withTips
          fullscreen
        />
      )}

      {pdfWarning && (
        <div className="alert" role="status" style={{ marginBottom: '0.5rem' }}>
          {pdfWarning}
        </div>
      )}

      {error && (
        <div className="alert error" role="alert">
          {error}
          {onRetry && (
            <div className="btn-row" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn ghost small" onClick={onRetry}>
                Повторить
              </button>
            </div>
          )}
        </div>
      )}

      {doc && !extracting && (
        <div className="ppr-upload__file card" style={{ padding: '0.75rem 1rem' }}>
          <div className="strong small">{doc.fileName}</div>
          <p className="muted xsmall" style={{ margin: '0.25rem 0 0' }}>
            {doc.items.length} блок(ов) · {controlMeasuresMethodLabel(doc.method)} ·{' '}
            {new Date(doc.generatedAtIso).toLocaleString()}
            {pdfBuilding
              ? ` · ${aiLabel} готовит PDF…`
              : doc.geminiPdfDocument
                ? ` · PDF от ${aiLabel}`
                : doc.pdfBase64
                  ? ' · PDF готов'
                  : ''}
          </p>
        </div>
      )}
    </fieldset>
  )
}
