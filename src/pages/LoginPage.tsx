import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AppLogo } from '../components/AppLogo'
import { useLanguage } from '../context/LanguageContext'
import { useSession } from '../context/SessionContext'
import '../login-page.css'

export function LoginPage() {
  const location = useLocation()
  const { t } = useLanguage()
  const login = t.login
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
        setFormError(login.wrongCredentials)
      } else if (code === 'auth/too-many-requests') {
        setFormError(login.tooManyAttempts)
      } else if (code === 'auth/user-not-found') {
        setFormError(login.userNotFound)
      } else {
        setFormError(err instanceof Error ? err.message : login.failed)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__stack">
        <section className="login-brand" aria-label="NOVA SAFETY AI">
          <AppLogo className="login-brand__logo" variant="header" size="lg" />
        </section>

        <form className="login-form" onSubmit={onSubmit}>
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
            {login.password}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {formError ? (
            <div className="login-form__error" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="login-form__actions">
            <button type="submit" className="login-form__submit" disabled={busy}>
              {busy ? login.signingIn : login.signIn}
            </button>
          </div>
        </form>

        {authReady && user && profileError ? (
          <div className="login-form__profile-error">
            <p>{profileError}</p>
            <button
              type="button"
              className="btn ghost"
              onClick={() => void signOutSession()}
            >
              {t.layout.signOut}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
