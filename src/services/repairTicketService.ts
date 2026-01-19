import {
  DocumentData,
  DocumentSnapshot,
  Timestamp,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase-config'
import { Asset, RepairStatus, RepairTicket } from '../types'
import { sanitizeDataForFirestore } from './firestoreUtils'

const COLLECTION_NAME = 'repairTickets'
const ASSET_COLLECTION_NAME = 'assets'

const parseTimestampToIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined
  if (value instanceof Timestamp) return value.toDate().toISOString()
  const v = value as any
  if (v?.seconds) return new Timestamp(v.seconds, v.nanoseconds).toDate().toISOString()
  if (typeof value === 'string') return value
  return undefined
}

const docToRepairTicket = (docSnap: DocumentSnapshot<DocumentData>): RepairTicket => {
  const data = docSnap.data()
  if (!data) throw new Error(`Document data is undefined for repair ticket ID: ${docSnap.id}`)

  const createdAt = parseTimestampToIsoString(data.createdAt) ?? new Date().toISOString()
  const updatedAt = parseTimestampToIsoString(data.updatedAt)
  const quoteAt = parseTimestampToIsoString(data.quoteAt)
  const expectedReturnAt = parseTimestampToIsoString(data.expectedReturnAt)
  const completedAt = parseTimestampToIsoString(data.completedAt)

  return {
    id: docSnap.id,
    assetId: data.assetId as string,
    status: data.status as RepairStatus,
    problemDesc: (data.problemDesc as string) ?? '',
    vendorName: data.vendorName as string | undefined,
    quoteAmount: typeof data.quoteAmount === 'number' ? (data.quoteAmount as number) : undefined,
    quoteAt,
    expectedReturnAt,
    completedAt,
    createdAt,
    updatedAt,
    timeline: Array.isArray(data.timeline) ? (data.timeline as RepairTicket['timeline']) : undefined,
  }
}

export const getRepairTickets = async (filters?: {
  status?: RepairStatus
  assetId?: string
}): Promise<RepairTicket[]> => {
  const col = collection(db, COLLECTION_NAME)
  const whereClauses: any[] = []
  if (filters?.status) whereClauses.push(where('status', '==', filters.status))
  if (filters?.assetId) whereClauses.push(where('assetId', '==', filters.assetId))
  const q = whereClauses.length > 0 ? query(col, ...whereClauses) : query(col)
  const snapshot = await getDocs(q)
  const items = snapshot.docs.map((d) => docToRepairTicket(d))
  return items.sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt).getTime()
    const bTime = new Date(b.updatedAt ?? b.createdAt).getTime()
    return bTime - aTime
  })
}

export const getRepairTicketById = async (id: string): Promise<RepairTicket | null> => {
  const ref = doc(db, COLLECTION_NAME, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return docToRepairTicket(snap)
}

export const createRepairTicket = async (data: {
  assetId: string
  problemDesc: string
  expectedReturnAt?: string
}): Promise<string> => {
  const assetRef = doc(db, ASSET_COLLECTION_NAME, data.assetId)
  const assetSnap = await getDoc(assetRef)
  if (!assetSnap.exists()) throw new Error('设备不存在，无法创建维修工单。')

  const asset = assetSnap.data() as Asset
  if (asset.status === 'in-use') throw new Error('设备正在使用中，无法创建维修工单。')

  const existingSnapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('assetId', '==', data.assetId)))
  const hasOpen = existingSnapshot.docs.some((d) => {
    const status = (d.data() as any)?.status as RepairStatus | undefined
    return status && status !== 'completed'
  })
  if (hasOpen) throw new Error('该设备已有未完成维修工单。')

  const ticketRef = doc(collection(db, COLLECTION_NAME))
  const batch = writeBatch(db)

  let expectedReturnAtValue: Timestamp | undefined
  if (data.expectedReturnAt) {
    const d = new Date(data.expectedReturnAt)
    if (!isNaN(d.valueOf())) {
      expectedReturnAtValue = Timestamp.fromDate(d)
    }
  }
  const nowIso = new Date().toISOString()

  batch.set(
    ticketRef,
    sanitizeDataForFirestore({
      assetId: data.assetId,
      status: 'quote-pending' as RepairStatus,
      problemDesc: data.problemDesc,
      expectedReturnAt: expectedReturnAtValue,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      timeline: [{ at: nowIso, to: 'quote-pending' as RepairStatus }],
    })
  )

  batch.update(assetRef, sanitizeDataForFirestore({ status: 'maintenance', updatedAt: serverTimestamp() }))
  await batch.commit()
  return ticketRef.id
}

