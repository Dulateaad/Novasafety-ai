import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, firebaseConfigured } from './firebase'
import type { EgovSignRole } from '../types/egovSignature'

const REGION = 'europe-west1'

export type ProvisionSignersResponse = {
  signers: Array<{
    role: EgovSignRole
    uid: string
    email: string
    displayName: string
    stepLabel: string
    accountCreated: boolean
    inviteId: string
  }>
  permitUpdated: boolean
  currentStep: EgovSignRole | null
}

export async function provisionPermitSignersClient(
  permitId: string,
): Promise<ProvisionSignersResponse | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<{ permitId: string }, ProvisionSignersResponse>(
    getFunctions(app, REGION),
    'provisionPermitSignersFn',
  )
  const res = await fn({ permitId })
  return res.data
}
