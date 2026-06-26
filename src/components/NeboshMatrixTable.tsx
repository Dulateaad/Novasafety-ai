import {
  NEBOSH_LIKELIHOOD_LABELS,
  NEBOSH_MATRIX_COLS,
  NEBOSH_MATRIX_ROWS,
  NEBOSH_SEVERITY_LABELS,
  neboshCellColor,
  neboshRiskBand,
  neboshRiskScore,
} from '../config/neboshRiskMatrix'

/** Матрица оценки рисков NEBOSH 5×5 (вероятность × тяжесть). */
export function NeboshMatrixTable() {
  return (
    <div className="nebosh-matrix-wrap">
      <table className="nebosh-matrix data-table">
        <thead>
          <tr>
            <th>Вероятность / Тяжесть</th>
            {NEBOSH_MATRIX_COLS.map((s) => (
              <th key={s} className="nebosh-matrix__col-head">
                {s}
                <span className="nebosh-matrix__sub">
                  {NEBOSH_SEVERITY_LABELS[s].split('—')[1]?.trim()}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NEBOSH_MATRIX_ROWS.map((l) => (
            <tr key={l}>
              <th className="nebosh-matrix__row-head">
                {NEBOSH_LIKELIHOOD_LABELS[l]}
              </th>
              {NEBOSH_MATRIX_COLS.map((s) => {
                const score = neboshRiskScore(l, s)
                const band = neboshRiskBand(score)
                return (
                  <td
                    key={s}
                    className={`nebosh-matrix__cell nebosh-matrix__cell--${band || 'empty'}`}
                    style={{ background: neboshCellColor(score) }}
                  >
                    <strong>{score}</strong>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted xsmall" style={{ marginTop: '0.65rem' }}>
        ВЫСОКИЙ (15–25): немедленные меры. СРЕДНИЙ (8–14): дополнительные контроли,
        разрешение руководства. НИЗКИЙ (1–7): приемлемый риск при соблюдении процедур.
      </p>
    </div>
  )
}
