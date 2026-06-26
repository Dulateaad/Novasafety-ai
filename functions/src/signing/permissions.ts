import type { EgovSignRole } from './types'

import type { DocumentData } from 'firebase-admin/firestore'

export function assigneeUidForRole(
  permit: DocumentData,
  role: EgovSignRole,
): string {
  if (role === 'performer') return String(permit.performerUid ?? '')
  if (role === 'permitter') return String(permit.permitterUid ?? '')
  if (role === 'issuer') return String(permit.issuerUid ?? '')
  return String(permit.leadExpertUid ?? '')
}

export function canUserSignRole(
  user: DocumentData,
  uid: string,
  permit: DocumentData,
  role: EgovSignRole,
): boolean {
  const r = String(user.role ?? '')
  if (r === 'coordinator') return true
  if (r !== role) return false
  return uid === assigneeUidForRole(permit, role)
}

export function signatureFlagKey(
  role: EgovSignRole,
): 'performerSigned' | 'permitterSigned' | 'issuerSigned' | 'leadExpertSigned' {
  if (role === 'performer') return 'performerSigned'
  if (role === 'permitter') return 'permitterSigned'
  if (role === 'issuer') return 'issuerSigned'
  return 'leadExpertSigned'
}
