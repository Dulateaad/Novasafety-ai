import type { GasTestReading } from '../types/workPermissions'
import { WORK_PERMISSION_KIND_LABELS, type WorkPermissionKind } from '../types/workPermissions'
import { useLanguage } from '../context/LanguageContext'

function dateValue(atIso: string): string {
  if (!atIso) return ''
  const d = new Date(atIso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function timeValue(atIso: string): string {
  if (!atIso) return ''
  const d = new Date(atIso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function mergeDateTime(datePart: string, timePart: string, prevIso: string): string {
  if (!datePart) return ''
  const time = timePart || '00:00'
  const merged = new Date(`${datePart}T${time}`)
  if (Number.isNaN(merged.getTime())) return prevIso
  return merged.toISOString()
}

export function GasTestResultsTable(props: {
  kind: WorkPermissionKind
  readings: GasTestReading[]
  editable?: boolean
  ertOnly?: boolean
  isErt?: boolean
  tableTitle?: string
  onChange?: (id: string, patch: Partial<GasTestReading>) => void
  onAddRow?: () => void
}) {
  const {
    kind,
    readings,
    editable = false,
    ertOnly = false,
    isErt = false,
    tableTitle,
    onChange,
    onAddRow,
  } = props
  const { t } = useLanguage()
  const gt = t.gasTest

  const canEdit = editable && (!ertOnly || isErt)
  const isEmpty = readings.length === 0
  const title = tableTitle ?? (ertOnly ? gt.openSection : gt.panelTitle)

  return (
    <div className="gas-test-table-wrap">
      <div className="gas-test-table__head">
        <h4 className="gas-test-table__title">{title}</h4>
        <p className="muted xsmall">
          {WORK_PERMISSION_KIND_LABELS[kind]}
          {ertOnly ? gt.ertFillsNote : ''}
        </p>
      </div>
      {isEmpty && canEdit ? (
        <div className="gas-test-table__empty-cta">
          <p className="small" style={{ margin: 0 }}>
            {gt.emptyTable}
          </p>
          {onAddRow ? (
            <button type="button" className="btn primary small" onClick={onAddRow}>
              {gt.addRow}
            </button>
          ) : null}
        </div>
      ) : null}
      {!isEmpty ? (
        <>
          <div className="gas-test-table-scroll">
            <table className="gas-test-table">
              <thead>
                <tr>
                  <th>{gt.colDate}</th>
                  <th>{gt.colTime}</th>
                  <th>{gt.colLel}</th>
                  <th>{gt.colH2s}</th>
                  <th>{gt.colO2}</th>
                  <th>{gt.colCo}</th>
                  <th>{gt.colTester}</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {canEdit ? (
                        <input
                          type="date"
                          className="gas-test-table__input"
                          value={dateValue(r.atIso)}
                          onChange={(e) =>
                            onChange?.(r.id, {
                              atIso: mergeDateTime(e.target.value, timeValue(r.atIso), r.atIso),
                            })
                          }
                        />
                      ) : (
                        r.atIso ? new Date(r.atIso).toLocaleDateString('ru-RU') : '—'
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <input
                          type="time"
                          className="gas-test-table__input"
                          value={timeValue(r.atIso)}
                          onChange={(e) =>
                            onChange?.(r.id, {
                              atIso: mergeDateTime(dateValue(r.atIso), e.target.value, r.atIso),
                            })
                          }
                        />
                      ) : (
                        r.atIso
                          ? new Date(r.atIso).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'
                      )}
                    </td>
                    {(['lelPercent', 'h2sPpm', 'o2Percent', 'coPpm'] as const).map((field) => (
                      <td key={field}>
                        {canEdit ? (
                          <input
                            className="gas-test-table__input gas-test-table__input--num"
                            value={r[field]}
                            inputMode="decimal"
                            placeholder="0"
                            onChange={(e) => onChange?.(r.id, { [field]: e.target.value })}
                          />
                        ) : (
                          r[field] || '—'
                        )}
                      </td>
                    ))}
                    <td className="gas-test-table__tester">{r.testerName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEdit && onAddRow ? (
            <button type="button" className="btn ghost small" onClick={onAddRow}>
              {gt.addRow}
            </button>
          ) : null}
        </>
      ) : null}
      {ertOnly && !isErt && editable ? (
        <p className="muted xsmall gas-test-table__hint">
          Редактирование таблицы доступно только газотестировщику (ПАС / ERT).
        </p>
      ) : null}
    </div>
  )
}
