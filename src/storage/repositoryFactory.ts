import { db } from '../lib/firebase'
import { FirestorePermitRepository } from './firestoreRepository'
import { LocalPermitRepository, seedDemoPermitIfEmpty } from './localRepository'
import type { PermitRepository } from './types'

export function createRepository(): PermitRepository {
  if (db) return new FirestorePermitRepository(db)
  seedDemoPermitIfEmpty()
  return new LocalPermitRepository()
}
