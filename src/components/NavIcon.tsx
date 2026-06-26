type NavIconName =
  | 'journal'
  | 'new'
  | 'ppr'
  | 'asor'
  | 'matrix'
  | 'permissions'
  | 'certificates'
  | 'help'

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
  help:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 15h1.5v1.5H12V17zm0-11.5a3.25 3.25 0 0 1 3.18 3.9c-.28 1.4-1.55 1.85-2.05 2.35-.35.35-.63.75-.63 1.35V14h-1.5v-.4c0-1 .55-1.55 1.05-2.05.55-.55 1.2-.95 1.45-1.85A1.75 1.75 0 0 0 12 5.5z',
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
