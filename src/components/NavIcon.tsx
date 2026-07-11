type NavIconName =
  | 'journal'
  | 'new'
  | 'ppr'
  | 'asor'
  | 'matrix'
  | 'permissions'
  | 'certificates'
  | 'help'
  | 'admin'

const QUESTION_MARK_PATH =
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z'

const paths: Record<NavIconName, string> = {
  journal:
    'M6 4h12v16H6V4zm2 2v12h8V6H8zm2 2h4v2h-4V8zm0 3h4v2h-4v-2z',
  new: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z',
  ppr: 'M8 4h8l2 2v14H6V4h2zm0 2v12h8V7.4L15.6 6H8zm2 3h6v2h-6V9zm0 3h6v2h-6v-2z',
  asor:
    'M12 3l9 16H3L12 3zm0 5.5L7.5 17h9L12 8.5zM12 11v3h1v-3h-1z',
  matrix:
    'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  permissions:
    'M7 3h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 012-2zm0 2v11.5l2-1 2 1 2-1 2 1 2-1V5H7zm2 3h6v2H9V8zm0 3h4v2H9v-2z',
  certificates:
    'M6 4h12v2H6V4zm0 4h8v2H6V8zm0 4h10v2H6v-2zm0 4h6v2H6v-2z',
  help: QUESTION_MARK_PATH,
  admin:
    'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18 7 3.11v5.71c0 4.52-3.08 8.79-7 9.93-3.92-1.14-7-5.41-7-9.93V6.29l7-3.11zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z',
}

export function QuestionMarkIcon(props: { size?: number; className?: string }) {
  const { size = 22, className } = props
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      fill="currentColor"
    >
      <path d={QUESTION_MARK_PATH} />
    </svg>
  )
}

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      width={22}
      height={22}
      aria-hidden
      fill="currentColor"
    >
      <path d={paths[name]} />
    </svg>
  )
}
