// src/services/projectService.ts
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  Timestamp,
  DocumentSnapshot,
  DocumentData,
  serverTimestamp, // 确保导入 serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase-config';
import { Project, Config } from '../types'; // 确保 Project 和 Config 类型已正确定义
import { sanitizeDataForFirestore } from './firestoreUtils'

const COLLECTION_NAME = 'projects';

// 辅助函数：将 Firestore 文档数据转换为 Project 对象
const mapDocToProject = (docSnap: DocumentSnapshot<DocumentData>): Project => {
  const data = docSnap.data();
  if (!data) {
    // 在抛出错误时提供更多上下文信息，比如文档ID
    throw new Error(`Document data is undefined for project ID: ${docSnap.id}`);
  }

  // 确保 createdAt 字段存在且为 Timestamp 类型，或能安全转换为字符串
  let createdAtString: string;
  if (data.createdAt instanceof Timestamp) {
    createdAtString = data.createdAt.toDate().toISOString();
  } else if (data.createdAt && typeof data.createdAt === 'string') {
    // 如果已经是字符串（可能来自旧数据或其他来源），直接使用，但最好验证其格式
    createdAtString = data.createdAt;
  } else if (data.createdAt && typeof data.createdAt.seconds === 'number' && typeof data.createdAt.nanoseconds === 'number') {
    // 处理可能是序列化后的 Timestamp 对象（非 instanceof Timestamp 的情况）
    createdAtString = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate().toISOString();
  }
  else {
    // 如果 createdAt 缺失或类型不正确，提供一个备用值或抛出更具体的错误
    console.warn(`Invalid or missing createdAt for project ID: ${docSnap.id}. Using current date as fallback.`);
    createdAtString = new Date().toISOString(); 
  }

  return {
    id: docSnap.id,
    name: data.name as string, // 假设 name 总是存在的
    description: data.description as string | undefined,
    configs: (data.configs || []) as Config[], // 确保 configs 是数组，即使 Firestore 中没有该字段
    wfs: (data.wfs || []) as string[] | undefined, // 确保 wfs 是数组或 undefined
    createdAt: createdAtString,
    customerName: data.customerName as string | undefined,
  };
};

export const getAllProjects = async (): Promise<Project[]> => {
  const projectsCol = collection(db, COLLECTION_NAME);
  const q = query(projectsCol, orderBy('createdAt', 'desc'));
  const projectSnapshot = await getDocs(q);
  return projectSnapshot.docs.map(mapDocToProject);
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  const projectDocRef = doc(db, COLLECTION_NAME, id);
  const projectSnapshot = await getDoc(projectDocRef);
  
  if (!projectSnapshot.exists()) {
    return null;
  }
  return mapDocToProject(projectSnapshot);
};

// 在 projectService.ts 的 createProject 函数内部
export const createProject = async (projectData: Omit<Project, 'id' | 'createdAt'>): Promise<string> => {
  const dataToSubmit: Record<string, any> = {
    name: projectData.name,
    configs: projectData.configs || [],
    wfs: projectData.wfs || [],
    createdAt: serverTimestamp(),
  };

  if (projectData.description !== undefined) {
    dataToSubmit.description = projectData.description;
  }
  if (projectData.customerName !== undefined) {
    dataToSubmit.customerName = projectData.customerName;
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSubmit);
    return docRef.id;
  } catch (error) {
    console.error("[Service] createProject: Error calling addDoc:", error); // 打印 addDoc 的直接错误
    throw error; // 重新抛出，让 Thunk 捕获
  }
};

// updateProject 函数接收部分更新数据，不应包含 id 或 createdAt
export const updateProject = async (id: string, projectUpdateData: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> => {
  const projectRef = doc(db, COLLECTION_NAME, id);
  
  // 清理掉 undefined 的字段，因为 Firestore 不接受它们
  const dataToUpdate = sanitizeDataForFirestore(projectUpdateData);

  // 确保 createdAt 字段不会被意外更新
  delete dataToUpdate.createdAt; 

  // 如果 configs 或 wfs 在 projectUpdateData 中被设为 undefined，
  // sanitizeDataForFirestore 会移除它们，这意味着这些字段在 Firestore 中不会被修改。
  // 如果要清空数组，应该传递一个空数组 [] 作为这些字段的值。
  if (projectUpdateData.hasOwnProperty('configs') && projectUpdateData.configs === undefined) {
    // 如果希望将 undefined 视为空数组（或保留原样），则需要调整逻辑
    // dataToUpdate.configs = []; // 例如，如果 undefined 意味着清空
    // 或者，如果 sanitizeDataForFirestore 移除了它，则该字段不会被更新。这是当前行为。
  }
  if (projectUpdateData.hasOwnProperty('wfs') && projectUpdateData.wfs === undefined) {
    // dataToUpdate.wfs = [];
  }


  await updateDoc(projectRef, dataToUpdate);
};

export const deleteProject = async (id: string): Promise<void> => {
  const projectRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(projectRef);
};
