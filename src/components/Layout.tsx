import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NavIcon } from './NavIcon'
import { useNetwork } from '../context/NetworkContext'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import { DEMO_USERS } from '../demoUsers'
import type { DemoUser } from '../types/domain'
import { roleLabel } from '../i18n/getLocale'
import { firebaseConfigured, firestoreOfflineCache } from '../lib/firebase'
import { preloadPdfMakeEngine } from '../lib/pdfMakeEngine'
import { AppLogo } from './AppLogo'
import { LanguageToggle } from './LanguageToggle'
import { scrollAppToTop } from '../lib/scrollAppToTop'
import {
  disablePushOnSignOut,
  PushNotificationsToggle,
} from './PushNotificationsToggle'
import { NotificationEmailField } from './NotificationEmailField'
import { pushConfigured } from '../lib/push'
import { PACKAGE_CLEARED_EVENT } from '../lib/packageSession'
import { NAV_GATES_CHANGED, isPermissionsNavVisible } from '../lib/navGates'
import { useLanguage } from '../context/LanguageContext'
import {
  isNavRouteAccessibleForUser,
  navRouteLockedHintForUser,
} from '../lib/permitAccess'

const MAIN_NAV_BASE: {
  to: string
  end?: boolean
  labelKey: 'journal' | 'ndpr' | 'ppr' | 'risk' | 'permissions'
  tabKey: 'journal' | 'ndpr' | 'ppr' | 'risk' | 'permissions'
  icon: 'journal' | 'new' | 'ppr' | 'asor' | 'certificates' | 'permissions'
}[] = [
  { to: '/', end: true, labelKey: 'journal', tabKey: 'journal', icon: 'journal' },
  { to: '/ppr', labelKey: 'ppr', tabKey: 'ppr', icon: 'ppr' },
  { to: '/new', labelKey: 'ndpr', tabKey: 'ndpr', icon: 'new' },
  { to: '/risk-assessment', labelKey: 'risk', tabKey: 'risk', icon: 'asor' },
  { to: '/permissions', labelKey: 'permissions', tabKey: 'permissions', icon: 'permissions' },
]

function buildMainNav(showPermissions: boolean) {
  return MAIN_NAV_BASE.filter((item) => item.to !== '/permissions' || showPermissions)
}

