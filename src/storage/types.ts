import type {
  DemoUser,
  JournalEntry,
  Permit,
  PermitDraft,
  PermitStatus,
} from '../types/domain'
import type { WorkStopPhoto } from '../types/workStop'
import type { WorkStopResolveAction } from '../lib/workStopFunctions'
import type { InspectorRejectedAction } from '../lib/inspectorRejectedPermit'

export type Unsubscribe = () => void

export interface WorkStopRequestParams {
  reason: string
  photo?: WorkStopPhoto
  /** Для локального режима — справочник инспекторов. */
  directory?: DemoUser[]
  inspectorNotifyMode?: 'global' | 'site_bound'
}

export interface WorkStopResolveParams {
  action: WorkStopResolveAction
  comment: string
}

export interface RejectedPermitResolveParams {
  action: InspectorRejectedAction
  comment: string
}

export interface PermitRepository {
  list(): Promise<Permit[]>
  getById(id: string): Promise<Permit | null>
  create(draft: PermitDraft, actor: DemoUser): Promise<Permit>
  updateFields(
    id: string,
    patch: Partial<Permit>,
    actor: DemoUser,
  ): Promise<void>
  transition(
    id: string,
    next: PermitStatus,
    actor: DemoUser,
  ): Promise<Permit>
  requestWorkStop(
    id: string,
    params: WorkStopRequestParams,
    actor: DemoUser,
  ): Promise<Permit>
  resolveWorkStop(
    id: string,
    params: WorkStopResolveParams,
    actor: DemoUser,
  ): Promise<Permit>
  resolveRejectedPermit(
    id: string,
    params: RejectedPermitResolveParams,
    actor: DemoUser,
  ): Promise<Permit>
  /** Сброс отклонённого пакета в черновик для правки и повторной отправки. */
  resetRejectedPermitToDraft(id: string, actor: DemoUser): Promise<Permit>
  deletePermit(id: string, actor: DemoUser): Promise<void>
  deleteAllPermits(actor: DemoUser): Promise<void>
  subscribePermits(cb: (permits: Permit[]) => void): Unsubscribe
  journalSubscribe(
    permitId: string,
    cb: (entries: JournalEntry[]) => void,
  ): Unsubscribe
  appendJournal(entry: Omit<JournalEntry, 'id'>): Promise<JournalEntry>
}
