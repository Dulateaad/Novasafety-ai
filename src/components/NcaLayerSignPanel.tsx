import { useLanguage } from '../context/LanguageContext'

export function NcaLayerSignPanel(props: {
  available: boolean | null
  busy: boolean
  disabled?: boolean
  onSign: () => void
}) {
  const { available, busy, disabled, onSign } = props
  const { t } = useLanguage()
  const ui = t.signingUi
  const c = t.common

  return (
    <div className="egov-ncalayer-panel">
      <p className="egov-ncalayer-panel__note">{ui.ncalayerHint}</p>
      <ol className="egov-ncalayer-panel__steps">
        <li>{ui.ncalayerStepInstall}</li>
        <li>{ui.ncalayerStepLaunch}</li>
        <li>{ui.ncalayerStepSign}</li>
      </ol>
      {available === false ? (
        <div className="alert error" role="alert">
          {ui.ncalayerNotRunning}
        </div>
      ) : null}
      <button
        type="button"
        className="btn primary egov-ncalayer-panel__btn"
        disabled={disabled || busy}
        onClick={onSign}
      >
        {busy ? c.saving : ui.ncalayerSignBtn}
      </button>
    </div>
  )
}
