import {
  FIRE_CHECK_PAIRS,
  GAS_HAZARD_CHECK_PAIRS,
} from '../config/workPermissionPdfTemplate'
import type {
  WorkPermissionCheckboxGroup,
  WorkPermissionCheckboxItem,
  WorkPermissionKind,
} from '../types/workPermissions'

function pairsForKind(kind: WorkPermissionKind) {
  if (kind === 'open_flame_fire') return FIRE_CHECK_PAIRS
  if (kind === 'gas_hazard') return GAS_HAZARD_CHECK_PAIRS
  return null
}

function itemById(items: WorkPermissionCheckboxItem[], id: string): WorkPermissionCheckboxItem | undefined {
  return items.find((i) => i.id === id)
}

function labelForId(
  pairs: { leftId: string; rightId: string; left: string; right: string }[],
  id: string,
): string {
  for (const pair of pairs) {
    if (pair.leftId === id) return pair.left
    if (pair.rightId === id) return pair.right
  }
  return id
}

export function PreWorkChecksTable(props: {
  kind: WorkPermissionKind
  group: WorkPermissionCheckboxGroup
  onChange: (group: WorkPermissionCheckboxGroup) => void
  /** Какую колонку PDF можно редактировать. */
  editColumn: 'required' | 'available' | 'none'
  disabled?: boolean
  /** Скрыть колонки «Требуется» (по умолчанию показываются, но только для чтения при editColumn=available). */
  hideRequiredColumns?: boolean
}) {
  const { kind, group, onChange, editColumn, disabled = false, hideRequiredColumns = false } = props
  const pairs = pairsForKind(kind)
  if (!pairs?.length) return null
  const pairRows = pairs

  function patchItem(id: string, patch: Partial<WorkPermissionCheckboxItem>) {
    const hit = itemById(group.items, id)
    if (hit) {
      onChange({
        ...group,
        items: group.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      })
      return
    }
    onChange({
      ...group,
      items: [
        ...group.items,
        {
          id,
          label: labelForId(pairRows, id),
          checked: false,
          required: false,
          note: '',
          ...patch,
        },
      ],
    })
  }

  function cellCheckbox(id: string, column: 'required' | 'available') {
    const item = itemById(group.items, id)
    const editable = !disabled && editColumn === column
    const checked =
      column === 'required' ? Boolean(item?.required) : Boolean(item?.checked)
    return (
      <label
        className={`check work-perm-prework-table__check${
          editable ? ' work-perm-prework-table__check--editable' : ' work-perm-prework-table__check--readonly'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={!editable}
          tabIndex={editable ? 0 : -1}
          aria-label={item?.label ?? labelForId(pairRows, id)}
          onChange={(e) =>
            patchItem(id, column === 'required' ? { required: e.target.checked } : { checked: e.target.checked })
          }
        />
      </label>
    )
  }

  if (hideRequiredColumns) {
    return (
      <div className="work-perm-prework-table-wrap">
        <table className="work-perm-prework-table work-perm-prework-table--available-only">
          <thead>
            <tr>
              <th>Пункт проверки</th>
              <th className="work-perm-prework-table__mark--editable">Имеется</th>
              <th>Пункт проверки</th>
              <th className="work-perm-prework-table__mark--editable">Имеется</th>
            </tr>
          </thead>
          <tbody>
            {pairRows.map((pair) => (
              <tr key={`${pair.leftId}-${pair.rightId}`}>
                <td>{pair.left}</td>
                <td className="work-perm-prework-table__mark work-perm-prework-table__mark--editable">
                  {cellCheckbox(pair.leftId, 'available')}
                </td>
                <td>{pair.right}</td>
                <td className="work-perm-prework-table__mark work-perm-prework-table__mark--editable">
                  {cellCheckbox(pair.rightId, 'available')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="work-perm-prework-table-wrap">
      <table className="work-perm-prework-table">
        <thead>
          <tr>
            <th>Пункт проверки</th>
            <th>Требуется</th>
            <th>Имеется</th>
            <th>Пункт проверки</th>
            <th>Требуется</th>
            <th>Имеется</th>
          </tr>
        </thead>
        <tbody>
          {pairRows.map((pair) => (
            <tr key={`${pair.leftId}-${pair.rightId}`}>
              <td>{pair.left}</td>
              <td
                className={`work-perm-prework-table__mark${
                  editColumn === 'required' ? ' work-perm-prework-table__mark--editable' : ''
                }`}
              >
                {cellCheckbox(pair.leftId, 'required')}
              </td>
              <td
                className={`work-perm-prework-table__mark${
                  editColumn === 'available' ? ' work-perm-prework-table__mark--editable' : ''
                }`}
              >
                {cellCheckbox(pair.leftId, 'available')}
              </td>
              <td>{pair.right}</td>
              <td
                className={`work-perm-prework-table__mark${
                  editColumn === 'required' ? ' work-perm-prework-table__mark--editable' : ''
                }`}
              >
                {cellCheckbox(pair.rightId, 'required')}
              </td>
              <td
                className={`work-perm-prework-table__mark${
                  editColumn === 'available' ? ' work-perm-prework-table__mark--editable' : ''
                }`}
              >
                {cellCheckbox(pair.rightId, 'available')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
