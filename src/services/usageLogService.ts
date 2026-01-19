// src/services/usageLogService.ts
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  deleteDoc,
  where,
  Timestamp,
  serverTimestamp, // 确保导入 serverTimestamp
  query,
  and,
  or,
  limit,
  DocumentData,
  writeBatch, // 导入 writeBatch
  getDoc,    // 导入 getDoc 用于读取 chamber 和 usageLog 状态
  Firestore, // 导入 Firestore 类型以便在辅助函数中传递 db
} from 'firebase/firestore';
import { db } from '../firebase-config'; // 导入 db 实例
import { UsageLog, Asset } from '../types'

// 假设您已经创建了这个文件和函数
// 如果没有，您需要先创建 src/utils/statusHelpers.ts
import { isUsageLogOccupyingAsset } from '../utils/statusHelpers';
import { sanitizeDataForFirestore } from './firestoreUtils'

const USAGE_LOGS_COLLECTION = 'usageLogs';
const ASSETS_COLLECTION = 'assets'

// 辅助函数：mapDocToUsageLog (增加了对新字段的读取)
const mapDocToUsageLog = (docSnapshotData: DocumentData | undefined, id: string): UsageLog => {
  const data = docSnapshotData;
  if (!data) {
    throw new Error(`Document data is undefined for usage log ID: ${id}`);
  }

  let endTimeString: string | undefined = undefined;
  if (data.endTime) {
    endTimeString = data.endTime instanceof Timestamp
      ? data.endTime.toDate().toISOString()
      : String(data.endTime);
  }

  let createdAtString: string;
  if (data.createdAt instanceof Timestamp) {
    createdAtString = data.createdAt.toDate().toISOString();
  } else if (data.createdAt?.seconds) {
    createdAtString = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate().toISOString();
  } else if (typeof data.createdAt === 'string') {
      createdAtString = data.createdAt;
  } else {
    console.warn(`Invalid or missing createdAt for usage log ID: ${id}. Using current date as fallback.`);
    createdAtString = new Date().toISOString();
  }

  return {
    id,
    chamberId: data.chamberId as string,
    user: data.user as string,
    startTime: data.startTime instanceof Timestamp ? data.startTime.toDate().toISOString() : String(data.startTime),
    endTime: endTimeString, // 已经是可选的
    status: data.status as UsageLog['status'],
    notes: data.notes as string | undefined,
    projectId: data.projectId as string | undefined,
    testProjectId: data.testProjectId as string | undefined,
    createdAt: createdAtString,
    selectedConfigIds: Array.isArray(data.selectedConfigIds) ? data.selectedConfigIds as string[] : [],
    selectedWaterfall: data.selectedWaterfall as string | undefined,
  };
};

// 修改后的 prepareUsageLogDataForFirestore
const prepareUsageLogDataForFirestore = (data: Partial<Omit<UsageLog, 'id' | 'createdAt'>>) => {
  const firestoreReadyData: Record<string, any> = {};

  if (data.chamberId !== undefined) firestoreReadyData.chamberId = data.chamberId;
  if (data.user !== undefined) firestoreReadyData.user = data.user;
  if (data.status !== undefined) firestoreReadyData.status = data.status;
  if (data.notes !== undefined) firestoreReadyData.notes = data.notes;
  if (data.projectId !== undefined) firestoreReadyData.projectId = data.projectId;
  if (data.testProjectId !== undefined) firestoreReadyData.testProjectId = data.testProjectId;

  if (data.selectedConfigIds !== undefined) {
    firestoreReadyData.selectedConfigIds = Array.isArray(data.selectedConfigIds) ? data.selectedConfigIds : [];
  }
  if (data.selectedWaterfall !== undefined) {
    firestoreReadyData.selectedWaterfall = data.selectedWaterfall;
  }

  if (data.startTime) {
    try {
      const startDate = new Date(data.startTime);
      if (isNaN(startDate.valueOf())) throw new Error('Invalid start date string');
      firestoreReadyData.startTime = Timestamp.fromDate(startDate);
    }
    catch (e: any) { console.error("Invalid startTime format for Firestore:", data.startTime, e.message); }
  }
  if (Object.prototype.hasOwnProperty.call(data, 'endTime')) {
    if (!data.endTime) {
      firestoreReadyData.endTime = null
    } else {
    try {
      const endDate = new Date(data.endTime);
      if (isNaN(endDate.valueOf())) throw new Error('Invalid end date string');
      firestoreReadyData.endTime = Timestamp.fromDate(endDate);
    }
    catch (e: any) { console.error("Invalid endTime format for Firestore:", data.endTime, e.message); }
    }
  }

  return sanitizeDataForFirestore(firestoreReadyData);
};


