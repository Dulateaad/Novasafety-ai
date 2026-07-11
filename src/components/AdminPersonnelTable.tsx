import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { DemoUser, UserRole } from '../types/domain'
import { collection, getDocs } from 'firebase/firestore'
import { db, firebaseConfigured } from '../lib/firebase'
import { profileDocToDemoUser } from '../lib/userProfile'
import {
  createDirectoryUserClient,
  deleteDirectoryUserClient,
  updateDirectoryUserClient,
  directoryCallableErrorMessage,
  DIRECTORY_CREATABLE_ROLES,
  DIRECTORY_EDITABLE_ROLES,
  type DirectoryCreatableRole,
  type DirectoryEditableRole,
} from '../lib/createDirectoryUser'
import { useSession } from '../context/SessionContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { fillTemplate, roleLabel } from '../i18n/getLocale'

const ROLE_ORDER: UserRole[] = [
  'coordinator',
  'issuer',
  'permitter',
  'performer',
  'leadExpert',
  'ert',
  'safety',
  'contractor',
  'executor',
]

function roleRank(role: UserRole): number {
  const idx = ROLE_ORDER.indexOf(role)
  return idx === -1 ? ROLE_ORDER.length : idx
}

function splitDisplayName(displayName: string): { name: string; position: string } {
  const dash = displayName.indexOf(' — ')
  if (dash === -1) return { name: displayName.trim(), position: '—' }
  return {
    name: displayName.slice(0, dash).trim() || displayName,
    position: displayName.slice(dash + 3).trim() || '—',
  }
}

type UserFormBase = {
  displayName: string
  position: string
  email: string
  password: string
  iin: string
  badgeNo: string
}

type CreateUserForm = UserFormBase & { role: DirectoryCreatableRole }
type EditUserForm = UserFormBase & { role: DirectoryEditableRole }

const EMPTY_FORM: CreateUserForm = {
  displayName: '',
  position: '',
  role: 'performer',
  email: '',
  password: '',
  iin: '',
  badgeNo: '',
}

type PersonnelRow = DemoUser & { badgeNo?: string; iin?: string }

function rowToEditForm(row: PersonnelRow): EditUserForm {
  const { name, position } = splitDisplayName(row.displayName)
  return {
    displayName: name,
    position: position === '—' ? '' : position,
    role: row.role as DirectoryEditableRole,
    email: row.email || '',
    password: '',
    iin: row.iin ?? '',
    badgeNo: row.badgeNo ?? '',
  }
}

