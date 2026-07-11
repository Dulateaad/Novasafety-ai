import { Navigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { PermitListPage } from './PermitListPage'

/** Главная: для координатора — админ-панель, для остальных — журнал. */
export function HomeRoute() {
  const { user } = useSession()
  if (!user) return null
  if (user.role === 'coordinator') {
    return <Navigate to="/admin" replace />
  }
  return <PermitListPage />
}
