// Basic localStorage helpers and seed data (mirrors CORETAX_STANDALONE defaults)

const STORAGE_KEYS = {
  USERS: 'users',
  ASSETS: 'assets',
  TAXES: 'taxes',
  TRANSACTIONS: 'transactions',
  USER_LOCATIONS: 'userLocations',
  SESSION: 'sessionToken',
};

async function ensureDefaults() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const demoUsers = await window.security.ensureHashedUsers([
      {
        id: 'admin-1',
        name: 'Admin System',
        fullName: 'Admin System',
        email: 'admin@coretax.go.id',
        username: 'admin',
        password: 'admin123',
        nik: '0000000000000000',
        dateOfBirth: '1990-01-01',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ]);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(demoUsers));
  } else {
    // Migrate any existing plaintext passwords to hashed format
    const users = read(STORAGE_KEYS.USERS, []);
    const hashedUsers = await window.security.ensureHashedUsers(users);
    writeLocal(STORAGE_KEYS.USERS, hashedUsers);
  }

  if (!localStorage.getItem(STORAGE_KEYS.ASSETS)) {
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TAXES)) {
    localStorage.setItem(STORAGE_KEYS.TAXES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USER_LOCATIONS)) {
    localStorage.setItem(STORAGE_KEYS.USER_LOCATIONS, JSON.stringify({}));
  }
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Storage read error', key, err);
    return fallback;
  }
}

// Write to localStorage only (no sync)
function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage write error', key, err);
  }
}

// Write to localStorage and sync to server
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Don't sync 'users' key - user accounts are managed by auth.php
    // Only sync user-specific data like assets, taxes, transactions
    if (window.sync && window.sync.recordChange && key !== STORAGE_KEYS.USERS) {
      // Call recordChange and handle async properly
      window.sync.recordChange(key, value).then(() => {
        console.log(`[Storage] Synced ${key} to server`);
      }).catch(err => {
        console.warn(`[Storage] Sync ${key} failed, will retry later`, err);
      });
    }
  } catch (err) {
    console.error('Storage write error', key, err);
    throw err; // Re-throw so caller can handle (e.g., quota exceeded)
  }
}

// Async version of write that waits for sync
async function writeAsync(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (window.sync && window.sync.recordChange && key !== STORAGE_KEYS.USERS) {
      await window.sync.recordChange(key, value);
      console.log(`[Storage] Synced ${key} to server`);
    }
  } catch (err) {
    console.error('Storage write error', key, err);
    throw err;
  }
}

// ========== Asset-specific methods with blob handling ==========

// Extract blob data from asset and store in IndexedDB
async function extractAndStoreBlobsFromAsset(asset) {
  if (!window.blobStorage) {
    console.warn('[Storage] BlobStorage not available');
    return asset;
  }
  
  const processedAsset = { ...asset };
  
  // Process photos
  if (asset.photos && asset.photos.length > 0) {
    processedAsset.photos = [];
    for (const photo of asset.photos) {
      // Skip if already stored in IndexedDB or has server URL
      if (photo.url && (window.blobStorage.isIndexedDBUrl(photo.url) || !photo.url.startsWith('data:'))) {
        processedAsset.photos.push(photo);
        continue;
      }
      
      // Store base64 data in IndexedDB
      if (photo.data && photo.data.startsWith('data:')) {
        try {
          const stored = await window.blobStorage.store(photo.data, {
            assetId: asset.id,
            name: photo.name || 'photo',
            type: 'image',
          });
          processedAsset.photos.push({
            id: stored.id,
            name: stored.name,
            url: stored.url, // indexeddb://blob-id
            mimeType: stored.mimeType,
            size: stored.size,
            type: 'image',
          });
          console.log(`[Storage] Stored photo in IndexedDB: ${stored.id}`);
        } catch (err) {
          console.error('[Storage] Failed to store photo in IndexedDB:', err);
          // Keep original but warn
          processedAsset.photos.push({ ...photo, storageError: true });
        }
      } else {
        processedAsset.photos.push(photo);
      }
    }
  }
  
  // Process attachments
  if (asset.attachments && asset.attachments.length > 0) {
    processedAsset.attachments = [];
    for (const att of asset.attachments) {
      // Skip if already stored in IndexedDB or has server URL
      if (att.url && (window.blobStorage.isIndexedDBUrl(att.url) || !att.url.startsWith('data:'))) {
        processedAsset.attachments.push(att);
        continue;
      }
      
      // Store base64 data in IndexedDB
      if (att.data && att.data.startsWith('data:')) {
        try {
          const stored = await window.blobStorage.store(att.data, {
            assetId: asset.id,
            name: att.name || 'document',
            type: 'document',
          });
          processedAsset.attachments.push({
            id: stored.id,
            name: stored.name,
            url: stored.url, // indexeddb://blob-id
            mimeType: stored.mimeType,
            size: stored.size,
            type: 'document',
          });
          console.log(`[Storage] Stored attachment in IndexedDB: ${stored.id}`);
        } catch (err) {
          console.error('[Storage] Failed to store attachment in IndexedDB:', err);
          processedAsset.attachments.push({ ...att, storageError: true });
        }
      } else {
        processedAsset.attachments.push(att);
      }
    }
  }
  
  return processedAsset;
}

