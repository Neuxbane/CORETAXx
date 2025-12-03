// IndexedDB storage for binary data (images, files, blobs)
// Keeps large binary data out of localStorage to avoid quota issues

const DB_NAME = 'CORETAX_BlobStorage';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

let db = null;

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('[BlobStorage] Failed to open IndexedDB:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('[BlobStorage] IndexedDB opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create blob store with indexes
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('assetId', 'assetId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('[BlobStorage] Object store created');
      }
    };
  });
}

// Generate unique blob ID
function generateBlobId() {
  return 'blob-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Convert base64 to Blob
function base64ToBlob(base64Data, mimeType) {
  // Handle data URL format
  let base64 = base64Data;
  let type = mimeType;
  
  if (base64Data.startsWith('data:')) {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      type = matches[1];
      base64 = matches[2];
    }
  }
  
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: type || 'application/octet-stream' });
  } catch (err) {
    console.error('[BlobStorage] Failed to convert base64 to blob:', err);
    return null;
  }
}

// Convert Blob to base64 data URL
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Store a blob (from base64 or File/Blob object)
async function storeBlob(data, options = {}) {
  await initDB();
  
  const id = options.id || generateBlobId();
  const assetId = options.assetId || null;
  const name = options.name || 'file';
  const type = options.type || 'image'; // 'image' or 'document'
  
  let blob;
  let mimeType;
  
  if (data instanceof Blob || data instanceof File) {
    blob = data;
    mimeType = data.type;
  } else if (typeof data === 'string' && data.startsWith('data:')) {
    // Base64 data URL
    const matches = data.match(/^data:([^;]+);base64,/);
    mimeType = matches ? matches[1] : 'application/octet-stream';
    blob = base64ToBlob(data, mimeType);
  } else if (typeof data === 'string') {
    // Raw base64
    blob = base64ToBlob(data, options.mimeType);
    mimeType = options.mimeType || 'application/octet-stream';
  } else {
    throw new Error('Invalid data type for blob storage');
  }
  
  if (!blob) {
    throw new Error('Failed to create blob');
  }
  
  const record = {
    id,
    assetId,
    name,
    type,
    mimeType,
    size: blob.size,
    blob,
    createdAt: new Date().toISOString(),
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);
    
    request.onsuccess = () => {
      console.log(`[BlobStorage] Stored blob ${id} (${blob.size} bytes)`);
      resolve({
        id,
        name,
        type,
        mimeType,
        size: blob.size,
        // Return a reference URL instead of actual data
        url: `indexeddb://${id}`,
      });
    };
    
    request.onerror = (event) => {
      console.error('[BlobStorage] Failed to store blob:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Retrieve a blob by ID
async function getBlob(id) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = (event) => {
      const record = event.target.result;
      if (record) {
        resolve(record);
      } else {
        resolve(null);
      }
    };
    
    request.onerror = (event) => {
      console.error('[BlobStorage] Failed to get blob:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Get blob as base64 data URL (for display)
async function getBlobAsDataURL(id) {
  const record = await getBlob(id);
  if (!record || !record.blob) {
    return null;
  }
  return await blobToBase64(record.blob);
}

// Get blob as object URL (more efficient for display)
async function getBlobAsObjectURL(id) {
  const record = await getBlob(id);
  if (!record || !record.blob) {
    console.warn(`[BlobStorage] Blob not found for ID: ${id}`);
    return null;
  }
  return URL.createObjectURL(record.blob);
}

// Get all blobs for an asset
async function getBlobsByAsset(assetId) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('assetId');
    const request = index.getAll(assetId);
    
    request.onsuccess = (event) => {
      resolve(event.target.result || []);
    };
    
    request.onerror = (event) => {
      console.error('[BlobStorage] Failed to get blobs by asset:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Delete a blob by ID
async function deleteBlob(id) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      console.log(`[BlobStorage] Deleted blob ${id}`);
      resolve(true);
    };
    
    request.onerror = (event) => {
      console.error('[BlobStorage] Failed to delete blob:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Delete all blobs for an asset
async function deleteBlobsByAsset(assetId) {
  const blobs = await getBlobsByAsset(assetId);
  for (const blob of blobs) {
    await deleteBlob(blob.id);
  }
  console.log(`[BlobStorage] Deleted ${blobs.length} blobs for asset ${assetId}`);
  return blobs.length;
}

// Get storage usage info
async function getStorageInfo() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = (event) => {
      const records = event.target.result || [];
      const totalSize = records.reduce((sum, r) => sum + (r.size || 0), 0);
      resolve({
        count: records.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      });
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Clear all blobs
async function clearAll() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => {
      console.log('[BlobStorage] All blobs cleared');
      resolve(true);
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Helper: Check if a URL is an IndexedDB reference
function isIndexedDBUrl(url) {
  return url && typeof url === 'string' && url.startsWith('indexeddb://');
}

// Helper: Extract blob ID from IndexedDB URL
function getBlobIdFromUrl(url) {
  if (!isIndexedDBUrl(url)) return null;
  return url.replace('indexeddb://', '');
}

// Helper: Resolve a photo/attachment reference to displayable URL
async function resolveMediaUrl(item) {
  if (!item) return null;
  
  // If it has a server URL, use that
  if (item.url && !isIndexedDBUrl(item.url)) {
    return item.url;
  }
  
  // If it's an IndexedDB reference, get object URL
  if (item.url && isIndexedDBUrl(item.url)) {
    const blobId = getBlobIdFromUrl(item.url);
    return await getBlobAsObjectURL(blobId);
  }
  
  // If it has inline base64 data, return that
  if (item.data && item.data.startsWith('data:')) {
    return item.data;
  }
  
  return null;
}

// Export
window.blobStorage = {
  init: initDB,
  store: storeBlob,
  get: getBlob,
  getAsDataURL: getBlobAsDataURL,
  getAsObjectURL: getBlobAsObjectURL,
  getByAsset: getBlobsByAsset,
  delete: deleteBlob,
  deleteByAsset: deleteBlobsByAsset,
  getInfo: getStorageInfo,
  clear: clearAll,
  isIndexedDBUrl,
  getBlobIdFromUrl,
  resolveMediaUrl,
  base64ToBlob,
  blobToBase64,
};

// Initialize on load
initDB().catch(err => console.error('[BlobStorage] Init failed:', err));
