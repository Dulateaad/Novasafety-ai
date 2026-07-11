import { GasTestResultsTable } from './GasTestResultsTable'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import { WorkPermissionIcon } from './WorkPermissionIcon'
import type { Permit } from '../types/domain'
import { useLanguage } from '../context/LanguageContext'

export function GasTestResultsReadOnlyCard(props: { permit: Permit }) {
  const { permit } = props
  const { t } = useLanguage()
  const gt = t.gasTest
  const docs = (permit.workPermissions?.documents ?? []).filter(
    (doc) => WORK_PERMISSION_BY_KIND[doc.kind].requiresGasTests,
  )
  if (!docs.length) return null

  return (
    <section className="card work-perm-ert-panel" style={{ marginBottom: '1rem' }}>
      <header className="work-perm-ert-panel__head">
        <h2 style={{ margin: 0 }}>{gt.panelTitle}</h2>
        <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
          Заполняет газотестировщик (ПАС / ERT). Производитель работ указывает виды газотеста в
          разделе 1 разрешения.
        </p>
      </header>
      {docs.map((doc) => (
        <div key={doc.kind} className="work-perm-ert-panel__doc">
          <div className="work-perm-ert-panel__doc-head">
            <WorkPermissionIcon kind={doc.kind} size={20} />
            <span className="strong">{doc.title}</span>
          </div>
          <GasTestResultsTable kind={doc.kind} readings={doc.gasTests} editable={false} />
        </div>
      ))}
    </section>
  )
}
