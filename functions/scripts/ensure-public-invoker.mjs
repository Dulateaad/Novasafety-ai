/**
 * Gen2 callable: после deploy Firebase иногда не выставляет roles/run.invoker для allUsers.
 * Без этого браузер видит CORS 403 на preflight OPTIONS.
 *
 * Запуск: node scripts/ensure-public-invoker.mjs
 * Требует: gcloud auth + project naryad-67194
 */
import { execSync } from 'node:child_process'

const PROJECT = process.env.FIREBASE_PROJECT ?? 'naryad-67194'
const REGION = process.env.FUNCTIONS_REGION ?? 'europe-west1'

const SERVICES = [
  'getsigningdocument',
  'submitegovsignature',
  'ensuredefaultndprsignersfn',
  'provisionpermitsignersfn',
  'ensuredefaultworkersfn',
  'renumberpermitsfn',
  'cleanuporphansigninginvitesfn',
  'getcrewackdocument',
  'submitcrewacknowledgment',
]

for (const service of SERVICES) {
  console.log(`→ ${service}`)
  execSync(
    `gcloud run services add-iam-policy-binding ${service} --region=${REGION} --project=${PROJECT} --member=allUsers --role=roles/run.invoker`,
    { stdio: 'inherit' },
  )
}

console.log('Public invoker applied to all callable services.')
