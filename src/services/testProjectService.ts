// src/services/testProjectService.ts
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
    serverTimestamp,
  } from 'firebase/firestore';
  import { db } from '../firebase-config';
  import { TestProject } from '../types';
  
  const COLLECTION_NAME = 'testProjects';
  
  const mapDocToTestProject = (docSnap: DocumentSnapshot<DocumentData>): TestProject => {
    const data = docSnap.data();
    if (!data) {
      throw new Error("Document data is undefined!");
    }
    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : (data.createdAt ? String(data.createdAt) : new Date().toISOString());
  
    return {
      id: docSnap.id,
      name: data.name as string,
      temperature: data.temperature as number,
      humidity: data.humidity as number,
      duration: data.duration as number,
      projectId: data.projectId as string | undefined,
      createdAt: createdAt,
    };
  };
  
  // 修改后的 prepareDataForFirestore
  const prepareDataForFirestore = (data: Partial<Omit<TestProject, 'id' | 'createdAt'>>) => {
    const firestoreData: { [key: string]: any } = {};
  
    if (data.name !== undefined) firestoreData.name = data.name;
    if (data.temperature !== undefined) firestoreData.temperature = data.temperature;
    if (data.humidity !== undefined) firestoreData.humidity = data.humidity;
    if (data.duration !== undefined) firestoreData.duration = data.duration;
    
    // 关键修改：只有当 projectId 不是 undefined 时才将其添加到 firestoreData
    // 如果 projectId 是空字符串 "" 或 null，它仍然会被添加（Firestore 接受这些值）
    // 但如果它是 undefined（通常表示“未设置”或“可选且未提供”），则应省略该字段
    if (data.projectId !== undefined) { 
      firestoreData.projectId = data.projectId;
    }
    // 注意：之前的 data.hasOwnProperty('projectId') 在 data.projectId 为 undefined 时也会为 true，
    // 导致 firestoreData.projectId = undefined; 这就是错误的来源。
  
    return firestoreData;
  };
  
  export const getAllTestProjects = async (): Promise<TestProject[]> => {
    const projectsCol = collection(db, COLLECTION_NAME);
    const q = query(projectsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDocToTestProject);
  };
  
  export const getTestProjectById = async (id: string): Promise<TestProject | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
  
    if (!docSnap.exists()) {
      return null;
    }
    return mapDocToTestProject(docSnap);
  };
  
  export const createTestProject = async (testProjectData: Omit<TestProject, 'id' | 'createdAt'>): Promise<string> => {
    const dataToSave = prepareDataForFirestore(testProjectData);
    dataToSave.createdAt = serverTimestamp(); 
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);
    return docRef.id;
  };
  
  export const updateTestProject = async (id: string, testProjectUpdateData: Partial<Omit<TestProject, 'id' | 'createdAt'>>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const dataToUpdate = prepareDataForFirestore(testProjectUpdateData);
    delete dataToUpdate.createdAt; 
  
    await updateDoc(docRef, dataToUpdate);
  };
  
  export const deleteTestProject = async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  };

