import type { WorkExecutor } from '../types/domain'

/** Сохраняет порядок из patch (новые строки сверху), переносит briefingAcknowledged. */
export function mergeExecutorPatch(
  previous: WorkExecutor[],
  patch: WorkExecutor[],
): WorkExecutor[] {
  const prevById = new Map(previous.map((ex) => [ex.id, ex]))
  const prevByUid = new Map(
    previous.filter((ex) => ex.userUid.trim()).map((ex) => [ex.userUid, ex]),
  )

  return patch.map((fromPatch) => {
    const prev =
      prevById.get(fromPatch.id) ??
      (fromPatch.userUid.trim() ? prevByUid.get(fromPatch.userUid) : undefined)
    if (!prev) return fromPatch
    return {
      ...fromPatch,
      briefingAcknowledged:
        prev.briefingAcknowledged || fromPatch.briefingAcknowledged,
    }
  })
}
