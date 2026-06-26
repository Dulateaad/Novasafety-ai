import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { APP_NAME } from '../config/branding'

export function LoginPage() {
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from?.startsWith('/login')
      ? '/'
      : ((location.state as { from?: string } | null)?.from ?? '/')

  const {
    authMode,
    authReady,
    user,
    signInWithEmailPassword,
    profileError,
    signOutSession,
  } = useSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (authMode === 'local') {
    return <Navigate to="/" replace />
  }

  if (authReady && user && !profileError) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      await signInWithEmailPassword(email, password)
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : ''
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setFormError('Неверный email или пароль')
      } else if (code === 'auth/too-many-requests') {
        setFormError('Слишком много попыток. Попробуйте позже')
      } else if (code === 'auth/user-not-found') {
        setFormError('Пользователь не найден')
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Не удалось войти',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <div className="page-header">
        <h1>{APP_NAME}</h1>
        <p className="muted">Вход по email и паролю</p>
      </div>

      <form className="card form" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {formError && (
          <div className="alert error" role="alert">
            {formError}
          </div>
        )}
        <div className="actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Вход…' : 'Войти'}
          </button>
        </div>
      </form>

      {authReady && user && profileError && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p className="error">{profileError}</p>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void signOutSession()}
          >
            Выйти
          </button>
        </div>
      )}

      <p className="small muted" style={{ marginTop: '1.5rem' }}>
        Доступ выдаёт администратор: учётная запись в Authentication и документ
        в Firestore <code>users/&#123;uid&#125;</code> с полями{' '}
        <code>displayName</code>, <code>role</code> (см. README).
      </p>
      <Link className="small muted" to="/">
        К журналу НД (только при локальном демо)
      </Link>
    </div>
  )
}
