import type { WorkPermissionKind } from '../types/workPermissions'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'

const iconPaths: Record<WorkPermissionKind, string> = {
  gas_hazard:
    'M12 2C8 2 5 5 5 9c0 4 3 7 7 11 4-4 7-7 7-11 0-4-3-7-7-7zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  open_flame_fire:
    'M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-4 2-5 0 2-1 4-2 6 2-1 4-3 4-6 0-2-1-4-2-4z',
  confined_space:
    'M6 8h12v10H6V8zm2 2v6h8v-6H8zm1 8h6v2H9v-2z',
}

export function WorkPermissionIcon(props: {
  kind: WorkPermissionKind
  size?: number
  className?: string
}) {
  const { kind, size = 20, className = '' } = props
  const style = WORK_PERMISSION_BY_KIND[kind].style
  return (
    <span
      className={`work-perm-icon work-perm-icon--${style} ${className}`.trim()}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d={iconPaths[kind]} />
      </svg>
    </span>
  )
}
