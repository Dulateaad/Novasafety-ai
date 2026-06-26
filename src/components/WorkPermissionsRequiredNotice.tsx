import type { WorkPermissionTemplateMeta } from '../config/workPermissionsConfig'
import { WorkPermissionIcon } from './WorkPermissionIcon'

export function WorkPermissionsRequiredNotice(props: {
  templates: WorkPermissionTemplateMeta[]
  variant?: 'inline' | 'banner'
}) {
  const { templates, variant = 'banner' } = props
  if (templates.length === 0) return null

  const className =
    variant === 'banner'
      ? 'work-perm-notice work-perm-notice--banner'
      : 'work-perm-notice work-perm-notice--inline'

  return (
    <div className={className} role="status">
      <p className="work-perm-notice__title">
        Для выбранных видов работ потребуются специальные разрешения
      </p>
      <ul className="work-perm-notice__list">
        {templates.map((t) => (
          <li key={t.kind}>
            <WorkPermissionIcon kind={t.kind} size={18} />
            <span>
              <strong>{t.shortLabel}</strong> — {t.selectionNotice}
            </span>
          </li>
        ))}
      </ul>
      <p className="work-perm-notice__foot muted xsmall">
        На шаге «Разрешения» (после оценки риска) документы заполняются вручную или с
        помощью ИИ. Газотесты вносит ПАС (роль ERT).
      </p>
    </div>
  )
}