export const updateRepairTicket = async (
  id: string,
  changes: Partial<Pick<RepairTicket, 'problemDesc' | 'vendorName' | 'quoteAmount' | 'expectedReturnAt'>>
): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id)
  const toUpdate: Record<string, any> = { ...changes }
  if (Object.prototype.hasOwnProperty.call(toUpdate, 'expectedReturnAt')) {
    if (toUpdate.expectedReturnAt) {
      const d = new Date(toUpdate.expectedReturnAt)
      if (!isNaN(d.valueOf())) {
        toUpdate.expectedReturnAt = Timestamp.fromDate(d)
      } else {
        delete toUpdate.expectedReturnAt
      }
    } else {
      toUpdate.expectedReturnAt = null
    }
  }
  toUpdate.updatedAt = serverTimestamp()

  const finalUpdateData = sanitizeDataForFirestore(toUpdate)
  if (Object.keys(finalUpdateData).length === 0) return

  const batch = writeBatch(db)
  batch.update(ref, finalUpdateData)
  await batch.commit()
}

export const deleteRepairTicket = async (id: string): Promise<void> => {
  const ticket = await getRepairTicketById(id)
  if (!ticket) return

  const ticketRef = doc(db, COLLECTION_NAME, id)
  const assetRef = doc(db, ASSET_COLLECTION_NAME, ticket.assetId)

  const existingSnapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('assetId', '==', ticket.assetId)))
  const hasOtherOpen = existingSnapshot.docs.some((d) => {
    if (d.id === id) return false
    const status = (d.data() as any)?.status as RepairStatus | undefined
    return status && status !== 'completed'
  })

  const batch = writeBatch(db)
  batch.delete(ticketRef)
  batch.update(
    assetRef,
    sanitizeDataForFirestore({ status: hasOtherOpen ? 'maintenance' : 'available', updatedAt: serverTimestamp() })
  )
  await batch.commit()
}

export const transitionRepairTicketStatus = async (args: {
  id: string
  to: RepairStatus
  note?: string
  vendorName?: string
  quoteAmount?: number
}): Promise<void> => {
  const ticketRef = doc(db, COLLECTION_NAME, args.id)
  const ticketSnap = await getDoc(ticketRef)
  if (!ticketSnap.exists()) throw new Error('维修工单不存在。')
  const current = docToRepairTicket(ticketSnap)

  const nowIso = new Date().toISOString()
  const update: Record<string, any> = {
    status: args.to,
    updatedAt: serverTimestamp(),
    timeline: arrayUnion({
      at: nowIso,
      from: current.status,
      to: args.to,
      note: args.note,
    }),
  }

  if (args.to === 'repair-pending' && current.status === 'quote-pending') {
    update.quoteAt = serverTimestamp()
    if (args.vendorName !== undefined) update.vendorName = args.vendorName
    if (args.quoteAmount !== undefined) update.quoteAmount = args.quoteAmount
  }

  if (args.to === 'completed') {
    update.completedAt = serverTimestamp()
  }

  const assetRef = doc(db, ASSET_COLLECTION_NAME, current.assetId)
  let hasOtherOpen = false
  if (args.to === 'completed') {
    const existingSnapshot = await getDocs(
      query(collection(db, COLLECTION_NAME), where('assetId', '==', current.assetId))
    )
    hasOtherOpen = existingSnapshot.docs.some((d) => {
      if (d.id === args.id) return false
      const status = (d.data() as any)?.status as RepairStatus | undefined
      return status && status !== 'completed'
    })
  }
  const assetUpdate = sanitizeDataForFirestore({
    status: args.to === 'completed' ? (hasOtherOpen ? 'maintenance' : 'available') : 'maintenance',
    updatedAt: serverTimestamp(),
  })

  const batch = writeBatch(db)
  batch.update(ticketRef, sanitizeDataForFirestore(update))
  batch.update(assetRef, assetUpdate)
  await batch.commit()
}
