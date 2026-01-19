import {
  DocumentData,
  DocumentSnapshot,
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase-config'
import type { Asset, Chamber } from '../types'
import { sanitizeDataForFirestore } from './firestoreUtils'

type MigrationStrategy = 'skip' | 'overwrite'

export interface MigrationPreview {
  chambersCount: number
  assetsChamberCount: number
  wouldCreateCount: number
  conflictCount: number
}

export interface MigrationResult {
  total: number
  createdOrUpdated: number
  skipped: number
  failed: number
  failures: Array<{ id: string; message: string }>
}

const parseTimestampToIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined
  if (value instanceof Timestamp) return value.toDate().toISOString()
  const v = value as any
  if (v?.seconds) return new Timestamp(v.seconds, v.nanoseconds).toDate().toISOString()
  if (typeof value === 'string') return value
  return undefined
}

const docToChamber = (docSnap: DocumentSnapshot<DocumentData>): Chamber => {
  const data = docSnap.data()
  if (!data) {
    throw new Error(`Document data is undefined for chamber ID: ${docSnap.id}`)
  }

  const createdAt = parseTimestampToIsoString(data.createdAt) ?? new Date().toISOString()
  const calibrationDate = parseTimestampToIsoString(data.calibrationDate)

  return {
    id: docSnap.id,
    name: data.name as string,
    description: data.description as string | undefined,
    status: data.status as Chamber['status'],
    manufacturer: (data.manufacturer as string | undefined) || '未知制造商',
    model: (data.model as string | undefined) || '未知型号',
    calibrationDate,
    createdAt,
  }
}

export const mapChamberToAsset = (chamber: Chamber): Omit<Asset, 'updatedAt'> => {
  return {
    id: chamber.id,
    type: 'chamber',
    name: chamber.name,
    description: chamber.description,
    status: chamber.status,
    manufacturer: chamber.manufacturer,
    model: chamber.model,
    calibrationDate: chamber.calibrationDate,
    createdAt: chamber.createdAt,
  }
}

export const previewChambersToAssetsMigration = async (): Promise<MigrationPreview> => {
  const chambersSnapshot = await getDocs(collection(db, 'chambers'))
  const chambers = chambersSnapshot.docs.map((d) => docToChamber(d))

  const assetsSnapshot = await getDocs(query(collection(db, 'assets'), limit(5000)))
  const assetsById = new Set(assetsSnapshot.docs.map((d) => d.id))

  const chambersCount = chambers.length
  const assetsChamberCount = assetsSnapshot.docs.reduce((count, d) => {
    const data = d.data()
    return data?.type === 'chamber' ? count + 1 : count
  }, 0)

  let conflictCount = 0
  let wouldCreateCount = 0
  chambers.forEach((c) => {
    if (assetsById.has(c.id)) conflictCount++
    else wouldCreateCount++
  })

  return { chambersCount, assetsChamberCount, wouldCreateCount, conflictCount }
}

export const migrateChambersToAssets = async (params: { strategy: MigrationStrategy }): Promise<MigrationResult> => {
  const { strategy } = params
  const chambersSnapshot = await getDocs(collection(db, 'chambers'))
  const chambers = chambersSnapshot.docs.map((d) => docToChamber(d))

  const assetsSnapshot = await getDocs(query(collection(db, 'assets'), limit(5000)))
  const assetsById = new Set(assetsSnapshot.docs.map((d) => d.id))

  const failures: Array<{ id: string; message: string }> = []
  let createdOrUpdated = 0
  let skipped = 0

  const batchSize = 450
  for (let i = 0; i < chambers.length; i += batchSize) {
    const slice = chambers.slice(i, i + batchSize)
    const batch = writeBatch(db)

    slice.forEach((chamber) => {
      const targetRef = doc(db, 'assets', chamber.id)
      const exists = assetsById.has(chamber.id)
      if (exists && strategy === 'skip') {
        skipped++
        return
      }

      const asset = mapChamberToAsset(chamber)
      const data: Record<string, any> = {
        type: asset.type,
        name: asset.name,
        status: asset.status,
        description: asset.description,
        manufacturer: asset.manufacturer,
        model: asset.model,
        createdAt: Timestamp.fromDate(new Date(asset.createdAt)),
        updatedAt: Timestamp.now(),
      }

      if (asset.calibrationDate) {
        const d = new Date(asset.calibrationDate)
        if (!isNaN(d.valueOf())) data.calibrationDate = Timestamp.fromDate(d)
      }

      const finalData = sanitizeDataForFirestore(data)
      batch.set(targetRef, finalData, { merge: strategy !== 'overwrite' })
      createdOrUpdated++
    })

    try {
      await batch.commit()
    } catch (e: any) {
      slice.forEach((c) => failures.push({ id: c.id, message: e?.message || 'batch commit failed' }))
    }
  }

  return {
    total: chambers.length,
    createdOrUpdated,
    skipped,
    failed: failures.length,
    failures,
  }
}