export function AdminPersonnelTable() {
  const { t, language } = useLanguage()
  const { user, userDirectory, upsertDirectoryUser, removeDirectoryUser, authMode } =
    useSession()
  const { showError, showInfo } = useToast()
  const ap = t.adminPage
  const [rows, setRows] = useState<PersonnelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editUid, setEditUid] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditUserForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [deletingUid, setDeletingUid] = useState<string | null>(null)
  const [lastCredentials, setLastCredentials] = useState<{
    email: string
    password: string
    created: boolean
  } | null>(null)

  const userDirectoryRef = useRef(userDirectory)
  userDirectoryRef.current = userDirectory

  const loadRows = useCallback(async () => {
    if (!firebaseConfigured || !db) {
      const demo = [...userDirectoryRef.current].sort((a, b) => {
        const byRole = roleRank(a.role) - roleRank(b.role)
        if (byRole !== 0) return byRole
        return a.displayName.localeCompare(b.displayName, 'ru')
      })
      setRows(demo)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const next: PersonnelRow[] = []
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>
        next.push({
          ...profileDocToDemoUser(
            d.id,
            data,
            String((data.email as string | undefined) ?? ''),
          ),
          badgeNo: typeof data.badgeNo === 'string' ? data.badgeNo : '',
          iin: typeof data.iin === 'string' ? data.iin : '',
        })
      })
      next.sort((a, b) => {
        const byRole = roleRank(a.role) - roleRank(b.role)
        if (byRole !== 0) return byRole
        return a.displayName.localeCompare(b.displayName, 'ru')
      })
      setRows(next)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const sorted = useMemo(() => rows, [rows])

  async function onDelete(row: PersonnelRow) {
    if (authMode !== 'firebase') {
      showError(ap.addUserFirebaseOnly)
      return
    }
    if (user && row.id === user.id) {
      showError(ap.deleteUserSelfBlocked)
      return
    }
    const { name } = splitDisplayName(row.displayName)
    const ok = window.confirm(
      fillTemplate(ap.deleteUserConfirm, {
        name,
        email: row.email || row.id,
      }),
    )
    if (!ok) return
    setDeletingUid(row.id)
    try {
      await deleteDirectoryUserClient(row.id)
      removeDirectoryUser(row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      showInfo(ap.deleteUserDone)
    } catch (err) {
      showError(directoryCallableErrorMessage(err))
    } finally {
      setDeletingUid(null)
    }
  }

  function openEdit(row: PersonnelRow) {
    if (editUid === row.id) {
      closeEdit()
      return
    }
    setEditUid(row.id)
    setEditForm(rowToEditForm(row))
    setLastCredentials(null)
  }

  function closeEdit() {
    setEditUid(null)
    setEditForm(null)
  }

  async function onEditSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editUid || !editForm) return
    if (authMode !== 'firebase') {
      showError(ap.addUserFirebaseOnly)
      return
    }
    const fio = editForm.displayName.trim()
    const email = editForm.email.trim()
    if (fio.length < 2) {
      showError(ap.addUserNameRequired)
      return
    }
    if (!email) {
      showError(ap.addUserEmailRequired)
      return
    }
    setBusy(true)
    setLastCredentials(null)
    try {
      const result = await updateDirectoryUserClient({
        uid: editUid,
        displayName: fio,
        role: editForm.role,
        email,
        password: editForm.password.trim() || undefined,
        position: editForm.position.trim() || undefined,
        iin: editForm.iin.trim() || undefined,
        badgeNo: editForm.badgeNo.trim() || undefined,
      })
      upsertDirectoryUser({
        id: result.uid,
        displayName: result.displayName,
        email: result.email,
        role: result.role,
        badgeNo: result.badgeNo,
      })
      if (result.passwordChanged && result.temporaryPassword) {
        setLastCredentials({
          email: result.email,
          password: result.temporaryPassword,
          created: false,
        })
      }
      showInfo(ap.editUserDone)
      closeEdit()
      await loadRows()
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (authMode !== 'firebase') {
      showError(ap.addUserFirebaseOnly)
      return
    }
    const fio = form.displayName.trim()
    const email = form.email.trim()
    if (fio.length < 2) {
      showError(ap.addUserNameRequired)
      return
    }
    if (!email) {
      showError(ap.addUserEmailRequired)
      return
    }
    setBusy(true)
    setLastCredentials(null)
    try {
      const result = await createDirectoryUserClient({
        displayName: fio,
        role: form.role,
        email,
        password: form.password.trim() || undefined,
        position: form.position.trim() || undefined,
        iin: form.iin.trim() || undefined,
      })
      upsertDirectoryUser({
        id: result.uid,
        displayName: result.displayName,
        email: result.email,
        role: result.role,
        badgeNo: result.badgeNo,
      })
      setLastCredentials({
        email: result.email,
        password: result.temporaryPassword ?? form.password.trim(),
        created: result.created,
      })
      setForm(EMPTY_FORM)
      showInfo(result.created ? ap.addUserCreated : ap.addUserUpdated)
      await loadRows()
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card admin-panel__section">
      <h2 className="admin-panel__heading">{ap.personnelTitle}</h2>
      <p className="muted small">{ap.personnelHint}</p>

      <form className="admin-add-user" onSubmit={(e) => void onSubmit(e)}>
        <h3 className="admin-add-user__title">{ap.addUserTitle}</h3>
        <p className="muted small">{ap.addUserHint}</p>
        <div className="admin-add-user__grid">
          <label className="field">
            <span className="field-label">{ap.addUserName} *</span>
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder={ap.addUserNamePlaceholder}
              autoComplete="name"
              disabled={busy}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">{ap.addUserPosition}</span>
            <input
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              placeholder={ap.addUserPositionPlaceholder}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span className="field-label">{ap.addUserRole} *</span>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as DirectoryCreatableRole }))
              }
              disabled={busy}
            >
              {DIRECTORY_CREATABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role, language)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{ap.addUserEmail} *</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder={ap.addUserEmailPlaceholder}
              autoComplete="off"
              disabled={busy}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">{ap.addUserPassword}</span>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={ap.addUserPasswordPlaceholder}
              autoComplete="new-password"
              disabled={busy}
            />
          </label>
          <label className="field">
            <span className="field-label">{ap.addUserIin}</span>
            <input
              value={form.iin}
              onChange={(e) => setForm((f) => ({ ...f, iin: e.target.value }))}
              placeholder={ap.addUserIinPlaceholder}
              disabled={busy}
            />
          </label>
        </div>
        <div className="admin-add-user__actions">
          <button type="submit" className="btn primary" disabled={busy || authMode !== 'firebase'}>
            {busy ? ap.addUserSaving : ap.addUserSubmit}
          </button>
        </div>
        {authMode !== 'firebase' ? (
          <p className="muted small">{ap.addUserFirebaseOnly}</p>
        ) : null}
        {lastCredentials ? (
          <p className="admin-add-user__creds small">
            {lastCredentials.created ? ap.addUserCredsCreated : ap.addUserCredsUpdated}{' '}
            <strong>{lastCredentials.email}</strong>
            {lastCredentials.password ? (
              <>
                {' · '}
                {ap.addUserCredsPassword}: <code>{lastCredentials.password}</code>
              </>
            ) : null}
          </p>
        ) : null}
      </form>

      {lastCredentials && !editUid ? (
        <p className="admin-add-user__creds small">
          {lastCredentials.created ? ap.addUserCredsCreated : ap.addUserCredsUpdated}{' '}
          <strong>{lastCredentials.email}</strong>
          {lastCredentials.password ? (
            <>
              {' · '}
              {ap.addUserCredsPassword}: <code>{lastCredentials.password}</code>
            </>
          ) : null}
        </p>
      ) : null}

      {loading ? (
        <p className="muted small">{t.common.loading ?? '…'}</p>
      ) : sorted.length === 0 ? (
        <p className="muted small">{ap.personnelEmpty}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table admin-panel__people">
            <thead>
              <tr>
                <th>{ap.colName}</th>
                <th>{ap.colPosition}</th>
                <th>{ap.colRole}</th>
                <th>{ap.colDepartment}</th>
                <th>{ap.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const { name, position } = splitDisplayName(row.displayName)
                const isEditing = editUid === row.id && editForm
                return (
                  <Fragment key={row.id}>
                    <tr className={isEditing ? 'admin-panel__people-row--editing' : undefined}>
                      <td>{name}</td>
                      <td className="muted small">{position}</td>
                      <td className="small">{roleLabel(row.role, language)}</td>
                      <td className="muted small">{ap.defaultDepartment}</td>
                      <td>
                        <span className="admin-panel__row-actions">
                          <button
                            type="button"
                            className={`link-btn small${isEditing ? ' admin-panel__edit-active' : ''}`}
                            disabled={busy || authMode !== 'firebase'}
                            onClick={() => openEdit(row)}
                          >
                            {isEditing ? ap.editUserCancel : ap.edit}
                          </button>
                          <button
                            type="button"
                            className="link-btn small admin-panel__delete"
                            disabled={
                              busy ||
                              deletingUid === row.id ||
                              authMode !== 'firebase' ||
                              Boolean(user && row.id === user.id) ||
                              Boolean(isEditing)
                            }
                            onClick={() => void onDelete(row)}
                          >
                            {deletingUid === row.id ? '…' : ap.deleteUser}
                          </button>
                        </span>
                      </td>
                    </tr>
                    {isEditing ? (
                      <tr className="admin-panel__people-edit-row">
                        <td colSpan={5}>
                          <form
                            className="admin-add-user admin-add-user--edit admin-add-user--inline"
                            onSubmit={(e) => void onEditSubmit(e)}
                          >
                            <h3 className="admin-add-user__title">{ap.editUserTitle}</h3>
                            <p className="muted small">{ap.editUserHint}</p>
                            <div className="admin-add-user__grid">
                              <label className="field">
                                <span className="field-label">{ap.addUserName} *</span>
                                <input
                                  value={editForm.displayName}
                                  onChange={(e) =>
                                    setEditForm((f) =>
                                      f ? { ...f, displayName: e.target.value } : f,
                                    )
                                  }
                                  disabled={busy}
                                  required
                                />
                              </label>
                              <label className="field">
                                <span className="field-label">{ap.addUserPosition}</span>
                                <input
                                  value={editForm.position}
                                  onChange={(e) =>
                                    setEditForm((f) =>
                                      f ? { ...f, position: e.target.value } : f,
                                    )
                                  }
                                  disabled={busy}
                                />
                              </label>
                              <label className="field">
                                <span className="field-label">{ap.addUserRole} *</span>
                                <select
                                  value={editForm.role}
                                  onChange={(e) =>
                                    setEditForm((f) =>
                                      f
                                        ? { ...f, role: e.target.value as DirectoryEditableRole }
                                        : f,
                                    )
                                  }
                                  disabled={busy}
                                >
                                  {DIRECTORY_EDITABLE_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {roleLabel(role, language)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field">
                                <span className="field-label">{ap.addUserEmail} *</span>
                                <input
                                  type="email"
                                  value={editForm.email}
                                  onChange={(e) =>
                                    setEditForm((f) => (f ? { ...f, email: e.target.value } : f))
                                  }
                                  disabled={busy}
                                  required
                                />
                              </label>
                              <label className="field">
                                <span className="field-label">{ap.addUserPassword}</span>
                                <input
                                  type="text"
                                  value={editForm.password}
                                  onChange={(e) =>
                                    setEditForm((f) =>
                                      f ? { ...f, password: e.target.value } : f,
                                    )
                                  }
                                  placeholder={ap.editUserPasswordKeep}
                                  disabled={busy}
                                />
                              </label>
                              <label className="field">
                                <span className="field-label">{ap.addUserIin}</span>
                                <input
                                  value={editForm.iin}
                                  onChange={(e) =>
                                    setEditForm((f) => (f ? { ...f, iin: e.target.value } : f))
                                  }
                                  disabled={busy}
                                />
                              </label>
                              <label className="field">
                                <span className="field-label">{ap.addUserBadgeNo}</span>
                                <input
                                  value={editForm.badgeNo}
                                  onChange={(e) =>
                                    setEditForm((f) => (f ? { ...f, badgeNo: e.target.value } : f))
                                  }
                                  placeholder={ap.addUserBadgeNoPlaceholder}
                                  disabled={busy}
                                />
                              </label>
                            </div>
                            <div className="admin-add-user__actions btn-row">
                              <button type="submit" className="btn primary" disabled={busy}>
                                {busy ? ap.addUserSaving : ap.editUserSubmit}
                              </button>
                              <button
                                type="button"
                                className="btn ghost"
                                disabled={busy}
                                onClick={closeEdit}
                              >
                                {ap.editUserCancel}
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
