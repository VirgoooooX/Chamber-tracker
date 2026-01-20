import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase-config";

const r2WorkerUrl = (import.meta as any).env?.VITE_R2_WORKER_URL as string | undefined
const r2Bucket = (import.meta as any).env?.VITE_R2_BUCKET as string | undefined

const getWorkerBase = () => {
  if (!r2WorkerUrl) return undefined
  return r2WorkerUrl.endsWith('/') ? r2WorkerUrl.slice(0, -1) : r2WorkerUrl
}

const normalizePathFromUrl = (value: string) => {
  try {
    const url = new URL(value)
    const queryPath = url.searchParams.get('path')
    if (queryPath) return queryPath
    let path = url.pathname.replace(/^\/+/, '')
    if (r2Bucket && path.startsWith(`${r2Bucket}/`)) {
      path = path.slice(r2Bucket.length + 1)
    }
    return path
  } catch {
    return value
  }
}

/**
 * 上传文件到 Firebase Storage
 * @param file 要上传的 File 对象
 * @param path 存储路径 (例如: 'assets/images/my-image.jpg')
 * @returns 下载 URL
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error("No file provided");

  const base = getWorkerBase()
  if (base) {
    const res = await fetch(`${base}/upload?path=${encodeURIComponent(path)}`, {
      method: 'POST',
      headers: {
        'content-type': file.type || 'application/octet-stream',
      },
      body: await file.arrayBuffer(),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || 'Upload failed')
    }
    const data = await res.json().catch(() => null)
    if (!data?.url) throw new Error('Upload succeeded but missing url')
    return data.url
  }

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

    const base = getWorkerBase()
    if (base) {
      const path = pathOrUrl.startsWith('http') ? normalizePathFromUrl(pathOrUrl) : pathOrUrl
      if (!path) return
      const res = await fetch(`${base}/delete?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Delete failed')
      }
      return
    }

    let storageRef;
    
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