// --- 核心辅助函数：checkAndAddChamberUpdateToBatch (修改后) ---
const checkAndAddChamberUpdateToBatch = async (
  batch: ReturnType<typeof writeBatch>,
  chamberId: string,
  dbInstance: Firestore,
  options?: { excludeLogId?: string }
): Promise<void> => {
  const chamberRef = doc(dbInstance, ASSETS_COLLECTION, chamberId)

  try {
    const chamberSnap = await getDoc(chamberRef);
    if (!chamberSnap.exists()) {
      console.warn(`[Service] Chamber ${chamberId} not found. Cannot update status.`);
      return;
    }
    const chamberData = chamberSnap.data()
    const chamberType = chamberData.type as Asset['type'] | undefined
    if (chamberType && chamberType !== 'chamber') {
      return
    }
    const currentChamberStatus = chamberData.status as Asset['status']

    if (currentChamberStatus === 'maintenance') {
      return;
    }

    let isChamberInUse = false;
    const now = new Date();

    try {
      const activeLogsQuery = query(
        collection(dbInstance, USAGE_LOGS_COLLECTION),
        and(where('chamberId', '==', chamberId), where('status', 'in', ['in-progress', 'not-started'])),
        limit(options?.excludeLogId ? 20 : 10)
      )
      const activeLogsSnapshot = await getDocs(activeLogsQuery)
      if (!activeLogsSnapshot.empty) {
        isChamberInUse = activeLogsSnapshot.docs.some((logDoc) => {
          if (options?.excludeLogId && logDoc.id === options.excludeLogId) return false
          const usageLog = mapDocToUsageLog(logDoc.data(), logDoc.id)
          return isUsageLogOccupyingAsset(usageLog, now)
        })
      }
    } catch (fastQueryError) {
      const usageLogsQuery = query(
        collection(dbInstance, USAGE_LOGS_COLLECTION),
        where('chamberId', '==', chamberId)
      );
      const usageLogsSnapshot = await getDocs(usageLogsQuery);

      if (!usageLogsSnapshot.empty) {
          usageLogsSnapshot.forEach((logDoc) => {
            if (options?.excludeLogId && logDoc.id === options.excludeLogId) {
              return;
            }
            const usageLog = mapDocToUsageLog(logDoc.data(), logDoc.id);
            if (isUsageLogOccupyingAsset(usageLog, now)) {
              isChamberInUse = true;
            }
          });
      }
      console.warn(`[Service] Falling back to full scan for chamber status due to query error:`, fastQueryError);
    }


    const targetStatus: Asset['status'] = isChamberInUse ? 'in-use' : 'available'

    if (currentChamberStatus !== targetStatus) {
      batch.update(chamberRef, { status: targetStatus });
    }
  } catch (error) {
    console.error(`[Service] Error checking/updating status for chamber ${chamberId}:`, error);
    // 决定是否向上抛出错误
    // throw error; // 如果希望调用者处理此错误
  }
};

// --- CRUD 操作 ---

