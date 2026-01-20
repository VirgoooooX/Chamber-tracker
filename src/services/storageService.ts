import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase-config";

/**
 * 上传文件到 Firebase Storage
 * @param file 要上传的 File 对象
 * @param path 存储路径 (例如: 'assets/images/my-image.jpg')
 * @returns 下载 URL
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error("No file provided");
  
  const storageRef = ref(storage, path);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * 从 Firebase Storage 删除文件
 * @param path 文件路径 (例如: 'assets/images/my-image.jpg') or downloadURL
 */
export const deleteFile = async (pathOrUrl: string): Promise<void> => {
    if (!pathOrUrl) return;

    let storageRef;
    
    // 简单的判断是否是 URL
    if (pathOrUrl.startsWith('http')) {
       storageRef = ref(storage, pathOrUrl);
    } else {
       storageRef = ref(storage, pathOrUrl);
    }

    try {
        await deleteObject(storageRef);
    } catch (error) {
        console.error("Error deleting file:", error);
        throw error;
    }
}
