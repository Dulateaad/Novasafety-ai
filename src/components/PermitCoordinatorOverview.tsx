import type { DemoUser, Permit } from '../types/domain'
import { ZONE_CLASS_LABELS } from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import { assigneeUidForRole } from '../lib/signatureStatus'
import { isRoleSigned } from '../lib/signatureStatus'
import { buildPermitCrewRows } from '../lib/permitCrewRows'
import { signingRoleOrder } from '../lib/approvalSequence'
import { useLanguage } from '../context/LanguageContext'
import { parseWorkStagesBlocks } from '../lib/formatWorkStagesDisplay'
import { permitWorkDescriptionNdpr, permitWorkTitle } from '../lib/ndprWorkText'
import {
  PERFORMER_DOCUMENT_ROLE_LABEL,
  PERMITTER_DOCUMENT_ROLE_LABEL,
  ISSUER_DOCUMENT_ROLE_LABEL,
  LEAD_EXPERT_DOCUMENT_ROLE_LABEL,
  RISK_ASSESSMENT_LABEL,
} from '../config/branding'

type PersonRow = {
  id: string
  fullName: string
  position: string
  roleLabel: string
  department: string
  signed: boolean
}

function splitDisplayName(displayName: string): { name: string; position: string } {
  const dash = displayName.indexOf(' — ')
  if (dash === -1) return { name: displayName.trim(), position: '—' }
  return {
    name: displayName.slice(0, dash).trim() || displayName,
    position: displayName.slice(dash + 3).trim() || '—',
  }
}

function buildResponsibleRows(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  language: 'ru' | 'en',
): PersonRow[] {
  const dept = permit.f02?.company?.trim() || 'ТОО «Урал Ойл энд Газ»'
  const rows: PersonRow[] = []

  const roleMeta: { role: EgovSignRole; label: string }[] = [
    { role: 'performer', label: PERFORMER_DOCUMENT_ROLE_LABEL },
    { role: 'permitter', label: PERMITTER_DOCUMENT_ROLE_LABEL },
    { role: 'issuer', label: ISSUER_DOCUMENT_ROLE_LABEL },
    { role: 'leadExpert', label: LEAD_EXPERT_DOCUMENT_ROLE_LABEL },
  ]

  if (signingRoleOrder(permit).includes('ert')) {
    roleMeta.splice(1, 0, { role: 'ert', label: 'ПАС (Пожарно-аварийная служба)' })
  }

  for (const { role, label } of roleMeta) {
    if (!signingRoleOrder(permit).includes(role) && role === 'ert') continue
    const uid = assigneeUidForRole(permit, role)
    const user = resolveUser(uid)
    const { name, position } = splitDisplayName(user?.displayName ?? '—')
    rows.push({
      id: `role-${role}`,
      fullName: name,
      position,
      roleLabel: label,
      department: dept,
      signed: isRoleSigned(permit, role),
    })
  }

  const crew = buildPermitCrewRows(permit, resolveUser)
  crew.forEach((c, i) => {
    const { name, position } = splitDisplayName(c.fullName)
    rows.push({
      id: c.id || `crew-${i}`,
      fullName: name,
      position: position !== '—' ? position : c.roleLabel,
      roleLabel: 'Член бригады',
      department: dept,
      signed: c.acknowledged,
    })
  })

  void language
  return rows
}

type Props = {
  permit: Permit
  resolveUser: (uid: string) => DemoUser | undefined
}

export function PermitCoordinatorOverview({ permit, resolveUser }: Props) {
  const { language } = useLanguage()
  const workArea =
    permit.f04?.workArea?.trim() ||
    permit.ppr?.workArea?.trim() ||
    permit.siteName ||
    '—'
  const stagesText = permitWorkDescriptionNdpr(permit)
  const stageBlocks = parseWorkStagesBlocks(stagesText)
  const tasks = permit.asor?.tasks ?? []
  const people = buildResponsibleRows(permit, resolveUser, language)

  return (
    <div className="coord-overview">
      <section className="card coord-overview__section">
        <h2 className="coord-overview__heading">ДАННЫЕ ОБЪЕКТА</h2>
        <dl className="coord-overview__dl">
          <dt>Название объекта</dt>
          <dd>{permit.siteName || '—'}</dd>
          <dt>Место проведения работ</dt>
          <dd>{workArea}</dd>
          <dt>Зона</dt>
          <dd>{ZONE_CLASS_LABELS[permit.zoneClass]}</dd>
          <dt>Наименование работ</dt>
          <dd>{permitWorkTitle(permit) || permit.title || '—'}</dd>
        </dl>
      </section>

      <section className="card coord-overview__section">
        <h2 className="coord-overview__heading">ОТВЕТСТВЕННЫЕ ЛИЦА</h2>
        <div className="table-wrap">
          <table className="data-table coord-overview__people">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Должность</th>
                <th>Роль</th>
                <th>Подразделение</th>
                <th>Подпись</th>
              </tr>
            </thead>
            <tbody>
              {people.map((row) => (
                <tr key={row.id}>
                  <td>{row.fullName}</td>
                  <td className="muted small">{row.position}</td>
                  <td className="small">{row.roleLabel}</td>
                  <td className="muted small">{row.department}</td>
                  <td>
                    <span
                      className={`coord-overview__sig ${row.signed ? 'is-signed' : ''}`}
                    >
                      {row.signed ? 'Подписано' : 'Ожидает'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card coord-overview__section">
        <h2 className="coord-overview__heading">ОЦЕНКА РИСКОВ И МЕРЫ БЕЗОПАСНОСТИ</h2>
        {stageBlocks.length > 0 ? (
          <div className="coord-overview__stages">
            {stageBlocks.map((block, i) => (
              <article key={i} className="coord-overview__stage">
                <h3 className="coord-overview__stage-title">{block.title || `Этап ${i + 1}`}</h3>
                {block.body ? <p className="small">{block.body}</p> : null}
              </article>
            ))}
          </div>
        ) : null}

        {tasks.length > 0 ? (
          <div className="coord-overview__tasks">
            {tasks.map((task, ti) => (
              <article key={task.id || ti} className="coord-overview__task card">
                <h3 className="coord-overview__task-title">
                  {task.taskTitle.trim() || `Задание ${ti + 1}`}
                </h3>
                {task.hazards.map((haz, hi) => (
                  <div key={haz.id || hi} className="coord-overview__hazard">
                    <p className="small strong">{haz.factorDescription || 'Опасность'}</p>
                    {haz.protectiveMeasures.trim() ? (
                      <ul className="coord-overview__measures small">
                        {haz.protectiveMeasures
                          .split('\n')
                          .map((m) => m.trim())
                          .filter(Boolean)
                          .map((m, mi) => (
                            <li key={mi}>{m.replace(/^\d+\.\s*/, '')}</li>
                          ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : (
          <p className="muted small">{RISK_ASSESSMENT_LABEL} ещё не заполнена.</p>
        )}
      </section>
    </div>
  )
}
