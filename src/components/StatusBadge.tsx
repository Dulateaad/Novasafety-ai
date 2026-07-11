import type { PermitStatus } from '../types/domain'
import { useLanguage } from '../context/LanguageContext'

export function StatusBadge({ status }: { status: PermitStatus }) {
  const { t } = useLanguage()
  return <span className={`pill status-${status}`}>{t.status[status]}</span>
}
