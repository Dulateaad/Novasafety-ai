import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { renumberAllPermits } from '../lib/admin/renumberPermits.js'

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GCLOUD_PROJECT ?? 'naryad-67194',
})

const db = getFirestore()
const result = await renumberAllPermits(db)
console.log(JSON.stringify(result, null, 2))
