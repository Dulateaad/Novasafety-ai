import type { GasTestReading } from '../types/workPermissions'
import { WORK_PERMISSION_KIND_LABELS, type WorkPermissionKind } from '../types/workPermissions'

function datetimeLocalValue(atIso: string): string {
  if (!atIso) return ''
  const d = new Date(atIso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function GasTestResultsTable(props: {
  kind: WorkPermissionKind
  readings: GasTestReading[]
  editable?: boolean
  ertOnly?: boolean
  isErt?: boolean
  onChange?: (id: string, patch: Partial<GasTestReading>) => void
  onAddRow?: () => void
}) {
  const {
    kind,
    readings,
    editable = false,
    ertOnly = false,
    isErt = false,
    onChange,
    onAddRow,
  } = props

  const canEdit = editable && (!ertOnly || isErt)
  const isEmpty = readings.length === 0

  return (
    <div className="gas-test-table-wrap">
      <div className="gas-test-table__head">
        <h4 className="gas-test-table__title">
          Результаты отбора проб / газотест
        </h4>
        <p className="muted xsmall">
          {WORK_PERMISSION_KIND_LABELS[kind]}
          {ertOnly ? ' · заполняет ПАС (ERT)' : ''}
        </p>
      </div>
      {isEmpty && canEdit ? (
        <div className="gas-test-table__empty-cta">
          <p className="small" style={{ margin: 0 }}>
            Таблица пустая. Сначала добавьте строку с результатами замера.
          </p>
          {onAddRow ? (
            <button type="button" className="btn primary small" onClick={onAddRow}>
              + Добавить первый замер
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="gas-test-table-scroll">
        <table className="gas-test-table">
          <thead>
            <tr>
              <th>Дата / время</th>
              <th>Локация</th>
              <th>LEL %</th>
              <th>H2S ppm</th>
              <th>O2 %</th>
              <th>CO ppm</th>
              <th>Прибор №</th>
              <th>Исполнитель</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td>
                  {canEdit ? (
                    <input
                      type="datetime-local"
                      className="gas-test-table__input"
                      value={datetimeLocalValue(r.atIso)}
                      onChange={(e) => {
                        const v = e.target.value
                        onChange?.(r.id, {
                          atIso: v ? new Date(v).toISOString() : '',
                        })
                      }}
                    />
                  ) : (
                    r.atIso ? new Date(r.atIso).toLocaleString('ru-RU') : '—'
                  )}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      className="gas-test-table__input"
                      value={r.location}
                      placeholder="Рабочая зона"
                      onChange={(e) => onChange?.(r.id, { location: e.target.value })}
                    />
                  ) : (
                    r.location || '—'
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
                <td>
                  {canEdit ? (
                    <input
                      className="gas-test-table__input"
                      value={r.instrumentNo}
                      placeholder="№ прибора"
                      onChange={(e) =>
                        onChange?.(r.id, { instrumentNo: e.target.value })
                      }
                    />
                  ) : (
                    r.instrumentNo || '—'
                  )}
                </td>
                <td className="gas-test-table__tester">{r.testerName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && onAddRow && !isEmpty ? (
        <button type="button" className="btn ghost small" onClick={onAddRow}>
          + Добавить замер
        </button>
      ) : null}
      {ertOnly && !isErt && editable ? (
        <p className="muted xsmall gas-test-table__hint">
          Редактирование таблицы доступно только пользователю с ролью ПАС (ERT).
        </p>
      ) : null}
    </div>
  )
}
