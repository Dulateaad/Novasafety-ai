import { useLanguage } from '../context/LanguageContext'

export type EgovSignTab = 'qr' | 'ncalayer'

export function EgovSignMethodTabs(props: {
  tab: EgovSignTab
  disabled?: boolean
  pkgReady?: boolean
  onTabChange: (tab: EgovSignTab) => void
}) {
  const { tab, disabled, pkgReady = true, onTabChange } = props
  const ui = useLanguage().t.signingUi

  return (
    <div className="egov-sign-tabs" role="tablist" aria-label={ui.signMethodTabs}>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'qr'}
        className={`egov-sign-tabs__btn${tab === 'qr' ? ' is-active' : ''}`}
        disabled={disabled}
        onClick={() => onTabChange('qr')}
      >
        {ui.tabQrMobile}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'ncalayer'}
        className={`egov-sign-tabs__btn${tab === 'ncalayer' ? ' is-active' : ''}`}
        disabled={disabled || !pkgReady}
        onClick={() => onTabChange('ncalayer')}
      >
        {ui.tabNcaLayer}
      </button>
    </div>
  )
}