function userInitial(name: string): string {
  const t = name.trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NavItem(props: {
  to: string
  end?: boolean
  label: string
  tab?: string
  icon?: 'journal' | 'new' | 'ppr' | 'asor' | 'matrix' | 'certificates' | 'permissions' | 'help' | 'admin'
  variant: 'header' | 'sidebar' | 'tab' | 'tab'
  gatesTick: number
  user: DemoUser | null
  onNavigate?: () => void
}) {
  const { to, end, label, tab, icon, variant, gatesTick, user, onNavigate } = props
  void gatesTick
  const accessible = isNavRouteAccessibleForUser(to, user)
  const hint = navRouteLockedHintForUser(to, user)
  const displayLabel = tab ?? label

  if (!accessible) {
    if (variant === 'sidebar') {
      return (
        <span
          className="sidebar-nav__link sidebar-nav__link--locked"
          title={hint ?? undefined}
          aria-disabled="true"
        >
          {icon && <NavIcon name={icon} />}
          <span className="sidebar-nav__label">{displayLabel}</span>
        </span>
      )
    }
    if (variant === 'tab') {
      return (
        <span
          className="tab-bar__link tab-bar__link--locked"
          title={hint ?? undefined}
          aria-disabled="true"
        >
          {icon && <NavIcon name={icon} />}
          <span className="tab-bar__label">{displayLabel}</span>
        </span>
      )
    }
    return (
      <span className="nav-link--locked" title={hint ?? undefined} aria-disabled="true">
        {label}
      </span>
    )
  }

  if (variant === 'sidebar') {
    return (
      <NavLink
        to={to}
        end={end ?? false}
        className={({ isActive }) =>
          `sidebar-nav__link${isActive ? ' sidebar-nav__link--active' : ''}`
        }
        onClick={onNavigate}
      >
        {icon && <NavIcon name={icon} />}
        <span className="sidebar-nav__label">{displayLabel}</span>
      </NavLink>
    )
  }

  if (variant === 'tab') {
    return (
      <NavLink
        to={to}
        end={end ?? false}
        className={({ isActive }) =>
          `tab-bar__link${isActive ? ' tab-bar__link--active' : ''}`
        }
        onClick={onNavigate}
      >
        {icon && <NavIcon name={icon} />}
        <span className="tab-bar__label">{displayLabel}</span>
      </NavLink>
    )
  }

  return (
    <NavLink to={to} end={end ?? false} onClick={onNavigate}>
      {label}
    </NavLink>
  )
}

export function Layout() {
  const {
    user,
    setUserId,
    error,
    clearError,
    authMode,
    signOutSession,
  } = useSession()
  const { showError } = useToast()
  const { online } = useNetwork()
  const navigate = useNavigate()
  const location = useLocation()
  const prevUserId = useRef<string | null>(null)
  const [gatesTick, setGatesTick] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  )

  const handleSignOut = () => {
    if (user?.id) void disablePushOnSignOut(user.id)
    void signOutSession()
  }

  useEffect(() => {
    if (!error) return
    showError(error)
    clearError()
  }, [error, showError, clearError])

  useEffect(() => {
    if (!user) {
      prevUserId.current = null
      return
    }
    if (prevUserId.current === user.id) return
    prevUserId.current = user.id
    if (location.pathname !== '/' && !location.pathname.startsWith('/login')) {
      navigate('/', { replace: true })
    }
  }, [user, location.pathname, navigate])

  useEffect(() => {
    if (
      location.pathname === '/new' ||
      location.pathname === '/risk-assessment' ||
      location.pathname === '/permissions'
    ) {
      scrollAppToTop()
    }
  }, [location.pathname])

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  useEffect(() => {
    if (
      location.pathname === '/new' ||
      location.pathname === '/risk-assessment' ||
      location.pathname === '/permissions'
    ) {
      scrollAppToTop()
    }
  }, [location.pathname])

  useEffect(() => {
    preloadPdfMakeEngine()
  }, [])

  useEffect(() => {
    if (!error) return
    showError(error)
    clearError()
  }, [error, showError, clearError])

  useEffect(() => {
    const bump = () => setGatesTick((n) => n + 1)
    window.addEventListener(NAV_GATES_CHANGED, bump)
    window.addEventListener(PACKAGE_CLEARED_EVENT, bump)
    return () => {
      window.removeEventListener(NAV_GATES_CHANGED, bump)
      window.removeEventListener(PACKAGE_CLEARED_EVENT, bump)
    }
  }, [])

  if (!user) return null

  const { t, language } = useLanguage()
  void gatesTick
  const mainNav = buildMainNav(isPermissionsNavVisible())
  const navLabel = (key: (typeof MAIN_NAV_BASE)[number]['labelKey']) => t.nav[key]
  const navTabLabel = (key: (typeof MAIN_NAV_BASE)[number]['tabKey']) => t.navTab[key]
  const closeSidebarOnMobile = () => {
    if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(false)
  }

  return (
    <div className={`app-shell${sidebarOpen ? ' app-shell--sidebar-open' : ''}`}>

      <aside
        className="app-sidebar"
        aria-label={t.layout.appNav}
        aria-hidden={!sidebarOpen}
      >
        <NavLink
          to="/"
          end
          className="app-sidebar__brand brand brand--home"
          aria-label={t.layout.homeAria}
          onClick={closeSidebarOnMobile}
        >
          <AppLogo className="brand-mark__logo--sidebar" variant="sidebar" />
        </NavLink>

        <nav className="sidebar-nav">
          {mainNav.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              end={item.end}
              label={navLabel(item.labelKey)}
              tab={navTabLabel(item.tabKey)}
              icon={item.icon}
              variant="sidebar"
              gatesTick={gatesTick}
              user={user}
              onNavigate={closeSidebarOnMobile}
            />
          ))}
          {user.role === 'coordinator' ? (
            <NavItem
              to="/admin"
              label={t.adminPage.navLabel}
              tab={t.adminPage.navLabel}
              icon="admin"
              variant="sidebar"
              gatesTick={gatesTick}
              user={user}
              onNavigate={closeSidebarOnMobile}
            />
          ) : null}
          <NavLink
            to="/help"
            className={({ isActive }) =>
              `sidebar-nav__link${isActive ? ' sidebar-nav__link--active' : ''}`
            }
            onClick={closeSidebarOnMobile}
          >
            <NavIcon name="help" />
            <span className="sidebar-nav__label">{t.layout.help}</span>
          </NavLink>
        </nav>

        {authMode === 'firebase' ? (
          <div className="app-sidebar__footer">
            <button
              type="button"
              className="app-sidebar__signout btn ghost small"
              onClick={() => void handleSignOut()}
            >
              <SignOutIcon />
              <span>{t.layout.signOut}</span>
            </button>
          </div>
        ) : null}
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label={t.layout.sidebarClose}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="app-frame">
        <header className="top-bar">
          <div className="top-bar__top">
            <div className="top-bar__start">
              <button
                type="button"
                className="sidebar-toggle"
                aria-label={sidebarOpen ? t.layout.sidebarClose : t.layout.sidebarOpen}
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((open) => !open)}
              >
                <MenuIcon />
              </button>
            </div>

            <nav className="nav nav--header" aria-label={t.layout.appNav}>
              {mainNav.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  label={navLabel(item.labelKey)}
                  variant="header"
                  gatesTick={gatesTick}
                  user={user}
                />
              ))}
            </nav>

            <div className="user-bar">
              <LanguageToggle />
              {authMode === 'local' ? (
                <>
                  <label className="small muted user-bar__demo-label" htmlFor="role-select">
                    {t.layout.demoUser}
                  </label>
                  <select
                    id="role-select"
                    className="user-bar__select"
                    value={user.id}
                    onChange={(e) => setUserId(e.target.value)}
                  >
                    {DEMO_USERS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} — {roleLabel(u.role, language)}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <div className="user-bar__who">
                    <span className="user-avatar" aria-hidden>
                      {userInitial(user.displayName)}
                    </span>
                    <span className="user-bar__text">
                      <span className="small user-bar__line">
                        <strong>{user.displayName}</strong>
                      </span>
                      <span className="xsmall muted user-bar__role">
                        {roleLabel(user.role, language)}
                      </span>
                    </span>
                  </div>
                  <div className="user-bar__actions">
                    {pushConfigured() ? (
                      <PushNotificationsToggle userId={user.id} />
                    ) : null}
                    <button
                      type="button"
                      className="btn ghost small user-bar__signout"
                      aria-label={t.layout.signOut}
                      onClick={() => void handleSignOut()}
                    >
                      <SignOutIcon />
                      <span>{t.layout.signOut}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {firebaseConfigured && !online && (
          <div className="banner banner--offline" role="status">
            {t.layout.offline}
            {firestoreOfflineCache ? t.layout.offlineSync : t.layout.offlineLimited}
          </div>
        )}

        {authMode === 'firebase' && user.role === 'coordinator' ? (
          <div className="notification-email-banner">
            <NotificationEmailField user={user} />
            <p className="muted xsmall notification-email-banner__hint">
              {t.notificationEmail.bannerHint}
            </p>
          </div>
        ) : null}

        <main className="main">
          <Outlet />
        </main>

        <nav className="tab-bar" aria-label={t.layout.appNav}>
          {mainNav.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              end={item.end}
              label={navLabel(item.labelKey)}
              tab={navTabLabel(item.tabKey)}
              icon={item.icon}
              variant="tab"
              gatesTick={gatesTick}
              user={user}
            />
          ))}
        </nav>

        <footer className="app-footer">
          <span>{t.layout.footerCopyright}</span>
          <div className="app-footer__links">
            <span>{t.layout.footerPrivacy}</span>
            <span>{t.layout.footerTerms}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
