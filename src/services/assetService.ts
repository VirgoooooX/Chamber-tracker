import {
  DocumentData,
  DocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase-config'
import { Asset, AssetAttachment, AssetType } from '../types'
import { sanitizeDataForFirestore } from './firestoreUtils'

const COLLECTION_NAME = 'assets'

const parseTimestampToIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined
  if (value instanceof Timestamp) return value.toDate().toISOString()
  const v = value as any
  if (v?.seconds) return new Timestamp(v.seconds, v.nanoseconds).toDate().toISOString()
  if (typeof value === 'string') return value
  return undefined
}

const docToAsset = (docSnap: DocumentSnapshot<DocumentData>): Asset => {
  const data = docSnap.data()
  if (!data) {
    throw new Error(`Document data is undefined for asset ID: ${docSnap.id}`)
  }

  const createdAt = parseTimestampToIsoString(data.createdAt) ?? new Date().toISOString()
  const updatedAt = parseTimestampToIsoString(data.updatedAt)
  const calibrationDate = parseTimestampToIsoString(data.calibrationDate)

  return {
    id: docSnap.id,
    type: data.type as AssetType,
    name: data.name as string,
    status: data.status as Asset['status'],
    category: data.category as string | undefined,
    assetCode: data.assetCode as string | undefined,
    description: data.description as string | undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    location: data.location as string | undefined,
    serialNumber: data.serialNumber as string | undefined,
    manufacturer: data.manufacturer as string | undefined,
    model: data.model as string | undefined,
    owner: data.owner as string | undefined,
    photoUrls: Array.isArray(data.photoUrls) ? (data.photoUrls as string[]) : undefined,
    nameplateUrls: Array.isArray(data.nameplateUrls) ? (data.nameplateUrls as string[]) : undefined,
    attachments: Array.isArray(data.attachments)
      ? (data.attachments as any[]).map(
          (a): AssetAttachment => ({
            id: String(a?.id ?? ''),
            name: String(a?.name ?? ''),
            url: String(a?.url ?? ''),
            path: String(a?.path ?? ''),
            contentType: a?.contentType ? String(a.contentType) : undefined,
            size: typeof a?.size === 'number' ? a.size : undefined,
            uploadedAt: String(a?.uploadedAt ?? ''),
          })
        )
      : undefined,
    calibrationDate,
    createdAt,
    updatedAt,
  }
}

export const getAssetsByType = async (type: AssetType): Promise<Asset[]> => {
  const assetsCol = collection(db, COLLECTION_NAME)
  const q = query(assetsCol, where('type', '==', type))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => docToAsset(d))
}

export const getAssetById = async (id: string): Promise<Asset | null> => {
  const assetDoc = doc(db, COLLECTION_NAME, id)
  const assetSnapshot = await getDoc(assetDoc)
  if (!assetSnapshot.exists()) return null
  return docToAsset(assetSnapshot)
}

export const createAsset = async (
  assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const dataToSave: Record<string, any> = {
    type: assetData.type,
    name: assetData.name,
    status: assetData.status,
  }

  if (assetData.description !== undefined) dataToSave.description = assetData.description
  if (assetData.tags !== undefined) dataToSave.tags = assetData.tags
  if (assetData.location !== undefined) dataToSave.location = assetData.location
  if (assetData.serialNumber !== undefined) dataToSave.serialNumber = assetData.serialNumber
  if (assetData.manufacturer !== undefined) dataToSave.manufacturer = assetData.manufacturer
  if (assetData.model !== undefined) dataToSave.model = assetData.model
  if (assetData.owner !== undefined) dataToSave.owner = assetData.owner
  if (assetData.assetCode !== undefined) dataToSave.assetCode = assetData.assetCode
  if (assetData.category !== undefined) dataToSave.category = assetData.category
  if (assetData.photoUrls !== undefined) dataToSave.photoUrls = assetData.photoUrls
  if (assetData.nameplateUrls !== undefined) dataToSave.nameplateUrls = assetData.nameplateUrls
  if (assetData.attachments !== undefined) dataToSave.attachments = assetData.attachments

  if (assetData.calibrationDate) {
    const d = new Date(assetData.calibrationDate)
    if (!isNaN(d.valueOf())) {
      dataToSave.calibrationDate = Timestamp.fromDate(d)
    }
  } else if (Object.prototype.hasOwnProperty.call(assetData, 'calibrationDate')) {
    dataToSave.calibrationDate = null
  }

  dataToSave.createdAt = serverTimestamp()
  dataToSave.updatedAt = serverTimestamp()

  const finalData = sanitizeDataForFirestore(dataToSave)
  const docRef = await addDoc(collection(db, COLLECTION_NAME), finalData)
  return docRef.id
}

export const updateAsset = async (
  id: string,
  assetUpdateData: Partial<Omit<Asset, 'id' | 'type' | 'createdAt'>>
): Promise<void> => {
  const assetRef = doc(db, COLLECTION_NAME, id)
  const dataToUpdate: Record<string, any> = { ...assetUpdateData }

  if (Object.prototype.hasOwnProperty.call(dataToUpdate, 'calibrationDate')) {
    if (dataToUpdate.calibrationDate) {
      const d = new Date(dataToUpdate.calibrationDate)
      if (!isNaN(d.valueOf())) {
        dataToUpdate.calibrationDate = Timestamp.fromDate(d)
      } else {
        delete dataToUpdate.calibrationDate
      }
    } else {
      dataToUpdate.calibrationDate = null
    }
  }

  dataToUpdate.updatedAt = serverTimestamp()

  const finalUpdateData = sanitizeDataForFirestore(dataToUpdate)
  if (Object.keys(finalUpdateData).length === 0) return
  await updateDoc(assetRef, finalUpdateData)
}

export const deleteAsset = async (id: string): Promise<void> => {
  const assetRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(assetRef)
}