export const getAllUsageLogs = async (): Promise<UsageLog[]> => {
  try {
    const q = query(collection(db, USAGE_LOGS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return [];
    }
    const results = querySnapshot.docs.map(doc => mapDocToUsageLog(doc.data(), doc.id));
    return results;
  } catch (error) {
    console.error('[Service] getAllUsageLogs: Error during Firestore operation or mapping:', error);
    throw error;
  }
};

export const getUsageLogsByChamber = async (chamberId: string): Promise<UsageLog[]> => {
  const q = query(collection(db, USAGE_LOGS_COLLECTION), where('chamberId', '==', chamberId), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => mapDocToUsageLog(doc.data(), doc.id));
};

export const getUsageLogById = async (id: string): Promise<UsageLog | null> => {
  if (!id) return null;
  const logRef = doc(db, USAGE_LOGS_COLLECTION, id);
  try {
    const logSnap = await getDoc(logRef);
    if (logSnap.exists()) {
      return mapDocToUsageLog(logSnap.data(), logSnap.id);
    } else {
      console.warn(`[Service] getUsageLogById: Log with ID ${id} not found.`);
      return null;
    }
  } catch (error) {
    console.error(`[Service] getUsageLogById: Error fetching log ${id}:`, error);
    throw error;
  }
};

export const createUsageLog = async (logData: Omit<UsageLog, 'id' | 'createdAt'>): Promise<string> => {
  const batch = writeBatch(db);
  const newLogRef = doc(collection(db, USAGE_LOGS_COLLECTION));

  const dataToSave = prepareUsageLogDataForFirestore(logData);
  dataToSave.createdAt = serverTimestamp();

  batch.set(newLogRef, dataToSave);

  // 使用 isUsageLogOccupyingAsset 检查传入的 logData 是否应触发 'in-use'
  // 注意：logData.startTime 是 string，需要转换为 Date 对象
  let tempLogForCheck: UsageLog | null = null;
  try {
    tempLogForCheck = {
        ...logData,
        id: newLogRef.id, // dummy id
        startTime: logData.startTime, // string
        endTime: logData.endTime, // string or undefined
        createdAt: new Date().toISOString(), // dummy
        status: logData.status, // use status from form
    } as UsageLog; // Cast for the helper
  } catch(e){
    console.error("Error preparing temp log for status check in createUsageLog", e)
  }


  if (tempLogForCheck && isUsageLogOccupyingAsset(tempLogForCheck, new Date()) && logData.chamberId) {
    // 注意：这里的 checkAndAddChamberUpdateToBatch 不需要 excludeLogId，因为记录尚未提交
    await checkAndAddChamberUpdateToBatch(batch, logData.chamberId, db);
  } else if (logData.chamberId) {
    // 即使不是立即 in-progress，也可能需要更新（例如从 in-use 变为 available）
    await checkAndAddChamberUpdateToBatch(batch, logData.chamberId, db);
  }


  try {
    await batch.commit();
    return newLogRef.id;
  } catch (error) {
    console.error("[Service] createUsageLog: Batch commit failed:", error);
    throw error;
  }
};

export const updateUsageLog = async (id: string, logData: Partial<Omit<UsageLog, 'id' | 'createdAt'>>): Promise<void> => {
  const logRef = doc(db, USAGE_LOGS_COLLECTION, id);
  const dataToUpdate = prepareUsageLogDataForFirestore(logData);

  // 如果状态被更新为 'completed'
  if (logData.status === 'completed') {
    let shouldSetEndTimeToNow = false;
    if (!dataToUpdate.endTime) { // 没有提供 endTime
        shouldSetEndTimeToNow = true;
    } else {
        // dataToUpdate.endTime 是 Timestamp，需要转换回 Date 来比较
        const providedEndTime = dataToUpdate.endTime.toDate();
        if (providedEndTime > new Date()) { // 提供的 endTime 在未来
            shouldSetEndTimeToNow = true;
        }
    }
    if (shouldSetEndTimeToNow) {
        dataToUpdate.endTime = Timestamp.fromDate(new Date());
    }
  }

  delete dataToUpdate.createdAt;

  let chamberId = dataToUpdate.chamberId || logData.chamberId;
  if (!chamberId) {
      try {
          const logSnap = await getDoc(logRef);
          if (logSnap.exists()) {
            const originalLog = mapDocToUsageLog(logSnap.data(), id);
            chamberId = originalLog.chamberId;
          }
      } catch(e) { console.error("Failed to get original chamberId for status update", e); }
  }

  if (!chamberId) {
      console.warn(`[Service] updateUsageLog: Cannot determine chamberId for log ${id}. Only updating the log if fields changed.`);
      if (Object.keys(dataToUpdate).length > 0) {
         await updateDoc(logRef, dataToUpdate);
      }
      return;
  }

  const batch = writeBatch(db);
  if (Object.keys(dataToUpdate).length > 0) {
    batch.update(logRef, dataToUpdate);
  }


  // 对于状态更新，特别是变为 'completed'，我们希望在计算环境箱状态时 *不* 排除当前日志，
  // 因为它的新状态（例如 'completed'）应该立即影响环境箱状态的判断。
  // 如果是其他类型的更新（例如改备注），则可以排除。
  // 一个简单的策略是，如果 status 字段正在被更新，则不排除。
  const excludeCurrentLogForChamberCheck = !(logData.hasOwnProperty('status'));


  await checkAndAddChamberUpdateToBatch(batch, chamberId, db, {
    excludeLogId: excludeCurrentLogForChamberCheck ? id : undefined
  });

  try {
    await batch.commit();
  } catch (error) {
    console.error("[Service] updateUsageLog: Batch commit failed for log:", id, error);
    throw error;
  }
};

export const removeConfigFromUsageLog = async (logId: string, configId: string): Promise<void> => {
  const logRef = doc(db, USAGE_LOGS_COLLECTION, logId);
  const batch = writeBatch(db);

  try {
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) {
      throw new Error(`Usage log with ID ${logId} not found.`);
    }

    const logData = mapDocToUsageLog(logSnap.data(), logSnap.id);
    const chamberId = logData.chamberId;
    const selectedConfigIds = logData.selectedConfigIds || [];

    const updatedConfigIds = selectedConfigIds.filter(id => id !== configId);

    if (updatedConfigIds.length === 0) {
      batch.delete(logRef);
    } else {
      batch.update(logRef, { selectedConfigIds: updatedConfigIds });
    }

    // 检查并更新环境箱状态，排除当前正在操作的日志（因为它将被删除或更新）
    await checkAndAddChamberUpdateToBatch(batch, chamberId, db, { excludeLogId: logId });

    await batch.commit();
  } catch (error) { 
    console.error(`[Service] Error in removeConfigFromUsageLog for logId=${logId}:`, error);
    throw error;
  }
};

