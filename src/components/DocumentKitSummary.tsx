import type { WorkPermissionTemplateMeta } from '../config/workPermissionsConfig'
import { WorkPermissionIcon } from './WorkPermissionIcon'
import { useLanguage } from '../context/LanguageContext'

export function DocumentKitSummary(props: {
  templates: WorkPermissionTemplateMeta[]
  includeNdpr?: boolean
  includeAbr?: boolean
  includeRisk?: boolean
}) {
  const {
    templates,
    includeNdpr = true,
    includeAbr = true,
    includeRisk = true,
  } = props
  const { t } = useLanguage()
  const dk = t.docKit

  const baseDocs = [
    includeNdpr && { key: 'ndpr', label: dk.ndpr, icon: 'ndpr' as const },
    includeAbr && { key: 'abr', label: dk.abr, icon: 'abr' as const },
    includeRisk && { key: 'risk', label: dk.risk, icon: 'risk' as const },
  ].filter(Boolean) as { key: string; label: string; icon: 'ndpr' | 'abr' | 'risk' }[]

  return (
    <section className="doc-kit-summary">
      <header className="doc-kit-summary__head">
        <h3 className="doc-kit-summary__title">{dk.fullPackage}</h3>
        <p className="doc-kit-summary__sub muted small">
          {dk.approvalPackage}
        </p>
      </header>
      <div className="doc-kit-summary__grid">
        {baseDocs.map((d) => (
          <div key={d.key} className="doc-kit-summary__chip doc-kit-summary__chip--base">
            <span className="doc-kit-summary__chip-icon doc-kit-summary__chip-icon--base">
              {d.icon === 'ndpr' ? '📋' : d.icon === 'abr' ? '🛡' : '⚠'}
            </span>
            <span>{d.label}</span>
          </div>
        ))}
        {templates.map((tpl) => (
          <div
            key={tpl.kind}
            className={`doc-kit-summary__chip doc-kit-summary__chip--perm doc-kit-summary__chip--${tpl.style}`}
          >
            <WorkPermissionIcon kind={tpl.kind} size={16} />
            <span className="doc-kit-summary__perm-label">{tpl.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