// Save assets with blob extraction
async function setAssetsWithBlobs(assets) {
  const processedAssets = [];
  
  for (const asset of assets) {
    const processed = await extractAndStoreBlobsFromAsset(asset);
    processedAssets.push(processed);
  }
  
  // Now store in localStorage (without large base64 data)
  try {
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(processedAssets));
    console.log(`[Storage] Saved ${processedAssets.length} assets to localStorage`);
    
    // Sync to server
    if (window.sync && window.sync.recordChange) {
      window.sync.recordChange(STORAGE_KEYS.ASSETS, processedAssets).then(() => {
        console.log('[Storage] Synced assets to server');
      }).catch(err => {
        console.warn('[Storage] Sync assets failed', err);
      });
    }
  } catch (err) {
    console.error('[Storage] Failed to save assets:', err);
    throw err;
  }
}

// Get assets with resolved blob URLs
async function getAssetsWithBlobs() {
  const assets = read(STORAGE_KEYS.ASSETS, []);
  
  if (!window.blobStorage) {
    return assets;
  }
  
  // Resolve IndexedDB URLs to object URLs for display
  const resolvedAssets = [];
  for (const asset of assets) {
    const resolved = { ...asset };
    
    // Resolve photos
    if (asset.photos && asset.photos.length > 0) {
      resolved.photos = [];
      for (const photo of asset.photos) {
        const resolvedUrl = await window.blobStorage.resolveMediaUrl(photo);
        resolved.photos.push({
          ...photo,
          displayUrl: resolvedUrl || photo.url || photo.data,
        });
      }
    }
    
    // Resolve attachments
    if (asset.attachments && asset.attachments.length > 0) {
      resolved.attachments = [];
      for (const att of asset.attachments) {
        const resolvedUrl = await window.blobStorage.resolveMediaUrl(att);
        resolved.attachments.push({
          ...att,
          displayUrl: resolvedUrl || att.url || att.data,
        });
      }
    }
    
    resolvedAssets.push(resolved);
  }
  
  return resolvedAssets;
}

// Delete asset and its blobs
async function deleteAssetWithBlobs(assetId) {
  if (window.blobStorage) {
    await window.blobStorage.deleteByAsset(assetId);
  }
  
  const assets = read(STORAGE_KEYS.ASSETS, []);
  const filtered = assets.filter(a => a.id !== assetId);
  write(STORAGE_KEYS.ASSETS, filtered);
}

window.storage = {
  keys: STORAGE_KEYS,
  ensureDefaults,
  read,
  write,
  writeAsync,
  writeLocal,
  getUsers: () => read(STORAGE_KEYS.USERS, []),
  setUsers: (users) => writeLocal(STORAGE_KEYS.USERS, users), // Users are managed by auth.php
  getAssets: () => read(STORAGE_KEYS.ASSETS, []),
  setAssets: setAssetsWithBlobs, // Now uses IndexedDB for blobs
  setAssetsSync: (assets) => write(STORAGE_KEYS.ASSETS, assets), // Sync version without blob processing
  getAssetsWithBlobs, // Get with resolved blob URLs
  deleteAssetWithBlobs,
  getTaxes: () => read(STORAGE_KEYS.TAXES, []),
  setTaxes: (taxes) => write(STORAGE_KEYS.TAXES, taxes),
  setTaxesAsync: async (taxes) => await writeAsync(STORAGE_KEYS.TAXES, taxes),
  getTransactions: () => read(STORAGE_KEYS.TRANSACTIONS, []),
  setTransactions: (transactions) => write(STORAGE_KEYS.TRANSACTIONS, transactions),
  setTransactionsAsync: async (transactions) => await writeAsync(STORAGE_KEYS.TRANSACTIONS, transactions),
  getUserLocations: () => read(STORAGE_KEYS.USER_LOCATIONS, {}),
  setUserLocations: (locations) => write(STORAGE_KEYS.USER_LOCATIONS, locations),
  getSession: () => localStorage.getItem(STORAGE_KEYS.SESSION),
  setSession: (userId) => localStorage.setItem(STORAGE_KEYS.SESSION, userId),
  clearSession: () => localStorage.removeItem(STORAGE_KEYS.SESSION),
};
