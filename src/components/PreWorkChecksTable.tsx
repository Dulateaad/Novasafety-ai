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

export function PreWorkChecksTable(props: {
  kind: WorkPermissionKind
  group: WorkPermissionCheckboxGroup
  onChange: (group: WorkPermissionCheckboxGroup) => void
  /** Какую колонку PDF можно редактировать. */
  editColumn: 'required' | 'available' | 'none'
  disabled?: boolean
}) {
  const { kind, group, onChange, editColumn, disabled = false } = props
  const pairs = pairsForKind(kind)
  if (!pairs?.length) return null

  function patchItem(id: string, patch: Partial<WorkPermissionCheckboxItem>) {
    onChange({
      ...group,
      items: group.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function cellCheckbox(id: string, column: 'required' | 'available') {
    const item = itemById(group.items, id)
    if (!item) return null
    const editable = !disabled && editColumn === column
    const checked = column === 'required' ? item.required ?? false : item.checked
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
          aria-label={item.label}
          onChange={(e) =>
            patchItem(id, column === 'required' ? { required: e.target.checked } : { checked: e.target.checked })
          }
        />
      </label>
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
          {pairs.map((pair) => (
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
