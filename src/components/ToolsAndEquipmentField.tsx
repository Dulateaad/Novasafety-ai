import { useEffect, useRef, useState } from 'react'
import {
  formatToolsAndEquipmentAsList,
  parseToolsAndEquipmentList,
} from '../lib/toolsAndEquipmentFormat'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'

type ToolRow = {
  id: string
  text: string
  selected: boolean
}

function newRow(text = '', selected = true): ToolRow {
  return { id: crypto.randomUUID(), text, selected }
}

function rowsFromValue(raw: string): ToolRow[] {
  const items = parseToolsAndEquipmentList(raw)
  if (!items.length) return [newRow()]
  return items.map((text) => newRow(text, true))
}

function serializeRows(rows: ToolRow[]): string {
  return formatToolsAndEquipmentAsList(
    rows
      .filter((row) => row.selected && row.text.trim())
      .map((row) => row.text.trim())
      .join('\n'),
  )
}

export function ToolsAndEquipmentField(props: {
  value: string
  readOnly?: boolean
  required?: boolean
  rows?: number
  onChange?: (value: string) => void
}) {
  const { value, readOnly, required, onChange } = props
  const { t } = useLanguage()
  const tools = t.tools
  const wp = t.workPermission
  const c = t.common
  const items = parseToolsAndEquipmentList(value)
  const [editRows, setEditRows] = useState(() => rowsFromValue(value))
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    setEditRows(rowsFromValue(value))
  }, [value])

  function emit(next: ToolRow[]) {
    const serialized = serializeRows(next)
    lastEmitted.current = serialized
    onChange?.(serialized)
  }

  function patchRow(id: string, patch: Partial<ToolRow>) {
    setEditRows((rows) => {
      const next = rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
      emit(next)
      return next
    })
  }

  function addRow() {
    setEditRows((rows) => [...rows, newRow()])
  }

  function removeRow(id: string) {
    setEditRows((rows) => {
      const next = rows.length > 1 ? rows.filter((row) => row.id !== id) : [newRow()]
      emit(next)
      return next
    })
  }

  const selectedCount = editRows.filter((row) => row.selected && row.text.trim()).length

  if (readOnly) {
    if (!items.length) return <span className="muted">{c.na}</span>
    return (
      <ol className="tools-equipment-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    )
  }

  return (
    <section
      className="tools-equipment-field"
      aria-labelledby="tools-equipment-heading"
    >
      <header className="tools-equipment-field__header">
        <div className="tools-equipment-field__heading">
          <h3 id="tools-equipment-heading" className="tools-equipment-field__title">
            {wp.equipLabel}
          </h3>
          <span
            className={`tools-equipment-field__count${selectedCount === 0 ? ' is-empty' : ''}`}
          >
            {selectedCount}
          </span>
        </div>
        <p className="tools-equipment-field__hint">
          {tools.selectItem.replace(/\{item\}/, tools.newItem)}
        </p>
      </header>

      <ul className="tools-equipment-field__list">
        {editRows.map((row) => (
          <li key={row.id}>
            <div
              className={`tools-equipment-field__option${row.selected ? ' is-checked' : ''}`}
              onDoubleClick={() => {
                if (row.selected) patchRow(row.id, { selected: false })
              }}
            >
              <input
                type="checkbox"
                className="tools-equipment-field__checkbox"
                checked={row.selected}
                aria-label={fillTemplate(tools.selectItem, {
                  item: row.text.trim() || tools.newItem,
                })}
                onChange={(e) => patchRow(row.id, { selected: e.target.checked })}
              />
              <input
                type="text"
                className="tools-equipment-field__input"
                required={required && selectedCount === 0}
                value={row.text}
                placeholder={tools.namePlaceholder}
                onChange={(e) => patchRow(row.id, { text: e.target.value })}
              />
              {editRows.length > 1 ? (
                <button
                  type="button"
                  className="tools-equipment-field__remove"
                  aria-label={tools.removeItem}
                  onClick={() => removeRow(row.id)}
                >
                  ×
                </button>
              ) : (
                <span className="tools-equipment-field__remove-spacer" aria-hidden />
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="tools-equipment-field__actions">
        <button type="button" className="tools-equipment-field__add" onClick={addRow}>
          <span className="tools-equipment-field__add-icon" aria-hidden>
            +
          </span>
          {c.add}
        </button>
      </div>
    </section>
  )
}
