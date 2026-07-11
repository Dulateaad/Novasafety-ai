import { Link } from 'react-router-dom'
import {
  UOG_CERTIFICATES,
  uogCertificateLabel,
} from '../config/uogCertificates'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'
import { loadPprForm } from '../lib/pprAutosave'
import { isPprGatePassed } from '../lib/pprGate'

export function CertificatesPage() {
  const { t } = useLanguage()
  const b = t.branding
  const c = t.common
  const ppr = loadPprForm()
  const linked = new Set(ppr.linkedCertificateIds ?? [])

  if (!isPprGatePassed()) {
    return (
      <div className="page narrow">
        <h1>{b.certificatesTitle}</h1>
        <p className="muted">
          {fillTemplate(b.certificatesGateHint, { source: b.sourceDocument })}
        </p>
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <Link className="btn primary" to="/ppr">
            {fillTemplate(b.goToSource, { source: b.sourceDocument })}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{b.certificatesTitle}</h1>
          <p className="muted small page-subtitle">{b.certificatesSubtitle}</p>
        </div>
      </div>

      {linked.size > 0 && (
        <div className="alert success" role="status" style={{ marginBottom: '1rem' }}>
          {fillTemplate(b.linkedProcedures, { count: linked.size })}{' '}
          <Link to="/ppr">{fillTemplate(b.goToSource, { source: b.sourceDocument })}</Link>
        </div>
      )}

      <div className="grid-2">
        {UOG_CERTIFICATES.map((cert) => {
          const isLinked = linked.has(cert.id)
          return (
            <section key={cert.id} className="card">
              <h2 style={{ fontSize: '1rem', marginTop: 0 }}>{cert.code}</h2>
              <p className="small" style={{ marginTop: 0 }}>
                {cert.title}
              </p>
              {isLinked && (
                <p className="xsmall muted" style={{ marginBottom: '0.75rem' }}>
                  {b.attachedToCurrentSource}
                </p>
              )}
              <div className="btn-row">
                {cert.publicPath ? (
                  <a
                    className="btn primary small"
                    href={cert.publicPath}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    {c.download}
                  </a>
                ) : (
                  <span className="muted xsmall">{b.fileNotInApp}</span>
                )}
              </div>
              <p className="xsmall muted" style={{ marginBottom: 0 }}>
                {uogCertificateLabel(cert)}
              </p>
            </section>
          )
        })}
      </div>

      <p className="muted small" style={{ marginTop: '1.25rem' }}>
        {b.deployInstructions}
      </p>
    </div>
  )
}
