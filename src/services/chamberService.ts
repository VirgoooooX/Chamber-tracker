// src/services/chamberService.ts
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  Timestamp,
  DocumentSnapshot,
  DocumentData,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase-config';
import { Chamber } from '../types';
import { sanitizeDataForFirestore } from './firestoreUtils'

const COLLECTION_NAME = 'chambers';

// 修改后的 docToChamber 函数，为 manufacturer 和 model 提供回退值
const docToChamber = (docSnap: DocumentSnapshot<DocumentData>): Chamber => {
  const data = docSnap.data();
  if (!data) {
    throw new Error(`Document data is undefined for chamber ID: ${docSnap.id}`);
  }
  
  let createdAtString: string;
  // ... (createdAt 处理逻辑保持不变) ...
  if (data.createdAt instanceof Timestamp) {
    createdAtString = data.createdAt.toDate().toISOString();
  } else if (data.createdAt?.seconds) { 
    createdAtString = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate().toISOString();
  } else if (typeof data.createdAt === 'string') {
      createdAtString = data.createdAt;
  } else {
    console.warn(`Invalid or missing createdAt for chamber ID: ${docSnap.id}. Using current date as fallback.`);
    createdAtString = new Date().toISOString(); 
  }

  let calibrationDateString: string | undefined = undefined;
  // ... (calibrationDate 处理逻辑保持不变) ...
    if (data.calibrationDate instanceof Timestamp) {
        calibrationDateString = data.calibrationDate.toDate().toISOString();
    } else if (data.calibrationDate?.seconds) {
        calibrationDateString = new Timestamp(data.calibrationDate.seconds, data.calibrationDate.nanoseconds).toDate().toISOString();
    } else if (typeof data.calibrationDate === 'string') {
       calibrationDateString = data.calibrationDate; 
    }

  return {
    id: docSnap.id,
    name: data.name as string,
    description: data.description as string | undefined,
    status: data.status as Chamber['status'],
    // 使用 '||' 提供回退值，确保结果是 string 类型
    manufacturer: (data.manufacturer as string | undefined) || '未知制造商', 
    model: (data.model as string | undefined) || '未知型号',       
    calibrationDate: calibrationDateString,
    createdAt: createdAtString,
  };
};

// getAllChambers (保持不变)
export const getAllChambers = async (): Promise<Chamber[]> => {
  const chambersCol = collection(db, COLLECTION_NAME);
  const chamberSnapshot = await getDocs(chambersCol);
  return chamberSnapshot.docs.map(docToChamber);
};

// getChamberById (保持不变)
export const getChamberById = async (id: string): Promise<Chamber | null> => {
  const chamberDoc = doc(db, COLLECTION_NAME, id);
  const chamberSnapshot = await getDoc(chamberDoc);
  
  if (!chamberSnapshot.exists()) {
    return null;
  }
  return docToChamber(chamberSnapshot);
};

// createChamber (使用 serverTimestamp, 确保可选字段处理)
export const createChamber = async (chamberData: Omit<Chamber, 'id' | 'createdAt'>): Promise<string> => {
  const dataToSave: Record<string, any> = {
    name: chamberData.name, 
    status: chamberData.status || 'available', 
  };
  if (chamberData.description !== undefined) dataToSave.description = chamberData.description;
  // 如果 manufacturer/model 在表单中是必需的，这里可以直接赋值
  // 如果是可选的，则也需要检查 undefined
  dataToSave.manufacturer = chamberData.manufacturer || '未知制造商'; // 假设表单数据可能不含，但类型需要
  dataToSave.model = chamberData.model || '未知型号';         // 假设表单数据可能不含，但类型需要

  if (chamberData.calibrationDate) {
    try {
        dataToSave.calibrationDate = Timestamp.fromDate(new Date(chamberData.calibrationDate));
    } catch (e) { console.error("Invalid calibrationDate format", chamberData.calibrationDate); }
  } else if (chamberData.hasOwnProperty('calibrationDate')) {
      dataToSave.calibrationDate = null;
  }

  dataToSave.createdAt = serverTimestamp(); 

  const finalData = sanitizeDataForFirestore(dataToSave); // 清理以防万一
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), finalData);
  return docRef.id;
};


// updateChamber (移除 createdAt 更新, 清理 undefined)
export const updateChamber = async (id: string, chamberUpdateData: Partial<Chamber>): Promise<void> => {
  const chamberRef = doc(db, COLLECTION_NAME, id);
  
  const dataToUpdate: Record<string, any> = { ...chamberUpdateData }; 
  delete dataToUpdate.createdAt; // 明确禁止更新 createdAt

  if (dataToUpdate.hasOwnProperty('calibrationDate')) {
      if (dataToUpdate.calibrationDate) {
          try {
              dataToUpdate.calibrationDate = Timestamp.fromDate(new Date(dataToUpdate.calibrationDate));
          } catch (e) {
              console.error("Invalid calibrationDate format during update", dataToUpdate.calibrationDate);
              delete dataToUpdate.calibrationDate; 
          }
      } else {
          dataToUpdate.calibrationDate = null;
      }
  }
  
  const finalUpdateData = sanitizeDataForFirestore(dataToUpdate);

  if (Object.keys(finalUpdateData).length > 0) { 
      await updateDoc(chamberRef, finalUpdateData);
  }
};

// deleteChamber (保持不变)
export const deleteChamber = async (id: string): Promise<void> => {
  const chamberRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(chamberRef);
};
