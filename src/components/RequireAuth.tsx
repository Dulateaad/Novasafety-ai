import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { authMode, authReady, user } = useSession()

  if (authMode === 'local') {
    return <>{children}</>
  }

  if (!authReady) {
    return (
      <div className="page narrow center muted" style={{ padding: '2rem' }}>
        Загрузка…
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    )
  }

  return <>{children}</>
}