export const deleteUsageLog = async (id: string): Promise<void> => {
  const logRef = doc(db, USAGE_LOGS_COLLECTION, id);

  let chamberId: string | null = null;
  try {
      const logSnap = await getDoc(logRef);
      if (logSnap.exists()) {
          chamberId = logSnap.data().chamberId as string;
      } else {
          console.warn(`[Service] deleteUsageLog: Log ${id} not found.`);
          // 如果记录不存在，直接返回，无需进一步操作
          return;
      }
  } catch(error) {
      console.error(`[Service] deleteUsageLog: Failed to get log ${id} before delete:`, error);
      throw error; // 抛出错误，让调用者处理
  }

  // 如果 chamberId 未能确定 (理论上如果 logSnap.exists() 则 chamberId 会有值)
  if (!chamberId) {
      console.error(`[Service] deleteUsageLog: Could not determine chamberId for log ${id}. Deleting log only (if it exists).`);
      // 记录已在上面检查过存在性，如果到这里 chamberId 还是 null，说明 logSnap.data().chamberId 就是 null/undefined
      // 这种情况下，只删除日志记录本身
      await deleteDoc(logRef);
      return;
  }

  const batch = writeBatch(db);
  batch.delete(logRef);

  // 在删除日志后，重新计算环境箱状态，此时需要排除正在被删除的这条日志
  await checkAndAddChamberUpdateToBatch(batch, chamberId, db, { excludeLogId: id });

  try {
    await batch.commit();
  } catch (error) {
    console.error("[Service] deleteUsageLog: Batch commit failed for deleting log:", id, error);
    throw error;
  }
};
