import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase-config'
import type { Asset, UsageLog } from '../types'
import { sanitizeDataForFirestore } from './firestoreUtils'
import { isUsageLogOccupyingAsset } from '../utils/statusHelpers'

const ASSETS_COLLECTION = 'assets'

export const reconcileAssetStatusesFromUsageLogs = async (assets: Asset[], usageLogs: UsageLog[]): Promise<number> => {
  const now = new Date()
  const occupied = new Map<string, boolean>()

  usageLogs.forEach((log) => {
    if (!isUsageLogOccupyingAsset(log, now)) return
    occupied.set(log.chamberId, true)
  })

  const batch = writeBatch(db)
  let changedCount = 0

  assets.forEach((asset) => {
    if (asset.type !== 'chamber') return
    if (asset.status === 'maintenance') return

    const shouldBeInUse = occupied.get(asset.id) === true
    const targetStatus: Asset['status'] = shouldBeInUse ? 'in-use' : 'available'
    if (asset.status === targetStatus) return

    batch.update(doc(db, ASSETS_COLLECTION, asset.id), sanitizeDataForFirestore({ status: targetStatus, updatedAt: serverTimestamp() }))
    changedCount += 1
  })

  if (changedCount === 0) return 0
  await batch.commit()
  return changedCount
}
