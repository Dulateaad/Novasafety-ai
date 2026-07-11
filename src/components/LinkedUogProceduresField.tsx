import {
  UOG_CERTIFICATES,
  uogCertificateById,
  uogCertificateLabel,
} from '../config/uogCertificates'
import { useLanguage } from '../context/LanguageContext'

export function LinkedUogProceduresField(props: { linkedIds: string[] }) {
  const { linkedIds } = props
  const { t } = useLanguage()
  const pp = t.pprPage
  const linked = new Set(linkedIds)
  if (linked.size === 0) return null

  return (
    <fieldset className="fieldset">
      <legend>{pp.proceduresLegend}</legend>
      <p className="small muted" style={{ marginTop: 0 }}>
        {pp.proceduresHint}
      </p>
      <ul className="compact-list small linked-uog-procedures">
        {UOG_CERTIFICATES.map((cert) => {
          const isLinked = linked.has(cert.id)
          return (
            <li
              key={cert.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.75rem',
                opacity: isLinked ? 1 : 0.45,
              }}
            >
              <span>{uogCertificateLabel(cert)}</span>
              {isLinked ? (
                <span style={{ color: 'var(--brand-blue)', fontWeight: 700 }} aria-hidden>
                  ✓
                </span>
              ) : null}
            </li>
          )
        })}
        {[...linked]
          .filter((id) => !uogCertificateById(id))
          .map((id) => (
            <li
              key={id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <span>{id}</span>
              <span style={{ color: 'var(--brand-blue)', fontWeight: 700 }} aria-hidden>
                ✓
              </span>
            </li>
          ))}
      </ul>
    </fieldset>
  )
}
