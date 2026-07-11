import type { DemoUser, Permit } from '../types/domain'
import type { StoredEgovSignature } from '../types/egovSignature'
import { EgovQrSignModal } from './EgovQrSignModal'
import { mergePermitAfterEgovSign } from '../lib/approvalSequence'
import { resolveUserBadgeNo } from '../lib/userBadgeNumbers'
import type { PackagePerformerSignTarget } from '../lib/submitNdprPackageFlow'

export function SubmitPackagePerformerSignModal(props: {
  target: PackagePerformerSignTarget | null
  authMode: 'firebase' | 'local'
  userDirectory: DemoUser[]
  updatePermit: (id: string, patch: Partial<Permit>) => Promise<void>
  refresh: () => Promise<void>
  onClose: () => void
  onSignedComplete: () => void | Promise<void>
}) {
  const {
    target,
    authMode,
    userDirectory,
    updatePermit,
    refresh,
    onClose,
    onSignedComplete,
  } = props

  if (!target) return null

  const resolveBadge = (uid: string) => resolveUserBadgeNo(uid, userDirectory)

  return (
    <EgovQrSignModal
      open
      permit={target.permit}
      role="performer"
      signerUid={target.signerUid}
      signerName={target.signerName}
      onClose={onClose}
      onSigned={(sig: StoredEgovSignature) => {
        void (async () => {
          if (authMode === 'firebase') {
            await refresh()
          } else {
            await updatePermit(
              target.permit.id,
              mergePermitAfterEgovSign(target.permit, 'performer', sig, resolveBadge),
            )
          }
          await onSignedComplete()
        })()
      }}
    />
  )
}
