import type { PermitPackageBrief } from '../lib/permitPackageBrief'
import type { PackagePdfPart } from '../lib/buildPackagePdf'
import { parseWorkStagesBlocks } from '../lib/formatWorkStagesDisplay'
import type { WorkPermissionKind } from '../types/workPermissions'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'

export type PackagePermissionBrief = {
  kind: WorkPermissionKind
  label: string
  hasPdf: boolean
  requiresGasTests: boolean
  gasTestsFilled?: boolean
}

function WorkStagesContent({ text, emptyLabel }: { text: string; emptyLabel: string }) {
  const blocks = parseWorkStagesBlocks(text)
  if (blocks.length === 0) {
    return <>{text || emptyLabel}</>
  }

  return (
    <div className="package-brief__stages-formatted">
      {blocks.map((block, i) => (
        <div key={i} className="package-brief__stage-block">
          {block.title ? (
            <div className="package-brief__stage-title">{block.title}</div>
          ) : null}
          {block.body ? (
            <div className="package-brief__stage-body">{block.body}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}


type Props = {
  brief: PermitPackageBrief
  permissions?: PackagePermissionBrief[]
  /** Показывать ссылки на отдельные PDF (НДПР, АБР и т. д.). На карточке наряда — только сводка. */
  showDocLinks?: boolean
  showGasTestTasks?: boolean
  activeGasKind?: WorkPermissionKind | null
  onViewPart?: (part: PackagePdfPart) => void
  onViewPpr?: () => void
  onViewPermission?: (kind: WorkPermissionKind) => void
  onViewFullPackage?: () => void
  onGasTestTask?: (kind: WorkPermissionKind) => void
  viewingPart?: PackagePdfPart | null
  viewingPermission?: WorkPermissionKind | null
  viewingFullPackage?: boolean
}

export function PermitPackageBriefCard(props: Props) {
  const {
    brief,
    permissions = [],
    showDocLinks = true,
    showGasTestTasks = false,
    activeGasKind,
    onViewPart,
    onViewPpr,
    onViewPermission,
    onViewFullPackage,
    onGasTestTask,
    viewingPart,
    viewingPermission,
    viewingFullPackage,
  } = props
  const { t } = useLanguage()
  const dk = t.docKit
  const c = t.common

  function docButton(
    part: PackagePdfPart,
    label: string,
    available: boolean,
  ) {
    if (!available) return null
    const busy = viewingPart === part
    return (
      <button
        type="button"
        className="package-brief__doc-link"
        disabled={busy || !onViewPart}
        onClick={() => onViewPart?.(part)}
        title={fillTemplate(dk.viewPdf, { label })}
      >
        {busy ? c.opening : label}
      </button>
    )
  }

  return (
    <div className="package-brief">
      <header className="package-brief__header">
        <div className="package-brief__headline">
          <span className="package-brief__reg">{t.branding.tagline} № {brief.regNo}</span>
        </div>
      </header>

      <div className="package-brief__meta">
        <span className="package-brief__chip">{brief.workKind}</span>
        <span className="package-brief__chip">«{brief.siteName}»</span>
        <span className="package-brief__chip">{c.zonePrefix} {brief.zoneClass}</span>
        {brief.crewCount > 0 ? (
          <span className="package-brief__chip">
            {brief.crewCount}
          </span>
        ) : null}
      </div>

      <dl className="package-brief__facts package-brief__facts--work">
        {brief.company !== c.na ? (
          <>
            <dt>{t.detailPage.pprName}</dt>
            <dd>{brief.company}</dd>
          </>
        ) : null}
        {brief.period !== c.na ? (
          <>
            <dt>{t.detailPage.pprPeriod}</dt>
            <dd>{brief.period}</dd>
          </>
        ) : null}
        {brief.shiftLabel !== c.na ? (
          <>
            <dt>{t.detailPage.duration}</dt>
            <dd>{brief.shiftLabel}</dd>
          </>
        ) : null}

        <dt>{t.workPermission.workLabel}</dt>
        <dd className="package-brief__facts-value--title">
          {brief.title !== c.na ? brief.title : c.na}
        </dd>

        <dt className="package-brief__facts-label--stages">{c.stagePrefix}</dt>
        <dd className="package-brief__stages-inline package-brief__facts-value--stages">
          <WorkStagesContent text={brief.workStages} emptyLabel={c.na} />
        </dd>

        <dt className="package-brief__facts-label--tools">{t.workPermission.equipLabel}</dt>
        <dd className="package-brief__facts-value--tools">{brief.toolsText || c.na}</dd>
      </dl>

      {showDocLinks ? (
        <div className="package-brief__docs">
          <p className="package-brief__docs-label muted xsmall">{dk.approvalPackage}</p>
          <div className="package-brief__doc-links">
            {brief.hasPprAttachment && onViewPpr ? (
              <button
                type="button"
                className="package-brief__doc-link"
                onClick={onViewPpr}
                title={fillTemplate(t.detailPage.viewSource, { source: t.branding.sourceDocument })}
              >
                {t.branding.sourceDocument}
              </button>
            ) : null}
            {docButton('ndpr', dk.ndpr, true)}
            {docButton('abr', dk.abr, brief.hasAbr)}
            {docButton('risk', dk.risk, brief.hasRiskAssessment)}
            {permissions.map((perm) => (
              <button
                key={perm.kind}
                type="button"
                className="package-brief__doc-link"
                disabled={!perm.hasPdf || !onViewPermission || viewingPermission === perm.kind}
                onClick={() => onViewPermission?.(perm.kind)}
                title={perm.label}
              >
                {viewingPermission === perm.kind ? c.opening : perm.label}
              </button>
            ))}
            {onViewFullPackage ? (
              <button
                type="button"
                className="package-brief__doc-link"
                disabled={viewingFullPackage}
                onClick={onViewFullPackage}
                title={dk.fullPackage}
              >
                {viewingFullPackage ? c.opening : dk.fullPackage}
              </button>
            ) : null}
            {showGasTestTasks ? (
              <div className="package-brief__gas-summary">
                <p className="package-brief__docs-label muted xsmall">{t.gasTest.summaryTitle}</p>
                <ul className="package-brief__gas-list">
                  {permissions
                    .filter((p) => p.requiresGasTests)
                    .map((perm) => (
                      <li key={`gas-status-${perm.kind}`} className="package-brief__gas-row">
                        <span className="package-brief__gas-label">{perm.label}</span>
                        <span
                          className={`badge ${
                            perm.gasTestsFilled ? 'status-success' : 'status-warning'
                          }`}
                        >
                          {perm.gasTestsFilled ? t.gasTest.filledBadge : t.ert.needsReading}
                        </span>
                        <button
                          type="button"
                          className={`package-brief__doc-link package-brief__doc-link--gas ${
                            activeGasKind === perm.kind ? 'is-active' : ''
                          }`}
                          onClick={() => onGasTestTask?.(perm.kind)}
                          title={fillTemplate(dk.fillGasTest, { label: perm.label })}
                        >
                          {fillTemplate(dk.fillGasTest, { label: perm.label })}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
